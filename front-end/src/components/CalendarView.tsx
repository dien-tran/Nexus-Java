import React, { useState } from 'react';
import { ChevronLeft, ChevronRight, Calendar, Sparkles, BookOpen, Clock } from 'lucide-react';
import { Task, AppState } from '../types';

interface CalendarViewProps {
  appState: AppState;
  onUpdateTaskStatus: (taskId: string, status: Task['status']) => void;
  onAddTask: (taskData: Partial<Task>) => void;
  onNavigateToTab: (tabName: string) => void;
  onEditTask?: (task: Task) => void;
}

export function parseTaskDueDate(dueDateStr: string, parentString?: string): Date | null {
  if (!dueDateStr || dueDateStr.toLowerCase() === 'no due date') return null;
  
  const normalized = dueDateStr.trim().toLowerCase();
  const fullNormalized = (parentString || dueDateStr).trim().toLowerCase();
  const today = new Date();
  
  // 1. Relative terms
  if (normalized.includes('today') || normalized.includes('hour') || normalized.includes('minute') || normalized.includes('mins') || normalized.includes('now')) {
    return today;
  }
  if (normalized.includes('tomorrow')) {
    const tomorrow = new Date();
    tomorrow.setDate(today.getDate() + 1);
    return tomorrow;
  }
  
  // 2. Month-day formatting
  const months = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];
  for (let i = 0; i < 12; i++) {
    const monthName = months[i];
    if (normalized.includes(monthName) || fullNormalized.includes(monthName)) {
      // Find the day number in the current part
      const digits = normalized.match(/\d+/);
      if (digits && digits.length > 0) {
        const day = parseInt(digits[0], 10);
        let year = today.getFullYear();
        
        // Check for year in the parent string
        if (fullNormalized.includes('2024')) {
          year = 2024;
        } else if (fullNormalized.includes('2025')) {
          year = 2025;
        } else if (fullNormalized.includes('2026')) {
          year = 2026;
        }
        
        // Handle case where month is not in normalized but in fullNormalized
        let monthIndex = i;
        if (!normalized.includes(monthName) && fullNormalized.includes(monthName)) {
          monthIndex = months.findIndex(m => fullNormalized.includes(m));
        }
        
        return new Date(year, monthIndex, day);
      }
    }
  }
  
  // 3. Fallback standard Date parsing
  try {
    const parsed = new Date(dueDateStr);
    if (!isNaN(parsed.getTime())) {
      return parsed;
    }
  } catch (e) {}
  
  return null;
}

export function parseTaskDueDateRange(dueDateStr: string): { start: Date; end: Date } | null {
  if (!dueDateStr) return null;
  const parts = dueDateStr.split('-');
  if (parts.length === 2) {
    const start = parseTaskDueDate(parts[0], dueDateStr);
    const end = parseTaskDueDate(parts[1], dueDateStr);
    if (start && end) {
      return { start, end };
    }
  }
  const single = parseTaskDueDate(dueDateStr);
  if (single) {
    return { start: single, end: single };
  }
  return null;
}

export function getTaskDateRange(task: Task): { start: Date; end: Date } | null {
  let start: Date | null = null;
  let end: Date | null = null;

  if (task.startDate) {
    const d = new Date(task.startDate);
    if (!isNaN(d.getTime())) start = d;
  }
  if (task.dueDate) {
    if (task.dueDate.includes('-')) {
      const parsedRange = parseTaskDueDateRange(task.dueDate);
      if (parsedRange) {
        if (!start) start = parsedRange.start;
        end = parsedRange.end;
      }
    } else {
      const d = new Date(task.dueDate);
      if (!isNaN(d.getTime())) {
        end = d;
      } else {
        const fallback = parseTaskDueDate(task.dueDate);
        if (fallback) end = fallback;
      }
    }
  }

  if (!start && end) start = end;
  if (start && !end) end = start;

  if (start && end) {
    if (start > end) {
      return { start: end, end: start };
    }
    return { start, end };
  }
  return null;
}

