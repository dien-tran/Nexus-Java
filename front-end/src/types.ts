/**
 * Type declarations for Nexus Flow
 */

export interface Assignee {
  name: string;
  avatar: string;
}

export type TaskStatus = 'To Do' | 'In Progress' | 'Review' | 'Completed';

export interface Task {
  id: string;
  title: string;
  description?: string;
  startDate?: string;
  dueDate: string;
  status: TaskStatus;
  priority?: 'Urgent' | 'High' | 'Medium' | 'Low';
  category?: string;
  progress?: number; // e.g., 60 for 60%
  assignees?: Assignee[];
  pinned?: boolean;
  planId?: string;
  planType?: 'story' | 'roadmap';
}

export type StoryStatus = 'Drafting' | 'In Review' | 'Completed';

export interface ActiveStory {
  id: string;
  title: string;
  category?: string;
  dueDate: string;
  status: StoryStatus;
  assigneeImages: string[];
  note?: string;
}

export interface UpcomingRelease {
  id: string;
  title: string;
  category: string;
  status: 'PUBLISHED' | 'READY' | 'DRAFTING' | 'IN REVIEW';
  date: string;
}

export interface Milestone {
  id: string;
  title: string;
  completed: boolean;
}

export interface RoadmapProject {
  id: string;
  title: string;
  type: string; // e.g., "PRIMARY OBJECTIVE", "SECONDARY OBJECTIVE"
  status: string; // e.g., "Active Exploration", "Paused"
  deadline: string;
  progress: number;
  milestones: Milestone[];
  lead?: string;
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

export interface AppState {
  tasks: Task[];
  stories: ActiveStory[];
  releases: UpcomingRelease[];
  roadmaps: RoadmapProject[];
  chats: ChatMessage[];
}
