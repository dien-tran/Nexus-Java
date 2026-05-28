import React, { useState } from 'react';
import { X } from 'lucide-react';
import { Task } from '../types';

interface CreateTaskModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (taskData: Partial<Task>) => void;
}

export default function CreateTaskModal({ isOpen, onClose, onSubmit }: CreateTaskModalProps) {
  const [title, setTitle] = useState('');
  const [status, setStatus] = useState<'To Do' | 'In Progress' | 'Review' | 'Completed'>('To Do');
  const [startDate, setStartDate] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState<'Urgent' | 'High' | 'Medium' | 'Low'>('Medium');

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    
    onSubmit({
      title: title.trim(),
      status,
      startDate: startDate || undefined,
      dueDate: dueDate || new Date().toISOString().split('T')[0], // Fallback to today if empty
      description,
      priority,
      category: 'General', // Default internally to avoid breaking legacy code
      progress: status === 'Completed' ? 100 : status === 'In Progress' ? 30 : 0
    });

    // Reset Form
    setTitle('');
    setStatus('To Do');
    setStartDate('');
    setDueDate('');
    setDescription('');
    setPriority('Medium');
    onClose();
  };

  return (
    <div id="create-task-modal-overlay" className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4 transition-all animate-fade-in">
      <div className="relative w-full max-w-lg bg-canvas border border-border-hairline rounded-xl shadow-xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex justify-between items-center px-6 py-4 border-b border-border-hairline">
          <h2 className="font-serif text-2xl text-ink font-medium">Create New Task</h2>
          <button 
            type="button"
            onClick={onClose}
            className="p-1 rounded-full text-ink-muted hover:text-ink hover:bg-surface-card transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
          {/* Task Title */}
          <div className="space-y-1">
            <label className="block text-xs font-semibold text-ink-muted uppercase tracking-wider">
              Task Title
            </label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Manuscript Proofreading"
              className="w-full px-4 py-2.5 bg-canvas border border-border-hairline rounded-lg text-ink focus:outline-hidden focus:ring-3 focus:ring-primary/15 focus:border-primary transition-all placeholder:text-ink-muted/50"
            />
          </div>

          {/* Row Status & Priority */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="block text-xs font-semibold text-ink-muted uppercase tracking-wider">
                Status
              </label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as any)}
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
                value={priority}
                onChange={(e) => setPriority(e.target.value as any)}
                className="w-full px-4 py-2.5 bg-canvas border border-border-hairline rounded-lg text-ink focus:outline-hidden focus:ring-3 focus:ring-primary/15 focus:border-primary transition-all"
              >
                <option value="Low">Low</option>
                <option value="Medium">Medium</option>
                <option value="High">High</option>
                <option value="Urgent">Urgent</option>
              </select>
            </div>
          </div>

          {/* Row Start Date & Due Date */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="block text-xs font-semibold text-ink-muted uppercase tracking-wider">
                Start Date
              </label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
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
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="w-full px-4 py-2.5 bg-canvas border border-border-hairline rounded-lg text-ink focus:outline-hidden focus:ring-3 focus:ring-primary/15 focus:border-primary transition-all"
              />
            </div>
          </div>

          {/* Description */}
          <div className="space-y-1">
            <label className="block text-xs font-semibold text-ink-muted uppercase tracking-wider">
              Description
            </label>
            <textarea
              rows={4}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe the task details..."
              className="w-full px-4 py-2 bg-canvas border border-border-hairline rounded-lg text-ink focus:outline-hidden focus:ring-3 focus:ring-primary/15 focus:border-primary transition-all placeholder:text-ink-muted/50 resize-none"
            />
          </div>

          {/* Actions */}
          <div className="flex justify-end items-center gap-4 pt-3 border-t border-border-hairline">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-ink-muted hover:text-ink hover:underline transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2.5 bg-primary hover:bg-primary-hover text-white text-sm font-semibold rounded-lg shadow-sm transition-all focus:ring-3 focus:ring-primary/20 cursor-pointer"
            >
              Create Task
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
