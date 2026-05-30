import React, { useState } from 'react';
import { ArrowLeft, ArrowRight, Calendar, Pencil, Search, Trash2 } from 'lucide-react';
import { Task, TaskStatus } from '../types';

interface TasksViewProps {
  tasks: Task[];
  onUpdateTaskStatus: (taskId: string, status: TaskStatus) => void;
  onDeleteTask: (taskId: string) => void;
  onEditTask?: (task: Task) => void;
}

export default function TasksView({
  tasks,
  onUpdateTaskStatus,
  onDeleteTask,
  onEditTask
}: TasksViewProps) {
  const [searchQuery, setSearchQuery] = useState('');

  const filteredTasks = tasks.filter(task => {
    return task.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (task.description || '').toLowerCase().includes(searchQuery.toLowerCase());
  });

  const statuses: TaskStatus[] = ['To Do', 'In Progress', 'Review', 'Completed'];

  const moveTask = (task: Task, direction: 'forward' | 'backward') => {
    const currentIndex = statuses.indexOf(task.status);
    if (direction === 'forward' && currentIndex < statuses.length - 1) {
      onUpdateTaskStatus(task.id, statuses[currentIndex + 1]);
    } else if (direction === 'backward' && currentIndex > 0) {
      onUpdateTaskStatus(task.id, statuses[currentIndex - 1]);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-canvas border border-border-hairline rounded-xl p-4 shadow-2xs">
        <div className="relative flex-grow max-w-md w-full">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search tasks..."
            className="w-full pl-10 pr-4 py-2 bg-[#efe9de]/40 border border-border-hairline rounded-lg text-xs leading-none text-ink placeholder:text-ink-muted/50 focus:outline-hidden focus:ring-2 focus:ring-primary/10 transition-all"
          />
          <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-muted" />
        </div>

        <p className="text-xs text-ink-muted">
          Tasks are created inside a plan so every task has a backend `planId`.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 items-start">
        {statuses.map((status) => {
          const statusTasks = filteredTasks.filter(t => t.status === status);

          return (
            <div
              key={status}
              className="bg-[#efe9de] border border-[#e6dfd8] rounded-xl p-4 flex flex-col max-h-[80vh] min-h-[400px] shadow-3xs"
            >
              <header className="flex justify-between items-center pb-3 border-b border-[#e1d5c5] mb-4">
                <div className="flex items-center gap-2">
                  <span className={`w-2.5 h-2.5 rounded-full ${
                    status === 'To Do' ? 'bg-[#cc3333]' :
                    status === 'In Progress' ? 'bg-[#e8a55a]' :
                    status === 'Review' ? 'bg-[#8f482f]' :
                    'bg-[#1d8372]'
                  }`}></span>
                  <h3 className="font-serif text-sm font-semibold text-ink">{status}</h3>
                  <span className="text-[10px] font-mono bg-canvas px-1.5 py-0.5 rounded-sm border border-border-hairline text-ink-muted font-bold">
                    {statusTasks.length}
                  </span>
                </div>
              </header>

              <div id={`pillar-${status.replace(' ', '-')}`} className="flex-grow space-y-3.5 overflow-y-auto pr-1">
                {statusTasks.length === 0 ? (
                  <div className="py-8 text-center text-xs text-ink-muted/50 italic border-2 border-dashed border-border-hairline rounded-lg">
                    No active tasks
                  </div>
                ) : (
                  statusTasks.map((task) => (
                    <div
                      key={task.id}
                      className="bg-canvas border border-border-hairline rounded-xl p-4 space-y-3 shadow-3xs hover:shadow-2xs transition-all relative group"
                    >
                      <div className="flex justify-between items-start gap-2">
                        <span className={`text-[9px] font-bold font-mono tracking-wider uppercase px-1.5 py-0.5 rounded-sm ${
                          task.priority === 'Urgent' ? 'bg-red-50 text-red-700' :
                          task.priority === 'High' ? 'bg-amber-50 text-amber-700' :
                          'bg-primary/10 text-primary'
                        }`}>
                          {task.priority || 'Medium'}
                        </span>

                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          {onEditTask && (
                            <button
                              onClick={() => onEditTask(task)}
                              className="p-1 text-ink-muted hover:text-primary rounded cursor-pointer"
                              title="Update Details"
                            >
                              <Pencil size={11} />
                            </button>
                          )}
                          <button
                            onClick={() => onDeleteTask(task.id)}
                            className="p-1 text-ink-muted hover:text-red-500 rounded cursor-pointer"
                            title="Delete Task"
                          >
                            <Trash2 size={11} />
                          </button>
                        </div>
                      </div>

                      <h4 className="font-serif text-sm font-semibold text-ink leading-snug">
                        {task.title}
                      </h4>

                      {task.description && (
                        <p className="text-xs text-ink-muted leading-relaxed line-clamp-2">
                          {task.description}
                        </p>
                      )}

                      <div className="flex items-center justify-between pt-2 border-t border-border-hairline/60">
                        <span className="text-[10px] font-mono text-ink-muted flex items-center gap-1">
                          <Calendar size={11} />
                          {task.dueDate}
                        </span>

                        <div className="flex items-center gap-0.5 border border-border-hairline rounded bg-surface-card">
                          <button
                            onClick={() => moveTask(task, 'backward')}
                            disabled={status === 'To Do'}
                            className="p-0.5 text-ink-muted hover:text-ink disabled:opacity-30 cursor-pointer"
                            title="Move back"
                          >
                            <ArrowLeft size={11} />
                          </button>
                          <button
                            onClick={() => moveTask(task, 'forward')}
                            disabled={status === 'Completed'}
                            className="p-0.5 text-ink-muted hover:text-ink disabled:opacity-30 cursor-pointer"
                            title="Move forward"
                          >
                            <ArrowRight size={11} />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
