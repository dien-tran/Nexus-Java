import React, { useState } from 'react';
import { ArrowLeft, Calendar, Circle, CheckSquare, Square, Plus, Trash2, Pin, PinOff, Tag, Clipboard, Layers, Check, X } from 'lucide-react';
import { Task, ActiveStory, RoadmapProject, TaskStatus } from '../types';

interface PlanDetailsViewProps {
  plan: ActiveStory | RoadmapProject;
  planType: 'story' | 'roadmap';
  tasks: Task[];
  onBack: () => void;
  onAddTask: (taskData: Partial<Task>) => void;
  onUpdateTaskStatus: (taskId: string, status: TaskStatus) => void;
  onDeleteTask: (taskId: string) => void;
  onTogglePin: (taskId: string) => void;
  onEditTask: (task: Task) => void;
}

export default function PlanDetailsView({
  plan,
  planType,
  tasks,
  onBack,
  onAddTask,
  onUpdateTaskStatus,
  onDeleteTask,
  onTogglePin,
  onEditTask
}: PlanDetailsViewProps) {
  // Local task creator state
  const [taskTitle, setTaskTitle] = useState('');
  const [taskCategory, setTaskCategory] = useState(planType === 'story' ? 'EDITORIAL' : 'ENGINEERING');
  const [taskStatus, setTaskStatus] = useState<TaskStatus>('To Do');
  const [taskPriority, setTaskPriority] = useState<'Urgent' | 'High' | 'Medium' | 'Low'>('Medium');
  const [taskStartDate, setTaskStartDate] = useState('');
  const [taskDueDate, setTaskDueDate] = useState('');
  const [taskDescription, setTaskDescription] = useState('');
  const [isAddingTask, setIsAddingTask] = useState(false);

  // Filter tasks belonging specifically to this plan
  const planTasks = tasks.filter(t => t.planId === plan.id && t.planType === planType);

  const handleCreateTask = (e: React.FormEvent) => {
    e.preventDefault();
    if (!taskTitle.trim()) return;

    onAddTask({
      title: taskTitle.trim(),
      category: taskCategory,
      status: taskStatus,
      priority: taskPriority,
      startDate: taskStartDate || undefined,
      dueDate: taskDueDate || new Date().toISOString().split('T')[0],
      description: taskDescription,
      planId: plan.id,
      planType: planType,
      pinned: false,
      progress: taskStatus === 'Completed' ? 100 : taskStatus === 'In Progress' ? 30 : 0
    });

    // Reset state
    setTaskTitle('');
    setTaskStartDate('');
    setTaskDescription('');
    setTaskDueDate('');
    setIsAddingTask(false);
  };

  // Helper values for displaying different plans
  const title = plan.title;
  let subtitle = '';
  let statusBadge = '';
  let metaInfo = '';

  if (planType === 'story') {
    const s = plan as ActiveStory;
    subtitle = (s.category || 'Creative') + " Project Plan";
    statusBadge = s.status;
    metaInfo = s.dueDate;
  } else {
    const r = plan as RoadmapProject;
    subtitle = r.type + " Goal Plan";
    statusBadge = r.status;
    metaInfo = r.deadline;
  }

  // Count summary of connected tasks
  const completedTasks = planTasks.filter(t => t.status === 'Completed').length;
  const totalTasks = planTasks.length;
  const progressPercent = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

  return (
    <div className="space-y-6 animate-fade-in max-w-7xl mx-auto w-full">
      {/* Return Navigation bar */}
      <div className="flex items-center justify-between border-b border-border-hairline pb-4">
        <button
          type="button"
          onClick={onBack}
          className="inline-flex items-center gap-2 text-xs font-mono font-bold tracking-wider text-ink-muted hover:text-ink uppercase cursor-pointer"
        >
          <ArrowLeft size={14} /> Back to plans workspace
        </button>
        <span className="text-[10px] font-mono text-ink-muted uppercase bg-surface-card px-2.5 py-1 rounded border border-border-hairline">
          Plan ID: {plan.id}
        </span>
      </div>

      {/* Main Plan Overview Header Card */}
      <section className="bg-canvas border border-border-hairline rounded-2xl p-6 shadow-xs relative overflow-hidden">
        {/* Subtle decorative edge */}
        <div className="absolute top-0 left-0 right-0 h-1.5 bg-[#ad5f45]"></div>

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 pt-2">
          {/* Information */}
          <div className="space-y-3 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-[10px] font-mono uppercase tracking-wider font-bold px-2 py-0.5 rounded bg-primary/10 text-primary">
                {subtitle}
              </span>
              <span className={`text-[10px] font-mono uppercase tracking-wider font-bold px-2.5 py-0.5 rounded border ${
                statusBadge === 'PUBLISHED' || statusBadge === 'Completed' 
                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200' 
                  : 'bg-[#efe9de] text-ink border-border-hairline'
              }`}>
                {statusBadge}
              </span>
            </div>

            <h2 className="font-serif text-2xl md:text-3xl font-medium text-ink tracking-tight leading-snug">
              {title}
            </h2>
            {planType === 'story' && (plan as ActiveStory).note && (
              <p className="text-xs text-ink-muted leading-relaxed font-sans italic pt-1 max-w-2xl">
                {(plan as ActiveStory).note}
              </p>
            )}

            <div className="flex flex-wrap items-center gap-4 text-xs font-mono text-ink-muted">
              <span className="flex items-center gap-1">
                <Calendar size={13} />
                Target Schedule: <strong className="text-ink">{metaInfo}</strong>
              </span>
              {planType === 'story' && (plan as ActiveStory).assigneeImages && (
                <div className="flex items-center gap-1.5">
                  <span>Assignees:</span>
                  <div className="flex -space-x-1.5 overflow-hidden">
                    {(plan as ActiveStory).assigneeImages.map((img, idx) => (
                      <img
                        key={idx}
                        src={img}
                        alt="Assignee"
                        referrerPolicy="no-referrer"
                        className="inline-block h-5 w-5 rounded-full ring-2 ring-canvas object-cover"
                      />
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Quick Metrics visualization */}
          <div className="bg-surface-card p-4 rounded-xl border border-border-hairline min-w-[200px] text-center space-y-2">
            <span className="block text-[10px] font-mono uppercase tracking-widest text-ink-muted font-bold">
              Plan Task Delivery
            </span>
            <div className="flex justify-between items-baseline px-2">
              <span className="text-2xl font-serif text-ink font-semibold">
                {completedTasks}<span className="text-xs font-sans text-ink-muted">/{totalTasks} tasks</span>
              </span>
              <span className="text-sm font-mono font-bold text-primary">{progressPercent}%</span>
            </div>
            <div className="w-full bg-[#efe9de] h-1.5 rounded-full overflow-hidden border border-border-hairline">
              <div 
                className="bg-[#ad5f45] h-full rounded-full transition-all duration-300"
                style={{ width: `${progressPercent}%` }}
              ></div>
            </div>
          </div>
        </div>
      </section>

      {/* Grid of details, adding input, and linked tasks listing */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
        {/* LEFT TWO COLUMNS: THE TASKS LIST */}
        <section className="lg:col-span-2 space-y-6">
          <div className="flex justify-between items-center">
            <h3 className="font-serif text-xl font-medium text-ink inline-flex items-center gap-2">
              <Layers size={16} className="text-[#8f482f]" /> Connected Plan Tasks
            </h3>
            
            <button
              onClick={() => setIsAddingTask(true)}
              className="px-3 py-1.5 bg-[#8f482f] hover:bg-[#a25135] text-white text-xs font-semibold rounded-lg shadow-sm flex items-center gap-1 cursor-pointer transition-all"
            >
              <Plus size={14} /> Add contextual task
            </button>
          </div>

          {/* Connected Plan Tasks container */}
          {planTasks.length === 0 ? (
            <div className="bg-surface-card/40 border border-dashed border-border-hairline rounded-xl p-10 text-center space-y-3">
              <p className="text-xs text-ink-muted italic font-mono uppercase">No tasks connected to this plan yet.</p>
              <p className="text-xs text-ink-muted/80 max-w-md mx-auto">
                Use the "Add contextual task" form to create tasks that are specifically linked to and organized under this plan.
              </p>
              <button
                onClick={() => setIsAddingTask(true)}
                className="text-xs font-semibold text-primary underline hover:text-[#a25135] cursor-pointer"
              >
                Create your first task now
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              {planTasks.map((task) => (
                <div 
                  key={task.id} 
                  className="bg-canvas border border-border-hairline rounded-xl p-5 hover:border-primary/80 hover:shadow-xs transition-all relative group"
                >
                  {/* Priority indicator tag top left */}
                  <div className="flex justify-between items-start gap-4">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-[9px] font-mono tracking-wider font-bold uppercase px-1.5 py-0.5 rounded bg-[#efe9de] text-ink">
                          {task.category}
                        </span>
                        <span className={`text-[8px] font-mono tracking-widest font-bold uppercase px-1.5 py-0.5 rounded ${
                          task.priority === 'Urgent' ? 'bg-red-50 text-red-700 border border-red-200' :
                          task.priority === 'High' ? 'bg-amber-50 text-amber-700 border border-amber-200' :
                          'bg-surface-card text-ink-muted border border-border-hairline'
                        }`}>
                          {task.priority || 'Medium'} PRIORITY
                        </span>
                      </div>
                      
                      <h4 className={`font-serif text-base font-semibold leading-snug pt-1 ${
                        task.status === 'Completed' ? 'line-through text-ink-muted' : 'text-ink'
                      }`}>
                        {task.title}
                      </h4>
                    </div>

                    {/* Status Select dropdown */}
                    <select
                      value={task.status}
                      onChange={(e) => onUpdateTaskStatus(task.id, e.target.value as TaskStatus)}
                      className={`text-xs font-mono font-bold uppercase tracking-wider px-2.5 py-1 rounded border outline-hidden transition-all cursor-pointer ${
                        task.status === 'Completed' ? 'bg-emerald-50 text-emerald-800 border-emerald-300' :
                        task.status === 'Review' ? 'bg-indigo-50 text-indigo-850 border-indigo-300' :
                        task.status === 'In Progress' ? 'bg-amber-50 text-amber-850 border-amber-300' :
                        'bg-surface-card text-ink border-border-hairline'
                      }`}
                    >
                      <option value="To Do">To Do</option>
                      <option value="In Progress">In Progress</option>
                      <option value="Review">Review</option>
                      <option value="Completed">Completed</option>
                    </select>
                  </div>

                  {/* Task Description */}
                  {task.description && (
                    <p className="text-xs text-ink-muted/95 leading-relaxed bg-surface-card/45 p-3 rounded-lg border border-border-hairline/50 mt-3 font-sans pb-3 whitespace-pre-line">
                      {task.description}
                    </p>
                  )}

                  {/* Meta data row: pins/schedule/deletion */}
                  <div className="flex justify-between items-center pt-3 border-t border-border-hairline/60 mt-3 text-[10px] font-mono text-ink-muted">
                    <span className="flex items-center gap-1">
                      <Calendar size={11} className="text-ink-muted/85" /> 
                      Due Schedule: <strong className="text-ink">{task.dueDate}</strong>
                    </span>

                    <div className="flex items-center gap-2">
                      {/* Edit Details action button */}
                      <button
                        onClick={() => onEditTask(task)}
                        className="p-1 hover:text-primary transition-colors cursor-pointer"
                        title="Edit details"
                      >
                        Update Task
                      </button>

                      {/* Pins */}
                      <button
                        onClick={() => onTogglePin(task.id)}
                        className={`p-1.5 rounded-full hover:bg-surface-card transition-colors cursor-pointer ${
                          task.pinned ? 'text-[#8f482f]' : 'text-ink-muted hover:text-ink'
                        }`}
                        title={task.pinned ? 'Unpin' : 'Pin to Focus'}
                      >
                        {task.pinned ? <Pin size={13} className="fill-current" /> : <PinOff size={13} />}
                      </button>

                      {/* Deletions */}
                      <button
                        onClick={() => {
                          if (confirm('Delete this task?')) {
                            onDeleteTask(task.id);
                          }
                        }}
                        className="p-1.5 rounded-full hover:bg-red-50 text-ink-muted hover:text-red-500 transition-colors cursor-pointer"
                        title="Delete task"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* RIGHT COLUMN: DETAILED PLAN CONTEXT */}
        <section className="space-y-6">
          {/* Plan context informational card */}
          <div className="bg-surface-card/65 border border-border-hairline rounded-2xl p-5 space-y-4">
            <h4 className="font-serif text-base font-semibold text-ink border-b border-border-hairline pb-2 inline-flex items-center gap-1.5 w-full">
              <Clipboard size={14} className="text-primary" /> Plan Checklist Info
            </h4>

            <div className="space-y-2 text-xs leading-relaxed font-sans text-ink-muted">
              {planType === 'story' ? (
                <>
                  <p>
                    This is an active production proposal in your editorial queue. Creating tasks under this proposal enables structured chapter drafting, final reviews, copy-editing, and publishing preparations.
                  </p>
                  {(plan as ActiveStory).category && (
                    <p className="text-[10px] font-mono uppercase font-bold tracking-wider pt-1 text-[#a25135]">
                      Category Focus: {(plan as ActiveStory).category}
                    </p>
                  )}
                </>
              ) : (
                <>
                  <p>
                    This roadmap goal represents a core, high-priority objective track. Adding tasks specifies key activities required to successfully tick off associated milestones.
                  </p>
                  <p className="text-[10px] font-mono uppercase font-bold tracking-wider pt-1 text-[#a25135]">
                    Lead Contact: {(plan as RoadmapProject).lead || 'Julian (Editor in Chief)'}
                  </p>
                </>
              )}
            </div>
          </div>
        </section>
      </div>

      {/* Pop-up modal overlay for creating task under this plan */}
      {isAddingTask && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 backdrop-blur-xs p-4 animate-fade-in"
          onClick={() => setIsAddingTask(false)}
        >
          <div 
            className="relative w-full max-w-lg bg-canvas border border-border-hairline rounded-xl shadow-xl overflow-hidden animate-in fade-in zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex justify-between items-center px-6 py-4 border-b border-border-hairline">
              <h2 className="font-serif text-xl text-ink font-semibold flex items-center gap-2">
                <Layers size={18} className="text-[#8f482f]" /> Add Task to Plan
              </h2>
              <button 
                type="button"
                onClick={() => setIsAddingTask(false)}
                className="p-1 rounded-full text-ink-muted hover:text-ink hover:bg-surface-card transition-colors cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleCreateTask} className="px-6 py-5 space-y-4">
              <div className="space-y-1">
                <label className="block text-xs font-semibold text-ink-muted uppercase tracking-wider">
                  Task Title *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Draft interview outline"
                  value={taskTitle}
                  onChange={(e) => setTaskTitle(e.target.value)}
                  className="w-full px-4 py-2.5 bg-canvas border border-border-hairline rounded-lg text-ink focus:outline-hidden focus:ring-3 focus:ring-primary/15 focus:border-primary transition-all placeholder:text-ink-muted/50 text-xs"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="block text-xs font-semibold text-ink-muted uppercase tracking-wider">
                    Initial Status
                  </label>
                  <select
                    value={taskStatus}
                    onChange={(e) => setTaskStatus(e.target.value as TaskStatus)}
                    className="w-full px-4 py-2.5 bg-canvas border border-border-hairline rounded-lg text-ink focus:outline-hidden focus:ring-3 focus:ring-primary/15 focus:border-primary transition-all text-xs"
                  >
                    <option value="To Do">To Do</option>
                    <option value="In Progress">In Progress</option>
                    <option value="Review">Review</option>
                    <option value="Completed">Completed</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="block text-xs font-semibold text-ink-muted uppercase tracking-wider">
                    Priority
                  </label>
                  <select
                    value={taskPriority}
                    onChange={(e) => setTaskPriority(e.target.value as any)}
                    className="w-full px-4 py-2.5 bg-canvas border border-border-hairline rounded-lg text-ink focus:outline-hidden focus:ring-3 focus:ring-primary/15 focus:border-primary transition-all text-xs"
                  >
                    <option value="Low">Low</option>
                    <option value="Medium">Medium</option>
                    <option value="High">High</option>
                    <option value="Urgent">Urgent</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="block text-xs font-semibold text-ink-muted uppercase tracking-wider">
                    Start Date
                  </label>
                  <input
                    type="date"
                    value={taskStartDate}
                    onChange={(e) => setTaskStartDate(e.target.value)}
                    className="w-full px-4 py-2.5 bg-canvas border border-border-hairline rounded-lg text-ink focus:outline-hidden focus:ring-3 focus:ring-primary/15 focus:border-primary transition-all text-xs"
                  />
                </div>

                <div className="space-y-1">
                  <label className="block text-xs font-semibold text-ink-muted uppercase tracking-wider">
                    Due Date
                  </label>
                  <input
                    type="date"
                    required
                    value={taskDueDate}
                    onChange={(e) => setTaskDueDate(e.target.value)}
                    className="w-full px-4 py-2.5 bg-canvas border border-border-hairline rounded-lg text-ink focus:outline-hidden focus:ring-3 focus:ring-primary/15 focus:border-primary transition-all text-xs"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="block text-xs font-semibold text-ink-muted uppercase tracking-wider">
                  Description / Expectations
                </label>
                <textarea
                  rows={3}
                  placeholder="Explain requirements or notes..."
                  value={taskDescription}
                  onChange={(e) => setTaskDescription(e.target.value)}
                  className="w-full px-4 py-2 bg-canvas border border-border-hairline rounded-lg text-ink focus:outline-hidden focus:ring-3 focus:ring-primary/15 focus:border-primary transition-all placeholder:text-ink-muted/50 resize-none text-xs"
                />
              </div>

              <div className="flex justify-end items-center gap-4 pt-3 border-t border-border-hairline">
                <button
                  type="button"
                  onClick={() => setIsAddingTask(false)}
                  className="px-4 py-2 text-xs font-medium text-ink-muted hover:text-ink hover:underline transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 bg-[#8f482f] hover:bg-[#a25135] text-white text-xs font-semibold rounded-lg shadow-sm transition-all focus:ring-3 focus:ring-[#8f482f]/20 cursor-pointer"
                >
                  Create Plan Task
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
