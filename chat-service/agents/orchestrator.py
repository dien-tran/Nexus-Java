import json
import re
import unicodedata
from datetime import date
from typing import Any, TypedDict

from agents.rag_agent import RagAgent
from agents.text_to_sql_agent import TextToSqlAgent
from agents.tool_registry import ToolRegistry
from core.llm_client import LlmClient
from prompts.system_prompt import ANSWER_PROMPT, SYSTEM_PROMPT, TOOL_SELECTION_PROMPT


class ChatState(TypedDict, total=False):
    user_id: str
    bearer_token: str
    message: str
    intent: str
    selected_tool: str | None
    tool_arguments: dict[str, Any]
    tool_result: Any
    reply: str
    selected_agent: str
    error: str | None
    is_simple: bool
    heuristic_confidence: str


class SimpleOrchestrator:
    CONVERSATIONAL_INTENTS = {"greeting", "identity", "capability_help", "thanks", "goodbye"}
    VALID_INTENTS = {
        "plan_query",
        "task_query",
        "work_summary",
        "unsupported",
        "clarification_needed",
        "text_to_sql_candidate",
        "rag_candidate",
        *CONVERSATIONAL_INTENTS,
    }

    def __init__(self, registry: ToolRegistry, llm: LlmClient) -> None:
        self.registry = registry
        self.llm = llm
        self.text_to_sql_agent = TextToSqlAgent()
        self.rag_agent = RagAgent()

    def ask(self, user_id: str, bearer_token: str, message: str) -> dict[str, Any]:
        state: ChatState = {
            "user_id": user_id,
            "bearer_token": bearer_token,
            "message": message,
            "is_simple": False,
        }

        route = self._heuristic_route(message)
        confidence = route.get("confidence", "low")

        if confidence == "high":
            state["intent"] = route["intent"]
            state["selected_tool"] = route.get("tool")
            state["tool_arguments"] = route.get("arguments", {})
            state["is_simple"] = True
            state["heuristic_confidence"] = confidence
        elif confidence == "medium" and route.get("tool"):
            state["intent"] = route["intent"]
            state["selected_tool"] = route.get("tool")
            state["tool_arguments"] = route.get("arguments", {})
            state["heuristic_confidence"] = confidence
        else:
            state = self.classify_and_select_tool(state)

        state = self.execute_tool(state)
        state = self.generate_answer(state)
        return {
            "reply": state.get("reply", "Mình chưa xử lý được câu hỏi này."),
            "selectedAgent": state.get("selected_agent", "unsupported")
            if not state.get("is_simple")
            else "heuristic",
            "tool": state.get("selected_tool"),
        }

    def classify_and_select_tool(self, state: ChatState) -> ChatState:
        message = state["message"]
        today = date.today().isoformat()
        tools_desc = json.dumps(self.registry.describe_for_prompt(), ensure_ascii=False)
        
        # Default fallback if LLM fails
        route = self._heuristic_route(message)
        fallback = {
            "intent": route.get("intent", "unsupported"),
            "tool": route.get("tool"),
            "arguments": route.get("arguments", {})
        }

        result = self.llm.complete_json(
            [
                {"role": "system", "content": SYSTEM_PROMPT},
                {"role": "system", "content": TOOL_SELECTION_PROMPT},
                {
                    "role": "user",
                    "content": (
                        f"Hôm nay là {today}.\n"
                        f"Tools Whitelist: {tools_desc}\n"
                        f"Câu hỏi: {message}"
                    ),
                },
            ],
            fallback=fallback,
        )

        intent = result.get("intent") if result.get("intent") in self.VALID_INTENTS else fallback["intent"]
        tool_name = result.get("tool")
        arguments = result.get("arguments") if isinstance(result.get("arguments"), dict) else {}

        # Validate tool
        if tool_name and tool_name not in self.registry.tools:
            tool_name = None
            arguments = {}

        return {
            **state,
            "intent": intent,
            "selected_tool": tool_name,
            "tool_arguments": arguments
        }

    def classify_intent(self, state: ChatState) -> ChatState:
        if state.get("intent"):
            return state

        message = state["message"]
        fallback = {"intent": self._heuristic_intent(message)}
        result = self.llm.complete_json(
            [
                {"role": "system", "content": SYSTEM_PROMPT},
                {
                    "role": "user",
                    "content": (
                        "Phân loại câu hỏi sau thành một trong các intent: "
                        "plan_query, task_query, work_summary, unsupported, clarification_needed, "
                        "text_to_sql_candidate, rag_candidate, greeting, identity, "
                        "capability_help, thanks, goodbye. "
                        "Chỉ trả JSON {\"intent\":\"...\"}.\n"
                        f"Câu hỏi: {message}"
                    ),
                },
            ],
            fallback=fallback,
        )
        intent = result.get("intent") if result.get("intent") in self.VALID_INTENTS else fallback["intent"]
        return {**state, "intent": intent}

    def select_tool(self, state: ChatState) -> ChatState:
        intent = state.get("intent", "unsupported")
        if intent in {
            "unsupported",
            "clarification_needed",
            "text_to_sql_candidate",
            "rag_candidate",
            *self.CONVERSATIONAL_INTENTS,
        }:
            return {**state, "selected_tool": None, "tool_arguments": {}}

        message = state["message"]
        fallback = self._heuristic_tool(message, intent)

        # Skip LLM if it's a simple query already matched by heuristic
        if state.get("is_simple") and fallback.get("tool"):
            return {
                **state,
                "selected_tool": fallback["tool"],
                "tool_arguments": fallback.get("arguments", {}),
            }

        today = date.today().isoformat()
        result = self.llm.complete_json(
            [
                {"role": "system", "content": SYSTEM_PROMPT},
                {"role": "system", "content": TOOL_SELECTION_PROMPT},
                {
                    "role": "user",
                    "content": (
                        f"Hôm nay là {today}.\n"
                        f"Tools: {json.dumps(self.registry.describe_for_prompt(), ensure_ascii=False)}\n"
                        f"Intent: {intent}\n"
                        f"Câu hỏi: {message}"
                    ),
                },
            ],
            fallback=fallback,
        )

        tool_name = result.get("tool")
        arguments = result.get("arguments") if isinstance(result.get("arguments"), dict) else {}
        if tool_name not in self.registry.tools:
            tool_name = fallback.get("tool")
            arguments = fallback.get("arguments", {})
        return {**state, "selected_tool": tool_name, "tool_arguments": arguments}

    def execute_tool(self, state: ChatState) -> ChatState:
        tool_name = state.get("selected_tool")
        intent = state.get("intent", "unsupported")
        if not tool_name:
            selected_agent = {
                "text_to_sql_candidate": self.text_to_sql_agent.selected_agent,
                "rag_candidate": self.rag_agent.selected_agent,
            }.get(intent, intent)
            return {**state, "tool_result": None, "selected_agent": selected_agent}

        try:
            result = self.registry.execute(
                bearer_token=state["bearer_token"],
                tool_name=tool_name,
                arguments=state.get("tool_arguments", {}),
            )
            return {**state, "tool_result": result, "selected_agent": "tool"}
        except Exception as exc:
            return {**state, "tool_result": None, "error": str(exc), "selected_agent": "tool"}

    def generate_answer(self, state: ChatState) -> ChatState:
        if state.get("error"):
            return {
                **state,
                "reply": "Hiện tại mình chưa lấy được dữ liệu task/plan. Bạn thử lại sau một chút nhé.",
            }

        intent = state.get("intent")
        if intent in self.CONVERSATIONAL_INTENTS:
            return {**state, "reply": self._conversational_answer(intent)}
        if intent == "unsupported":
            return {**state, "reply": "Mình hiện chỉ hỗ trợ các câu hỏi liên quan đến task và plan trong Nexus."}
        if intent == "clarification_needed":
            return {
                **state,
                "reply": (
                    "Mình chưa rõ bạn muốn xem theo plan, trạng thái hay khoảng thời gian nào. "
                    "Bạn có thể nói rõ hơn không?"
                ),
            }
        if intent == "text_to_sql_candidate":
            return {**state, "reply": self.text_to_sql_agent.answer_disabled()}
        if intent == "rag_candidate":
            return {**state, "reply": self.rag_agent.answer_disabled()}

        tool_result = state.get("tool_result")
        if not tool_result:
            return {**state, "reply": "Mình chưa tìm thấy dữ liệu phù hợp trong task hoặc plan của bạn."}

        fallback = self._deterministic_answer(state)

        # Fast path for simple questions or if LLM is disabled
        if state.get("is_simple") or not self.llm.enabled:
            return {**state, "reply": fallback}

        try:
            reply = self.llm.complete(
                [
                    {"role": "system", "content": SYSTEM_PROMPT},
                    {"role": "system", "content": ANSWER_PROMPT},
                    {
                        "role": "user",
                        "content": (
                            f"Câu hỏi: {state['message']}\n"
                            f"tool_result: {json.dumps(tool_result, ensure_ascii=False)}"
                        ),
                    },
                ],
                temperature=0.2,
            )
        except Exception:
            return {**state, "reply": fallback}
        return {**state, "reply": self._clean_reply_text(reply.strip()) or fallback}

    def _clean_reply_text(self, reply: str) -> str:
        reply = re.sub(r"\*\*(.*?)\*\*", r"\1", reply)
        reply = re.sub(r"__(.*?)__", r"\1", reply)
        reply = re.sub(r"`([^`]*)`", r"\1", reply)
        return reply

    def _heuristic_intent(self, message: str) -> str:
        normalized = message.lower()
        normalized_ascii = self._strip_accents(normalized)

        conversational_intent = self._conversational_intent(normalized, normalized_ascii)
        if conversational_intent:
            return conversational_intent

        if any(word in normalized for word in ["tài liệu", "file", "document", "rag"]):
            return "rag_candidate"
        if any(word in normalized for word in ["sql", "database", "truy vấn phức tạp", "join", "schema"]):
            return "text_to_sql_candidate"
        if self._is_summary_query(normalized):
            return "work_summary"
        if any(word in normalized for word in ["plan", "kế hoạch"]):
            return "plan_query"
        if any(word in normalized for word in ["task", "công việc", "deadline", "quá hạn", "hôm nay", "sắp tới"]):
            return "task_query"
        if any(
            word in normalized
            for word in [
                "priority",
                "ưu tiên",
                "urgent",
                "khẩn cấp",
                "gấp",
                "high",
                "medium",
                "low",
            ]
        ):
            return "task_query"
        return "unsupported"

    def _heuristic_route(self, message: str) -> dict[str, Any]:
        intent = self._heuristic_intent(message)

        if intent in {"rag_candidate", "text_to_sql_candidate"}:
            return {"intent": intent, "tool": None, "arguments": {}, "confidence": "high"}
        if intent in self.CONVERSATIONAL_INTENTS:
            return {"intent": intent, "tool": None, "arguments": {}, "confidence": "high"}

        tool = self._heuristic_tool(message, intent)
        confidence = self._heuristic_confidence(message, intent, tool)
        return {
            "intent": intent,
            "tool": tool.get("tool"),
            "arguments": tool.get("arguments", {}),
            "confidence": confidence,
        }

    def _heuristic_tool(self, message: str, intent: str) -> dict[str, Any]:
        normalized = message.lower()
        mentions_plan = self._contains_any(normalized, ["plan", "kế hoạch"])
        mentions_task = self._contains_any(normalized, ["task", "công việc", "deadline"])
        is_summary = self._is_summary_query(normalized)
        priority = self._extract_priority(normalized)
        task_status = self._extract_task_status(normalized)
        plan_status = self._extract_plan_status(normalized)

        if "quá hạn" in normalized or "overdue" in normalized:
            return {"tool": "get_overdue_tasks", "arguments": {"limit": 10}}
        if "hôm nay" in normalized or "today" in normalized:
            return {"tool": "get_today_tasks", "arguments": {"limit": 10}}
        if "sắp tới" in normalized or "upcoming" in normalized or "tuần này" in normalized:
            return {"tool": "get_upcoming_tasks", "arguments": {"days": 7, "limit": 10}}

        if "theo plan" in normalized or "theo kế hoạch" in normalized:
            return {"tool": "summarize_my_work", "arguments": {"groupBy": "plan"}}
        if is_summary and mentions_plan and not mentions_task:
            return {"tool": "get_plan_statistics", "arguments": {}}
        if is_summary and mentions_task and not mentions_plan:
            return {"tool": "get_task_statistics", "arguments": {}}
        if is_summary and mentions_plan and mentions_task:
            return {"tool": "get_dashboard_summary", "arguments": {}}

        if intent == "task_query" and (priority or task_status):
            arguments: dict[str, Any] = {"limit": 10}
            if priority:
                arguments["priority"] = priority
            if task_status:
                arguments["status"] = task_status
            return {"tool": "search_my_tasks", "arguments": arguments}

        if intent == "plan_query" and plan_status:
            return {"tool": "search_my_plans", "arguments": {"status": plan_status, "limit": 10}}

        if "ưu tiên" in normalized or "priority" in normalized:
            return {"tool": "summarize_my_work", "arguments": {"groupBy": "priority"}}
        if "dashboard" in normalized or "tổng quan" in normalized or "tổng hợp" in normalized:
            return {"tool": "get_dashboard_summary", "arguments": {}}
        if is_summary:
            return {"tool": "get_dashboard_summary", "arguments": {}}
        if intent == "plan_query":
            return {"tool": "search_my_plans", "arguments": {"limit": 10}}
        if intent == "unsupported" or intent in self.CONVERSATIONAL_INTENTS:
            return {"tool": None, "arguments": {}}
        return {"tool": "search_my_tasks", "arguments": {"limit": 10}}

    def _heuristic_confidence(self, message: str, intent: str, tool: dict[str, Any]) -> str:
        normalized = message.lower()
        if intent in {"rag_candidate", "text_to_sql_candidate"} or intent in self.CONVERSATIONAL_INTENTS:
            return "high"
        if intent == "unsupported":
            return "low"

        arguments = tool.get("arguments", {})
        selected_tool = tool.get("tool")
        has_filter = any(key in arguments for key in ("priority", "status", "dueBefore", "dueAfter"))
        has_exact_time = self._contains_any(normalized, ["hôm nay", "today", "quá hạn", "overdue", "sắp tới", "upcoming", "tuần này"])
        asks_count_or_stats = self._contains_any(normalized, ["thống kê", "bao nhiêu", "số lượng", "dashboard", "tổng quan", "tổng hợp"])
        asks_analysis = self._contains_any(
            normalized,
            ["tình hình", "tiến độ", "ổn không", "nên làm", "ưu tiên xử lý", "đáng chú ý", "rủi ro", "bị kẹt", "phân tích"],
        )

        if has_filter or has_exact_time or asks_count_or_stats:
            return "high"
        if selected_tool and asks_analysis:
            return "medium"
        if selected_tool in {"search_my_tasks", "search_my_plans"}:
            return "high"
        return "low"

    def _extract_priority(self, normalized: str) -> str | None:
        priority_keywords = {
            "URGENT": ["urgent", "khẩn cấp", "gấp", "rất gấp"],
            "HIGH": ["high", "cao", "quan trọng"],
            "MEDIUM": ["medium", "trung bình", "bình thường", "normal"],
            "LOW": ["low", "thấp"],
        }
        for value, keywords in priority_keywords.items():
            if self._contains_any(normalized, keywords):
                return value
        return None

    def _extract_task_status(self, normalized: str) -> str | None:
        status_keywords = {
            "TODO": ["todo", "to do", "chưa làm", "chưa bắt đầu"],
            "IN_PROGRESS": ["in progress", "đang làm", "đang thực hiện", "đang xử lý"],
            "REVIEW": ["review", "đang review", "chờ review"],
            "COMPLETE": ["complete", "completed", "done", "xong", "hoàn thành"],
        }
        for value, keywords in status_keywords.items():
            if self._contains_any(normalized, keywords):
                return value
        return None

    def _extract_plan_status(self, normalized: str) -> str | None:
        status_keywords = {
            "DRAFTING": ["draft", "drafting", "đang soạn", "nháp"],
            "IN_REVIEW": ["in review", "review", "đang review", "chờ review"],
            "COMPLETED": ["completed", "complete", "done", "xong", "hoàn thành"],
        }
        for value, keywords in status_keywords.items():
            if self._contains_any(normalized, keywords):
                return value
        return None

    def _contains_any(self, text: str, keywords: list[str]) -> bool:
        return any(keyword in text for keyword in keywords)

    def _strip_accents(self, text: str) -> str:
        normalized = unicodedata.normalize("NFD", text).replace("đ", "d").replace("Đ", "D")
        return "".join(char for char in normalized if unicodedata.category(char) != "Mn")

    def _conversational_intent(self, normalized: str, normalized_ascii: str) -> str | None:
        compact = re.sub(r"[^\w\s]", " ", normalized_ascii).strip()
        compact = re.sub(r"\s+", " ", compact)

        if compact in {
            "hi",
            "hello",
            "hey",
            "alo",
            "xin chao",
            "chao",
            "chao ban",
            "good morning",
            "good afternoon",
            "good evening",
        }:
            return "greeting"

        if self._contains_any(
            compact,
            ["ban la ai", "who are you", "assistant la gi", "tro ly nao", "nexus ai assistant la gi"],
        ):
            return "identity"

        has_work_terms = self._contains_any(
            compact,
            ["task", "plan", "deadline", "cong viec", "ke hoach", "thong ke", "qua han", "hom nay", "sap toi"],
        )
        if self._contains_any(
            compact,
            [
                "ban lam duoc gi",
                "ban giup duoc gi",
                "co the lam gi",
                "co the hoi gi",
                "hoi gi duoc",
                "huong dan su dung",
                "cach hoi",
                "help",
            ],
        ) and not has_work_terms:
            return "capability_help"

        if self._contains_any(compact, ["cam on", "thanks", "thank you", "thank"]):
            return "thanks"

        if compact in {"bye", "goodbye", "tam biet", "hen gap lai", "gap lai sau"}:
            return "goodbye"

        return None

    def _conversational_answer(self, intent: str) -> str:
        answers = {
            "greeting": (
                "Chào bạn, mình là Nexus AI Assistant. "
                "Mình có thể giúp bạn kiểm tra task, plan, deadline và thống kê công việc trong Nexus."
            ),
            "identity": (
                "Mình là Nexus AI Assistant, trợ lý hỗ trợ bạn theo dõi task, plan, deadline "
                "và thống kê công việc trong Nexus."
            ),
            "capability_help": (
                "Mình có thể giúp bạn xem task hôm nay, task quá hạn, task sắp tới, tìm task/plan "
                "theo trạng thái hoặc độ ưu tiên, và tóm tắt thống kê công việc."
            ),
            "thanks": "Không có gì. Bạn cần mình kiểm tra task, plan hoặc thống kê nào tiếp không?",
            "goodbye": "Tạm biệt bạn. Khi cần xem task, plan hoặc deadline trong Nexus thì cứ hỏi mình nhé.",
        }
        return answers.get(intent, "Mình có thể hỗ trợ các câu hỏi liên quan đến task và plan trong Nexus.")

    def _is_summary_query(self, normalized_message: str) -> bool:
        return self._contains_any(
            normalized_message,
            ["tóm tắt", "thống kê", "bao nhiêu", "số lượng", "dashboard", "tổng quan", "tổng hợp", "tình hình", "tiến độ"],
        )

    def _deterministic_answer(self, state: ChatState) -> str:
        result = state.get("tool_result")
        tool_name = state.get("selected_tool")
        
        if isinstance(result, list):
            count = len(result)
            if count == 0:
                return "Mình không tìm thấy mục nào phù hợp với yêu cầu của bạn."
            
            # Better templates based on tool name
            templates = {
                "get_overdue_tasks": f"Bạn có {count} công việc đã quá hạn. Đây là danh sách chi tiết:",
                "get_today_tasks": f"Hôm nay bạn có {count} công việc cần hoàn thành:",
                "get_upcoming_tasks": f"Trong những ngày tới bạn có {count} công việc sắp đến hạn:",
                "search_my_tasks": f"Mình tìm thấy {count} công việc khớp với từ khóa của bạn:",
                "search_my_plans": f"Dưới đây là {count} kế hoạch mình tìm thấy:",
            }
            header = templates.get(tool_name, f"Mình tìm thấy {count} kết quả phù hợp:")
            
            preview = []
            for item in result[:10]:
                name = item.get("name") or item.get("title") or item.get("groupKey") or item.get("status") or item.get("id")
                status = item.get("status")
                priority = item.get("priority")
                due_date = item.get("dueDate") or item.get("due_date")
                start_date = item.get("startDate") or item.get("start_date")
                description = item.get("description")
                total = item.get("total") or item.get("count")
                
                parts = [f"• {name}"]
                if total is not None:
                    parts.append(f": {total}")
                meta = []
                if priority:
                    meta.append(f"Ưu tiên: {self._label(priority)}")
                if status:
                    meta.append(f"Trạng thái: {self._label(status)}")
                if start_date:
                    meta.append(f"Bắt đầu: {start_date}")
                if due_date:
                    meta.append(f"Hạn: {due_date}")
                if meta:
                    parts.append(f" ({', '.join(meta)})")
                if description:
                    parts.append(f"\n  Mô tả: {description}")
                preview.append("".join(parts))
            
            return f"{header}\n" + "\n".join(preview)

        if isinstance(result, dict):
            if tool_name == "get_dashboard_summary":
                stats = result.get("statistics", result)
                total_tasks = stats.get("totalTasks", 0)
                completed_tasks = stats.get("completedTasks", 0)
                completion_rate = result.get("completionRate")
                if completion_rate is None:
                    completion_rate = round(completed_tasks / total_tasks * 100, 1) if total_tasks else 0
                return (
                    "Tổng quan công việc của bạn:\n"
                    f"- Tổng số plan: {stats.get('totalPlans', 0)}\n"
                    f"- Tổng số task: {total_tasks}\n"
                    f"- Đang thực hiện: {stats.get('inProgressTasks', 0)}\n"
                    f"- Chưa làm: {stats.get('pendingTasks', 0)}\n"
                    f"- Đã hoàn thành: {completed_tasks}\n"
                    f"- Tỉ lệ hoàn thành: {completion_rate}%"
                )

            if tool_name == "get_plan_statistics":
                total_plans = result.get("totalPlans", 0)
                status_counts = self._format_counts(result.get("statusCounts"))
                return (
                    f"Hiện tại bạn có {total_plans} plan.\n"
                    f"- Theo trạng thái: {status_counts}"
                )

            if tool_name == "get_task_statistics":
                total_tasks = result.get("totalTasks", 0)
                status_counts = self._format_counts(result.get("statusCounts"))
                priority_counts = self._format_counts(result.get("priorityCounts"))
                return (
                    f"Hiện tại bạn có {total_tasks} task.\n"
                    f"- Theo trạng thái: {status_counts}\n"
                    f"- Theo độ ưu tiên: {priority_counts}"
                )
            
            name = result.get("name") or result.get("title") or result.get("id")
            if name is None:
                parts = []
                for key, value in result.items():
                    if isinstance(value, dict):
                        nested = ", ".join(f"{nk}: {nv}" for nk, nv in value.items())
                        parts.append(f"- {key}: {nested}")
                    else:
                        parts.append(f"- {key}: {value}")
                return "Dưới đây là thông tin chi tiết:\n" + "\n".join(parts)
            return f"Thông tin bạn cần: {name}."
            
        return "Dữ liệu đã sẵn sàng để bạn theo dõi."

    def _label(self, value: Any) -> str:
        labels = {
            "TODO": "Chưa làm",
            "IN_PROGRESS": "Đang thực hiện",
            "REVIEW": "Đang review",
            "COMPLETE": "Hoàn thành",
            "COMPLETED": "Hoàn thành",
            "DRAFTING": "Đang soạn",
            "IN_REVIEW": "Đang review",
            "LOW": "Thấp",
            "MEDIUM": "Trung bình",
            "HIGH": "Cao",
            "URGENT": "Khẩn cấp",
            "UNKNOWN": "Không xác định",
        }
        return labels.get(str(value), str(value))

    def _format_counts(self, counts: Any) -> str:
        if not isinstance(counts, dict) or not counts:
            return "chưa có dữ liệu"
        return ", ".join(f"{self._label(key)}: {value}" for key, value in counts.items())
