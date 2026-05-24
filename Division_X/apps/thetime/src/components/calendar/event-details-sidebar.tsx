'use client';

interface Guest {
  name: string;
  role?: string;
  avatar?: string;
}

interface GroupedEvent {
  id: string;
  title: string;
  type: string;
  time: string;
  duration: string;
  color?: string;
}

interface EventDetailsSidebarProps {
  isOpen: boolean;
  eventTitle?: string;
  eventType?: string;
  date?: string;
  time?: string;
  duration?: string;
  meetingUrl?: string;
  guests?: Guest[];
  groupedEvents?: GroupedEvent[];
  reminderMinutes?: number;
  description?: string;
  onClose?: () => void;
}

export function EventDetailsSidebar({
  isOpen,
  eventTitle = '',
  eventType = '',
  date = '',
  time = '',
  duration = '',
  meetingUrl = '',
  guests = [],
  groupedEvents = [],
  reminderMinutes = 10,
  description = '',
  onClose,
}: EventDetailsSidebarProps) {
  if (!isOpen) return null;

  return (
    <aside className="event-detail-panel">
      <div className="event-detail-card">
        <button
          onClick={onClose}
          className="event-close-button"
          aria-label="Close event details"
        >
          <svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        <h2>{eventTitle}</h2>
        <p className="event-detail-type">{eventType}</p>

        <div className="event-detail-section">
          {date && (
            <div className="event-detail-row">
              <svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              <div>
                <small>Date</small>
                <strong>{date}</strong>
              </div>
            </div>
          )}

          {time && (
            <div className="event-detail-row">
              <svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 2m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <div>
                <small>Time</small>
                <strong>{time}</strong>
                {duration && <span>{duration}</span>}
              </div>
            </div>
          )}
        </div>

        {/* Meeting Link */}
        {meetingUrl && (
          <div className="event-detail-section">
            <p className="event-section-title">Meeting Link</p>
            <a
              href={meetingUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="event-detail-link"
            >
              {meetingUrl}
            </a>
          </div>
        )}

        {/* Guests */}
        {guests.length > 0 && (
          <div className="event-detail-section">
            <p className="event-section-title">{guests.length} Guests</p>
            <div className="guest-list">
              {guests.map((guest, idx) => (
                <div key={idx} className="guest-row">
                  {guest.avatar ? (
                    <img
                      src={guest.avatar}
                      alt={guest.name}
                    />
                  ) : (
                    <div className="guest-avatar">
                      {guest.name.charAt(0).toUpperCase()}
                    </div>
                  )}
                  <div>
                    <strong>{guest.name}</strong>
                    {guest.role && <span>{guest.role}</span>}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {groupedEvents.length > 0 && (
          <div className="event-detail-section">
            <p className="event-section-title">Time Blocks</p>
            <div className="grouped-event-list">
              {groupedEvents.map((event) => (
                <div
                  key={event.id}
                  className="grouped-event-row"
                  style={{ borderLeftColor: event.color || '#34D399' }}
                >
                  <strong>{event.title}</strong>
                  <span>{event.type}</span>
                  <small>{event.time} · {event.duration}</small>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Reminder */}
        <div className="event-detail-section">
          <p className="event-section-title">Reminder</p>
          <div className="event-reminder">
            <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
            </svg>
            <span>{reminderMinutes} minutes before</span>
          </div>
        </div>

        {description && (
          <div className="event-detail-section">
            <p className="event-section-title">Notes</p>
            <p className="event-notes">{description}</p>
          </div>
        )}
      </div>
    </aside>
  );
}
