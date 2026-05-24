'use client';

interface CalendarViewProps {
  title: string;
  dateRange: string;
  weekDays: Array<{ day: string; date: number }>;
  onToday: () => void;
  onViewChange: (view: 'week' | 'month' | 'year') => void;
  currentView: 'week' | 'month' | 'year';
  totalEvents?: number;
  totalHours?: string;
  children?: React.ReactNode;
}

export function CalendarView({
  title,
  dateRange,
  weekDays,
  onToday,
  onViewChange,
  currentView,
  totalEvents = 0,
  totalHours = '0m',
  children,
}: CalendarViewProps) {
  return (
    <section className="timesheet-main-panel">
      <div className="scheduler-toolbar">
        <div>
          <p className="scheduler-eyebrow">Timesheet calendar</p>
          <div className="scheduler-title-row">
            <h2>{title}</h2>
            <span>{dateRange}</span>
          </div>
        </div>

        <div className="scheduler-actions">
          <div className="scheduler-segmented">
            {(['week', 'month', 'year'] as const).map((view) => (
              <button
                key={view}
                onClick={() => onViewChange(view)}
                className={currentView === view ? 'active' : ''}
              >
                {view.charAt(0).toUpperCase() + view.slice(1)}
              </button>
            ))}
          </div>

          <button onClick={onToday} className="scheduler-tool-button">
            <span aria-hidden="true">‹</span>
            Today
            <span aria-hidden="true">›</span>
          </button>

          <button className="scheduler-tool-button">
            <span aria-hidden="true">▣</span>
            Jump to date
          </button>

          <button className="scheduler-icon-button" aria-label="More calendar filters">
            ⚙
          </button>
        </div>
      </div>

      <div className="scheduler-metrics">
        <div>
          <strong>{totalHours}</strong>
          <span>logged in this range</span>
        </div>
        <div>
          <strong>{totalEvents}</strong>
          <span>time blocks scheduled</span>
        </div>
        <div>
          <strong>{weekDays.length}</strong>
          <span>days visible</span>
        </div>
      </div>

      <div className="scheduler-content">
        {children}
      </div>
    </section>
  );
}
