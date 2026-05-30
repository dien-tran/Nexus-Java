from dataclasses import dataclass
from typing import Any, Callable

from clients.work_client import WorkServiceClient


@dataclass(frozen=True)
class ToolSpec:
    name: str
    description: str
    parameters: dict[str, str]
    handler: Callable[[str, dict[str, Any]], Any]


class ToolRegistry:
    def __init__(self, work_client: WorkServiceClient) -> None:
        self.work_client = work_client
        self.tools: dict[str, ToolSpec] = {
            "get_my_plans": ToolSpec(
                name="get_my_plans",
                description="Lấy danh sách plan của người dùng hiện tại.",
                parameters={"limit": "int optional"},
                handler=lambda token, args: self.work_client.get_my_plans(token, args.get("limit")),
            ),
            "get_plan_detail": ToolSpec(
                name="get_plan_detail",
                description="Lấy chi tiết một plan theo planId.",
                parameters={"planId": "string required"},
                handler=lambda token, args: self.work_client.get_plan_detail(token, self._required(args, "planId")),
            ),
            "search_my_plans": ToolSpec(
                name="search_my_plans",
                description="Tìm plan bằng status/keyword whitelist.",
                parameters={"status": "string optional", "keyword": "string optional", "limit": "int optional"},
                handler=lambda token, args: self.work_client.search_my_plans(
                    token,
                    args.get("status"),
                    args.get("keyword"),
                    args.get("limit"),
                ),
            ),
            "search_my_tasks": ToolSpec(
                name="search_my_tasks",
                description="Tìm task bằng filter whitelist, không nhận SQL.",
                parameters={
                    "status": "string optional",
                    "keyword": "string optional",
                    "priority": "LOW|MEDIUM|HIGH|URGENT optional",
                    "planId": "string optional",
                    "dueBefore": "YYYY-MM-DD optional",
                    "dueAfter": "YYYY-MM-DD optional",
                    "startBefore": "YYYY-MM-DD optional",
                    "startAfter": "YYYY-MM-DD optional",
                    "limit": "int optional",
                },
                handler=lambda token, args: self.work_client.search_my_tasks(
                    bearer_token=token,
                    status=args.get("status"),
                    keyword=args.get("keyword"),
                    priority=args.get("priority"),
                    plan_id=args.get("planId"),
                    due_before=args.get("dueBefore"),
                    due_after=args.get("dueAfter"),
                    start_before=args.get("startBefore"),
                    start_after=args.get("startAfter"),
                    limit=args.get("limit"),
                ),
            ),
            "get_today_tasks": ToolSpec(
                name="get_today_tasks",
                description="Lấy task có hạn hôm nay.",
                parameters={"limit": "int optional"},
                handler=lambda token, args: self.work_client.get_today_tasks(token, args.get("limit")),
            ),
            "get_overdue_tasks": ToolSpec(
                name="get_overdue_tasks",
                description="Lấy task quá hạn của người dùng hiện tại.",
                parameters={"limit": "int optional"},
                handler=lambda token, args: self.work_client.get_overdue_tasks(token, args.get("limit")),
            ),
            "get_upcoming_tasks": ToolSpec(
                name="get_upcoming_tasks",
                description="Lấy task sắp tới trong N ngày.",
                parameters={"days": "int optional, max 30", "limit": "int optional"},
                handler=lambda token, args: self.work_client.get_upcoming_tasks(
                    token,
                    args.get("days"),
                    args.get("limit"),
                ),
            ),
            "summarize_my_work": ToolSpec(
                name="summarize_my_work",
                description="Tóm tắt task theo status, priority, plan, dueDate hoặc dashboard trong khoảng ngày.",
                parameters={
                    "fromDate": "YYYY-MM-DD optional",
                    "toDate": "YYYY-MM-DD optional",
                    "groupBy": "status|priority|plan|planStatus|dueDate|dashboard optional",
                },
                handler=lambda token, args: self.work_client.summarize_my_work(
                    token,
                    args.get("fromDate"),
                    args.get("toDate"),
                    args.get("groupBy"),
                ),
            ),
            "get_task_statistics": ToolSpec(
                name="get_task_statistics",
                description="Lấy thống kê task theo status và priority từ work-service.",
                parameters={},
                handler=lambda token, args: self.work_client.get_task_statistics(token),
            ),
            "get_plan_statistics": ToolSpec(
                name="get_plan_statistics",
                description="Lấy thống kê plan theo status từ work-service.",
                parameters={},
                handler=lambda token, args: self.work_client.get_plan_statistics(token),
            ),
            "get_dashboard_summary": ToolSpec(
                name="get_dashboard_summary",
                description="Lấy tổng quan dashboard gồm tổng plan, tổng task và số task theo nhóm chính.",
                parameters={},
                handler=lambda token, args: self.work_client.get_dashboard_summary(token),
            ),
        }

    def describe_for_prompt(self) -> list[dict[str, Any]]:
        return [
            {
                "name": spec.name,
                "description": spec.description,
                "parameters": spec.parameters,
            }
            for spec in self.tools.values()
        ]

    def execute(self, bearer_token: str, tool_name: str, arguments: dict[str, Any] | None) -> Any:
        if tool_name not in self.tools:
            raise ValueError(f"Unsupported tool: {tool_name}")

        spec = self.tools[tool_name]
        safe_args = self._filter_arguments(spec, arguments or {})
        return spec.handler(bearer_token, safe_args)

    def _filter_arguments(self, spec: ToolSpec, arguments: dict[str, Any]) -> dict[str, Any]:
        return {key: value for key, value in arguments.items() if key in spec.parameters}

    def _required(self, arguments: dict[str, Any], key: str) -> Any:
        value = arguments.get(key)
        if value is None or value == "":
            raise ValueError(f"Missing required argument: {key}")
        return value
