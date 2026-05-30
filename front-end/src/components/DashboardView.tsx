import React, { useState } from 'react';
import { CheckSquare, ChevronRight, Clock, LayoutDashboard, Pencil, Send, Sparkles, Square, Zap } from 'lucide-react';
import { AppState, Task } from '../types';

interface DashboardViewProps {
  appState: AppState;
  onUpdateTaskStatus: (taskId: string, status: Task['status']) => void;
  onNavigateToTab: (tabName: string) => void;
  onAskAI: (text: string) => void;
  onEditTask?: (task: Task) => void;
}

export default function DashboardView({
  appState,
  onUpdateTaskStatus,
  onNavigateToTab,
  onAskAI,
  onEditTask
}: DashboardViewProps) {
  const [quickInput, setQuickInput] = useState('');

  const isTaskForToday = (task: Task) => {
    if (!task.dueDate) return false;

    const parsed = new Date(task.dueDate);
    if (isNaN(parsed.getTime())) return false;

    const today = new Date();
    return parsed.getDate() === today.getDate() &&
      parsed.getMonth() === today.getMonth() &&
      parsed.getFullYear() === today.getFullYear();
  };

  const summary = appState.dashboardSummary;
  const todayTasks = appState.tasks.filter(isTaskForToday);
  const upcomingTasks = appState.tasks
    .filter(task => task.dueDate)
    .slice(0, 5);

  const handleQuickChatSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickInput.trim()) return;
    onAskAI(quickInput);
    setQuickInput('');
    onNavigateToTab('assistant');
  };

  return (
    <div className="space-y-6 animate-fade-in md:px-2">
      <header className="space-y-1.5">
        <h2 className="font-serif text-4xl text-ink leading-tight font-medium">
          Dashboard
        </h2>
        <p className="text-sm text-ink-muted leading-relaxed font-sans">
          Backend summary for <span className="font-medium">{new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}</span>.
        </p>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        {[
          ['Plans', summary?.totalPlans ?? appState.plans.length],
          ['Tasks', summary?.totalTasks ?? appState.tasks.length],
          ['Completed', summary?.completedTasks ?? appState.tasks.filter(t => t.status === 'Completed').length],
          ['Pending', summary?.pendingTasks ?? appState.tasks.filter(t => t.status === 'To Do').length],
          ['In Progress', summary?.inProgressTasks ?? appState.tasks.filter(t => t.status === 'In Progress').length]
        ].map(([label, value]) => (
          <section key={label} className="bg-canvas border border-border-hairline rounded-xl p-4 shadow-xs">
            <div className="flex items-center gap-2 text-primary">
              <LayoutDashboard size={15} />
              <span className="text-[10px] font-mono uppercase tracking-wider text-ink-muted">{label}</span>
            </div>
            <p className="font-serif text-3xl text-ink mt-2">{value}</p>
          </section>
        ))}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-8 items-start">
        <main className="xl:col-span-5 space-y-6">
          <section className="bg-canvas border border-border-hairline rounded-xl p-5 space-y-4 shadow-xs">
            <h3 className="font-serif text-lg font-medium text-ink pb-2 border-b border-border-hairline">
              Upcoming Tasks
            </h3>

            <div className="space-y-3.5">
              {upcomingTasks.length === 0 ? (
                <p className="text-xs text-ink-muted italic">No tasks available.</p>
              ) : upcomingTasks.map((task) => (
                <div
                  key={task.id}
                  onClick={() => onEditTask && onEditTask(task)}
                  className="flex items-center justify-between p-3 border border-border-hairline/80 hover:bg-surface-card rounded-lg transition-colors cursor-pointer"
                >
                  <div className="space-y-1">
                    <span className="text-[9px] font-mono tracking-wider opacity-60">
                      {task.status}
                    </span>
                    <h4 className="font-serif text-sm font-semibold text-ink leading-snug">
                      {task.title}
                    </h4>
                  </div>

                  <span className="block text-xs font-mono font-medium text-primary">
                    {task.dueDate || 'No due date'}
                  </span>
                </div>
              ))}
            </div>
          </section>
        </main>

        <section className="xl:col-span-4 bg-[#efe9de] border border-[#e6dfd8] rounded-xl p-5 space-y-5 shadow-sm">
          <header className="flex justify-between items-center pb-2 border-b border-[#e1d5c5]">
            <div className="flex items-center gap-2 text-primary">
              <Zap size={16} className="fill-current" />
              <h2 className="font-serif text-lg font-bold uppercase tracking-wider text-primary">Today</h2>
            </div>
            <span className="text-[10px] font-mono font-medium text-ink-muted bg-canvas px-2.5 py-1 rounded-full border border-border-hairline">
              {todayTasks.length} tasks
            </span>
          </header>

          <div className="space-y-4">
            {todayTasks.length === 0 ? (
              <div className="p-6 bg-canvas border border-border-hairline border-dashed rounded-lg text-center space-y-2">
                <p className="text-xs font-mono uppercase text-ink-muted tracking-widest">All Clear</p>
                <p className="text-sm font-serif text-ink italic leading-relaxed">No tasks scheduled for today.</p>
              </div>
            ) : (
              todayTasks.map((task) => {
                const isCompleted = task.status === 'Completed';
                return (
                  <div
                    key={task.id}
                    className={`p-4 bg-canvas border border-border-hairline rounded-lg space-y-3 transition-all hover:shadow-xs group ${isCompleted ? 'opacity-65' : ''}`}
                  >
                    <div className="flex items-start gap-3 justify-between">
                      <div className="flex items-start gap-2.5">
                        <button
                          type="button"
                          onClick={() => onUpdateTaskStatus(task.id, isCompleted ? 'To Do' : 'Completed')}
                          className="mt-0.5 text-primary hover:scale-105 transition-all text-ink hover:text-primary cursor-pointer"
                        >
                          {isCompleted ? (
                            <CheckSquare size={17} className="text-primary fill-primary/10" />
                          ) : (
                            <Square size={17} className="text-ink-muted" />
                          )}
                        </button>
                        <h3 className={`font-serif text-sm font-semibold leading-snug text-ink ${isCompleted ? 'line-through text-ink-muted' : ''}`}>
                          {task.title}
                        </h3>
                      </div>
                      {onEditTask && (
                        <button
                          type="button"
                          onClick={() => onEditTask(task)}
                          className="p-1.5 text-ink-muted hover:text-primary rounded-md hover:bg-surface-card transition-all cursor-pointer block"
                          title="Update Details"
                        >
                          <Pencil size={11} />
                        </button>
                      )}
                    </div>

                    <div className="flex items-center justify-between text-[11px] text-ink-muted font-mono bg-surface-card rounded-md p-2 border border-border-hairline/60">
                      <span>{task.status}</span>
                      <span className="flex items-center gap-1">
                        <Clock size={11} />
                        {task.dueDate}
                      </span>
                    </div>

                    {task.description && !isCompleted && (
                      <p className="text-xs text-ink-muted leading-relaxed font-sans pl-1 border-l border-primary/20 italic">
                        {task.description}
                      </p>
                    )}
                  </div>
                );
              })
            )}
          </div>

          <button
            onClick={() => onNavigateToTab('tasks')}
            className="w-full py-2.5 bg-canvas hover:bg-surface-emphasis border border-border-hairline rounded-lg text-xs font-semibold text-ink flex items-center justify-center gap-1 transition-all hover:text-primary cursor-pointer"
          >
            Manage All Tasks <ChevronRight size={14} />
          </button>
        </section>

        <section className="xl:col-span-3 bg-canvas border border-border-hairline rounded-xl p-5 space-y-5 shadow-sm">
          <header className="flex justify-between items-center pb-2 border-b border-border-hairline">
            <div className="flex items-center gap-1.5 text-primary">
              <Sparkles size={16} />
              <h3 className="font-serif text-base font-semibold">AI Assistant</h3>
            </div>
            <button
              type="button"
              onClick={() => onNavigateToTab('assistant')}
              className="text-[10px] font-mono font-bold text-primary hover:underline inline-flex items-center cursor-pointer"
            >
              Full Canvas
            </button>
          </header>

          <form onSubmit={handleQuickChatSubmit} className="space-y-3">
            <label className="block text-[10px] font-mono text-ink-muted uppercase tracking-wider font-semibold">
              Ask Assistant
            </label>
            <div className="relative">
              <input
                type="text"
                value={quickInput}
                onChange={(e) => setQuickInput(e.target.value)}
                placeholder="Ask about plans or tasks..."
                className="w-full px-3.5 py-2.5 bg-canvas border border-border-hairline rounded-lg text-xs text-ink placeholder:text-ink-muted/50 focus:outline-hidden focus:ring-2 focus:ring-primary/10 transition-all pr-8"
              />
              <button
                type="submit"
                className="absolute right-2 top-1/2 -translate-y-1/2 text-primary hover:text-primary-hover transition-colors cursor-pointer"
              >
                <Send size={13} />
              </button>
            </div>
          </form>
        </section>
      </div>
    </div>
  );
}
