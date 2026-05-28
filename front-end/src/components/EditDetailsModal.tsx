import React, { useState, useEffect } from 'react';
import { X, Calendar, Type, Clipboard, AlertCircle } from 'lucide-react';
import { Task, ActiveStory, RoadmapProject, StoryStatus } from '../types';

interface EditDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  editType: 'task' | 'story' | 'roadmap';
  data: Task | ActiveStory | RoadmapProject | null;
  onSave: (updatedData: any) => void;
}

export default function EditDetailsModal({
  isOpen,
  onClose,
  editType,
  data,
  onSave
}: EditDetailsModalProps) {
  // State for Task
  const [taskTitle, setTaskTitle] = useState('');
  const [taskCategory, setTaskCategory] = useState('');
  const [taskStatus, setTaskStatus] = useState<'To Do' | 'In Progress' | 'Review' | 'Completed'>('To Do');
  const [taskPriority, setTaskPriority] = useState<'Urgent' | 'High' | 'Medium' | 'Low'>('Medium');
  const [taskStartDate, setTaskStartDate] = useState('');
  const [taskDueDate, setTaskDueDate] = useState('');
  const [taskDescription, setTaskDescription] = useState('');
  const [taskProgress, setTaskProgress] = useState(0);

  // State for Story (Pipeline Plan)
  const [storyTitle, setStoryTitle] = useState('');
  const [storyStatus, setStoryStatus] = useState<StoryStatus>('Drafting');
  const [storyDueDate, setStoryDueDate] = useState('');
  const [storyNote, setStoryNote] = useState('');

  // State for Roadmap Project (Goal Plan)
  const [roadmapTitle, setRoadmapTitle] = useState('');
  const [roadmapType, setRoadmapType] = useState('PRIMARY OBJECTIVE');
  const [roadmapStatus, setRoadmapStatus] = useState('Active Exploration');
  const [roadmapDeadline, setRoadmapDeadline] = useState('');
  const [roadmapProgress, setRoadmapProgress] = useState(0);

  // Helper to parse existing friendly date strings to YYYY-MM-DD for date inputs
  const formatToInputDate = (dateStr: string): string => {
    if (!dateStr) return '';
    const cleanStr = dateStr.trim().toLowerCase();
    if (cleanStr.includes('no due date') || cleanStr.includes('as needed') || cleanStr.includes('no deadline')) {
      return '';
    }
    try {
      const d = new Date(dateStr);
      if (!isNaN(d.getTime())) {
        return d.toISOString().split('T')[0];
      }
    } catch (e) {
      // Ignore parsing errors
    }
    return '';
  };

  // Populate data when the modal opens or values change
  useEffect(() => {
    if (!data) return;

    if (editType === 'task') {
      const t = data as Task;
      setTaskTitle(t.title || '');
      setTaskCategory(t.category || 'Editorial');
      setTaskStatus(t.status || 'To Do');
      setTaskPriority(t.priority || 'Medium');
      setTaskStartDate(formatToInputDate(t.startDate || ''));
      setTaskDueDate(formatToInputDate(t.dueDate || ''));
      setTaskDescription(t.description || '');
      setTaskProgress(t.progress || 0);
    } else if (editType === 'story') {
      const s = data as ActiveStory;
      setStoryTitle(s.title || '');
      setStoryStatus(s.status || 'Drafting');
      setStoryDueDate(formatToInputDate(s.dueDate || ''));
      setStoryNote(s.note || '');
    } else if (editType === 'roadmap') {
      const r = data as RoadmapProject;
      setRoadmapTitle(r.title || '');
      setRoadmapType(r.type || 'PRIMARY OBJECTIVE');
      setRoadmapStatus(r.status || 'Active Exploration');
      setRoadmapDeadline(formatToInputDate(r.deadline || ''));
      setRoadmapProgress(r.progress || 0);
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
        description: taskDescription,
        category: taskCategory || 'General',
        progress: taskStatus === 'Completed' ? 100 : taskStatus === 'In Progress' ? Math.max(taskProgress, 10) : taskProgress
      });
    } else if (editType === 'story') {
      onSave({
        id: data.id,
        title: storyTitle,
        status: storyStatus,
        dueDate: storyDueDate || new Date().toISOString().split('T')[0],
        note: storyNote
      });
    } else if (editType === 'roadmap') {
      onSave({
        id: data.id,
        title: roadmapTitle,
        type: roadmapType,
        status: roadmapStatus,
        deadline: roadmapDeadline ? new Date(roadmapDeadline).toLocaleDateString('en-US', { month: 'short', day: '2-digit' }) : 'No deadline',
        progress: roadmapProgress
      });
    }
    onClose();
  };

  return (
    <div id="edit-details-modal-overlay" className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4 transition-all animate-fade-in">
      <div className="relative w-full max-w-lg bg-canvas border border-border-hairline rounded-xl shadow-xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex justify-between items-center px-6 py-4 border-b border-border-hairline">
          <div className="space-y-0.5">
            <h2 className="font-serif text-2xl text-ink font-medium">
              Update Details
            </h2>
            <p className="text-[10px] font-mono font-bold tracking-wider text-ink-muted uppercase">
              REFINING {editType === 'task' ? 'TASK INFORMATION' : 'PLAN OBJECTIVES'}
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

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4 max-h-[75vh] overflow-y-auto">
          {/* TASK MODE */}
          {editType === 'task' && (
            <>
              {/* Task Title */}
              <div className="space-y-1">
                <label className="block text-xs font-semibold text-ink-muted uppercase tracking-wider">
                  Task Title
                </label>
                <input
                  type="text"
                  required
                  value={taskTitle}
                  onChange={(e) => setTaskTitle(e.target.value)}
                  className="w-full px-4 py-2.5 bg-canvas border border-border-hairline rounded-lg text-ink focus:outline-hidden focus:ring-3 focus:ring-primary/15 focus:border-primary transition-all"
                />
              </div>

              {/* Status & Priority */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="block text-xs font-semibold text-ink-muted uppercase tracking-wider">
                    Status
                  </label>
                  <select
                    value={taskStatus}
                    onChange={(e) => setTaskStatus(e.target.value as any)}
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
                    onChange={(e) => setTaskPriority(e.target.value as any)}
                    className="w-full px-4 py-2.5 bg-canvas border border-border-hairline rounded-lg text-ink focus:outline-hidden focus:ring-3 focus:ring-primary/15 focus:border-primary transition-all"
                  >
                    <option value="Low">Low</option>
                    <option value="Medium">Medium</option>
                    <option value="High">High</option>
                    <option value="Urgent">Urgent</option>
                  </select>
                </div>
              </div>

              {/* Start Date & Due Date */}
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

              {/* Description */}
              <div className="space-y-1">
                <label className="block text-xs font-semibold text-ink-muted uppercase tracking-wider">
                  Description
                </label>
                <textarea
                  rows={4}
                  value={taskDescription}
                  onChange={(e) => setTaskDescription(e.target.value)}
                  placeholder="Summarize objectives, requirements, and key reference materials..."
                  className="w-full px-4 py-2 bg-canvas border border-border-hairline rounded-lg text-ink focus:outline-hidden focus:ring-3 focus:ring-primary/15 focus:border-primary transition-all placeholder:text-ink-muted/50 resize-none"
                />
              </div>
            </>
          )}

          {/* STORY (Queue Plan) MODE */}
          {editType === 'story' && (
            <>
              {/* Story Title */}
              <div className="space-y-1">
                <label className="block text-xs font-semibold text-ink-muted uppercase tracking-wider">
                  Proposal Title
                </label>
                <input
                  type="text"
                  required
                  value={storyTitle}
                  onChange={(e) => setStoryTitle(e.target.value)}
                  className="w-full px-4 py-2.5 bg-canvas border border-border-hairline rounded-lg text-ink focus:outline-hidden focus:ring-3 focus:ring-primary/15 focus:border-primary transition-all"
                />
              </div>

              {/* Status & Deadline */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="block text-xs font-semibold text-ink-muted uppercase tracking-wider">
                    Story Status
                  </label>
                  <select
                    value={storyStatus}
                    onChange={(e) => setStoryStatus(e.target.value as any)}
                    className="w-full px-4 py-2.5 bg-canvas border border-border-hairline rounded-lg text-ink focus:outline-hidden focus:ring-3 focus:ring-primary/15 focus:border-primary transition-all"
                  >
                    <option value="Drafting">Drafting</option>
                    <option value="In Review">In Review</option>
                    <option value="Completed">Completed</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="block text-xs font-semibold text-ink-muted uppercase tracking-wider">
                    Target Deadline
                  </label>
                  <input
                    type="date"
                    required
                    value={storyDueDate}
                    onChange={(e) => setStoryDueDate(e.target.value)}
                    className="w-full px-4 py-2.5 bg-canvas border border-border-hairline rounded-lg text-ink focus:outline-hidden focus:ring-3 focus:ring-primary/15 focus:border-primary transition-all"
                  />
                </div>
              </div>

              {/* Story Note */}
              <div className="space-y-1">
                <label className="block text-xs font-semibold text-ink-muted uppercase tracking-wider">
                  Note / Description
                </label>
                <textarea
                  rows={4}
                  value={storyNote}
                  onChange={(e) => setStoryNote(e.target.value)}
                  placeholder="Provide context or summary for this creative proposal..."
                  className="w-full px-4 py-2 bg-canvas border border-border-hairline rounded-lg text-ink focus:outline-hidden focus:ring-3 focus:ring-primary/15 focus:border-primary transition-all placeholder:text-ink-muted/50 resize-none"
                />
              </div>
            </>
          )}

          {/* ROADMAP MODE */}
          {editType === 'roadmap' && (
            <>
              {/* Proposal Title */}
              <div className="space-y-1">
                <label className="block text-xs font-semibold text-ink-muted uppercase tracking-wider">
                  Objective Headline
                </label>
                <input
                  type="text"
                  required
                  value={roadmapTitle}
                  onChange={(e) => setRoadmapTitle(e.target.value)}
                  className="w-full px-4 py-2.5 bg-canvas border border-border-hairline rounded-lg text-ink focus:outline-hidden focus:ring-3 focus:ring-primary/15 focus:border-primary transition-all"
                />
              </div>

              {/* Type Category */}
              <div className="space-y-1">
                <label className="block text-xs font-semibold text-ink-muted uppercase tracking-wider">
                  Target Priority Tier
                </label>
                <select
                  value={roadmapType}
                  onChange={(e) => setRoadmapType(e.target.value)}
                  className="w-full px-4 py-2.5 bg-canvas border border-border-hairline rounded-lg text-ink focus:outline-hidden focus:ring-3 focus:ring-primary/15 focus:border-primary transition-all"
                >
                  <option value="PRIMARY OBJECTIVE">Primary Objective</option>
                  <option value="SECONDARY OBJECTIVE">Secondary Objective</option>
                  <option value="TERTIARY OBJECTIVE">Tertiary Objective</option>
                </select>
              </div>

              {/* Status & Deadline */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="block text-xs font-semibold text-ink-muted uppercase tracking-wider">
                    Execution State
                  </label>
                  <select
                    value={roadmapStatus}
                    onChange={(e) => setRoadmapStatus(e.target.value)}
                    className="w-full px-4 py-2.5 bg-canvas border border-border-hairline rounded-lg text-ink focus:outline-hidden focus:ring-3 focus:ring-primary/15 focus:border-primary transition-all"
                  >
                    <option value="Active Exploration">Active Exploration</option>
                    <option value="Paused">Paused</option>
                    <option value="Completed">Completed</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="block text-xs font-semibold text-ink-muted uppercase tracking-wider">
                    Target Release
                  </label>
                  <input
                    type="date"
                    value={roadmapDeadline}
                    onChange={(e) => setRoadmapDeadline(e.target.value)}
                    className="w-full px-4 py-2.5 bg-canvas border border-border-hairline rounded-lg text-ink focus:outline-hidden focus:ring-3 focus:ring-primary/15 focus:border-primary transition-all"
                  />
                </div>
              </div>

              {/* Progress Slider */}
              <div className="space-y-1">
                <div className="flex justify-between items-center">
                  <label className="block text-xs font-semibold text-ink-muted uppercase tracking-wider">
                    Project Completion Progress (%)
                  </label>
                  <span className="text-xs font-mono font-bold text-primary">{roadmapProgress}%</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="100"
                  step="5"
                  value={roadmapProgress}
                  onChange={(e) => setRoadmapProgress(parseInt(e.target.value))}
                  className="w-full accent-primary cursor-pointer"
                />
              </div>
            </>
          )}

          {/* Action Row */}
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
              Save Details
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
