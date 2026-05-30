import React, { lazy, Suspense, useEffect, useState } from 'react';
import {
  QueryClient,
  QueryClientProvider,
  useMutation,
  useQuery,
  useQueryClient
} from '@tanstack/react-query';
import { BrowserRouter, Navigate, Route, Routes, useLocation, useNavigate, useParams } from 'react-router-dom';
import {
  Bell,
  BookOpen,
  Calendar,
  CheckSquare,
  Compass,
  HelpCircle,
  LayoutDashboard,
  LogOut,
  Menu,
  Settings,
  Sparkles,
  X
} from 'lucide-react';
import { AppState, ChatMessage, Plan, Task } from './types.js';
import {
  apiRequest,
  clearStoredSession,
  createPlan,
  createTask,
  deleteTask as deleteTaskRequest,
  fetchAppState,
  getStoredSession,
  updatePlan,
  updateTask
} from './lib/api.js';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      staleTime: 600000
    }
  }
});

const DashboardView = lazy(() => import('./components/DashboardView.js'));
const WorkspaceView = lazy(() => import('./components/WorkspaceView.js'));
const TasksView = lazy(() => import('./components/TasksView.js'));
const AIAssistantView = lazy(() => import('./components/AIAssistantView.js'));
const LandingPage = lazy(() => import('./components/LandingPage.js'));
const AuthPages = lazy(() => import('./components/AuthPages.js'));
const EditDetailsModal = lazy(() => import('./components/EditDetailsModal.js'));
const PlanDetailsView = lazy(() => import('./components/PlanDetailsView.js'));
const CalendarView = lazy(() => import('./components/CalendarView.js'));

function LoadingSpinner() {
  return (
    <div className="flex flex-col items-center justify-center py-20 space-y-4">
      <div className="w-10 h-10 border-4 border-primary/20 border-t-primary rounded-full animate-spin"></div>
      <p className="text-xs font-mono text-ink-muted uppercase tracking-wider animate-pulse">Loading Workspace...</p>
    </div>
  );
}

interface PlanDetailsRouteProps {
  dbState: AppState | undefined;
  onAddTask: (task: Partial<Task>) => void;
  onUpdateTaskStatus: (taskId: string, status: Task['status']) => void;
  onDeleteTask: (taskId: string) => void;
  onEditTask: (task: Task) => void;
}

function PlanDetailsRoute({
  dbState,
  onAddTask,
  onUpdateTaskStatus,
  onDeleteTask,
  onEditTask
}: PlanDetailsRouteProps) {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  if (!dbState) return <LoadingSpinner />;

  const plan = dbState.plans.find(p => p.id === id);

  if (!plan) {
    return <Navigate to="/workspace" replace />;
  }

  return (
    <PlanDetailsView
      plan={plan}
      tasks={dbState.tasks}
      onBack={() => navigate('/workspace')}
      onAddTask={onAddTask}
      onUpdateTaskStatus={onUpdateTaskStatus}
      onDeleteTask={onDeleteTask}
      onEditTask={onEditTask}
    />
  );
}

