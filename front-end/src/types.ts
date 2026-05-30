/**
 * Type declarations for Nexus Flow frontend view models.
 * These mirror the current backend API surface: plans, tasks, dashboard summary, and chat.
 */

export type TaskStatus = 'To Do' | 'In Progress' | 'Review' | 'Completed';
export type TaskPriority = 'Urgent' | 'High' | 'Medium' | 'Low';

export interface Task {
  id: string;
  title: string;
  description?: string;
  startDate?: string;
  dueDate: string;
  status: TaskStatus;
  priority?: TaskPriority;
  planId?: string;
}

export type PlanStatus = 'Drafting' | 'In Review' | 'Completed';

export interface Plan {
  id: string;
  title: string;
  status: PlanStatus;
  note?: string;
  dueDate?: string;
  ownerUserId?: string;
}

export interface ChatMessage {
  id: string;
  sender: 'user' | 'assistant';
  text: string;
  timestamp: string;
  codeBlock?: {
    filename: string;
    language: string;
    code: string;
  };
}

export interface DashboardSummary {
  totalPlans: number;
  totalTasks: number;
  completedTasks: number;
  pendingTasks: number;
  inProgressTasks: number;
}

export interface AppState {
  tasks: Task[];
  plans: Plan[];
  chats: ChatMessage[];
  dashboardSummary?: DashboardSummary;
}
