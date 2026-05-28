import React, { useState, useEffect, lazy, Suspense } from 'react';
import {
  QueryClient,
  QueryClientProvider,
  useQuery,
  useMutation,
  useQueryClient
} from '@tanstack/react-query';
import { BrowserRouter, Routes, Route, Navigate, useNavigate, useLocation, useParams } from 'react-router-dom';
import {
  LayoutDashboard,
  BookOpen,
  CheckSquare,
  Calendar,
  Sparkles,
  Settings,
  HelpCircle,
  Menu,
  X,
  Bell,
  Search,
  Plus,
  LogOut,
  Compass,
  MapPin,
  Code
} from 'lucide-react';
import { Task, StoryStatus, ActiveStory, AppState, RoadmapProject } from './types.js';

// Setup React Query client with 10 minutes cache/stale times for outstanding speed efficiency
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      staleTime: 600000,
    },
  },
});

// Lazy load child components (as explicitly requested to optimize efficiency)
const DashboardView = lazy(() => import('./components/DashboardView.js'));
const WorkspaceView = lazy(() => import('./components/WorkspaceView.js'));
const TasksView = lazy(() => import('./components/TasksView.js'));
const AIAssistantView = lazy(() => import('./components/AIAssistantView.js'));
const PinnedView = lazy(() => import('./components/PinnedView.js'));
const LandingPage = lazy(() => import('./components/LandingPage.js'));
const AuthPages = lazy(() => import('./components/AuthPages.js'));
const CreateTaskModal = lazy(() => import('./components/CreateTaskModal.js'));
const EditDetailsModal = lazy(() => import('./components/EditDetailsModal.js'));
const PlanDetailsView = lazy(() => import('./components/PlanDetailsView.js'));
const CalendarView = lazy(() => import('./components/CalendarView.js'));

// Custom Loading Spinner
function LoadingSpinner() {
  return (
    <div className="flex flex-col items-center justify-center py-20 space-y-4">
      <div className="w-10 h-10 border-4 border-primary/20 border-t-primary rounded-full animate-spin"></div>
      <p className="text-xs font-mono text-ink-muted uppercase tracking-wider animate-pulse">Drafting Workspace...</p>
    </div>
  );
}

interface PlanDetailsRouteProps {
  dbState: AppState | undefined;
  onAddTask: (task: Partial<Task>) => void;
  onUpdateTaskStatus: (taskId: string, status: any) => void;
  onDeleteTask: (taskId: string) => void;
  onTogglePin: (taskId: string) => void;
  onEditTask: (task: Task) => void;
}

function PlanDetailsRoute({
  dbState,
  onAddTask,
  onUpdateTaskStatus,
  onDeleteTask,
  onTogglePin,
  onEditTask
}: PlanDetailsRouteProps) {
  const { type, id } = useParams<{ type: 'story' | 'roadmap'; id: string }>();
  const navigate = useNavigate();

  if (!dbState) return <LoadingSpinner />;

  const plan = type === 'story'
    ? dbState.stories.find(s => s.id === id)
    : dbState.roadmaps.find(r => r.id === id);

  if (!plan || !type) {
    return <Navigate to="/workspace" replace />;
  }

  return (
    <PlanDetailsView
      plan={plan}
      planType={type as 'story' | 'roadmap'}
      tasks={dbState.tasks}
      onBack={() => navigate('/workspace')}
      onAddTask={onAddTask}
      onUpdateTaskStatus={onUpdateTaskStatus}
      onDeleteTask={onDeleteTask}
      onTogglePin={onTogglePin}
      onEditTask={onEditTask}
    />
  );
}