export default function CalendarView({
  appState,
  onUpdateTaskStatus,
  onAddTask,
  onNavigateToTab,
  onEditTask
}: CalendarViewProps) {
  // Start on Sep 16, 2024 to match the user's mockup default
  const [currentDate, setCurrentDate] = useState<Date>(new Date());
  const [viewType, setViewType] = useState<'week' | 'month'>('week');

  // Month select options
  const getDropdownOptions = () => {
    const options = [];
    const years = [2024, 2025, 2026];
    const monthNames = [
      "January", "February", "March", "April", "May", "June", 
      "July", "August", "September", "October", "November", "December"
    ];
    for (const year of years) {
      for (let m = 0; m < 12; m++) {
        options.push({
          value: `${year}-${m}`,
          label: `${monthNames[m]} ${year}`
        });
      }
    }
    return options;
  };

  const handleMonthChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const [year, month] = e.target.value.split('-').map(Number);
    setCurrentDate(new Date(year, month, 15)); // Target middle of month to avoid boundary shifts
  };

  // Week calculation helpers
  const getWeekStart = (d: Date): Date => {
    const date = new Date(d);
    const day = date.getDay();
    const diff = date.getDate() - day + (day === 0 ? -6 : 1); // adjust when day is sunday (make monday start)
    return new Date(date.setDate(diff));
  };

  const weekDays = [];
  const weekStart = getWeekStart(currentDate);
  for (let i = 0; i < 7; i++) {
    const day = new Date(weekStart);
    day.setDate(weekStart.getDate() + i);
    weekDays.push(day);
  }
  const weekEnd = weekDays[6];

  // Month calculation helpers
  const firstDayOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
  const startDayOfWeek = firstDayOfMonth.getDay(); // 0=Sun, 1=Mon...
  const startOfGrid = new Date(firstDayOfMonth);
  const paddingStart = startDayOfWeek === 0 ? 6 : startDayOfWeek - 1;
  startOfGrid.setDate(firstDayOfMonth.getDate() - paddingStart);

  const gridDays = [];
  for (let i = 0; i < 42; i++) {
    const day = new Date(startOfGrid);
    day.setDate(startOfGrid.getDate() + i);
    gridDays.push(day);
  }

  // Prev / Next Navigation Handlers
  const handlePrev = () => {
    if (viewType === 'week') {
      const prevWeek = new Date(currentDate);
      prevWeek.setDate(currentDate.getDate() - 7);
      setCurrentDate(prevWeek);
    } else {
      const prevMonth = new Date(currentDate);
      prevMonth.setMonth(currentDate.getMonth() - 1);
      setCurrentDate(prevMonth);
    }
  };

  const handleNext = () => {
    if (viewType === 'week') {
      const nextWeek = new Date(currentDate);
      nextWeek.setDate(currentDate.getDate() + 7);
      setCurrentDate(nextWeek);
    } else {
      const nextMonth = new Date(currentDate);
      nextMonth.setMonth(currentDate.getMonth() + 1);
      setCurrentDate(nextMonth);
    }
  };

  const getHeaderDateRange = () => {
    if (viewType === 'week') {
      const start = weekDays[0];
      const end = weekDays[6];
      const startMonth = start.toLocaleDateString('en-US', { month: 'short' });
      const endMonth = end.toLocaleDateString('en-US', { month: 'short' });
      const startDay = start.getDate();
      const endDay = end.getDate();
      const startYear = start.getFullYear();
      const endYear = end.getFullYear();
      
      if (startYear !== endYear) {
        return `${startMonth} ${startDay}, ${startYear} - ${endMonth} ${endDay}, ${endYear}`;
      }
      return `${startMonth} ${startDay} - ${endMonth} ${endDay}, ${startYear}`;
    } else {
      return currentDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
    }
  };

  // Task filtering & visual styles mapping
  const getTaskStyles = (task: Task) => {
    const title = task.title.toLowerCase();
    
    if (title.includes('strategy')) {
      return 'bg-[#008f7a] text-white border-[#008f7a]';
    }
    if (title.includes('anthology')) {
      return 'bg-[#a25135] text-white border-[#a25135]';
    }
    if (title.includes('market')) {
      return 'bg-[#005f56] text-white border-[#005f56]';
    }
    
    // Category mapping fallback
    switch (task.category.toUpperCase()) {
      case 'EDITORIAL':
        return 'bg-primary text-white border-primary';
      case 'DESIGN':
        return 'bg-[#e8a55a] text-ink font-semibold border-[#e8a55a]';
      case 'CONTENT':
        return 'bg-[#005f56] text-white border-[#005f56]';
      case 'ENGINEERING':
        return 'bg-[#1d8372] text-white border-[#1d8372]';
      default:
        return 'bg-surface-card text-ink border-border-hairline';
    }
  };

  // Filter tasks for the active week view
  const activeWeekTasks = appState.tasks.map(task => {
    const range = getTaskDateRange(task);
    return { task, range };
  }).filter(item => {
    if (!item.range) return false;
    const startOnlyDate = new Date(item.range.start.getFullYear(), item.range.start.getMonth(), item.range.start.getDate());
    const endOnlyDate = new Date(item.range.end.getFullYear(), item.range.end.getMonth(), item.range.end.getDate());
    const weekStartOnly = new Date(weekStart.getFullYear(), weekStart.getMonth(), weekStart.getDate());
    const weekEndOnly = new Date(weekEnd.getFullYear(), weekEnd.getMonth(), weekEnd.getDate());
    
    return startOnlyDate <= weekEndOnly && endOnlyDate >= weekStartOnly;
  });

  const spanningWeekItems = activeWeekTasks.filter(item => {
    return item.range!.start.toDateString() !== item.range!.end.toDateString();
  });

  const dailyWeekItems = activeWeekTasks.filter(item => {
    return item.range!.start.toDateString() === item.range!.end.toDateString();
  });

  return (
    <div className="space-y-6 animate-fade-in max-w-7xl mx-auto w-full">
      {/* Top Header section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border-hairline pb-4">
        <div>
          <h2 className="font-serif text-3xl font-medium text-ink">Editorial Calendar</h2>
          <p className="text-sm text-ink-muted leading-relaxed font-sans">
            Visualize your upcoming milestones and publication deadlines.
          </p>
        </div>
        
        {/* Navigation Controls */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Date Selector Navigation */}
          <div className="flex items-center gap-2 bg-[#efe9de] border border-[#e6dfd8] rounded-lg px-2 py-1">
            <button 
              onClick={handlePrev}
              className="p-1 hover:bg-canvas rounded-md transition-colors cursor-pointer text-ink-muted hover:text-ink"
            >
              <ChevronLeft size={16} />
            </button>
            <span className="text-xs font-mono font-bold px-2 text-ink uppercase tracking-wider min-w-[120px] text-center">
              {getHeaderDateRange()}
            </span>
            <button 
              onClick={handleNext}
              className="p-1 hover:bg-canvas rounded-md transition-colors cursor-pointer text-ink-muted hover:text-ink"
            >
              <ChevronRight size={16} />
            </button>
          </div>

          {/* Month Dropdown jump selector */}
          <select
            value={`${currentDate.getFullYear()}-${currentDate.getMonth()}`}
            onChange={handleMonthChange}
            className="px-3 py-1.5 bg-canvas border border-border-hairline rounded-lg text-xs font-mono font-bold text-ink cursor-pointer focus:outline-hidden focus:ring-2 focus:ring-primary/10"
          >
            {getDropdownOptions().map(opt => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>

          {/* Toggle Switch week / month */}
          <div className="flex rounded-lg border border-border-hairline overflow-hidden p-0.5 bg-[#efe9de]">
            <button
              onClick={() => setViewType('week')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all cursor-pointer ${
                viewType === 'week' 
                  ? 'bg-canvas text-[#8f482f] shadow-xs' 
                  : 'text-ink-muted hover:text-ink'
              }`}
            >
              Week
            </button>
            <button
              onClick={() => setViewType('month')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all cursor-pointer ${
                viewType === 'month' 
                  ? 'bg-canvas text-[#8f482f] shadow-xs' 
                  : 'text-ink-muted hover:text-ink'
              }`}
            >
              Month
            </button>
          </div>

          {/* Today reset button */}
          <button
            onClick={() => setCurrentDate(new Date())}
            className="px-3 py-1.5 bg-[#8f482f] hover:bg-primary-hover text-white text-xs font-semibold rounded-lg shadow-sm transition-all active:scale-98 cursor-pointer"
          >
            Today
          </button>
        </div>
      </div>

      {/* Main Grid View render */}
      {viewType === 'week' ? (
        /* Week View rendering */
        <div className="bg-canvas border border-border-hairline rounded-2xl p-5 space-y-4 shadow-xs">
          {/* Calendar Headers */}
          <div className="grid grid-cols-7 gap-4 border-b border-border-hairline pb-3 text-center">
            {weekDays.map(day => {
              const isToday = day.toDateString() === new Date().toDateString();
              const dayNum = day.getDate();
              const dayLabel = day.toLocaleDateString('en-US', { weekday: 'short' }).toUpperCase();
              return (
                <div key={day.toISOString()} className="space-y-0.5">
                  <span className={`text-[10px] font-mono font-bold tracking-wider block ${isToday ? 'text-primary' : 'text-ink-muted'}`}>
                    {dayLabel} {dayNum}
                  </span>
                </div>
              );
            })}
          </div>

          {/* Multi-day Spanning Events Row */}
          <div className="grid grid-cols-7 gap-4 min-h-[70px] relative border-b border-border-hairline pb-4 pt-1">
            {spanningWeekItems.map(({ task, range }) => {
              const startOnlyDate = new Date(range.start.getFullYear(), range.start.getMonth(), range.start.getDate());
              const endOnlyDate = new Date(range.end.getFullYear(), range.end.getMonth(), range.end.getDate());
              const weekStartOnly = new Date(weekStart.getFullYear(), weekStart.getMonth(), weekStart.getDate());
              const weekEndOnly = new Date(weekEnd.getFullYear(), weekEnd.getMonth(), weekEnd.getDate());

              let colStart = 1;
              if (startOnlyDate > weekStartOnly) {
                colStart = weekDays.findIndex(d => d.toDateString() === startOnlyDate.toDateString()) + 1;
              }
              let colEnd = 8;
              if (endOnlyDate < weekEndOnly) {
                colEnd = weekDays.findIndex(d => d.toDateString() === endOnlyDate.toDateString()) + 2;
              }

              return (
                <div
                  key={task.id}
                  onClick={() => onEditTask && onEditTask(task)}
                  style={{ gridColumn: `${colStart} / ${colEnd}` }}
                  className={`p-3 rounded-lg border shadow-xs transition-all hover:shadow-sm cursor-pointer select-none ${getTaskStyles(task)} flex flex-col justify-between`}
                >
                  <div className="flex items-start gap-2">
                    <Calendar size={13} className="shrink-0 mt-0.5" />
                    <div>
                      <h4 className="text-xs font-serif font-bold leading-snug">{task.title}</h4>
                      <p className="text-[9px] font-mono tracking-wide opacity-80 mt-0.5">
                        {task.startDate ? `${task.startDate} to ${task.dueDate}` : task.dueDate}
                      </p>
                    </div>
                  </div>
                </div>
              );
            })}
            {spanningWeekItems.length === 0 && (
              <div className="col-span-7 flex items-center justify-center text-xs text-ink-muted italic py-4 opacity-40">
                No spanning tasks this week
              </div>
            )}
          </div>

          {/* Daily grid columns (Mon to Sun) */}
          <div className="grid grid-cols-7 gap-4 min-h-[300px] pt-1">
            {weekDays.map(day => {
              const dayString = day.toDateString();
              const tasksForDay = dailyWeekItems.filter(item => item.range.start.toDateString() === dayString);
              const isToday = dayString === new Date().toDateString();

              return (
                <div 
                  key={day.toISOString()} 
                  className={`border-r border-border-hairline/25 last:border-r-0 p-1 min-h-[280px] flex flex-col gap-2 rounded-lg transition-colors ${
                    isToday ? 'bg-primary/5 border border-primary/10' : ''
                  }`}
                >
                  {tasksForDay.map(({ task }) => (
                    <div
                      key={task.id}
                      onClick={() => onEditTask && onEditTask(task)}
                      className={`p-3 rounded-lg border shadow-xs transition-all hover:shadow-sm cursor-pointer select-none text-left ${getTaskStyles(task)} space-y-1.5`}
                    >
                      <h4 className="text-xs font-serif font-bold leading-snug">{task.title}</h4>
                      <div className="flex items-center gap-1 text-[9px] font-mono opacity-85">
                        <Clock size={10} />
                        <span>
                          {task.dueDate.includes('PM') || task.dueDate.includes('AM') 
                            ? task.dueDate.split(',')[1]?.trim() || task.dueDate 
                            : 'All Day'}
                        </span>
                      </div>
                    </div>
                  ))}
                  {tasksForDay.length === 0 && (
                    <div className="flex-1 flex items-center justify-center text-[10px] text-ink-muted italic opacity-25">
                      Empty
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        /* Month View rendering */
        <div className="bg-canvas border border-border-hairline rounded-2xl p-5 space-y-4 shadow-xs">
          {/* Grid Headers */}
          <div className="grid grid-cols-7 gap-2 border-b border-border-hairline pb-2 text-center">
            {['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'].map(dayLabel => (
              <span key={dayLabel} className="text-[10px] font-mono font-bold tracking-wider text-ink-muted">
                {dayLabel}
              </span>
            ))}
          </div>

          {/* 42 grid cells */}
          <div className="grid grid-cols-7 gap-2">
            {gridDays.map(day => {
              const dayString = day.toDateString();
              const isCurrentMonth = day.getMonth() === currentDate.getMonth();
              const isToday = dayString === new Date().toDateString();
              const dayNum = day.getDate();

              // Filter tasks falling on this day
              const tasksForDay = appState.tasks.map(task => {
                const range = getTaskDateRange(task);
                return { task, range };
              }).filter(item => {
                if (!item.range) return false;
                const dayOnly = new Date(day.getFullYear(), day.getMonth(), day.getDate());
                const startOnly = new Date(item.range.start.getFullYear(), item.range.start.getMonth(), item.range.start.getDate());
                const endOnly = new Date(item.range.end.getFullYear(), item.range.end.getMonth(), item.range.end.getDate());
                return dayOnly >= startOnly && dayOnly <= endOnly;
              });

              return (
                <div
                  key={day.toISOString()}
                  className={`min-h-[100px] border border-border-hairline rounded-lg p-2 flex flex-col gap-1 transition-all ${
                    isCurrentMonth ? 'bg-canvas' : 'bg-surface-card/40 opacity-55'
                  } ${
                    isToday ? 'ring-2 ring-primary border-transparent shadow-xs bg-primary/5' : ''
                  }`}
                >
                  <span className={`text-[10px] font-mono font-bold ${
                    isToday ? 'text-primary' : isCurrentMonth ? 'text-ink-muted' : 'text-ink-muted/40'
                  }`}>
                    {dayNum}
                  </span>

                  <div className="flex-1 overflow-y-auto space-y-1 pr-0.5">
                    {tasksForDay.map(({ task }) => (
                      <div
                        key={task.id}
                        onClick={(e) => {
                          e.stopPropagation();
                          if (onEditTask) onEditTask(task);
                        }}
                        className={`px-1.5 py-0.5 text-[9px] rounded-md font-sans border truncate cursor-pointer transition-all hover:brightness-95 shadow-2xs ${getTaskStyles(task)}`}
                        title={task.title}
                      >
                        {task.title}
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Mockup Context Cards row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-2">
        {/* Week's Focus */}
        <div className="bg-[#efe9de] border border-[#e6dfd8] rounded-xl p-5 flex items-start gap-4 shadow-xs">
          <div className="p-3 bg-canvas border border-[#e1d5c5] rounded-xl text-primary shrink-0">
            <BookOpen size={18} className="text-[#8f482f]" />
          </div>
          <div className="space-y-0.5">
            <span className="text-[9px] font-mono uppercase text-ink-muted tracking-widest font-bold block">
              Week's Focus
            </span>
            <h4 className="font-serif text-sm font-bold text-ink leading-snug">
              Anthology Wrap-up
            </h4>
            <p className="text-[10px] text-ink-muted font-mono uppercase">
              Editorial Goal
            </p>
          </div>
        </div>

        {/* AI Suggestions */}
        <div className="bg-[#efe9de] border border-[#e6dfd8] rounded-xl p-5 flex items-start gap-4 shadow-xs">
          <div className="p-3 bg-canvas border border-[#e1d5c5] rounded-xl text-[#005f56] shrink-0">
            <Sparkles size={18} className="text-[#008f7a]" />
          </div>
          <div className="space-y-0.5">
            <span className="text-[9px] font-mono uppercase text-ink-muted tracking-widest font-bold block">
              AI Suggestions
            </span>
            <p className="text-xs text-ink leading-relaxed font-sans italic pt-0.5">
              "Schedule a brief check-in for 'Final Polish' on Thursday morning."
            </p>
          </div>
        </div>

        {/* Upcoming Deadlines */}
        <div className="bg-[#efe9de] border border-[#e6dfd8] rounded-xl p-5 flex items-start gap-4 shadow-xs">
          <div className="p-3 bg-canvas border border-[#e1d5c5] rounded-xl text-primary shrink-0">
            <Calendar size={18} className="text-[#8f482f]" />
          </div>
          <div className="space-y-1 flex-1">
            <span className="text-[9px] font-mono uppercase text-ink-muted tracking-widest font-bold block">
              Upcoming Deadlines
            </span>
            <div className="flex justify-between items-baseline pt-0.5">
              <h4 className="font-serif text-sm font-semibold text-ink leading-snug">
                Anthology Release
              </h4>
              <span className="text-[9px] font-mono font-bold text-[#ad5f45]">
                2 Days
              </span>
            </div>
            <div className="w-full bg-[#e6dfd8] h-1.5 rounded-full overflow-hidden border border-border-hairline/60 mt-1">
              <div className="bg-[#ad5f45] h-full rounded-full" style={{ width: '80%' }}></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
