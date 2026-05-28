# Editorial Flow: Frontend API & Feature Specification

This document provides a detailed specification of the pages, features, data structures, and REST API endpoints in the Frontend UI to facilitate matching and integration with the Java backend.

---

## 1. Application Pages & Views

- **Landing & Auth Page (`/` / `/auth`)**: Welcome portal with premium styling. Provides simple mock authentication inputs for stakeholders.
- **Dashboard View (`/dashboard`)**: The primary command center displaying:
  - **Daily Focus**: List of high-priority tasks scheduled for today.
  - **Upcoming Deadlines**: Progress bar gauges of plan and task deadlines.
  - **AI Suggestion Panel**: Recommendations from the Gemini companion.
- **Creative Workspace (`/workspace`)**:
  - **Pipeline (Q4 Editorial Queue)**: Creation and update of Plans (Proposals) with state controls (Draft, Review, Complete).
  - **Roadmaps**: Overall progress of milestones and objective tracks.
- **Task Boards (`/tasks`)**: Kanban board columns (`To Do`, `In Progress`, `Review`, `Completed`) with inline task adding, status transitions, search filtering by category/text, and pinning/deletion options.
- **Calendar (`/calendar`)**: Real-time week and month grid displays. Spanning tasks stretch dynamically from `startDate` to `dueDate`.
- **AI Assistant Chat**: Interactive drawer sidebar allowing conversational drafting assistance and code output.

---

## 2. Frontend Data Models

To align the backend models, here are the exact TypeScript interfaces defined in the frontend:

### Task
```typescript
export interface Task {
  id: string;
  title: string;          // Maps to 'name' in Java Entity
  description?: string;
  startDate?: string;     // YYYY-MM-DD format (standard LocalDate parseable)
  dueDate: string;        // YYYY-MM-DD format (standard LocalDate parseable)
  status: 'To Do' | 'In Progress' | 'Review' | 'Completed';
  priority?: 'Urgent' | 'High' | 'Medium' | 'Low';
  category?: string;      // Optional internal category tag
  progress?: number;      // 0 to 100 percentage integer
  pinned?: boolean;       // Display pinned on dashboard focus
  planId?: string;        // Linked plan ID
  planType?: 'story' | 'roadmap';
  assignees?: {
    name: string;
    avatar: string;
  }[];
}
```

### ActiveStory (Plan)
```typescript
export interface ActiveStory {
  id: string;
  title: string;          // Maps to 'name' in Java Entity
  status: 'Drafting' | 'In Review' | 'Completed';
  dueDate: string;        // YYYY-MM-DD format (standard LocalDate parseable)
  note?: string;          // Maps to 'note' in Java Entity
  category?: string;      // Optional category fallback
  assigneeImages: string[]; // List of avatar image URLs
}
```

### RoadmapProject
```typescript
export interface RoadmapProject {
  id: string;
  title: string;
  type: string;           // E.g., "PRIMARY OBJECTIVE"
  status: string;         // E.g., "Active Exploration", "Paused"
  deadline: string;       // YYYY-MM-DD format
  progress: number;       // 0 to 100 percentage integer
  milestones: {
    id: string;
    title: string;
    completed: boolean;
  }[];
  lead?: string;
}
```

---

## 3. REST API Contract

The frontend makes the following HTTP calls to communicate state mutations and sync with the database. The backend must match these routes and request/response structures.

### State Retrieval
* **GET `/api/state`**
  - **Description**: Fetches the initial database payload containing all tasks, plans, roadmaps, and chat history.
  - **Response (JSON)**:
    ```json
    {
      "tasks": [ ... ],
      "stories": [ ... ],
      "releases": [ ... ],
      "roadmaps": [ ... ],
      "chats": [ ... ]
    }
    ```

### Tasks Operations
* **POST `/api/tasks`**
  - **Description**: Creates a new task.
  - **Request Body (JSON)**: `Partial<Task>` (e.g., `{ "title": "Revise script", "startDate": "2026-05-28", "dueDate": "2026-05-30", "status": "To Do", "priority": "Medium", "description": "Review tone" }`)
  - **Response (JSON)**: Fully instantiated `Task` object.

* **PUT `/api/tasks/:id`**
  - **Description**: Updates fields on a task.
  - **Request Body (JSON)**: `Partial<Task>` containing changes.
  - **Response (JSON)**: Updated `Task` object.

* **DELETE `/api/tasks/:id`**
  - **Description**: Deletes a task.
  - **Response**: Status `204 No Content` on success.

### Plans (Stories) Operations
* **POST `/api/stories`**
  - **Description**: Creates a new plan track.
  - **Request Body (JSON)**: `Partial<ActiveStory>` (e.g., `{ "title": "New Proposal", "status": "Drafting", "dueDate": "2026-06-15", "note": "Notes here" }`)
  - **Response (JSON)**: Fully instantiated `ActiveStory` object.

* **PUT `/api/stories/:id`**
  - **Description**: Updates plan parameters or toggles status state.
  - **Request Body (JSON)**: `Partial<ActiveStory>` containing changes.
  - **Response (JSON)**: Updated `ActiveStory` object.

### Roadmap Operations
* **PUT `/api/roadmaps/:id`**
  - **Description**: Toggles milestone completeness state or updates objective progress.
  - **Request Body (JSON)**: `Partial<RoadmapProject>` containing changes.
  - **Response (JSON)**: Updated `RoadmapProject` object.

### AI Assistant Chat
* **POST `/api/gemini/chat`**
  - **Description**: Sends a message to the AI Companion assistant.
  - **Request Body (JSON)**: `{ "message": "Analyze chapter pacing" }`
  - **Response (JSON)**: `{ "response": ChatMessage, "currentChats": ChatMessage[] }`

* **POST `/api/gemini/reset`**
  - **Description**: Resets assistant chat history.
  - **Response (JSON)**: `{ "chats": ChatMessage[] }`
