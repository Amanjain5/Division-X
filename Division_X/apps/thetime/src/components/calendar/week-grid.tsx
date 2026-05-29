'use client';

interface WeekGridProps {
  weekDays: Date[];
  events: Array<{
    id: string;
    title: string;
    type: string;
    startTime: Date;
    endTime?: Date;
    color?: string;
  }>;
  selectedEventId?: string | null;
  onEventClick?: (eventId: string) => void;
  onMoreClick?: (eventIds: string[]) => void;
}

const START_HOUR = 8;
const END_HOUR = 20;
const SLOT_HOURS = 2;
const SLOT_HEIGHT = 104;
const HOUR_HEIGHT = SLOT_HEIGHT / SLOT_HOURS;
const MIN_EVENT_HEIGHT = 74;

const HOURS = Array.from({ length: (END_HOUR - START_HOUR) / SLOT_HOURS }, (_, i) => {
  const hour = START_HOUR + i * SLOT_HOURS;
  const period = hour >= 12 ? 'PM' : 'AM';
  const display = hour > 12 ? hour - 12 : hour;
  return `${String(display).padStart(2, '0')} ${period}`;
});

function isSameDay(date1: Date, date2: Date): boolean {
  return (
    date1.getFullYear() === date2.getFullYear() &&
    date1.getMonth() === date2.getMonth() &&
    date1.getDate() === date2.getDate()
  );
}

function formatEventTime(date: Date): string {
  let hours = date.getHours();
  const minutes = String(date.getMinutes()).padStart(2, '0');
  const period = hours >= 12 ? 'PM' : 'AM';
  hours = hours % 12 || 12;
  return `${hours}:${minutes} ${period}`;
}

function formatEventDuration(start: Date, end?: Date): string {
  if (!end) return 'In progress';
  const minutes = Math.max(1, Math.round((end.getTime() - start.getTime()) / 60000));
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  const remaining = minutes % 60;
  return remaining ? `${hours}h ${remaining}m` : `${hours}h`;
}

function getSlotIndex(date: Date): number {
  const eventHour = date.getHours() + date.getMinutes() / 60;
  return Math.max(
    0,
    Math.min(HOURS.length - 1, Math.floor((eventHour - START_HOUR) / SLOT_HOURS))
  );
}

function getSlotLabel(slotIndex: number): string {
  const start = START_HOUR + slotIndex * SLOT_HOURS;
  const end = start + SLOT_HOURS;
  return `${formatHourLabel(start)} - ${formatHourLabel(end)}`;
}

function formatHourLabel(hour: number): string {
  const period = hour >= 12 ? 'PM' : 'AM';
  const display = hour > 12 ? hour - 12 : hour === 0 ? 12 : hour;
  return `${String(display).padStart(2, '0')} ${period}`;
}

export function WeekGrid({
  weekDays,
  events,
  selectedEventId,
  onEventClick,
  onMoreClick,
}: WeekGridProps) {
  const today = new Date();

  return (
    <div className="week-scheduler">
      <div className="time-axis">
        <div className="day-header-spacer" />
        {HOURS.map((hour, idx) => (
          <div
            key={idx}
            className="time-slot-label"
          >
            <span>{hour}</span>
          </div>
        ))}
      </div>

      <div className="week-columns">
        {weekDays.map((day, dayIdx) => {
          const isToday = isSameDay(day, today);
          const dayEvents = events
            .filter((e) => isSameDay(e.startTime, day))
            .sort((a, b) => a.startTime.getTime() - b.startTime.getTime());
          const slotGroups = new Map<number, typeof dayEvents>();

          dayEvents.forEach((event) => {
            const slotIndex = getSlotIndex(event.startTime);
            const group = slotGroups.get(slotIndex) || [];
            group.push(event);
            slotGroups.set(slotIndex, group);
          });

          return (
            <div
              key={dayIdx}
              className={`day-column ${isToday ? 'today' : ''}`}
            >
              <div
                className="day-header"
              >
                <span>
                  <span className="weekday-long">{day.toLocaleDateString('en-US', { weekday: 'long' })}</span>
                  <span className="weekday-short" style={{ display: 'none' }}>{day.toLocaleDateString('en-US', { weekday: 'short' })}</span>
                </span>
                <strong>{day.getDate()}</strong>
              </div>

              <div className="day-grid">
                {HOURS.map((_, hourIdx) => (
                  <div
                    key={hourIdx}
                    className="hour-row"
                  />
                ))}

                <div className="event-layer">
                  {Array.from(slotGroups.entries()).map(([slotIndex, cluster]) => {
                    const clusterStart = Math.min(...cluster.map((event) => event.startTime.getTime()));
                    const clusterEnd = Math.max(
                      ...cluster.map((event) =>
                        event.endTime ? event.endTime.getTime() : event.startTime.getTime() + 3600000
                      )
                    );
                    const clusterStartDate = new Date(clusterStart);
                    const clusterEndDate = new Date(clusterEnd);
                    const topPx = slotIndex * SLOT_HEIGHT;
                    const heightPx = SLOT_HEIGHT;
                    const isGrouped = cluster.length > 1;
                    const primaryEvent = cluster[0];

                    return (
                      <div key={cluster.map((event) => event.id).join('-')} className="event-cluster">
                        {isGrouped ? (
                          <button
                            className="calendar-event calendar-event-group"
                            onClick={() => onMoreClick?.(cluster.map((event) => event.id))}
                            style={{
                              top: `${topPx}px`,
                              height: `${Math.max(MIN_EVENT_HEIGHT, heightPx)}px`,
                              left: '6px',
                              right: '6px',
                              zIndex: 4,
                              borderLeftColor: primaryEvent.color || '#6C5CE7',
                            }}
                          >
                            <div className="event-title">{cluster.length} time blocks</div>
                            <div className="event-type">
                              {getSlotLabel(slotIndex)}
                            </div>
                            <div className="event-meta">
                              {formatEventTime(clusterStartDate)} - {formatEventTime(clusterEndDate)}
                            </div>
                            <div className="event-preview">
                              {primaryEvent.title}{cluster.length > 1 ? ', more...' : ''}
                            </div>
                            <span className="event-group-action">View details</span>
                          </button>
                        ) : (
                          <div
                            onClick={() => onEventClick?.(primaryEvent.id)}
                            className={`calendar-event ${selectedEventId === primaryEvent.id ? 'selected' : ''}`}
                            style={{
                              top: `${topPx}px`,
                              height: `${Math.max(MIN_EVENT_HEIGHT, heightPx)}px`,
                              left: '6px',
                              right: '6px',
                              zIndex: 2,
                              borderLeftColor: primaryEvent.color || '#6C5CE7',
                            }}
                            title={primaryEvent.title}
                          >
                            <div className="event-title">
                              {primaryEvent.title}
                            </div>
                            <div className="event-type">
                              {primaryEvent.type}
                            </div>
                            <div className="event-meta">
                              {formatEventTime(primaryEvent.startTime)} · {formatEventDuration(primaryEvent.startTime, primaryEvent.endTime)}
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
