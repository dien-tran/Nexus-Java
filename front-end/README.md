# Nexus Flow Frontend

The frontend is aligned with the current backend API surface:

- Auth: `/api/auth/login`, `/api/users`
- Plans: `/api/plans`
- Tasks: `/api/tasks`
- Dashboard: `/api/dashboard/summary`
- Chatbot proxy: `/api/chatbot`

The UI intentionally models only backend-backed concepts: plans, tasks, dashboard summary, and chat. Legacy-only concepts such as roadmaps, releases, pinned tasks, assignees, task categories, frontend progress fields, and plan types have been removed from the active UI.

## Pages

- `/dashboard`: backend summary, upcoming tasks, today's tasks, AI shortcut.
- `/workspace`: plan list, create plan, update plan status, open plan tasks.
- `/workspace/plan/:id`: tasks linked to one backend plan by `planId`.
- `/tasks`: read-only board-style task management with status transitions, edit, delete.
- `/calendar`: task date visualization using `startDate` and `dueDate`.
- `/assistant`: chat UI through `/api/chatbot`.

## Frontend Models

`Task.title` maps to backend `TaskResponse.name`.

```ts
export interface Task {
  id: string;
  title: string;
  description?: string;
  startDate?: string;
  dueDate: string;
  status: 'To Do' | 'In Progress' | 'Review' | 'Completed';
  priority?: 'Urgent' | 'High' | 'Medium' | 'Low';
  planId?: string;
}
```

`Plan.title` maps to backend `PlanResponse.name`.

```ts
export interface Plan {
  id: string;
  title: string;
  status: 'Drafting' | 'In Review' | 'Completed';
  note?: string;
  dueDate?: string;
  ownerUserId?: string;
}
```
