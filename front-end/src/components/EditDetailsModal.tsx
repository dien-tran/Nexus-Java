import React, { useEffect, useState } from 'react';
import { X } from 'lucide-react';
import { Plan, PlanStatus, Task, TaskPriority, TaskStatus } from '../types';

interface EditDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  editType: 'task' | 'plan';
  data: Task | Plan | null;
  onSave: (updatedData: any) => void;
}

export default function EditDetailsModal({
  isOpen,
  onClose,
  editType,
  data,
  onSave
}: EditDetailsModalProps) {
  const [taskTitle, setTaskTitle] = useState('');
  const [taskStatus, setTaskStatus] = useState<TaskStatus>('To Do');
  const [taskPriority, setTaskPriority] = useState<TaskPriority>('Medium');
  const [taskStartDate, setTaskStartDate] = useState('');
  const [taskDueDate, setTaskDueDate] = useState('');
  const [taskDescription, setTaskDescription] = useState('');

  const [planTitle, setPlanTitle] = useState('');
  const [planStatus, setPlanStatus] = useState<PlanStatus>('Drafting');
  const [planNote, setPlanNote] = useState('');

  const formatToInputDate = (dateStr: string): string => {
    if (!dateStr) return '';
    try {
      const d = new Date(dateStr);
      if (!isNaN(d.getTime())) {
        return d.toISOString().split('T')[0];
      }
    } catch {
      return '';
    }
    return '';
  };

  useEffect(() => {
    if (!data) return;

    if (editType === 'task') {
      const task = data as Task;
      setTaskTitle(task.title || '');
      setTaskStatus(task.status || 'To Do');
      setTaskPriority(task.priority || 'Medium');
      setTaskStartDate(formatToInputDate(task.startDate || ''));
      setTaskDueDate(formatToInputDate(task.dueDate || ''));
      setTaskDescription(task.description || '');
    } else {
      const plan = data as Plan;
      setPlanTitle(plan.title || '');
      setPlanStatus(plan.status || 'Drafting');
      setPlanNote(plan.note || '');
    }
  }, [data, editType, isOpen]);

  if (!isOpen || !data) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (editType === 'task') {
      onSave({
        id: data.id,
        title: taskTitle,
        status: taskStatus,
        priority: taskPriority,
        startDate: taskStartDate || undefined,
        dueDate: taskDueDate || new Date().toISOString().split('T')[0],
        description: taskDescription
      });
    } else {
      onSave({
        id: data.id,
        title: planTitle,
        status: planStatus,
        note: planNote
      });
    }
    onClose();
  };

  return (
    <div id="edit-details-modal-overlay" className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4 transition-all animate-fade-in">
      <div className="relative w-full max-w-lg bg-canvas border border-border-hairline rounded-xl shadow-xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        <div className="flex justify-between items-center px-6 py-4 border-b border-border-hairline">
          <div className="space-y-0.5">
            <h2 className="font-serif text-2xl text-ink font-medium">
              Update {editType === 'task' ? 'Task' : 'Plan'}
            </h2>
            <p className="text-[10px] font-mono font-bold tracking-wider text-ink-muted uppercase">
              Backend fields only
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-full text-ink-muted hover:text-ink hover:bg-surface-card transition-colors cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4 max-h-[75vh] overflow-y-auto">
          {editType === 'task' && (
            <>
              <div className="space-y-1">
                <label className="block text-xs font-semibold text-ink-muted uppercase tracking-wider">
                  Task Name
                </label>
                <input
                  type="text"
                  required
                  value={taskTitle}
                  onChange={(e) => setTaskTitle(e.target.value)}
                  className="w-full px-4 py-2.5 bg-canvas border border-border-hairline rounded-lg text-ink focus:outline-hidden focus:ring-3 focus:ring-primary/15 focus:border-primary transition-all"
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
                    className="w-full px-4 py-2.5 bg-canvas border border-border-hairline rounded-lg text-ink focus:outline-hidden focus:ring-3 focus:ring-primary/15 focus:border-primary transition-all"
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
                    className="w-full px-4 py-2.5 bg-canvas border border-border-hairline rounded-lg text-ink focus:outline-hidden focus:ring-3 focus:ring-primary/15 focus:border-primary transition-all"
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
                    className="w-full px-4 py-2.5 bg-canvas border border-border-hairline rounded-lg text-ink focus:outline-hidden focus:ring-3 focus:ring-primary/15 focus:border-primary transition-all"
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
                    className="w-full px-4 py-2.5 bg-canvas border border-border-hairline rounded-lg text-ink focus:outline-hidden focus:ring-3 focus:ring-primary/15 focus:border-primary transition-all"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="block text-xs font-semibold text-ink-muted uppercase tracking-wider">
                  Description
                </label>
                <textarea
                  rows={4}
                  value={taskDescription}
                  onChange={(e) => setTaskDescription(e.target.value)}
                  placeholder="Task description..."
                  className="w-full px-4 py-2 bg-canvas border border-border-hairline rounded-lg text-ink focus:outline-hidden focus:ring-3 focus:ring-primary/15 focus:border-primary transition-all placeholder:text-ink-muted/50 resize-none"
                />
              </div>
            </>
          )}

          {editType === 'plan' && (
            <>
              <div className="space-y-1">
                <label className="block text-xs font-semibold text-ink-muted uppercase tracking-wider">
                  Plan Name
                </label>
                <input
                  type="text"
                  required
                  value={planTitle}
                  onChange={(e) => setPlanTitle(e.target.value)}
                  className="w-full px-4 py-2.5 bg-canvas border border-border-hairline rounded-lg text-ink focus:outline-hidden focus:ring-3 focus:ring-primary/15 focus:border-primary transition-all"
                />
              </div>

              <div className="space-y-1">
                <label className="block text-xs font-semibold text-ink-muted uppercase tracking-wider">
                  Status
                </label>
                <select
                  value={planStatus}
                  onChange={(e) => setPlanStatus(e.target.value as PlanStatus)}
                  className="w-full px-4 py-2.5 bg-canvas border border-border-hairline rounded-lg text-ink focus:outline-hidden focus:ring-3 focus:ring-primary/15 focus:border-primary transition-all"
                >
                  <option value="Drafting">Drafting</option>
                  <option value="In Review">In Review</option>
                  <option value="Completed">Completed</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="block text-xs font-semibold text-ink-muted uppercase tracking-wider">
                  Note
                </label>
                <textarea
                  rows={4}
                  value={planNote}
                  onChange={(e) => setPlanNote(e.target.value)}
                  placeholder="Plan note..."
                  className="w-full px-4 py-2 bg-canvas border border-border-hairline rounded-lg text-ink focus:outline-hidden focus:ring-3 focus:ring-primary/15 focus:border-primary transition-all placeholder:text-ink-muted/50 resize-none"
                />
              </div>
            </>
          )}

          <div className="flex justify-end items-center gap-4 pt-4 border-t border-border-hairline">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-ink-muted hover:text-ink hover:underline transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2.5 bg-[#8f482f] hover:bg-[#a25135] text-white text-sm font-semibold rounded-lg shadow-sm transition-all focus:ring-3 focus:ring-primary/20 cursor-pointer"
            >
              Save
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