function MainAppContent() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [userSession, setUserSession] = useState<{ id?: string; name: string; email: string } | null>(() => getStoredSession());
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editModalType, setEditModalType] = useState<'task' | 'plan'>('task');
  const [editModalData, setEditModalData] = useState<Task | Plan | null>(null);
  const [notifications, setNotifications] = useState([
    { id: 1, text: 'Backend integration is using plans and tasks only.', read: false }
  ]);
  const [showNotifications, setShowNotifications] = useState(false);

  const navigate = useNavigate();
  const location = useLocation();
  const queryClientInstance = useQueryClient();

  const { data: dbState, isLoading } = useQuery<AppState>({
    queryKey: ['dbState'],
    queryFn: fetchAppState,
    enabled: !!userSession
  });

  const addTaskMutation = useMutation({
    mutationFn: async (taskData: Partial<Task>) => createTask(taskData),
    onSuccess: () => queryClientInstance.invalidateQueries({ queryKey: ['dbState'] })
  });

  const updateTaskMutation = useMutation({
    mutationFn: async ({ taskId, body }: { taskId: string; body: Partial<Task> }) => {
      const currentTask = dbState?.tasks.find(t => t.id === taskId);
      return updateTask(taskId, { ...currentTask, ...body });
    },
    onSuccess: () => queryClientInstance.invalidateQueries({ queryKey: ['dbState'] })
  });

  const deleteTaskMutation = useMutation({
    mutationFn: async (taskId: string) => deleteTaskRequest(taskId),
    onSuccess: () => queryClientInstance.invalidateQueries({ queryKey: ['dbState'] })
  });

  const addPlanMutation = useMutation({
    mutationFn: async (planData: Partial<Plan>) => createPlan(planData),
    onSuccess: () => queryClientInstance.invalidateQueries({ queryKey: ['dbState'] })
  });

  const updatePlanMutation = useMutation({
    mutationFn: async ({ planId, body }: { planId: string; body: Partial<Plan> }) => {
      const currentPlan = dbState?.plans.find(p => p.id === planId);
      return updatePlan(planId, { ...currentPlan, ...body });
    },
    onSuccess: () => queryClientInstance.invalidateQueries({ queryKey: ['dbState'] })
  });

  const sendAIChatMutation = useMutation({
    mutationFn: async (text: string) => {
      return apiRequest<{ reply: string; selectedAgent: string; traceId: string; tool?: string | null }>('/api/chatbot/message', {
        method: 'POST',
        body: JSON.stringify({ message: text })
      });
    },
    onMutate: async (text) => {
      const userMsg: ChatMessage = {
        id: `msg_${Date.now()}_u`,
        sender: 'user',
        text,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };

      queryClientInstance.setQueryData(['dbState'], (old: AppState | undefined) => {
        if (!old) return old;
        return { ...old, chats: [...old.chats, userMsg] };
      });
    },
    onSuccess: (payload) => {
      const assistantMsg: ChatMessage = {
        id: `msg_${Date.now()}_a`,
        sender: 'assistant',
        text: payload.reply,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };

      queryClientInstance.setQueryData(['dbState'], (old: AppState | undefined) => {
        if (!old) return old;
        return { ...old, chats: [...old.chats, assistantMsg] };
      });
    },
    onError: (error) => {
      const assistantMsg: ChatMessage = {
        id: `msg_${Date.now()}_e`,
        sender: 'assistant',
        text: error instanceof Error ? error.message : 'AI Assistant request failed',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };

      queryClientInstance.setQueryData(['dbState'], (old: AppState | undefined) => {
        if (!old) return old;
        return { ...old, chats: [...old.chats, assistantMsg] };
      });
    }
  });

  const clearAIChatsMutation = useMutation({
    mutationFn: async () => {
      return {
        chats: [
          {
            id: 'c1',
            sender: 'assistant' as const,
            text: 'Mình có thể hỗ trợ bạn kiểm tra plan, task, deadline và thống kê công việc trong Nexus.',
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
          }
        ]
      };
    },
    onSuccess: (payload) => {
      queryClientInstance.setQueryData(['dbState'], (old: AppState | undefined) => {
        if (!old) return old;
        return { ...old, chats: payload.chats };
      });
    }
  });

  const triggerEditModal = (type: 'task' | 'plan', data: Task | Plan) => {
    setEditModalType(type);
    setEditModalData(data);
    setIsEditModalOpen(true);
  };

  const handleAuthSuccess = (session: { id?: string; name: string; email: string }) => {
    setUserSession(session);
    queryClientInstance.invalidateQueries({ queryKey: ['dbState'] });
    navigate('/dashboard');
  };

  const handleSignOut = () => {
    clearStoredSession();
    queryClientInstance.clear();
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

        <div className="flex items-center gap-4 relative">
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
                {notifications.map(n => (
                  <div key={n.id} className={`p-2.5 text-xs rounded-lg border ${n.read ? 'bg-canvas text-ink-muted border-transparent' : 'bg-surface-card text-ink border-border-hairline'}`}>
                    {n.text}
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="flex items-center gap-2 border-l border-border-hairline pl-4">
            <img
              src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=80&fit=crop"
              alt="Profile"
              referrerPolicy="no-referrer"
              className="w-7 h-7 rounded-full object-cover"
            />
            <span className="hidden md:inline-block text-xs font-semibold text-ink">
              {userSession.name}
            </span>
          </div>
        </div>
      </header>

      <div className="flex flex-1 relative overflow-hidden">
        <aside className={`fixed inset-y-0 left-0 bg-canvas border-r border-[#efe9de] w-64 p-5 flex flex-col z-50 transition-transform duration-300 md:static md:translate-x-0 md:h-full shrink-0 ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
          <div className="flex justify-between items-center pb-6 md:hidden">
            <span className="font-serif text-xl font-bold text-primary">Nexus Flow</span>
            <button
              onClick={() => setIsSidebarOpen(false)}
              className="p-1 text-ink-muted hover:text-ink cursor-pointer"
            >
              <X size={18} />
            </button>
          </div>

          <nav className="flex-1 space-y-2">
            <span className="block text-[10px] font-mono text-ink-muted uppercase tracking-wider font-bold mb-4">Workspace Index</span>

            <button
              onClick={() => { navigate('/dashboard'); setIsSidebarOpen(false); }}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${location.pathname.startsWith('/dashboard') ? 'bg-[#efe9de] text-[#8f482f] font-bold' : 'text-ink-muted hover:bg-surface-card hover:text-ink'}`}
            >
              <LayoutDashboard size={15} /> Dashboard
            </button>

            <button
              onClick={() => { navigate('/workspace'); setIsSidebarOpen(false); }}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${location.pathname.startsWith('/workspace') ? 'bg-[#efe9de] text-[#8f482f] font-bold' : 'text-ink-muted hover:bg-surface-card hover:text-ink'}`}
            >
              <BookOpen size={15} /> Plans
            </button>

            <button
              onClick={() => { navigate('/tasks'); setIsSidebarOpen(false); }}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${location.pathname.startsWith('/tasks') ? 'bg-[#efe9de] text-[#8f482f] font-bold' : 'text-ink-muted hover:bg-surface-card hover:text-ink'}`}
            >
              <CheckSquare size={15} /> Tasks
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
          </nav>

          <div className="pt-4 border-t border-border-hairline space-y-2 font-semibold text-xs text-ink-muted">
            <button
              onClick={() => { navigate('/dashboard'); alert('Settings are not implemented yet.'); }}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-surface-card hover:text-ink cursor-pointer text-left"
            >
              <Settings size={15} /> Settings
            </button>

            <button
              onClick={() => alert('For assistance, reach support@nexus.local')}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-surface-card hover:text-ink cursor-pointer text-left"
            >
              <HelpCircle size={15} /> Help
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
                    onNavigateToTab={handleNavigateToTab}
                    onAskAI={(text) => sendAIChatMutation.mutate(text)}
                    onEditTask={(task) => triggerEditModal('task', task)}
                  />
                } />
                <Route path="/workspace" element={
                  <WorkspaceView
                    plans={dbState.plans}
                    onAddPlan={(plan) => addPlanMutation.mutate(plan)}
                    onUpdatePlanStatus={(planId, status) => updatePlanMutation.mutate({ planId, body: { status } })}
                    onEditPlan={(plan) => triggerEditModal('plan', plan)}
                    onSelectPlan={(plan) => navigate(`/workspace/plan/${plan.id}`)}
                  />
                } />
                <Route path="/workspace/plan/:id" element={
                  <PlanDetailsRoute
                    dbState={dbState}
                    onAddTask={(task) => addTaskMutation.mutate(task)}
                    onUpdateTaskStatus={(taskId, status) => updateTaskMutation.mutate({ taskId, body: { status } })}
                    onDeleteTask={(taskId) => deleteTaskMutation.mutate(taskId)}
                    onEditTask={(task) => triggerEditModal('task', task)}
                  />
                } />
                <Route path="/tasks" element={
                  <TasksView
                    tasks={dbState.tasks}
                    onUpdateTaskStatus={(taskId, status) => updateTaskMutation.mutate({ taskId, body: { status } })}
                    onDeleteTask={(taskId) => deleteTaskMutation.mutate(taskId)}
                    onEditTask={(task) => triggerEditModal('task', task)}
                  />
                } />
                <Route path="/calendar" element={
                  <CalendarView
                    appState={dbState}
                    onUpdateTaskStatus={(taskId, status) => updateTaskMutation.mutate({ taskId, body: { status } })}
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
                <Route path="*" element={<Navigate to="/dashboard" replace />} />
              </Routes>
            )}
          </Suspense>
        </div>
      </div>

      <Suspense fallback={null}>
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
            } else {
              updatePlanMutation.mutate({ planId: updatedData.id, body: updatedData });
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
