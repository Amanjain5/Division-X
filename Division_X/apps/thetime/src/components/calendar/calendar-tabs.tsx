'use client';

interface CalendarTabsProps {
  activeTab: 'overview' | 'calendar' | 'tasks' | 'activity';
  onTabChange: (tab: 'overview' | 'calendar' | 'tasks' | 'activity') => void;
}

const tabs = [
  { id: 'overview', label: 'Overview' },
  { id: 'calendar', label: 'Calendar' },
  { id: 'tasks', label: 'Tasks' },
  { id: 'activity', label: 'Activity' },
] as const;

export function CalendarTabs({ activeTab, onTabChange }: CalendarTabsProps) {
  return (
    <div className="flex gap-8 border-b border-slate-700/50 mb-6 pb-0">
      {tabs.map((tab) => (
        <button
          key={tab.id}
          onClick={() => onTabChange(tab.id as typeof activeTab)}
          className={`px-1 py-3 text-sm font-medium transition-all border-b-2 ${
            activeTab === tab.id
              ? 'text-white border-blue-500'
              : 'text-slate-400 border-transparent hover:text-slate-300'
          }`}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
}
