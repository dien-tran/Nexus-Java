import json
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


class SimpleOrchestrator:
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

        # Check heuristic first to avoid LLM for simple queries
        h_intent = self._heuristic_intent(message)
        if h_intent not in ["unsupported", "rag_candidate", "text_to_sql_candidate"]:
            state["intent"] = h_intent
            state["is_simple"] = True
            # For simple queries, we still need to select a tool using heuristic
            fallback_tool = self._heuristic_tool(message, h_intent)
            state["selected_tool"] = fallback_tool.get("tool")
            state["tool_arguments"] = fallback_tool.get("arguments", {})
        else:
            # Combined Intent Classification and Tool Selection for complex queries
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
        h_intent = self._heuristic_intent(message)
        h_tool = self._heuristic_tool(message, h_intent)
        fallback = {
            "intent": h_intent,
            "tool": h_tool.get("tool"),
            "arguments": h_tool.get("arguments", {})
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

        intent = result.get("intent") or fallback["intent"]
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
                        "text_to_sql_candidate, rag_candidate. "
                        "Chỉ trả JSON {\"intent\":\"...\"}.\n"
                        f"Câu hỏi: {message}"
                    ),
                },
            ],
            fallback=fallback,
        )
        valid_intents = {
            "plan_query",
            "task_query",
            "work_summary",
            "unsupported",
            "clarification_needed",
            "text_to_sql_candidate",
            "rag_candidate",
        }
        intent = result.get("intent") if result.get("intent") in valid_intents else fallback["intent"]
        return {**state, "intent": intent}

    def select_tool(self, state: ChatState) -> ChatState:
        intent = state.get("intent", "unsupported")
        if intent in {"unsupported", "clarification_needed", "text_to_sql_candidate", "rag_candidate"}:
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
        return {**state, "reply": reply.strip() or fallback}

    def _heuristic_intent(self, message: str) -> str:
        normalized = message.lower()
        if any(word in normalized for word in ["tài liệu", "file", "document", "rag"]):
            return "rag_candidate"
        if any(word in normalized for word in ["sql", "database", "truy vấn phức tạp", "join", "schema"]):
            return "text_to_sql_candidate"
        if any(word in normalized for word in ["plan", "kế hoạch"]):
            return "plan_query"
        if any(word in normalized for word in ["task", "công việc", "deadline", "quá hạn", "hôm nay", "sắp tới"]):
            return "task_query"
        if any(word in normalized for word in ["tóm tắt", "thống kê", "bao nhiêu", "số lượng", "dashboard", "tổng quan"]):
            return "work_summary"
        return "unsupported"

    def _heuristic_tool(self, message: str, intent: str) -> dict[str, Any]:
        normalized = message.lower()
        if "quá hạn" in normalized or "overdue" in normalized:
            return {"tool": "get_overdue_tasks", "arguments": {"limit": 10}}
        if "hôm nay" in normalized or "today" in normalized:
            return {"tool": "get_today_tasks", "arguments": {"limit": 10}}
        if "sắp tới" in normalized or "upcoming" in normalized or "tuần này" in normalized:
            return {"tool": "get_upcoming_tasks", "arguments": {"days": 7, "limit": 10}}
        if "dashboard" in normalized or "tổng quan" in normalized:
            return {"tool": "get_dashboard_summary", "arguments": {}}
        if "thống kê plan" in normalized or "số lượng plan" in normalized:
            return {"tool": "get_plan_statistics", "arguments": {}}
        if "thống kê task" in normalized or "số lượng task" in normalized:
            return {"tool": "get_task_statistics", "arguments": {}}
        if "ưu tiên" in normalized or "priority" in normalized:
            return {"tool": "summarize_my_work", "arguments": {"groupBy": "priority"}}
        if "bao nhiêu" in normalized or "số lượng" in normalized or "thống kê" in normalized or "tóm tắt" in normalized:
            return {"tool": "summarize_my_work", "arguments": {"groupBy": "status"}}
        if intent == "plan_query":
            return {"tool": "search_my_plans", "arguments": {"limit": 10}}
        return {"tool": "search_my_tasks", "arguments": {"limit": 10}}

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
                due_date = item.get("dueDate") or item.get("due_date")
                total = item.get("total") or item.get("count")
                
                parts = [f"• {name}"]
                if total is not None:
                    parts.append(f": {total}")
                if status:
                    status_vn = {"OPEN": "Mở", "IN_PROGRESS": "Đang làm", "DONE": "Xong", "COMPLETED": "Hoàn thành"}.get(status, status)
                    parts.append(f" [{status_vn}]")
                if due_date:
                    parts.append(f" (Hạn: {due_date})")
                preview.append("".join(parts))
            
            return f"{header}\n" + "\n".join(preview)

        if isinstance(result, dict):
            if tool_name == "get_dashboard_summary":
                stats = result.get("statistics", {})
                return (
                    "Tổng quan công việc của bạn:\n"
                    f"- Tổng số task: {stats.get('totalTasks', 0)}\n"
                    f"- Đang thực hiện: {stats.get('inProgressTasks', 0)}\n"
                    f"- Đã hoàn thành: {stats.get('completedTasks', 0)}\n"
                    f"- Quá hạn: {stats.get('overdueTasks', 0)}\n"
                    f"- Tỉ lệ hoàn thành: {result.get('completionRate', 0)}%"
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
