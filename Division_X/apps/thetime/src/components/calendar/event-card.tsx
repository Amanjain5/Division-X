'use client';

interface EventCardProps {
  title: string;
  eventType: string;
  color?: string;
  startTime?: string;
  duration?: string;
  isSelected?: boolean;
  onClick?: () => void;
  style?: React.CSSProperties;
  className?: string;
}

export function EventCard({
  title,
  eventType,
  color = '#3b82f6',
  startTime,
  duration,
  isSelected = false,
  onClick,
  style,
  className = '',
}: EventCardProps) {
  return (
    <div
      onClick={onClick}
      className={`absolute rounded-lg p-2 cursor-pointer transition-all group/event ${
        isSelected
          ? 'bg-slate-700/80 border-slate-500/80 shadow-lg'
          : 'bg-slate-700/60 border-slate-600/60 hover:bg-slate-700/90 hover:border-slate-500/90'
      } border ${className}`}
      style={{
        ...style,
        borderLeftWidth: '3px',
        borderLeftColor: color,
      }}
    >
      <div className="relative z-10 flex flex-col gap-1">
        <div className="flex items-start justify-between gap-2">
          <h3 className="text-sm font-semibold text-white leading-tight flex-1 line-clamp-2">{title}</h3>
        </div>
        <p className="text-xs text-slate-300">{eventType}</p>
        {startTime && (
          <p className="text-xs text-slate-400 mt-1">{startTime}</p>
        )}
        {duration && (
          <span className="text-xs text-slate-300 bg-slate-600/40 px-2 py-0.5 rounded w-fit mt-1">
            {duration}
          </span>
        )}
      </div>
    </div>
  );
}
