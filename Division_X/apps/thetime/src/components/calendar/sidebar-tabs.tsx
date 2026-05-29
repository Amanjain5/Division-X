'use client';

import { useState } from 'react';

interface SidebarTabsProps {
  activeTab: 'overview' | 'calendar' | 'tasks' | 'activity';
  onTabChange: (tab: 'overview' | 'calendar' | 'tasks' | 'activity') => void;
  miniCalendarDays: Date[];
  currentMonth: Date;
  selectedDate?: Date;
  onDateSelect?: (date: Date) => void;
}

const tabsList = [
  { id: 'overview', label: 'Overview' },
  { id: 'calendar', label: 'Calendar' },
  { id: 'tasks', label: 'Tasks' },
  { id: 'activity', label: 'Activity' },
] as const;

export function SidebarTabs({
  activeTab,
  onTabChange,
  miniCalendarDays,
  currentMonth,
  selectedDate,
  onDateSelect,
}: SidebarTabsProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <aside className="timesheet-side-panel">
      <div className="scheduler-tabs">
        {tabsList.map((tab) => (
          <button
            key={tab.id}
            onClick={() => onTabChange(tab.id as typeof activeTab)}
            className={activeTab === tab.id ? 'active' : ''}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="sidebar-mobile-toggle-btn"
      >
        <span>{isExpanded ? 'Hide Calendar & Submission' : 'Show Calendar & Submission'}</span>
        <span style={{ fontSize: '0.7rem', display: 'inline-block', transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s' }}>▼</span>
      </button>

      <div className={`sidebar-collapsible-content ${isExpanded ? 'expanded' : 'collapsed'}`}>
        <div className="mini-calendar-card">
          <h3>
            {currentMonth.toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}
          </h3>

          <div className="mini-weekdays">
            {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map((day) => (
              <div key={day}>
                {day}
              </div>
            ))}
          </div>

          <div className="mini-days">
            {miniCalendarDays.map((day, idx) => {
              const isSelected = selectedDate && 
                day.getDate() === selectedDate.getDate() &&
                day.getMonth() === selectedDate.getMonth() &&
                day.getFullYear() === selectedDate.getFullYear();
              const isCurrentMonth = day.getMonth() === currentMonth.getMonth();

              return (
                <button
                  key={idx}
                  onClick={() => onDateSelect?.(day)}
                  className={`${isSelected ? 'selected' : ''} ${!isCurrentMonth ? 'muted' : ''}`}
                >
                  {day.getDate()}
                </button>
              );
            })}
          </div>
        </div>

        <div className="workflow-card">
          <p className="workflow-label">Workflow</p>
          {['Draft', 'Submitted', 'In review', 'Approved'].map((stage, index) => (
            <div className="workflow-step" key={stage}>
              <span>{index + 1}</span>
              <div>
                <strong>{stage}</strong>
                <small>{index === 0 ? 'Capture work blocks' : index === 1 ? 'Send weekly sheet' : index === 2 ? 'Manager checks' : 'Ready for payroll'}</small>
              </div>
            </div>
          ))}
        </div>
      </div>
    </aside>
  );
}
