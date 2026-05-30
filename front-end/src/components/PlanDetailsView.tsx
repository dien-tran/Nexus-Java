import React, { useState } from 'react';
import { ArrowLeft, Calendar, CheckSquare, Clipboard, Layers, Plus, Square, Trash2, X } from 'lucide-react';
import { Plan, Task, TaskPriority, TaskStatus } from '../types';

interface PlanDetailsViewProps {
  plan: Plan;
  tasks: Task[];
  onBack: () => void;
  onAddTask: (taskData: Partial<Task>) => void;
  onUpdateTaskStatus: (taskId: string, status: TaskStatus) => void;
  onDeleteTask: (taskId: string) => void;
  onEditTask: (task: Task) => void;
}

export default function PlanDetailsView({
  plan,
  tasks,
  onBack,
  onAddTask,
  onUpdateTaskStatus,
  onDeleteTask,
  onEditTask
}: PlanDetailsViewProps) {
  const [taskTitle, setTaskTitle] = useState('');
  const [taskStatus, setTaskStatus] = useState<TaskStatus>('To Do');
  const [taskPriority, setTaskPriority] = useState<TaskPriority>('Medium');
  const [taskStartDate, setTaskStartDate] = useState('');
  const [taskDueDate, setTaskDueDate] = useState('');
  const [taskDescription, setTaskDescription] = useState('');
  const [isAddingTask, setIsAddingTask] = useState(false);

  const planTasks = tasks.filter(t => t.planId === plan.id);

  const handleCreateTask = (e: React.FormEvent) => {
    e.preventDefault();
    if (!taskTitle.trim()) return;

    onAddTask({
      title: taskTitle.trim(),
      status: taskStatus,
      priority: taskPriority,
      startDate: taskStartDate || undefined,
      dueDate: taskDueDate || new Date().toISOString().split('T')[0],
      description: taskDescription,
      planId: plan.id
    });

    setTaskTitle('');
    setTaskStatus('To Do');
    setTaskPriority('Medium');
    setTaskStartDate('');
    setTaskDescription('');
    setTaskDueDate('');
    setIsAddingTask(false);
  };

  const completedTasks = planTasks.filter(t => t.status === 'Completed').length;

  return (
    <div className="space-y-6 animate-fade-in max-w-7xl mx-auto w-full">
      <div className="flex items-center justify-between border-b border-border-hairline pb-4">
        <button
          type="button"
          onClick={onBack}
          className="inline-flex items-center gap-2 text-xs font-mono font-bold tracking-wider text-ink-muted hover:text-ink uppercase cursor-pointer"
        >
          <ArrowLeft size={14} /> Back to plans
        </button>
        <span className="text-[10px] font-mono text-ink-muted uppercase bg-surface-card px-2.5 py-1 rounded border border-border-hairline">
          Plan ID: {plan.id}
        </span>
      </div>

      <section className="bg-canvas border border-border-hairline rounded-2xl p-6 shadow-xs relative overflow-hidden">
        <div className="absolute top-0 left-0 right-0 h-1.5 bg-[#ad5f45]"></div>

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 pt-2">
          <div className="space-y-3 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-[10px] font-mono uppercase tracking-wider font-bold px-2 py-0.5 rounded bg-primary/10 text-primary">
                Plan
              </span>
              <span className={`text-[10px] font-mono uppercase tracking-wider font-bold px-2.5 py-0.5 rounded border ${
                plan.status === 'Completed'
                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                  : 'bg-[#efe9de] text-ink border-border-hairline'
              }`}>
                {plan.status}
              </span>
            </div>

            <h2 className="font-serif text-2xl md:text-3xl font-medium text-ink tracking-tight leading-snug">
              {plan.title}
            </h2>
            {plan.note && (
              <p className="text-xs text-ink-muted leading-relaxed font-sans italic pt-1 max-w-2xl">
                {plan.note}
              </p>
            )}

            {plan.dueDate && (
              <div className="flex flex-wrap items-center gap-4 text-xs font-mono text-ink-muted">
                <span className="flex items-center gap-1">
                  <Calendar size={13} />
                  Due Date: <strong className="text-ink">{plan.dueDate}</strong>
                </span>
              </div>
            )}
          </div>

          <div className="bg-surface-card p-4 rounded-xl border border-border-hairline min-w-[180px] text-center space-y-1">
            <span className="block text-[10px] font-mono uppercase tracking-widest text-ink-muted font-bold">
              Tasks
            </span>
            <div className="text-2xl font-serif text-ink font-semibold">
              {completedTasks}<span className="text-xs font-sans text-ink-muted">/{planTasks.length} completed</span>
            </div>
          </div>
        </div>
      </section>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
        <section className="lg:col-span-2 space-y-6">
          <div className="flex justify-between items-center">
            <h3 className="font-serif text-xl font-medium text-ink inline-flex items-center gap-2">
              <Layers size={16} className="text-[#8f482f]" /> Plan Tasks
            </h3>

            <button
              onClick={() => setIsAddingTask(true)}
              className="px-3 py-1.5 bg-[#8f482f] hover:bg-[#a25135] text-white text-xs font-semibold rounded-lg shadow-sm flex items-center gap-1 cursor-pointer transition-all"
            >
              <Plus size={14} /> Add Task
            </button>
          </div>

          {planTasks.length === 0 ? (
            <div className="bg-surface-card/40 border border-dashed border-border-hairline rounded-xl p-10 text-center space-y-3">
              <p className="text-xs text-ink-muted italic font-mono uppercase">No tasks connected to this plan yet.</p>
              <button
                onClick={() => setIsAddingTask(true)}
                className="text-xs font-semibold text-primary underline hover:text-[#a25135] cursor-pointer"
              >
                Create your first task
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              {planTasks.map((task) => (
                <div
                  key={task.id}
                  className="bg-canvas border border-border-hairline rounded-xl p-5 hover:border-primary/80 hover:shadow-xs transition-all relative group"
                >
                  <div className="flex justify-between items-start gap-4">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className={`text-[8px] font-mono tracking-widest font-bold uppercase px-1.5 py-0.5 rounded ${
                          task.priority === 'Urgent' ? 'bg-red-50 text-red-700 border border-red-200' :
                          task.priority === 'High' ? 'bg-amber-50 text-amber-700 border border-amber-200' :
                          'bg-surface-card text-ink-muted border border-border-hairline'
                        }`}>
                          {task.priority || 'Medium'} Priority
                        </span>
                      </div>

                      <h4 className={`font-serif text-base font-semibold leading-snug pt-1 ${
                        task.status === 'Completed' ? 'line-through text-ink-muted' : 'text-ink'
                      }`}>
                        {task.title}
                      </h4>
                    </div>

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

                  {task.description && (
                    <p className="text-xs text-ink-muted/95 leading-relaxed bg-surface-card/45 p-3 rounded-lg border border-border-hairline/50 mt-3 font-sans pb-3 whitespace-pre-line">
                      {task.description}
                    </p>
                  )}

                  <div className="flex justify-between items-center pt-3 border-t border-border-hairline/60 mt-3 text-[10px] font-mono text-ink-muted">
                    <span className="flex items-center gap-1">
                      <Calendar size={11} className="text-ink-muted/85" />
                      Due: <strong className="text-ink">{task.dueDate}</strong>
                    </span>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => onEditTask(task)}
                        className="p-1 hover:text-primary transition-colors cursor-pointer"
                        title="Edit details"
                      >
                        Update
                      </button>
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

        <section className="space-y-6">
          <div className="bg-surface-card/65 border border-border-hairline rounded-2xl p-5 space-y-4">
            <h4 className="font-serif text-base font-semibold text-ink border-b border-border-hairline pb-2 inline-flex items-center gap-1.5 w-full">
              <Clipboard size={14} className="text-primary" /> Backend Fields
            </h4>
            <div className="space-y-2 text-xs leading-relaxed font-sans text-ink-muted">
              <p>This screen only uses backend plan fields: name, status, note, due date, and tasks attached by plan ID.</p>
            </div>
          </div>
        </section>
      </div>

      {isAddingTask && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 backdrop-blur-xs p-4 animate-fade-in"
          onClick={() => setIsAddingTask(false)}
        >
          <div
            className="relative w-full max-w-lg bg-canvas border border-border-hairline rounded-xl shadow-xl overflow-hidden animate-in fade-in zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-center px-6 py-4 border-b border-border-hairline">
              <h2 className="font-serif text-xl text-ink font-semibold flex items-center gap-2">
                <Layers size={18} className="text-[#8f482f]" /> Add Task
              </h2>
              <button
                type="button"
                onClick={() => setIsAddingTask(false)}
                className="p-1 rounded-full text-ink-muted hover:text-ink hover:bg-surface-card transition-colors cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleCreateTask} className="px-6 py-5 space-y-4">
              <div className="space-y-1">
                <label className="block text-xs font-semibold text-ink-muted uppercase tracking-wider">
                  Task Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Draft implementation checklist"
                  value={taskTitle}
                  onChange={(e) => setTaskTitle(e.target.value)}
                  className="w-full px-4 py-2.5 bg-canvas border border-border-hairline rounded-lg text-ink focus:outline-hidden focus:ring-3 focus:ring-primary/15 focus:border-primary transition-all placeholder:text-ink-muted/50 text-xs"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="block text-xs font-semibold text-ink-muted uppercase tracking-wider">
                    Status
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
                    onChange={(e) => setTaskPriority(e.target.value as TaskPriority)}
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
                  Description
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
                  Create Task
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
