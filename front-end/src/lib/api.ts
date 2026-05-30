import { AppState, ChatMessage, DashboardSummary, Plan, PlanStatus, Task, TaskPriority, TaskStatus } from '../types.js';

const TOKEN_STORAGE_KEY = 'accessToken';
const SESSION_STORAGE_KEY = 'userSession';

type ApiEnvelope<T> = {
  code?: string;
  message?: string;
  result?: T;
};

type UserSession = {
  id?: string;
  name: string;
  email: string;
};

type AuthenticationResponse = {
  token: string;
  authenticated: boolean;
};

type UserResponse = {
  id: string;
  name: string;
  email: string;
};

type BackendTask = {
  id: string;
  planId: string;
  name: string;
  description?: string | null;
  startDate?: string | null;
  dueDate?: string | null;
  status?: string | null;
  priority?: string | null;
};

type BackendPlan = {
  id: string;
  ownerUserId?: string;
  name: string;
  status?: string | null;
  note?: string | null;
  dueDate?: string | null;
};

const initialChat: ChatMessage = {
  id: 'c1',
  sender: 'assistant',
  text: 'Mình có thể hỗ trợ bạn kiểm tra plan, task, deadline và thống kê công việc trong Nexus.',
  timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
};

export function getAuthToken() {
  return localStorage.getItem(TOKEN_STORAGE_KEY);
}

export function setStoredSession(token: string, session: UserSession) {
  localStorage.setItem(TOKEN_STORAGE_KEY, token);
  localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(session));
}

export function getStoredSession(): UserSession | null {
  if (!getAuthToken()) return null;

  const raw = localStorage.getItem(SESSION_STORAGE_KEY);
  if (!raw) return null;

  try {
    return JSON.parse(raw) as UserSession;
  } catch {
    return null;
  }
}

export function clearStoredSession() {
  localStorage.removeItem(TOKEN_STORAGE_KEY);
  localStorage.removeItem(SESSION_STORAGE_KEY);
  localStorage.removeItem('token');
}

export async function apiRequest<T>(path: string, init: RequestInit = {}): Promise<T> {
  const headers = new Headers(init.headers);
  const token = getAuthToken();

  if (init.body && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }

  if (token) {
    headers.set('Authorization', token.startsWith('Bearer ') ? token : `Bearer ${token}`);
  }

  const response = await fetch(path, { ...init, headers });
  const contentType = response.headers.get('content-type') || '';
  const payload = contentType.includes('application/json') ? await response.json() : await response.text();

  if (!response.ok) {
    if (response.status === 401) clearStoredSession();
    const message = typeof payload === 'object'
      ? payload?.message || payload?.error || payload?.detail
      : payload;
    throw new Error(message || `Request failed with status ${response.status}`);
  }

  return payload as T;
}

function unwrap<T>(payload: T | ApiEnvelope<T>): T {
  if (payload && typeof payload === 'object' && 'result' in payload) {
    return (payload as ApiEnvelope<T>).result as T;
  }
  return payload as T;
}

function toBackendTaskStatus(status?: TaskStatus): string | undefined {
  if (!status) return undefined;
  return {
    'To Do': 'TODO',
    'In Progress': 'IN_PROGRESS',
    Review: 'REVIEW',
    Completed: 'COMPLETE'
  }[status];
}

function fromBackendTaskStatus(status?: string | null): TaskStatus {
  return ({
    TODO: 'To Do',
    IN_PROGRESS: 'In Progress',
    REVIEW: 'Review',
    COMPLETE: 'Completed'
  }[status || ''] || 'To Do') as TaskStatus;
}

function toBackendPlanStatus(status?: PlanStatus): string | undefined {
  if (!status) return undefined;
  return {
    Drafting: 'DRAFTING',
    'In Review': 'IN_REVIEW',
    Completed: 'COMPLETED'
  }[status];
}

function fromBackendPlanStatus(status?: string | null): PlanStatus {
  return ({
    DRAFTING: 'Drafting',
    IN_REVIEW: 'In Review',
    COMPLETED: 'Completed'
  }[status || ''] || 'Drafting') as PlanStatus;
}

