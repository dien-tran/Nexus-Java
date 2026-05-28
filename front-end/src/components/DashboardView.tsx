import React, { useState } from 'react';
import { Clock, CheckSquare, Square, ChevronRight, Sparkles, Send, ArrowUpRight, Zap, RefreshCw, BarChart2, Pencil } from 'lucide-react';
import { Task, AppState } from '../types';

interface DashboardViewProps {
  appState: AppState;
  onUpdateTaskStatus: (taskId: string, status: Task['status']) => void;
  onAddTask: (taskData: Partial<Task>) => void;
  onNavigateToTab: (tabName: string) => void;
  onAskAI: (text: string) => void;
  onEditTask?: (task: Task) => void;
}

export default function DashboardView({
  appState,
  onUpdateTaskStatus,
  onAddTask,
  onNavigateToTab,
  onAskAI,
  onEditTask
}: DashboardViewProps) {
  const [quickInput, setQuickInput] = useState('');
  const [isSummarizing, setIsSummarizing] = useState(false);

  const isTaskForToday = (task: Task) => {
    if (!task.dueDate) return false;
    const normalized = task.dueDate.toLowerCase();
    
    // Explicit Today terms
    if (normalized.includes('today') || normalized.includes('hour') || normalized.includes('minute') || normalized.includes('mins') || normalized.includes('now')) {
      return true;
    }
    
    // Look up relative formatting format (e.g. May 27)
    const todayFormatted = new Date().toLocaleDateString('en-US', { month: 'short', day: '2-digit' }).toLowerCase();
    const todayFormattedAlternate = new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric' }).toLowerCase();
    if (normalized.includes(todayFormatted) || normalized.includes(todayFormattedAlternate)) {
      return true;
    }
    
    try {
      const d = new Date(task.dueDate);
      if (!isNaN(d.getTime())) {
        const today = new Date();
        return d.getDate() === today.getDate() &&
               d.getMonth() === today.getMonth() &&
               d.getFullYear() === today.getFullYear();
      }
    } catch (err) {}
    
    return false;
  };

  const todayTasks = appState.tasks.filter(isTaskForToday);
  const urgentTasksCount = appState.tasks.filter(t => t.priority === 'Urgent').length;

  const handleQuickChatSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickInput.trim()) return;
    onAskAI(quickInput);
    setQuickInput('');
    onNavigateToTab('assistant');
  };

  // Generate mock AI summary report based on current task list
  const getAISummary = () => {
    const toDoCount = appState.tasks.filter(t => t.status === 'To Do').length;
    const progressCount = appState.tasks.filter(t => t.status === 'In Progress').length;
    const reviewCount = appState.tasks.filter(t => t.status === 'Review').length;

    return `You have ${toDoCount + progressCount} active assignments. Under your current Editorial guidelines, ${urgentTasksCount > 0 ? `${urgentTasksCount} task(s) are urgent` : 'everything is progressing on schedule'}. Focus first on Chapter revisions.`;
  };

  // Weekly data points for our custom responsive SVG productivity chart
  const productivityData = [
    { day: 'Mon', words: 1200, cycles: 3 },
    { day: 'Tue', words: 1900, cycles: 5 },
    { day: 'Wed', words: 1400, cycles: 4 },
    { day: 'Thu', words: 2400, cycles: 6 },
    { day: 'Fri', words: 1800, cycles: 5 },
    { day: 'Sat', words: 800, cycles: 2 },
    { day: 'Sun', words: 2100, cycles: 5 }
  ];

  const maxVal = Math.max(...productivityData.map(d => d.words));

  return (
    <div className="space-y-6 animate-fade-in md:px-2">
      <header className="space-y-1.5">
        <h2 className="font-serif text-4xl text-ink leading-tight font-medium">
          Welcome back, <span className="italic text-[#8f482f] font-semibold">Julian</span>
        </h2>
        <p className="text-sm text-ink-muted leading-relaxed font-sans">
          Here is your overview for today, <span className="font-medium">{new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}</span>.
        </p>
      </header>

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-8 items-start">
        {/* LEFT COLUMN: OVERVIEW & WEEKLY METRIC (Welcome Back & Upcoming Deadlines) */}
        <main className="xl:col-span-5 space-y-6">
          {/* Weekly Productivity Custom Line Chart */}
          <section className="bg-canvas border border-border-hairline rounded-xl p-5 space-y-4 shadow-xs">
          <div className="flex justify-between items-center pb-2 border-b border-border-hairline">
            <h3 className="font-serif text-lg font-medium text-ink inline-flex items-center gap-1.5">
              <BarChart2 size={16} className="text-[#a25135]" />
              Weekly Productivity
            </h3>
            <span className="text-[10px] font-mono text-ink-muted uppercase">Word count cycles</span>
          </div>

          {/* SVG based chart wrapper */}
          <div className="relative w-full h-44 flex flex-col justify-between pt-2">
            <div className="absolute inset-0 flex flex-col justify-between pointer-events-none opacity-20">
              <div className="border-t border-ink-muted w-full h-px"></div>
              <div className="border-t border-ink-muted w-full h-px"></div>
              <div className="border-t border-ink-muted w-full h-px"></div>
              <div className="border-t border-ink-muted w-full h-px"></div>
            </div>

            {/* Custom SVG line */}
            <svg viewBox="0 0 100 35" className="w-full h-32 z-10 overflow-visible">
              <defs>
                <linearGradient id="chart-glow" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#8f482f" stopOpacity="0.3"/>
                  <stop offset="100%" stopColor="#8f482f" stopOpacity="0.0"/>
                </linearGradient>
              </defs>
              
              {/* Grid Path */}
              <path 
                d="M 5,28 L 20,20 L 35,25 L 50,14 L 65,22 L 80,31 L 95,17" 
                fill="none" 
                stroke="#8f482f" 
                strokeWidth="1.2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />

              {/* Gradient fill beneath */}
              <path
                d="M 5,28 L 20,20 L 35,25 L 50,14 L 65,22 L 80,31 L 95,17 L 95,35 L 5,35 Z"
                fill="url(#chart-glow)"
              />

              {/* Data points */}
              <circle cx="5" cy="28" r="1.3" className="fill-primary" />
              <circle cx="20" cy="20" r="1.3" className="fill-primary" />
              <circle cx="35" cy="25" r="1.3" className="fill-primary" />
              <circle cx="50" cy="14" r="1.3" className="fill-primary" />
              <circle cx="65" cy="22" r="1.3" className="fill-primary" />
              <circle cx="80" cy="31" r="1.3" className="fill-primary" />
              <circle cx="95" cy="17" r="1.3" className="fill-primary" />
            </svg>

            {/* X-Axis labels */}
            <div className="flex justify-between px-2 text-[10px] font-mono text-ink-muted pt-2">
              {productivityData.map((d, index) => (
                <div key={index} className="text-center w-8">
                  <div className="font-semibold text-ink">{d.words}w</div>
                  <div>{d.day}</div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Upcoming Publications/Deadlines list */}
        <section className="bg-canvas border border-border-hairline rounded-xl p-5 space-y-4 shadow-xs">
          <h3 className="font-serif text-lg font-medium text-ink pb-2 border-b border-border-hairline">
            Upcoming Deadlines
          </h3>

          <div className="space-y-3.5">
            {appState.tasks.slice(6, 9).map((deadTask) => (
              <div 
                key={deadTask.id}
                onClick={() => onNavigateToTab('workspace')}
                className="flex items-center justify-between p-3 border border-border-hairline/80 hover:bg-surface-card rounded-lg transition-colors cursor-pointer"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-1.5">
                    <span className="text-[9px] font-mono tracking-wider font-semibold uppercase bg-surface-emphasis px-1.5 py-0.5 rounded-sm">
                      {deadTask.category}
                    </span>
                    <span className="text-[9px] font-mono tracking-wider opacity-60">
                      {deadTask.status}
                    </span>
                  </div>
                  <h4 className="font-serif text-sm font-semibold text-ink leading-snug">
                    {deadTask.title}
                  </h4>
                </div>

                <div className="text-right space-y-1">
                  <span className="block text-xs font-mono font-medium text-primary">
                    {deadTask.dueDate}
                  </span>
                  <div className="flex justify-end -space-x-1 overflow-hidden">
                    {deadTask.assignees?.map((a, idx) => (
                      <img 
                        key={idx}
                        src={a.avatar} 
                        alt={a.name} 
                        referrerPolicy="no-referrer"
                        className="inline-block h-5 w-5 rounded-full ring-2 ring-canvas object-cover" 
                      />
                    )) || (
                      <span className="text-[10px] font-mono text-ink-muted">Unassigned</span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>
      </main>

      {/* CENTER COLUMN: DAILY FOCUS (Screenshot 1 LHS with TODAY'S TARGETS only) */}
      <section className="xl:col-span-4 bg-[#efe9de] border border-[#e6dfd8] rounded-xl p-5 space-y-5 shadow-sm">
        <header className="flex justify-between items-center pb-2 border-b border-[#e1d5c5]">
          <div className="flex items-center gap-2 text-primary">
            <Zap size={16} className="fill-current animate-pulse" />
            <h2 className="font-serif text-lg font-bold uppercase tracking-wider text-primary">Daily Focus</h2>
          </div>
          <span className="text-[10px] font-mono font-medium text-ink-muted bg-canvas px-2.5 py-1 rounded-full border border-border-hairline">
            TODAY'S TARGETS
          </span>
        </header>

        {/* Task lists checklist */}
        <div className="space-y-4">
          {todayTasks.length === 0 ? (
            <div className="p-6 bg-canvas border border-border-hairline border-dashed rounded-lg text-center space-y-2">
              <p className="text-xs font-mono uppercase text-ink-muted tracking-widest">All Clear</p>
              <p className="text-sm font-serif text-ink italic leading-relaxed">No tasks scheduled for today. Maintain focus and read or draft at your own pace.</p>
            </div>
          ) : (
            todayTasks.map((task) => {
              const isCompleted = task.status === 'Completed';
              return (
                <div 
                  key={task.id} 
                  className={`p-4 bg-canvas border border-border-hairline rounded-lg space-y-3 transition-all hover:shadow-xs group ${isCompleted ? 'opacity-65' : ''}`}
                >
                  {/* Header & Checkbox */}
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
                      <div>
                        <span className="text-[9px] font-bold font-mono tracking-wider text-primary uppercase mr-2 bg-primary/10 px-1.5 py-0.5 rounded-sm">
                          {task.category}
                        </span>
                        <h3 className={`font-serif text-sm font-semibold leading-snug mt-1 text-ink ${isCompleted ? 'line-through text-ink-muted' : ''}`}>
                          {task.title}
                        </h3>
                      </div>
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

                  {/* Status and due details */}
                  <div className="flex items-center justify-between text-[11px] text-ink-muted font-mono bg-surface-card rounded-md p-2 border border-border-hairline/60">
                    <span className="flex items-center gap-1.5 capitalize">
                      <span className={`w-1.5 h-1.5 rounded-full ${isCompleted ? 'bg-success bg-green-500' : task.status === 'In Progress' ? 'bg-[#e8a55a]' : 'bg-[#cc785c]'}`}></span>
                      {task.status}
                    </span>
                    <span className="flex items-center gap-1">
                      <Clock size={11} />
                      {task.dueDate}
                    </span>
                  </div>

                  {/* Description & priority */}
                  {task.description && !isCompleted && (
                    <p className="text-xs text-ink-muted leading-relaxed font-sans pl-1 border-l border-primary/20 italic">
                      {task.description}
                    </p>
                  )}

                  {/* Progress rendering */}
                  {task.status === 'In Progress' && task.progress !== undefined && (
                    <div className="space-y-1">
                      <div className="flex justify-between text-[10px] font-mono text-ink-muted">
                        <span>Refinement progress</span>
                        <span>{task.progress}%</span>
                      </div>
                      <div className="w-full bg-border-hairline h-1 rounded-full overflow-hidden">
                        <div className="bg-[#cc785c] h-full" style={{ width: `${task.progress}%` }}></div>
                      </div>
                    </div>
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

      {/* RIGHT COLUMN: AI SUITE (Screenshot 1 RHS Sidebar) */}
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
            Full Canvas &nearr;
          </button>
        </header>

        {/* AI summary container */}
        <div className="bg-surface-card border border-[#efe9de] rounded-lg p-4 space-y-3 relative overflow-hidden">
          <span className="text-[9px] font-mono uppercase text-ink-muted tracking-widest block">GENERATE INSIGHT</span>
          <p className="text-xs text-ink-muted leading-relaxed font-sans italic">
            "{getAISummary()}"
          </p>
          <div className="flex justify-between items-center pt-2 text-[10px] uppercase font-mono text-primary font-bold">
            <span className="inline-flex items-center gap-1"><Zap size={10} /> Editorial Engine v3.5</span>
            <button 
              type="button" 
              onClick={() => {
                setIsSummarizing(true);
                setTimeout(() => setIsSummarizing(false), 800);
              }}
              className="text-ink-muted hover:text-primary cursor-pointer"
            >
              <RefreshCw size={11} className={isSummarizing ? 'animate-spin' : ''} />
            </button>
          </div>
        </div>

        {/* Simple prompt input for micro chat */}
        <form onSubmit={handleQuickChatSubmit} className="space-y-3">
          <label className="block text-[10px] font-mono text-ink-muted uppercase tracking-wider font-semibold">
            Ask the Companion helper
          </label>
          <div className="relative">
            <input
              type="text"
              value={quickInput}
              onChange={(e) => setQuickInput(e.target.value)}
              placeholder="Suggest draft changes/pacing..."
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

        {/* Quick actions triggers */}
        <div className="space-y-2 pt-1 uppercase text-[10px] font-mono text-ink-muted">
          <span className="block font-semibold tracking-wider">Quick Actions</span>
          <button
            type="button"
            onClick={() => {
              onAskAI("Analyze pacing of the chapter");
              onNavigateToTab('assistant');
            }}
            className="w-full text-left p-2 border border-border-hairline/85 rounded-md hover:bg-surface-card hover:text-primary transition-all flex justify-between items-center cursor-pointer"
          >
            <span>Analyze Chapter Pacing</span>
            <span>&rarr;</span>
          </button>
          <button
            type="button"
            onClick={() => {
              onAskAI("Draft a python script for word frequencies");
              onNavigateToTab('assistant');
            }}
            className="w-full text-left p-2 border border-border-hairline/85 rounded-md hover:bg-surface-card hover:text-primary transition-all flex justify-between items-center cursor-pointer"
          >
            <span>Generate Work Analyzer Script</span>
            <span>&rarr;</span>
          </button>
        </div>
      </section>
      </div>
    </div>
  );
}
