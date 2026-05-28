import React, { useState } from 'react';
import { BookOpen, Map, CheckSquare, Square, Calendar, Plus, ChevronDown, Check, Play, CircleDot, Pencil, Eye } from 'lucide-react';
import { ActiveStory, RoadmapProject, StoryStatus } from '../types';

interface WorkspaceViewProps {
  stories: ActiveStory[];
  roadmaps: RoadmapProject[];
  onAddStory: (storyData: Partial<ActiveStory>) => void;
  onUpdateStoryStatus: (storyId: string, status: StoryStatus) => void;
  onToggleMilestone: (projectId: string, milestoneId: string) => void;
  onResumeProject: (projectId: string) => void;
  onEditStory?: (story: ActiveStory) => void;
  onEditRoadmap?: (project: RoadmapProject) => void;
  onSelectStory?: (story: ActiveStory) => void;
  onSelectRoadmap?: (project: RoadmapProject) => void;
}

export default function WorkspaceView({
  stories,
  roadmaps,
  onAddStory,
  onUpdateStoryStatus,
  onToggleMilestone,
  onResumeProject,
  onEditStory,
  onEditRoadmap,
  onSelectStory,
  onSelectRoadmap
}: WorkspaceViewProps) {
  const [activeSubTab, setActiveSubTab] = useState<'pipeline' | 'roadmap'>('pipeline');
  const [isAddingStory, setIsAddingStory] = useState(false);
  const [storyTitle, setStoryTitle] = useState('');
  const [storyNote, setStoryNote] = useState('');
  const [storyDueDate, setStoryDueDate] = useState('');

  const handleCreateStory = (e: React.FormEvent) => {
    e.preventDefault();
    if (!storyTitle.trim()) return;

    onAddStory({
      title: storyTitle,
      category: 'General Plan',
      status: 'Drafting',
      dueDate: storyDueDate || new Date().toISOString().split('T')[0],
      note: storyNote,
      assigneeImages: [
        'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=80&fit=crop'
      ]
    });

    setStoryTitle('');
    setStoryNote('');
    setStoryDueDate('');
    setIsAddingStory(false);
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header and sub-tab selection */}
      <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pb-4 border-b border-border-hairline">
        <div className="space-y-1">
          <h2 className="font-serif text-3xl font-medium text-ink">Creative Workspace</h2>
          <p className="text-xs text-ink-muted">Track literary productions and long-term project milestones.</p>
        </div>

        {/* Tab selector pill */}
        <div className="flex bg-surface-card border border-border-hairline p-1 rounded-lg">
          <button
            type="button"
            onClick={() => setActiveSubTab('pipeline')}
            className={`px-4 py-1.5 rounded-md text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${activeSubTab === 'pipeline' ? 'bg-canvas text-[#8f482f] shadow-xs' : 'text-ink-muted hover:text-ink'}`}
          >
            <BookOpen size={14} /> Q4 Editorial Queue
          </button>
          <button
            type="button"
            onClick={() => setActiveSubTab('roadmap')}
            className={`px-4 py-1.5 rounded-md text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${activeSubTab === 'roadmap' ? 'bg-canvas text-[#8f482f] shadow-xs' : 'text-ink-muted hover:text-ink'}`}
          >
            <Map size={14} /> Roadmap Objectives
          </button>
        </div>
      </header>

      {/* RENDER VIEW 1: Q4 PIPELINE (Screenshot 2) */}
      {activeSubTab === 'pipeline' && (
        <section className="space-y-6">
          <div className="flex justify-between items-center bg-surface-emphasis/30 p-4 border border-border-hairline rounded-xl">
            <h3 className="font-serif text-lg font-medium text-ink inline-flex items-center gap-2">
              <CircleDot size={14} className="text-[#a25135]" /> Production Queue
            </h3>
            <button
              onClick={() => setIsAddingStory(!isAddingStory)}
              className="px-3.5 py-1.5 bg-primary hover:bg-primary-hover text-white text-xs font-semibold rounded-lg shadow-sm flex items-center gap-1 transition-all cursor-pointer"
            >
              <Plus size={14} /> Create Proposal
            </button>
          </div>

          {/* Add story micro view */}
          {isAddingStory && (
            <form onSubmit={handleCreateStory} className="p-5 bg-surface-card border-2 border-[#cc785c] rounded-xl space-y-4 animate-in slide-in-from-top-4 duration-200">
              <h4 className="font-serif text-base font-semibold text-ink">New Creative Proposal</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] font-mono uppercase font-bold text-ink-muted">Proposal Title</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Eco-Minimalism: Reclaiming Spaces"
                    value={storyTitle}
                    onChange={(e) => setStoryTitle(e.target.value)}
                    className="px-3 py-2 bg-canvas border border-border-hairline rounded-md text-xs outline-hidden focus:ring-2 focus:ring-primary/20 focus:border-primary placeholder:text-ink-muted/50"
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] font-mono uppercase font-bold text-ink-muted">Target Deadline</label>
                  <input
                    type="date"
                    required
                    value={storyDueDate}
                    onChange={(e) => setStoryDueDate(e.target.value)}
                    className="px-3 py-2 bg-canvas border border-border-hairline rounded-md text-xs outline-hidden focus:ring-2 focus:ring-primary/20 focus:border-primary"
                  />
                </div>
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-mono uppercase font-bold text-ink-muted">Note / Description</label>
                <textarea
                  rows={2}
                  placeholder="Provide context or summary for this creative proposal..."
                  value={storyNote}
                  onChange={(e) => setStoryNote(e.target.value)}
                  className="px-3 py-2 bg-canvas border border-border-hairline rounded-md text-xs outline-hidden focus:ring-2 focus:ring-primary/20 focus:border-primary placeholder:text-ink-muted/50 resize-none"
                />
              </div>
              <div className="flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsAddingStory(false)}
                  className="px-3 py-1.5 text-xs text-ink-muted hover:underline"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-primary text-white text-xs font-semibold rounded-md shadow-xs"
                >
                  Confirm Proposal
                </button>
              </div>
            </form>
          )}

          {/* Stories list rendering exactly styled */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {stories.map((story) => (
              <div
                key={story.id}
                className="bg-canvas border border-border-hairline rounded-xl p-5 shadow-xs space-y-4 hover:border-[#cc785c] transition-all"
              >
                <div className="flex justify-between items-start gap-4">
                  <div className="space-y-1">
                    {story.category && (
                      <span className="text-[10px] font-mono font-medium uppercase tracking-wider text-primary bg-primary/10 px-2 py-0.5 rounded">
                        {story.category}
                      </span>
                    )}
                    <h4 className="font-serif text-lg font-semibold leading-snug pt-1 text-ink">
                      {story.title}
                    </h4>
                  </div>
 
                  <span className={`text-[9px] font-mono font-bold uppercase tracking-wider px-2.5 py-1 rounded border ${
                    story.status === 'Completed' ? 'bg-[#1d8372]/15 text-[#136355] border-[#1d8372]/30' :
                    story.status === 'In Review' ? 'bg-[#cc785c]/10 text-[#a34b2f] border-[#cc785c]/30' :
                    'bg-[#efe9de]/40 text-[#8f482f] border-[#cc785c]/20'
                  }`}>
                    {story.status}
                  </span>
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-border-hairline/60 text-[11px] text-ink-muted font-mono">
                  <div className="flex items-center gap-1">
                    <Calendar size={12} />
                    <span>Target deadline: <strong className="text-ink font-medium">{story.dueDate}</strong></span>
                  </div>

                  <div className="flex items-center gap-2">
                    <div className="flex -space-x-1.5 overflow-hidden">
                      {story.assigneeImages.map((img, idx) => (
                        <img
                          key={idx}
                          src={img}
                          alt="Assignee"
                          referrerPolicy="no-referrer"
                          className="inline-block h-6 w-6 rounded-full ring-2 ring-canvas object-cover"
                        />
                      ))}
                    </div>
                  </div>
                </div>

                <div className="flex gap-2 justify-between items-center pt-1">
                  <div className="flex gap-2">
                    {onSelectStory && (
                      <button
                        type="button"
                        onClick={() => onSelectStory(story)}
                        className="px-2 py-0.5 text-[10px] uppercase font-mono rounded text-primary border border-primary/30 hover:bg-[#efe9de] transition-all font-bold flex items-center gap-1 cursor-pointer"
                        title="See details & tasks for this proposal"
                      >
                        <Eye size={10} /> View Details & Tasks
                      </button>
                    )}
                    {onEditStory && (
                      <button
                        type="button"
                        onClick={() => onEditStory(story)}
                        className="px-2 py-0.5 text-[10px] uppercase font-mono rounded text-[#8f482f]/80 border border-dashed border-[#cc785c]/30 hover:bg-[#efe9de] transition-all flex items-center gap-1 cursor-pointer"
                      >
                        <Pencil size={10} /> Update Details
                      </button>
                    )}
                  </div>
                  <div className="flex gap-1.5 ml-auto">
                    <button
                      onClick={() => onUpdateStoryStatus(story.id, 'Drafting')}
                      className={`px-2 py-0.5 text-[10px] uppercase font-mono rounded ${story.status === 'Drafting' ? 'bg-[#efe9de] text-ink font-bold' : 'text-ink-muted hover:text-ink'}`}
                    >
                      Draft
                    </button>
                    <button
                      onClick={() => onUpdateStoryStatus(story.id, 'In Review')}
                      className={`px-2 py-0.5 text-[10px] uppercase font-mono rounded ${story.status === 'In Review' ? 'bg-[#efe9de] text-ink font-bold' : 'text-ink-muted hover:text-ink'}`}
                    >
                      Review
                    </button>
                    <button
                      onClick={() => onUpdateStoryStatus(story.id, 'Completed')}
                      className={`px-2 py-0.5 text-[10px] uppercase font-mono rounded ${story.status === 'Completed' ? 'bg-[#efe9de] text-ink font-bold' : 'text-ink-muted hover:text-ink'}`}
                    >
                      Complete
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* RENDER VIEW 2: MAP ROADMAP OBJECTIVES (Screenshot 6) */}
      {activeSubTab === 'roadmap' && (
        <section className="space-y-6">
          <div className="grid grid-cols-1 gap-6">
            {roadmaps.map((project) => (
              <div
                key={project.id}
                className="bg-canvas border border-border-hairline rounded-xl p-6 shadow-xs space-y-4 hover:shadow-sm transition-all"
              >
                {/* Header info */}
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 pb-3 border-b border-border-hairline">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-mono tracking-widest font-bold text-primary">
                        {project.type}
                      </span>
                      <span className={`w-1.5 h-1.5 rounded-full ${project.status === 'Paused' ? 'bg-amber-500' : 'bg-green-600'}`}></span>
                      <span className="text-[10px] font-mono text-ink-muted uppercase">
                        {project.status}
                      </span>
                    </div>
                    <h3 className="font-serif text-xl font-bold text-ink">{project.title}</h3>
                  </div>

                  <div className="text-right">
                    <span className="block text-xs font-mono text-ink-muted">Deadline</span>
                    <span className="text-sm font-semibold text-ink">{project.deadline}</span>
                  </div>
                </div>

                {/* Progress bar info */}
                <div className="space-y-2">
                  <div className="flex justify-between items-center text-xs font-mono text-ink-muted">
                    <span>Overall Objective Progress</span>
                    <span className="font-bold text-ink">{project.progress}%</span>
                  </div>
                  <div className="w-full bg-[#efe9de] h-2.5 rounded-full overflow-hidden border border-border-hairline">
                    <div
                      className="bg-[#cc785c] h-full rounded-full transition-all duration-500"
                      style={{ width: `${project.progress}%` }}
                    ></div>
                  </div>
                </div>

                {/* Milestones dynamic Checklist */}
                <div className="space-y-3 pt-2">
                  <span className="block text-xs font-bold text-ink font-mono uppercase tracking-wider">
                    Milestones Checklist
                  </span>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pb-2">
                    {project.milestones.map((milestone) => (
                      <div
                        key={milestone.id}
                        onClick={() => onToggleMilestone(project.id, milestone.id)}
                        className={`flex items-start gap-2.5 p-3 rounded-lg border cursor-pointer select-none transition-colors ${milestone.completed ? 'bg-surface-card/60 text-ink-muted border-border-hairline' : 'bg-canvas text-ink border-border-hairline hover:border-primary'}`}
                      >
                        <button
                          type="button"
                          className="mt-0.5 text-primary focus:outline-hidden"
                        >
                          {milestone.completed ? (
                            <CheckSquare size={16} className="text-[#a25135]" />
                          ) : (
                            <Square size={16} className="text-ink-muted" />
                          )}
                        </button>
                        <span className={`text-xs ${milestone.completed ? 'line-through text-ink-muted' : 'font-medium'}`}>
                          {milestone.title}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Roadmap & Resume project action links */}
                <div className="flex justify-between items-center pt-2 border-t border-border-hairline/60">
                  <div className="flex items-center gap-2">
                    {onSelectRoadmap && (
                      <button
                        type="button"
                        onClick={() => onSelectRoadmap(project)}
                        className="text-xs font-mono font-bold text-primary border border-primary/30 px-2.5 py-1 rounded hover:bg-[#efe9de] transition-all flex items-center gap-1 cursor-pointer"
                        title="See details & tasks for this objective"
                      >
                        <Eye size={11} /> View Details & Tasks
                      </button>
                    )}
                    {onEditRoadmap && (
                      <button
                        type="button"
                        onClick={() => onEditRoadmap(project)}
                        className="text-xs font-mono text-[#8f482f]/80 hover:underline cursor-pointer flex items-center gap-1 border border-dashed border-[#cc785c]/30 px-2.5 py-1 rounded"
                      >
                        <Pencil size={11} /> Update Details
                      </button>
                    )}
                  </div>
                  {project.status === 'Paused' && (
                    <button
                      onClick={() => onResumeProject(project.id)}
                      className="text-xs font-mono font-semibold text-primary inline-flex items-center gap-1 hover:underline underline-offset-4 cursor-pointer"
                    >
                      <Play size={12} className="fill-current" /> Resume Project Track
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
