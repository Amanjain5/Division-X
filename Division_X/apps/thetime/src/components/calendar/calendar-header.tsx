'use client';

interface CalendarHeaderProps {
  currentDate: Date;
  viewMode: 'week' | 'month' | 'year';
  onPrevious: () => void;
  onNext: () => void;
  onToday: () => void;
  onViewChange: (view: 'week' | 'month' | 'year') => void;
}

export function CalendarHeader({
  currentDate,
  viewMode,
  onPrevious,
  onNext,
  onToday,
  onViewChange,
}: CalendarHeaderProps) {
  const formatDateRange = () => {
    if (viewMode === 'week') {
      const sunday = new Date(currentDate);
      sunday.setDate(currentDate.getDate() - currentDate.getDay());
      const saturday = new Date(sunday);
      saturday.setDate(sunday.getDate() + 6);
      
      return `${sunday.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${saturday.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`;
    } else if (viewMode === 'month') {
      return currentDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
    } else {
      return currentDate.getFullYear().toString();
    }
  };

  return (
    <div className="flex items-center justify-between gap-4 mb-6">
      <div>
        <h1 className="text-2xl font-bold text-white mb-1">Calendar</h1>
        <p className="text-sm text-slate-400">{formatDateRange()}</p>
      </div>

      <div className="flex items-center gap-3">
        {/* Navigation controls */}
        <div className="flex items-center gap-1 bg-slate-800/50 border border-slate-700/50 rounded-lg p-1">
          <button
            onClick={onPrevious}
            className="p-2 hover:bg-slate-700/50 rounded transition-colors text-slate-400 hover:text-white"
            title="Previous"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <button
            onClick={onToday}
            className="px-3 py-1 text-xs font-semibold hover:bg-slate-700/50 rounded transition-colors text-slate-400 hover:text-white uppercase"
          >
            Today
          </button>
          <button
            onClick={onNext}
            className="p-2 hover:bg-slate-700/50 rounded transition-colors text-slate-400 hover:text-white"
            title="Next"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>

        {/* View mode toggle */}
        <div className="flex items-center gap-1 bg-slate-800/50 border border-slate-700/50 rounded-lg p-1">
          {(['week', 'month', 'year'] as const).map((view) => (
            <button
              key={view}
              onClick={() => onViewChange(view)}
              className={`px-3 py-1 text-xs font-semibold rounded transition-colors uppercase ${
                viewMode === view
                  ? 'bg-blue-600/50 text-white'
                  : 'text-slate-400 hover:text-white hover:bg-slate-700/50'
              }`}
            >
              {view}
            </button>
          ))}
        </div>

        {/* Additional controls */}
        <button className="p-2 hover:bg-slate-700/50 rounded transition-colors text-slate-400 hover:text-white">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2m0 7a1 1 0 110-2 1 1 0 010 2m0 7a1 1 0 110-2 1 1 0 010 2" />
          </svg>
        </button>
      </div>
    </div>
  );
}
