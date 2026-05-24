'use client';

import { EventCard } from './event-card';

interface TimeGridEvent {
  id: string;
  title: string;
  eventType: string;
  date: Date;
  startTime: Date;
  endTime?: Date;
  color?: string;
  duration?: string;
}

interface TimeGridCalendarProps {
  events: TimeGridEvent[];
  selectedEventId?: string;
  onEventClick?: (eventId: string) => void;
}

const HOURS = Array.from({ length: 12 }, (_, i) => {
  const hour = 8 + i;
  const period = hour >= 12 ? 'PM' : 'AM';
  const display = hour > 12 ? hour - 12 : hour === 0 ? 12 : hour;
  return { hour, period, display };
});

const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

function getWeekDays(baseDate: Date): Date[] {
  const start = new Date(baseDate);
  start.setDate(baseDate.getDate() - baseDate.getDay());
  
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    return d;
  });
}

function formatTime(date: Date): string {
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  return `${hours}:${minutes}`;
}

function isSameDay(date1: Date, date2: Date): boolean {
  return (
    date1.getFullYear() === date2.getFullYear() &&
    date1.getMonth() === date2.getMonth() &&
    date1.getDate() === date2.getDate()
  );
}

export function TimeGridCalendar({
  events,
  selectedEventId,
  onEventClick,
}: TimeGridCalendarProps) {
  const baseDate = new Date();
  const weekDays = getWeekDays(baseDate);
  const now = new Date();

  return (
    <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl overflow-hidden h-[calc(100vh-300px)]">
      {/* Header with day labels */}
      <div className="grid grid-cols-[80px_1fr] border-b border-slate-700/50">
        {/* Time axis header */}
        <div className="border-r border-slate-700/50 bg-slate-800/70 p-3">
          <p className="text-xs text-slate-400 uppercase font-semibold">Time</p>
        </div>

        {/* Day headers */}
        <div className="grid grid-cols-7">
          {weekDays.map((day, idx) => {
            const isToday = isSameDay(day, now);
            return (
              <div
                key={idx}
                className={`border-r border-slate-700/50 p-3 text-center transition-colors ${
                  isToday ? 'bg-blue-500/15' : 'bg-slate-800/50'
                }`}
              >
                <p className={`text-xs uppercase font-semibold mb-1 ${isToday ? 'text-blue-400' : 'text-slate-400'}`}>
                  {DAYS[day.getDay()].slice(0, 3)}
                </p>
                <p
                  className={`text-xl font-bold ${
                    isToday ? 'text-blue-400' : 'text-slate-300'
                  }`}
                >
                  {day.getDate()}
                </p>
              </div>
            );
          })}
        </div>
      </div>

      {/* Time grid */}
      <div className="grid grid-cols-[80px_1fr] h-full overflow-y-auto">
        {/* Time axis */}
        <div className="border-r border-slate-700/50 bg-slate-800/70 sticky left-0 z-20">
          {HOURS.map((h, idx) => (
            <div
              key={idx}
              className="border-b border-slate-700/30 h-24 flex items-start justify-end pr-3 pt-1"
            >
              <span className="text-xs text-slate-500 font-semibold">
                {String(h.display).padStart(2, '0')}:00
              </span>
            </div>
          ))}
        </div>

        {/* Day columns */}
        <div className="grid grid-cols-7 relative">
          {weekDays.map((day, dayIdx) => {
            const isToday = isSameDay(day, now);
            const dayEvents = events.filter((e) => isSameDay(e.date, day));

            return (
              <div
                key={dayIdx}
                className={`border-r border-slate-700/50 relative transition-colors ${
                  isToday ? 'bg-blue-500/5' : 'bg-slate-900/50 hover:bg-slate-800/50'
                }`}
              >
                {/* Hour rows background */}
                {HOURS.map((_, hourIdx) => (
                  <div
                    key={hourIdx}
                    className="border-b border-slate-700/20 h-24 hover:bg-slate-700/10 transition-colors"
                  />
                ))}

                {/* Events */}
                <div className="absolute inset-0 p-2 pointer-events-none">
                  {dayEvents.map((event) => {
                    const startHour = event.startTime.getHours() + event.startTime.getMinutes() / 60;
                    const endHour = event.endTime
                      ? event.endTime.getHours() + event.endTime.getMinutes() / 60
                      : startHour + 1;
                    const durationHours = Math.max(0.5, endHour - startHour);

                    const topPx = Math.max(0, (startHour - 8) * 96);
                    const heightPx = Math.max(50, durationHours * 96);

                    return (
                      <div
                        key={event.id}
                        className="pointer-events-auto"
                        onClick={() => onEventClick?.(event.id)}
                      >
                        <EventCard
                          title={event.title}
                          eventType={event.eventType}
                          color={event.color}
                          startTime={formatTime(event.startTime)}
                          duration={event.duration}
                          isSelected={selectedEventId === event.id}
                          style={{
                            top: `${topPx}px`,
                            height: `${heightPx}px`,
                            width: '90%',
                            marginLeft: '5%',
                          }}
                        />
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
