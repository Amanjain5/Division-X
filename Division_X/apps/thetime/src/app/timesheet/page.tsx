'use client';

import { useEffect, useState, useCallback, useMemo } from 'react';
import { AppShell } from '../../components/app-shell';
import { Toast } from '../../components/toast';
import { getTimeEntries, getWorkspace, getCatalog } from '@divisionx/api-client';
import {
  SidebarTabs,
  CalendarView,
  WeekGrid,
  EventDetailsSidebar,
} from '../../components/calendar';

type ViewMode = 'week' | 'month' | 'year';
type TabMode = 'overview' | 'calendar' | 'tasks' | 'activity';

function formatDuration(ms: number): string {
  const h = Math.floor(ms / 3600000);
  const m = Math.floor((ms % 3600000) / 60000);
  if (h === 0) return `${m}m`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}m`;
}

function startTimeStr(date: Date): string {
  let h = date.getHours();
  const m = String(date.getMinutes()).padStart(2, '0');
  const period = h >= 12 ? 'PM' : 'AM';
  h = h % 12;
  h = h ? h : 12;
  return `${h}:${m} ${period}`;
}

// Generate dates for Month View (6 weeks / 42 days grid)
function getMonthGrid(anchor: Date): Date[] {
  const year = anchor.getFullYear();
  const month = anchor.getMonth();
  
  const firstDay = new Date(year, month, 1);
  const startDayOfWeek = firstDay.getDay();
  
  const start = new Date(firstDay);
  start.setDate(firstDay.getDate() - startDayOfWeek);
  
  const days: Date[] = [];
  for (let i = 0; i < 42; i++) {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    days.push(d);
  }
  return days;
}

// Generate dates for Week View (7 days)
function getWeekGrid(anchor: Date): Date[] {
  const startDayOfWeek = anchor.getDay();
  const start = new Date(anchor);
  start.setDate(anchor.getDate() - startDayOfWeek);
  
  const days: Date[] = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    days.push(d);
  }
  return days;
}

export default function TimesheetPage() {
  const [activeTab, setActiveTab] = useState<TabMode>('calendar');
  const [view, setView] = useState<ViewMode>('week');
  const [anchorDate, setAnchorDate] = useState<Date>(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  });
  
  const [items, setItems] = useState<any[]>([]);
  const [members, setMembers] = useState<any[]>([]);
  const [allTags, setAllTags] = useState<any[]>([]);
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);
  const [selectedGroupIds, setSelectedGroupIds] = useState<string[]>([]);
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [toast, setToast] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  // Mini calendar for sidebar
  const miniCalendarDays = useMemo(() => {
    return getMonthGrid(selectedDate);
  }, [selectedDate]);

  // Grid days for main view
  const gridDays = useMemo(() => {
    return view === 'week' ? getWeekGrid(anchorDate) : getMonthGrid(anchorDate);
  }, [view, anchorDate]);

  // Query bounds
  const queryBounds = useMemo(() => {
    if (gridDays.length === 0) return null;
    const start = new Date(gridDays[0]);
    const end = new Date(gridDays[gridDays.length - 1]);
    end.setHours(23, 59, 59, 999);
    return { start, end };
  }, [gridDays]);

  // Load static workspace and tags metadata once on mount
  useEffect(() => {
    async function loadMetadata() {
      try {
        const [workspaceData, tagsData] = await Promise.all([
          getWorkspace(),
          getCatalog('tags')
        ]);
        setMembers(workspaceData.members);
        setAllTags(tagsData.items);
      } catch {
        setToast({ text: 'Failed to load workspace metadata', type: 'error' });
      }
    }
    loadMetadata();
  }, []);

  // Load time entries only when query bounds change
  const refresh = useCallback(async () => {
    if (!queryBounds) return;
    try {
      const entriesData = await getTimeEntries({
        from: queryBounds.start.toISOString(),
        to: queryBounds.end.toISOString(),
        pageSize: 1000
      });
      setItems(entriesData.items);
    } catch {
      setToast({ text: 'Failed to load timeline data', type: 'error' });
    }
  }, [queryBounds]);

  useEffect(() => { refresh(); }, [refresh]);

  // Get selected event
  const selectedEvent = useMemo(() => {
    return items.find((e) => e.id === selectedEventId);
  }, [selectedEventId, items]);

  const selectedGroupEvents = useMemo(() => {
    if (selectedGroupIds.length === 0) return [];
    return selectedGroupIds
      .map((id) => items.find((item) => item.id === id))
      .filter(Boolean);
  }, [selectedGroupIds, items]);

  // Format date range for header
  const dateRange = useMemo(() => {
    if (view === 'week') {
      const start = gridDays[0];
      const end = gridDays[6];
      return `${start.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${end.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`;
    }
    return '';
  }, [gridDays, view]);

  // Week days for display
  const weekDaysDisplay = useMemo(() => {
    return gridDays.map((day) => ({
      day: day.toLocaleDateString('en-US', { weekday: 'short' }),
      date: day.getDate(),
    }));
  }, [gridDays]);

  return (
    <AppShell title="Timesheet">
      <div className="timesheet-scheduler">
        <SidebarTabs
          activeTab={activeTab}
          onTabChange={setActiveTab}
          miniCalendarDays={miniCalendarDays}
          currentMonth={selectedDate}
          selectedDate={selectedDate}
          onDateSelect={(date) => {
            setSelectedDate(date);
            setAnchorDate(date);
          }}
        />

        {/* Main Calendar Area */}
        {activeTab === 'calendar' && (
          <CalendarView
            title={anchorDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
            dateRange={dateRange}
            weekDays={weekDaysDisplay}
            onToday={() => {
              const d = new Date();
              d.setHours(0, 0, 0, 0);
              setAnchorDate(d);
              setSelectedDate(d);
            }}
            onViewChange={setView}
            currentView={view}
            totalEvents={items.length}
            totalHours={formatDuration(
              items.reduce((sum, item) => {
                if (!item.endedAt) return sum;
                return sum + (new Date(item.endedAt).getTime() - new Date(item.startedAt).getTime());
              }, 0)
            )}
          >
            {view === 'week' && (
              <WeekGrid
                weekDays={gridDays}
                events={items.map((item) => ({
                  id: item.id,
                  title: item.description || 'Untitled Work',
                  type: item.project?.name || 'General',
                  startTime: new Date(item.startedAt),
                  endTime: item.endedAt ? new Date(item.endedAt) : undefined,
                  color: item.project?.color || '#3b82f6',
                }))}
                selectedEventId={selectedEventId}
                onEventClick={(eventId) => {
                  setSelectedGroupIds([]);
                  setSelectedEventId(eventId);
                }}
                onMoreClick={(eventIds) => {
                  setSelectedEventId(null);
                  setSelectedGroupIds(eventIds);
                }}
              />
            )}
          </CalendarView>
        )}

        {/* Other Tabs */}
        {activeTab !== 'calendar' && (
          <div className="timesheet-empty-panel">
            <p>{activeTab.charAt(0).toUpperCase() + activeTab.slice(1)} section coming soon...</p>
          </div>
        )}

        {/* Event Details Sidebar */}
        {(selectedEvent || selectedGroupEvents.length > 0) && (
          <EventDetailsSidebar
            isOpen={true}
            eventTitle={
              selectedGroupEvents.length > 0
                ? `${selectedGroupEvents.length} overlapping time blocks`
                : selectedEvent.description || 'Untitled Work'
            }
            eventType={
              selectedGroupEvents.length > 0
                ? 'Grouped timesheet entries'
                : selectedEvent.project?.name || 'General'
            }
            date={new Date((selectedEvent || selectedGroupEvents[0]).startedAt).toLocaleDateString('en-US', {
              weekday: 'long',
              month: 'short',
              day: 'numeric',
              year: 'numeric',
            })}
            time={startTimeStr(new Date((selectedEvent || selectedGroupEvents[0]).startedAt))}
            duration={
              selectedGroupEvents.length > 0
                ? `${selectedGroupEvents.length} entries`
                : selectedEvent.endedAt
                ? formatDuration(
                    new Date(selectedEvent.endedAt).getTime() -
                      new Date(selectedEvent.startedAt).getTime()
                  )
                : 'In Progress'
            }
            description={selectedGroupEvents.length > 0 ? '' : selectedEvent.description}
            groupedEvents={selectedGroupEvents.map((event: any) => ({
              id: event.id,
              title: event.description || 'Untitled Work',
              type: event.project?.name || 'General',
              time: startTimeStr(new Date(event.startedAt)),
              duration: event.endedAt
                ? formatDuration(new Date(event.endedAt).getTime() - new Date(event.startedAt).getTime())
                : 'In Progress',
              color: event.project?.color || '#34D399',
            }))}
            guests={members.slice(0, 2).map((member: any, index) => ({
              name: member.name || member.email || `Team member ${index + 1}`,
              role: index === 0 ? 'Owner' : 'Collaborator',
            }))}
            onClose={() => {
              setSelectedEventId(null);
              setSelectedGroupIds([]);
            }}
          />
        )}

        <Toast message={toast?.text || ''} type={toast?.type || 'success'} onClose={() => setToast(null)} />
      </div>
    </AppShell>
  );
}
