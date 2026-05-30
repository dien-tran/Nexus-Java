import React, { useState } from 'react';
import { BookOpen, Calendar, CircleDot, Eye, Pencil, Plus } from 'lucide-react';
import { Plan, PlanStatus } from '../types';

interface WorkspaceViewProps {
  plans: Plan[];
  onAddPlan: (planData: Partial<Plan>) => void;
  onUpdatePlanStatus: (planId: string, status: PlanStatus) => void;
  onEditPlan?: (plan: Plan) => void;
  onSelectPlan?: (plan: Plan) => void;
}

export default function WorkspaceView({
  plans,
  onAddPlan,
  onUpdatePlanStatus,
  onEditPlan,
  onSelectPlan
}: WorkspaceViewProps) {
  const [isAddingPlan, setIsAddingPlan] = useState(false);
  const [planTitle, setPlanTitle] = useState('');
  const [planNote, setPlanNote] = useState('');

  const handleCreatePlan = (e: React.FormEvent) => {
    e.preventDefault();
    if (!planTitle.trim()) return;

    onAddPlan({
      title: planTitle.trim(),
      status: 'Drafting',
      note: planNote
    });

    setPlanTitle('');
    setPlanNote('');
    setIsAddingPlan(false);
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pb-4 border-b border-border-hairline">
        <div className="space-y-1">
          <h2 className="font-serif text-3xl font-medium text-ink">Plans</h2>
          <p className="text-xs text-ink-muted">Manage plans returned by the work-service backend.</p>
        </div>

        <button
          onClick={() => setIsAddingPlan(!isAddingPlan)}
          className="px-3.5 py-1.5 bg-primary hover:bg-primary-hover text-white text-xs font-semibold rounded-lg shadow-sm flex items-center gap-1 transition-all cursor-pointer"
        >
          <Plus size={14} /> Create Plan
        </button>
      </header>

      {isAddingPlan && (
        <form onSubmit={handleCreatePlan} className="p-5 bg-surface-card border-2 border-[#cc785c] rounded-xl space-y-4 animate-in slide-in-from-top-4 duration-200">
          <h4 className="font-serif text-base font-semibold text-ink">New Plan</h4>
          <div className="flex flex-col gap-1">
            <label className="text-[10px] font-mono uppercase font-bold text-ink-muted">Plan Name</label>
            <input
              type="text"
              required
              placeholder="e.g. Q4 content plan"
              value={planTitle}
              onChange={(e) => setPlanTitle(e.target.value)}
              className="px-3 py-2 bg-canvas border border-border-hairline rounded-md text-xs outline-hidden focus:ring-2 focus:ring-primary/20 focus:border-primary placeholder:text-ink-muted/50"
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-[10px] font-mono uppercase font-bold text-ink-muted">Note</label>
            <textarea
              rows={3}
              placeholder="Optional plan note..."
              value={planNote}
              onChange={(e) => setPlanNote(e.target.value)}
              className="px-3 py-2 bg-canvas border border-border-hairline rounded-md text-xs outline-hidden focus:ring-2 focus:ring-primary/20 focus:border-primary placeholder:text-ink-muted/50 resize-none"
            />
          </div>
          <div className="flex justify-end gap-3">
            <button
              type="button"
              onClick={() => setIsAddingPlan(false)}
              className="px-3 py-1.5 text-xs text-ink-muted hover:underline"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-1.5 bg-primary text-white text-xs font-semibold rounded-md shadow-xs"
            >
              Save Plan
            </button>
          </div>
        </form>
      )}

      <section className="space-y-6">
        <div className="flex justify-between items-center bg-surface-emphasis/30 p-4 border border-border-hairline rounded-xl">
          <h3 className="font-serif text-lg font-medium text-ink inline-flex items-center gap-2">
            <CircleDot size={14} className="text-[#a25135]" /> Active Plans
          </h3>
          <span className="text-[10px] font-mono text-ink-muted uppercase">{plans.length} total</span>
        </div>

        {plans.length === 0 ? (
          <div className="bg-surface-card/40 border border-dashed border-border-hairline rounded-xl p-10 text-center space-y-3">
            <p className="text-xs text-ink-muted italic font-mono uppercase">No plans yet</p>
            <button
              onClick={() => setIsAddingPlan(true)}
              className="text-xs font-semibold text-primary underline hover:text-[#a25135] cursor-pointer"
            >
              Create your first plan
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {plans.map((plan) => (
              <div
                key={plan.id}
                className="bg-canvas border border-border-hairline rounded-xl p-5 shadow-xs space-y-4 hover:border-[#cc785c] transition-all"
              >
                <div className="flex justify-between items-start gap-4">
                  <div className="space-y-1">
                    <span className="text-[10px] font-mono font-medium uppercase tracking-wider text-primary bg-primary/10 px-2 py-0.5 rounded">
                      Plan
                    </span>
                    <h4 className="font-serif text-lg font-semibold leading-snug pt-1 text-ink">
                      {plan.title}
                    </h4>
                  </div>

                  <span className={`text-[9px] font-mono font-bold uppercase tracking-wider px-2.5 py-1 rounded border ${
                    plan.status === 'Completed' ? 'bg-[#1d8372]/15 text-[#136355] border-[#1d8372]/30' :
                    plan.status === 'In Review' ? 'bg-[#cc785c]/10 text-[#a34b2f] border-[#cc785c]/30' :
                    'bg-[#efe9de]/40 text-[#8f482f] border-[#cc785c]/20'
                  }`}>
                    {plan.status}
                  </span>
                </div>

                {plan.note && (
                  <p className="text-xs text-ink-muted leading-relaxed font-sans border-t border-border-hairline/60 pt-3">
                    {plan.note}
                  </p>
                )}

                {plan.dueDate && (
                  <div className="flex items-center gap-1 pt-2 border-t border-border-hairline/60 text-[11px] text-ink-muted font-mono">
                    <Calendar size={12} />
                    <span>Due date: <strong className="text-ink font-medium">{plan.dueDate}</strong></span>
                  </div>
                )}

                <div className="flex gap-2 justify-between items-center pt-1">
                  <div className="flex gap-2">
                    {onSelectPlan && (
                      <button
                        type="button"
                        onClick={() => onSelectPlan(plan)}
                        className="px-2 py-0.5 text-[10px] uppercase font-mono rounded text-primary border border-primary/30 hover:bg-[#efe9de] transition-all font-bold flex items-center gap-1 cursor-pointer"
                      >
                        <Eye size={10} /> View Tasks
                      </button>
                    )}
                    {onEditPlan && (
                      <button
                        type="button"
                        onClick={() => onEditPlan(plan)}
                        className="px-2 py-0.5 text-[10px] uppercase font-mono rounded text-[#8f482f]/80 border border-dashed border-[#cc785c]/30 hover:bg-[#efe9de] transition-all flex items-center gap-1 cursor-pointer"
                      >
                        <Pencil size={10} /> Update
                      </button>
                    )}
                  </div>
                  <div className="flex gap-1.5 ml-auto">
                    <button
                      onClick={() => onUpdatePlanStatus(plan.id, 'Drafting')}
                      className={`px-2 py-0.5 text-[10px] uppercase font-mono rounded ${plan.status === 'Drafting' ? 'bg-[#efe9de] text-ink font-bold' : 'text-ink-muted hover:text-ink'}`}
                    >
                      Draft
                    </button>
                    <button
                      onClick={() => onUpdatePlanStatus(plan.id, 'In Review')}
                      className={`px-2 py-0.5 text-[10px] uppercase font-mono rounded ${plan.status === 'In Review' ? 'bg-[#efe9de] text-ink font-bold' : 'text-ink-muted hover:text-ink'}`}
                    >
                      Review
                    </button>
                    <button
                      onClick={() => onUpdatePlanStatus(plan.id, 'Completed')}
                      className={`px-2 py-0.5 text-[10px] uppercase font-mono rounded ${plan.status === 'Completed' ? 'bg-[#efe9de] text-ink font-bold' : 'text-ink-muted hover:text-ink'}`}
                    >
                      Complete
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