function MainAppContent() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [userSession, setUserSession] = useState<{ name: string; email: string } | null>(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editModalType, setEditModalType] = useState<'task' | 'story' | 'roadmap'>('task');
  const [editModalData, setEditModalData] = useState<any>(null);
  const [notifications, setNotifications] = useState([
    { id: 1, text: "Review cycle completed for 'The Creator's Essay'", read: false }
  ]);
  const [showNotifications, setShowNotifications] = useState(false);

  const navigate = useNavigate();
  const location = useLocation();
  const queryClientInstance = useQueryClient();

  // Fetch current application state through React Query (Provides Caching)
  const { data: dbState, isLoading } = useQuery<AppState>({
    queryKey: ['dbState'],
    queryFn: async () => {
      const res = await fetch('/api/state');
      if (!res.ok) throw new Error("Failed to load server state");
      return res.json();
    }
  });

  // MUTATIONS (React Query server state mutations)
  const addTaskMutation = useMutation({
    mutationFn: async (taskData: Partial<Task>) => {
      const res = await fetch('/api/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(taskData)
      });
      return res.json();
    },
    onSuccess: () => {
      queryClientInstance.invalidateQueries({ queryKey: ['dbState'] });
    }
  });

  const updateTaskMutation = useMutation({
    mutationFn: async ({ taskId, body }: { taskId: string; body: Partial<Task> }) => {
      const res = await fetch(`/api/tasks/${taskId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });
      return res.json();
    },
    onSuccess: () => {
      queryClientInstance.invalidateQueries({ queryKey: ['dbState'] });
    }
  });

  const deleteTaskMutation = useMutation({
    mutationFn: async (taskId: string) => {
      await fetch(`/api/tasks/${taskId}`, { method: 'DELETE' });
    },
    onSuccess: () => {
      queryClientInstance.invalidateQueries({ queryKey: ['dbState'] });
    }
  });

  const addStoryMutation = useMutation({
    mutationFn: async (storyData: Partial<ActiveStory>) => {
      const res = await fetch('/api/stories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(storyData)
      });
      return res.json();
    },
    onSuccess: () => {
      queryClientInstance.invalidateQueries({ queryKey: ['dbState'] });
    }
  });

  const updateStoryMutation = useMutation({
    mutationFn: async ({ storyId, body }: { storyId: string; body: Partial<ActiveStory> }) => {
      const res = await fetch(`/api/stories/${storyId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });
      return res.json();
    },
    onSuccess: () => {
      queryClientInstance.invalidateQueries({ queryKey: ['dbState'] });
    }
  });

  const updateRoadmapMutation = useMutation({
    mutationFn: async ({ roadmapId, body }: { roadmapId: string; body: Partial<RoadmapProject> }) => {
      const res = await fetch(`/api/roadmaps/${roadmapId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });
      return res.json();
    },
    onSuccess: () => {
      queryClientInstance.invalidateQueries({ queryKey: ['dbState'] });
    }
  });

  const sendAIChatMutation = useMutation({
    mutationFn: async (text: string) => {
      const res = await fetch('/api/gemini/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: text })
      });
      return res.json();
    },
    onSuccess: () => {
      queryClientInstance.invalidateQueries({ queryKey: ['dbState'] });
    }
  });

  const clearAIChatsMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch('/api/gemini/reset', { method: 'POST' });
      return res.json();
    },
    onSuccess: () => {
      queryClientInstance.invalidateQueries({ queryKey: ['dbState'] });
    }
  });

  const triggerEditModal = (type: 'task' | 'story' | 'roadmap', data: any) => {
    setEditModalType(type);
    setEditModalData(data);
    setIsEditModalOpen(true);
  };

  const handleAuthSuccess = (name: string) => {
    setUserSession({
      name,
      email: `${name.toLowerCase()}@editorialflow.com`
    });
    navigate('/dashboard');
  };

  const handleSignOut = () => {
    setUserSession(null);
    navigate('/');
  };

  const handleNavigateToTab = (tabName: string) => {
    switch (tabName) {
      case 'dashboard':
        navigate('/dashboard');
        break;
      case 'workspace':
        navigate('/workspace');
        break;
      case 'tasks':
        navigate('/tasks');
        break;
      case 'assistant':
        navigate('/assistant');
        break;
      case 'pinned':
        navigate('/pinned');
        break;
      case 'landing':
        navigate('/');
        break;
      default:
        navigate('/' + tabName);
    }
  };

  const isAuthOrLanding = location.pathname === '/' || location.pathname === '/login' || location.pathname === '/register';

  useEffect(() => {
    if (!userSession && !isAuthOrLanding) {
      navigate('/', { replace: true });
    }
  }, [userSession, isAuthOrLanding, navigate]);

  useEffect(() => {
    if (userSession && isAuthOrLanding) {
      navigate('/dashboard', { replace: true });
    }
  }, [userSession, isAuthOrLanding, navigate]);

  if (isAuthOrLanding) {
    return (
      <Suspense fallback={<LoadingSpinner />}>
        <Routes>
          <Route path="/" element={
            <LandingPage
              onGetStarted={() => navigate('/register')}
              onSignIn={() => navigate('/login')}
            />
          } />
          <Route path="/login" element={
            <AuthPages
              initialIsSignIn={true}
              onSuccess={handleAuthSuccess}
              onBackToLanding={() => navigate('/')}
            />
          } />
          <Route path="/register" element={
            <AuthPages
              initialIsSignIn={false}
              onSuccess={handleAuthSuccess}
              onBackToLanding={() => navigate('/')}
            />
          } />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Suspense>
    );
  }

  if (!userSession) {
    return <LoadingSpinner />;
  }

  return (
    <div className="h-screen bg-canvas text-ink flex flex-col font-sans select-none selection:bg-primary/20 overflow-hidden">
      {/* Top Navbar Header */}
      <header className="bg-canvas border-b border-border-hairline px-6 py-4 flex items-center justify-between z-40 sticky top-0 shrink-0">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            className="p-1 text-ink-muted hover:text-ink md:hidden cursor-pointer"
          >
            <Menu size={20} />
          </button>
          <div
            onClick={() => navigate('/dashboard')}
            className="flex items-center gap-2 cursor-pointer text-primary"
          >
            <Compass size={22} className="stroke-[2.5px]" />
            <h1 className="font-serif text-2xl font-semibold tracking-tight">Nexus Flow</h1>
          </div>
        </div>

        {/* Top actions/Profile bar */}
        <div className="flex items-center gap-4 relative">
          {/* Quick Create Task Trigger */}
          <button
            onClick={() => setIsCreateModalOpen(true)}
            className="hidden sm:flex px-3.5 py-1.5 bg-[#efe9de] hover:bg-surface-emphasis border border-border-hairline rounded-lg text-xs font-semibold text-ink items-center gap-1 transition-all cursor-pointer"
          >
            <Plus size={13} /> Quick task
          </button>

          {/* Alarm Notification Bells indicator */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setShowNotifications(!showNotifications)}
              className="p-1.5 hover:bg-surface-card rounded-full text-ink-muted hover:text-ink transition-colors cursor-pointer relative"
            >
              <Bell size={18} />
              {notifications.some(n => !n.read) && (
                <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-primary rounded-full ring-2 ring-canvas animate-pulse"></span>
              )}
            </button>

            {/* Micro notifications board popup */}
            {showNotifications && (
              <div className="absolute right-0 mt-2.5 w-72 bg-canvas border border-border-hairline rounded-xl shadow-lg p-4 z-50 animate-in fade-in slide-in-from-top-1 duration-150">
                <div className="flex justify-between items-center pb-2 border-b border-border-hairline mb-2">
                  <span className="text-[10px] font-mono uppercase tracking-wider font-bold">Notifications</span>
                  {notifications.some(n => !n.read) && (
                    <button
                      onClick={() => setNotifications(notifications.map(n => ({ ...n, read: true })))}
                      className="text-[9px] font-semibold text-primary hover:underline cursor-pointer"
                    >
                      Mark all read
                    </button>
                  )}
                </div>
                {notifications.length === 0 ? (
                  <p className="text-center text-xs text-ink-muted italic py-4">No notifications yet</p>
                ) : (
                  <div className="space-y-2">
                    {notifications.map(n => (
                      <div key={n.id} className={`p-2.5 text-xs rounded-lg border ${n.read ? 'bg-canvas text-ink-muted border-transparent' : 'bg-surface-card text-ink border-border-hairline'}`}>
                        {n.text}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* User profile capsule */}
          <div className="flex items-center gap-2 border-l border-border-hairline pl-4">
            <img
              src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=80&fit=crop"
              alt="Profile"
              referrerPolicy="no-referrer"
              className="w-7 h-7 rounded-full object-cover"
            />
            <span className="hidden md:inline-block text-xs font-semibold text-ink">
              {userSession ? userSession.name : 'Julian'}
            </span>
          </div>
        </div>
      </header>

      {/* Main Structural platform layout */}
      <div className="flex flex-1 relative overflow-hidden">
        {/* SIDEBAR NAVIGATION (Screenshot 1 panel) */}
        <aside className={`fixed inset-y-0 left-0 bg-canvas border-r border-[#efe9de] w-64 p-5 flex flex-col z-50 transition-transform duration-300 md:static md:translate-x-0 md:h-full shrink-0 ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
          {/* Logo element for drawers only */}
          <div className="flex justify-between items-center pb-6 md:hidden">
            <span className="font-serif text-xl font-bold text-primary">Nexus Flow</span>
            <button
              onClick={() => setIsSidebarOpen(false)}
              className="p-1 text-ink-muted hover:text-ink cursor-pointer"
            >
              <X size={18} />
            </button>
          </div>

          {/* Nav Items buttons list */}
          <nav className="flex-1 space-y-2">
            <span className="block text-[10px] font-mono text-ink-muted uppercase tracking-wider font-bold mb-4">Workspace Index</span>

            <button
              onClick={() => { navigate('/dashboard'); setIsSidebarOpen(false); }}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${location.pathname.startsWith('/dashboard') ? 'bg-[#efe9de] text-[#8f482f] font-bold' : 'text-ink-muted hover:bg-surface-card hover:text-ink'}`}
            >
              <LayoutDashboard size={15} /> Focus Dashboard
            </button>

            <button
              onClick={() => { navigate('/workspace'); setIsSidebarOpen(false); }}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${location.pathname.startsWith('/workspace') ? 'bg-[#efe9de] text-[#8f482f] font-bold' : 'text-ink-muted hover:bg-surface-card hover:text-ink'}`}
            >
              <BookOpen size={15} /> Workspace
            </button>

            <button
              onClick={() => { navigate('/tasks'); setIsSidebarOpen(false); }}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${location.pathname.startsWith('/tasks') ? 'bg-[#efe9de] text-[#8f482f] font-bold' : 'text-ink-muted hover:bg-surface-card hover:text-ink'}`}
            >
              <CheckSquare size={15} /> Task Boards
            </button>

            <button
              onClick={() => { navigate('/calendar'); setIsSidebarOpen(false); }}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${location.pathname.startsWith('/calendar') ? 'bg-[#efe9de] text-[#8f482f] font-bold' : 'text-ink-muted hover:bg-surface-card hover:text-ink'}`}
            >
              <Calendar size={15} /> Calendar
            </button>

            <button
              onClick={() => { navigate('/assistant'); setIsSidebarOpen(false); }}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${location.pathname.startsWith('/assistant') ? 'bg-[#efe9de] text-[#8f482f] font-bold' : 'text-ink-muted hover:bg-surface-card hover:text-ink'}`}
            >
              <Sparkles size={15} /> AI Assistant
            </button>

            <button
              onClick={() => { navigate('/pinned'); setIsSidebarOpen(false); }}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${location.pathname.startsWith('/pinned') ? 'bg-[#efe9de] text-[#8f482f] font-bold' : 'text-ink-muted hover:bg-surface-card hover:text-ink'}`}
            >
              <Compass size={15} /> Atmosphere
            </button>
          </nav>

          {/* Footer panel items inside sidebar */}
          <div className="pt-4 border-t border-border-hairline space-y-2 font-semibold text-xs text-ink-muted">
            <button
              onClick={() => { navigate('/dashboard'); alert('General workspace settings adjusted successfully.'); }}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-surface-card hover:text-ink cursor-pointer text-left"
            >
              <Settings size={15} /> System Preferences
            </button>

            <button
              onClick={() => alert('For any assistance or guides, reach support at support@editorialflow.com')}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-surface-card hover:text-ink cursor-pointer text-left"
            >
              <HelpCircle size={15} /> Documentation & Help
            </button>

            <button
              type="button"
              onClick={handleSignOut}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-red-500 hover:bg-red-50 hover:text-red-700 transition-colors cursor-pointer text-left font-semibold active:scale-98"
            >
              <LogOut size={15} /> Sign Out
            </button>
          </div>
        </aside>

        {/* Core application body contents */}
        <div className="flex-grow p-6 md:p-8 max-w-7xl mx-auto w-full overflow-y-auto h-full">
          <Suspense fallback={<LoadingSpinner />}>
            {isLoading || !dbState ? (
              <LoadingSpinner />
            ) : (
              <Routes>
                <Route path="/dashboard" element={
                  <DashboardView
                    appState={dbState}
                    onUpdateTaskStatus={(taskId, status) => updateTaskMutation.mutate({ taskId, body: { status } })}
                    onAddTask={(task) => addTaskMutation.mutate(task)}
                    onNavigateToTab={handleNavigateToTab}
                    onAskAI={(text) => sendAIChatMutation.mutate(text)}
                    onEditTask={(task) => triggerEditModal('task', task)}
                  />
                } />
                <Route path="/workspace" element={
                  <WorkspaceView
                    stories={dbState.stories}
                    roadmaps={dbState.roadmaps}
                    onAddStory={(story) => addStoryMutation.mutate(story)}
                    onUpdateStoryStatus={(storyId, status) => updateStoryMutation.mutate({ storyId, body: { status } })}
                    onToggleMilestone={(projId, milestoneId) => {
                      // Iterate and invert specific milestone complete flag
                      const project = dbState.roadmaps.find(p => p.id === projId);
                      if (project) {
                        const updatedMilestones = project.milestones.map(m =>
                          m.id === milestoneId ? { ...m, completed: !m.completed } : m
                        );
                        const completedCount = updatedMilestones.filter(m => m.completed).length;
                        const newProgress = Math.round((completedCount / updatedMilestones.length) * 100);

                        // Call standard mutation on state
                        queryClientInstance.setQueryData(['dbState'], (old: AppState | undefined) => {
                          if (!old) return old;
                          return {
                            ...old,
                            roadmaps: old.roadmaps.map(r => r.id === projId ? {
                              ...r,
                              milestones: updatedMilestones,
                              progress: newProgress
                            } : r)
                          };
                        });
                      }
                    }}
                    onResumeProject={(projId) => {
                      queryClientInstance.setQueryData(['dbState'], (old: AppState | undefined) => {
                        if (!old) return old;
                        return {
                          ...old,
                          roadmaps: old.roadmaps.map(r => r.id === projId ? {
                            ...r,
                            status: 'Active Exploration'
                          } : r)
                        };
                      });
                    }}
                    onEditStory={(story) => triggerEditModal('story', story)}
                    onEditRoadmap={(project) => triggerEditModal('roadmap', project)}
                    onSelectStory={(story) => navigate(`/workspace/story/${story.id}`)}
                    onSelectRoadmap={(project) => navigate(`/workspace/roadmap/${project.id}`)}
                  />
                } />
                <Route path="/workspace/:type/:id" element={
                  <PlanDetailsRoute
                    dbState={dbState}
                    onAddTask={(task) => addTaskMutation.mutate(task)}
                    onUpdateTaskStatus={(taskId, status) => updateTaskMutation.mutate({ taskId, body: { status } })}
                    onDeleteTask={(taskId) => deleteTaskMutation.mutate(taskId)}
                    onTogglePin={(taskId) => {
                      const taskObj = dbState.tasks.find(t => t.id === taskId);
                      if (taskObj) {
                        updateTaskMutation.mutate({ taskId, body: { pinned: !taskObj.pinned } });
                      }
                    }}
                    onEditTask={(task) => triggerEditModal('task', task)}
                  />
                } />
                <Route path="/tasks" element={
                  <TasksView
                    tasks={dbState.tasks}
                    onAddTask={(task) => addTaskMutation.mutate(task)}
                    onUpdateTaskStatus={(taskId, status) => updateTaskMutation.mutate({ taskId, body: { status } })}
                    onDeleteTask={(taskId) => deleteTaskMutation.mutate(taskId)}
                    onTogglePin={(taskId) => {
                      const taskObj = dbState.tasks.find(t => t.id === taskId);
                      if (taskObj) {
                        updateTaskMutation.mutate({ taskId, body: { pinned: !taskObj.pinned } });
                      }
                    }}
                    onOpenCreateModal={() => setIsCreateModalOpen(true)}
                    onEditTask={(task) => triggerEditModal('task', task)}
                  />
                } />
                <Route path="/calendar" element={
                  <CalendarView
                    appState={dbState}
                    onUpdateTaskStatus={(taskId, status) => updateTaskMutation.mutate({ taskId, body: { status } })}
                    onAddTask={(task) => addTaskMutation.mutate(task)}
                    onNavigateToTab={handleNavigateToTab}
                    onEditTask={(task) => triggerEditModal('task', task)}
                  />
                } />
                <Route path="/assistant" element={
                  <AIAssistantView
                    chats={dbState.chats}
                    onSendMessage={(msg) => sendAIChatMutation.mutate(msg)}
                    onClearChats={() => clearAIChatsMutation.mutate()}
                    isSending={sendAIChatMutation.isPending}
                  />
                } />
                <Route path="/pinned" element={<PinnedView />} />
                <Route path="*" element={<Navigate to="/dashboard" replace />} />
              </Routes>
            )}
          </Suspense>
        </div>
      </div>

      {/* Dynamic Modal Creation (Screenshot 7) */}
      <Suspense fallback={null}>
        <CreateTaskModal
          isOpen={isCreateModalOpen}
          onClose={() => setIsCreateModalOpen(false)}
          onSubmit={(taskData) => {
            addTaskMutation.mutate({
              ...taskData,
              pinned: true,
              assignees: [
                { name: userSession ? userSession.name : 'Julian', avatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=80&fit=crop" }
              ]
            });
            alert('A dynamic new task has been created and synced with the database.');
          }}
        />

        <EditDetailsModal
          isOpen={isEditModalOpen}
          editType={editModalType}
          data={editModalData}
          onClose={() => {
            setIsEditModalOpen(false);
            setEditModalData(null);
          }}
          onSave={(updatedData) => {
            if (editModalType === 'task') {
              updateTaskMutation.mutate({ taskId: updatedData.id, body: updatedData });
              alert('Task details updated and saved successfully.');
            } else if (editModalType === 'story') {
              updateStoryMutation.mutate({ storyId: updatedData.id, body: updatedData });
              alert('Creative Story proposal updated and saved successfully.');
            } else if (editModalType === 'roadmap') {
              updateRoadmapMutation.mutate({ roadmapId: updatedData.id, body: updatedData });
              alert('Roadmap Objective plan updated and saved successfully.');
            }
          }}
        />
      </Suspense>
    </div>
  );
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <MainAppContent />
      </BrowserRouter>
    </QueryClientProvider>
  );
}
