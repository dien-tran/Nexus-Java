from collections import Counter
from datetime import date, timedelta
from typing import Any

import httpx

from core.config import get_settings


class WorkServiceClient:
    def __init__(self) -> None:
        settings = get_settings()
        self.base_url = settings.work_service_base_url.rstrip("/")
        self.timeout = settings.work_service_timeout_seconds

    def health(self) -> bool:
        response = httpx.get(f"{self.base_url}/actuator/health", timeout=self.timeout)
        response.raise_for_status()
        return True

    def get_my_plans(self, bearer_token: str, limit: int | None = None) -> list[dict[str, Any]]:
        plans = self._get(bearer_token, "/plans")
        return self._limited(plans, limit)

    def get_plan_detail(self, bearer_token: str, plan_id: str) -> Any:
        return self._get(bearer_token, f"/plans/{plan_id}")

    def search_my_plans(
        self,
        bearer_token: str,
        status: str | None = None,
        keyword: str | None = None,
        limit: int | None = None,
    ) -> list[dict[str, Any]]:
        params = {
            "name": keyword,
            "status": self._normalize_plan_status(status),
        }
        plans = self._get(bearer_token, "/plans", params)
        return self._limited(plans, limit)

    def get_plan_statistics(self, bearer_token: str) -> Any:
        return self._get(bearer_token, "/plans/statistics")

    def search_my_tasks(
        self,
        bearer_token: str,
        status: str | None = None,
        keyword: str | None = None,
        priority: str | None = None,
        plan_id: str | None = None,
        due_before: str | None = None,
        due_after: str | None = None,
        start_before: str | None = None,
        start_after: str | None = None,
        limit: int | None = None,
    ) -> list[dict[str, Any]]:
        needs_local_filter = any([plan_id, due_before, due_after, start_before, start_after])
        if needs_local_filter:
            tasks = self._get(bearer_token, "/tasks")
            tasks = self._filter_tasks(
                tasks,
                status=status,
                keyword=keyword,
                priority=priority,
                plan_id=plan_id,
                due_before=due_before,
                due_after=due_after,
                start_before=start_before,
                start_after=start_after,
            )
        else:
            tasks = self._get(
                bearer_token,
                "/tasks",
                {
                    "name": keyword,
                    "status": self._normalize_task_status(status),
                    "priority": self._normalize_priority(priority),
                },
            )
        return self._limited(tasks, limit)

    def get_task_statistics(self, bearer_token: str) -> Any:
        return self._get(bearer_token, "/tasks/statistics")

    def get_dashboard_summary(self, bearer_token: str) -> Any:
        return self._get(bearer_token, "/dashboard/summary")

    def get_today_tasks(self, bearer_token: str, limit: int | None = None) -> list[dict[str, Any]]:
        today = date.today().isoformat()
        tasks = self._filter_tasks(self._get(bearer_token, "/tasks"), due_before=today, due_after=today)
        return self._limited(tasks, limit)

    def get_overdue_tasks(self, bearer_token: str, limit: int | None = None) -> list[dict[str, Any]]:
        yesterday = (date.today() - timedelta(days=1)).isoformat()
        tasks = self._filter_tasks(self._get(bearer_token, "/tasks"), due_before=yesterday)
        tasks = [task for task in tasks if self._normalize_task_status(task.get("status")) != "COMPLETE"]
        return self._limited(tasks, limit)

    def get_upcoming_tasks(
        self,
        bearer_token: str,
        days: int | None = None,
        limit: int | None = None,
    ) -> list[dict[str, Any]]:
        bounded_days = max(1, min(int(days or 7), 30))
        today = date.today()
        end = today + timedelta(days=bounded_days)
        tasks = self._filter_tasks(
            self._get(bearer_token, "/tasks"),
            due_after=today.isoformat(),
            due_before=end.isoformat(),
        )
        tasks = [task for task in tasks if self._normalize_task_status(task.get("status")) != "COMPLETE"]
        return self._limited(tasks, limit)

    def summarize_my_work(
        self,
        bearer_token: str,
        from_date: str | None = None,
        to_date: str | None = None,
        group_by: str | None = None,
    ) -> list[dict[str, Any]] | dict[str, Any]:
        group = (group_by or "status").strip()

        if not from_date and not to_date and group == "dashboard":
            return self.get_dashboard_summary(bearer_token)

        if not from_date and not to_date and group == "status":
            return self.get_task_statistics(bearer_token)

        if not from_date and not to_date and group == "planStatus":
            return self.get_plan_statistics(bearer_token)

        if group == "plan":
            return self._summarize_tasks_by_plan(bearer_token, from_date, to_date)

        tasks = self._filter_tasks(self._get(bearer_token, "/tasks"), due_after=from_date, due_before=to_date)
        key = {
            "priority": "priority",
            "dueDate": "dueDate",
            "status": "status",
        }.get(group, "status")
        counts = Counter(task.get(key) or "UNKNOWN" for task in tasks)
        return [{"groupKey": group_key, "total": total} for group_key, total in counts.most_common()]

    def _summarize_tasks_by_plan(
        self,
        bearer_token: str,
        from_date: str | None,
        to_date: str | None,
    ) -> list[dict[str, Any]]:
        plans = self._get(bearer_token, "/plans")
        summary: list[dict[str, Any]] = []
        for plan in plans:
            tasks = self._filter_tasks(plan.get("tasks") or [], due_after=from_date, due_before=to_date)
            summary.append(
                {
                    "groupKey": plan.get("name") or plan.get("id") or "UNKNOWN",
                    "planId": plan.get("id"),
                    "total": len(tasks),
                }
            )
        return sorted(summary, key=lambda item: item["total"], reverse=True)

    def _get(
        self,
        bearer_token: str,
        path: str,
        params: dict[str, Any] | None = None,
    ) -> Any:
        response = httpx.get(
            f"{self.base_url}{path}",
            headers={"Authorization": f"Bearer {bearer_token}"},
            params={key: value for key, value in (params or {}).items() if value is not None},
            timeout=self.timeout,
        )
        response.raise_for_status()
        return self._normalize_response(response.json())

    def _normalize_response(self, payload: Any) -> Any:
        if not isinstance(payload, dict):
            return payload

        for key in ("result", "data", "content"):
            value = payload.get(key)
            if value is not None:
                return value

        return payload

    def _filter_tasks(
        self,
        tasks: list[dict[str, Any]],
        status: str | None = None,
        keyword: str | None = None,
        priority: str | None = None,
        plan_id: str | None = None,
        due_before: str | None = None,
        due_after: str | None = None,
        start_before: str | None = None,
        start_after: str | None = None,
    ) -> list[dict[str, Any]]:
        normalized_status = self._normalize_task_status(status)
        normalized_priority = self._normalize_priority(priority)
        keyword_lower = keyword.lower() if keyword else None

        result = []
        for task in tasks:
            if normalized_status and self._normalize_task_status(task.get("status")) != normalized_status:
                continue
            if normalized_priority and self._normalize_priority(task.get("priority")) != normalized_priority:
                continue
            if plan_id and task.get("planId") != plan_id:
                continue
            if keyword_lower and keyword_lower not in self._task_text(task):
                continue
            if not self._date_in_bounds(task.get("dueDate"), due_after, due_before):
                continue
            if not self._date_in_bounds(task.get("startDate"), start_after, start_before):
                continue
            result.append(task)

        return result

    def _task_text(self, task: dict[str, Any]) -> str:
        return " ".join(
            str(task.get(key) or "").lower()
            for key in ("name", "description", "status", "priority", "planId")
        )

    def _date_in_bounds(
        self,
        value: str | None,
        lower: str | None,
        upper: str | None,
    ) -> bool:
        current = self._parse_date(value)
        if current is None:
            return False if lower or upper else True

        lower_date = self._parse_date(lower)
        upper_date = self._parse_date(upper)
        if lower_date and current < lower_date:
            return False
        if upper_date and current > upper_date:
            return False
        return True

    def _parse_date(self, value: str | None) -> date | None:
        if not value:
            return None
        try:
            return date.fromisoformat(str(value)[:10])
        except ValueError:
            return None

    def _limited(self, rows: Any, limit: int | None) -> Any:
        if not isinstance(rows, list):
            return rows
        bounded_limit = max(1, min(int(limit or 10), 50))
        return rows[:bounded_limit]

    def _normalize_task_status(self, value: Any) -> str | None:
        if value is None:
            return None
        normalized = str(value).strip().upper().replace(" ", "_").replace("-", "_")
        return {
            "TO_DO": "TODO",
            "TODO": "TODO",
            "IN_PROGRESS": "IN_PROGRESS",
            "DOING": "IN_PROGRESS",
            "REVIEW": "REVIEW",
            "DONE": "COMPLETE",
            "COMPLETED": "COMPLETE",
            "COMPLETE": "COMPLETE",
        }.get(normalized)

    def _normalize_plan_status(self, value: Any) -> str | None:
        if value is None:
            return None
        normalized = str(value).strip().upper().replace(" ", "_").replace("-", "_")
        return {
            "DRAFT": "DRAFTING",
            "DRAFTING": "DRAFTING",
            "IN_REVIEW": "IN_REVIEW",
            "REVIEW": "IN_REVIEW",
            "DONE": "COMPLETED",
            "COMPLETE": "COMPLETED",
            "COMPLETED": "COMPLETED",
        }.get(normalized)

    def _normalize_priority(self, value: Any) -> str | None:
        if value is None:
            return None
        normalized = str(value).strip().upper().replace(" ", "_").replace("-", "_")
        return {
            "LOW": "LOW",
            "MEDIUM": "MEDIUM",
            "NORMAL": "MEDIUM",
            "HIGH": "HIGH",
            "URGENT": "URGENT",
        }.get(normalized)