function toBackendPriority(priority?: TaskPriority): string | undefined {
  return priority?.toUpperCase();
}

function fromBackendPriority(priority?: string | null): TaskPriority {
  return ({
    LOW: 'Low',
    MEDIUM: 'Medium',
    HIGH: 'High',
    URGENT: 'Urgent'
  }[priority || ''] || 'Medium') as TaskPriority;
}

function toUiTask(task: BackendTask): Task {
  return {
    id: task.id,
    title: task.name,
    description: task.description || '',
    startDate: task.startDate || undefined,
    dueDate: task.dueDate || '',
    status: fromBackendTaskStatus(task.status),
    priority: fromBackendPriority(task.priority),
    planId: task.planId
  };
}

function toUiPlan(plan: BackendPlan): Plan {
  return {
    id: plan.id,
    ownerUserId: plan.ownerUserId,
    title: plan.name,
    status: fromBackendPlanStatus(plan.status),
    note: plan.note || '',
    dueDate: plan.dueDate || undefined
  };
}

export async function loginUser(email: string, password: string): Promise<AuthenticationResponse> {
  const payload = await apiRequest<ApiEnvelope<AuthenticationResponse>>('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password })
  });

  return unwrap(payload);
}

export async function createUser(name: string, email: string, password: string): Promise<UserResponse> {
  const payload = await apiRequest<ApiEnvelope<UserResponse>>('/api/users', {
    method: 'POST',
    body: JSON.stringify({ name, email, password })
  });

  return unwrap(payload);
}

export async function fetchAppState(): Promise<AppState> {
  const [plans, tasks, dashboardSummary] = await Promise.all([
    apiRequest<BackendPlan[]>('/api/plans'),
    apiRequest<BackendTask[]>('/api/tasks'),
    apiRequest<DashboardSummary>('/api/dashboard/summary')
  ]);

  return {
    plans: plans.map(toUiPlan),
    tasks: tasks.map(toUiTask),
    chats: [initialChat],
    dashboardSummary
  };
}

export async function createTask(task: Partial<Task>): Promise<Task> {
  if (!task.planId) {
    throw new Error('Backend requires planId before creating a task');
  }

  const payload = await apiRequest<BackendTask>('/api/tasks', {
    method: 'POST',
    body: JSON.stringify({
      name: task.title,
      planId: task.planId,
      description: task.description,
      startDate: task.startDate,
      dueDate: task.dueDate,
      status: toBackendTaskStatus(task.status),
      priority: toBackendPriority(task.priority)
    })
  });

  return toUiTask(payload);
}

export async function updateTask(taskId: string, task: Partial<Task>): Promise<Task> {
  const payload = await apiRequest<BackendTask>(`/api/tasks/${taskId}`, {
    method: 'PUT',
    body: JSON.stringify({
      name: task.title,
      description: task.description,
      startDate: task.startDate,
      dueDate: task.dueDate,
      status: toBackendTaskStatus(task.status),
      priority: toBackendPriority(task.priority)
    })
  });

  return toUiTask(payload);
}

export async function deleteTask(taskId: string): Promise<void> {
  await apiRequest<string>(`/api/tasks/${taskId}`, { method: 'DELETE' });
}

export async function createPlan(plan: Partial<Plan>): Promise<Plan> {
  const payload = await apiRequest<BackendPlan>('/api/plans', {
    method: 'POST',
    body: JSON.stringify({
      name: plan.title,
      status: toBackendPlanStatus(plan.status),
      note: plan.note
    })
  });

  return toUiPlan(payload);
}

export async function updatePlan(planId: string, plan: Partial<Plan>): Promise<Plan> {
  const payload = await apiRequest<BackendPlan>(`/api/plans/${planId}`, {
    method: 'PUT',
    body: JSON.stringify({
      name: plan.title,
      status: toBackendPlanStatus(plan.status),
      note: plan.note
    })
  });

  return toUiPlan(payload);
}
