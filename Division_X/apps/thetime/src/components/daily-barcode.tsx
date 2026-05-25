'use client';

import React, { useState } from 'react';

interface TimelineSegment {
  start: string;
  end: string;
  state: 'ACTIVE' | 'BREAK' | 'IDLE' | 'OFFLINE';
  durationMinutes: number;
  metadata?: {
    entryId?: string;
    description?: string;
    project?: { id: string; name: string; color: string } | null;
    task?: { id: string; name: string } | null;
    breakId?: string;
    auditId?: string;
  };
}

interface DailyBarcodeProps {
  timeline: TimelineSegment[];
  dateString: string;
}

export function DailyBarcode({ timeline, dateString }: DailyBarcodeProps) {
  const [hoveredSegment, setHoveredSegment] = useState<{
    segment: TimelineSegment;
    x: number;
    y: number;
  } | null>(null);

  // Total minutes in a day
  const totalDayMinutes = 24 * 60;

  const stateDetails = {
    ACTIVE: { label: 'Active Work', color: '#10b981', desc: 'Employee is actively tracking projects/tasks.' },
    BREAK: { label: 'Break Session', color: '#f59e0b', desc: 'Employee logged an official break interval.' },
    IDLE: { label: 'Idle Inactivity', color: '#ef4444', desc: 'System registered active timer with zero activity.' },
    OFFLINE: { label: 'Offline / Gaps', color: 'rgba(255, 255, 255, 0.08)', desc: 'Outside clocked-in hours or inactive.' }
  };

  function formatTime(isoString: string) {
    try {
      const d = new Date(isoString);
      return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } catch {
      return '';
    }
  }

  function formatDuration(minutes: number) {
    if (minutes < 60) return `${minutes}m`;
    const hrs = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return mins > 0 ? `${hrs}h ${mins}m` : `${hrs}h`;
  }

  const handleMouseMove = (e: React.MouseEvent, segment: TimelineSegment) => {
    const rect = e.currentTarget.parentElement?.getBoundingClientRect();
    if (!rect) return;
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top - 120; // Position above the barcode row
    setHoveredSegment({ segment, x, y });
  };

  return (
    <div style={{ position: 'relative', width: '100%', padding: '10px 0 25px 0' }}>
      {/* ── Barcode Row ── */}
      <div 
        style={{
          display: 'flex',
          width: '100%',
          height: '36px',
          background: 'rgba(0, 0, 0, 0.2)',
          border: '1px solid rgba(255, 255, 255, 0.1)',
          borderRadius: '8px',
          overflow: 'hidden',
          position: 'relative'
        }}
      >
        {timeline.map((seg, idx) => {
          const pct = (seg.durationMinutes / totalDayMinutes) * 100;
          const bg = stateDetails[seg.state].color;

          return (
            <div
              key={idx}
              style={{
                width: `${pct}%`,
                height: '100%',
                background: bg,
                cursor: 'pointer',
                transition: 'opacity 0.2s',
                position: 'relative',
                borderRight: seg.state !== 'OFFLINE' ? '1px solid rgba(0, 0, 0, 0.15)' : 'none'
              }}
              onMouseEnter={(e) => handleMouseMove(e, seg)}
              onMouseMove={(e) => handleMouseMove(e, seg)}
              onMouseLeave={() => setHoveredSegment(null)}
            />
          );
        })}
      </div>

      {/* ── Time Ruler / Scale ── */}
      <div 
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          marginTop: '6px',
          fontSize: '0.75rem',
          color: 'rgba(255, 255, 255, 0.4)',
          fontFamily: 'monospace',
          padding: '0 4px'
        }}
      >
        <span>12 AM</span>
        <span>3 AM</span>
        <span>6 AM</span>
        <span>9 AM</span>
        <span>12 PM</span>
        <span>3 PM</span>
        <span>6 PM</span>
        <span>9 PM</span>
        <span>12 AM</span>
      </div>

      {/* ── Legend ── */}
      <div 
        style={{
          display: 'flex',
          gap: '16px',
          marginTop: '12px',
          fontSize: '0.8rem',
          color: 'var(--text-muted)'
        }}
      >
        {Object.entries(stateDetails).map(([state, details]) => (
          <div key={state} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ width: '10px', height: '10px', borderRadius: '50%', background: details.color }} />
            <span>{details.label}</span>
          </div>
        ))}
      </div>

      {/* ── Floating Tooltip ── */}
      {hoveredSegment && (
        <div
          style={{
            position: 'absolute',
            left: `${hoveredSegment.x}px`,
            top: `${hoveredSegment.y}px`,
            transform: 'translateX(-50%)',
            background: 'rgba(10, 30, 20, 0.95)',
            border: '1px solid rgba(52, 211, 153, 0.25)',
            boxShadow: 'var(--shadow-lg), 0 0 15px rgba(52, 211, 153, 0.1)',
            borderRadius: '8px',
            padding: '12px',
            color: '#ffffff',
            width: '240px',
            zIndex: 1000,
            pointerEvents: 'none',
            fontSize: '0.85rem'
          }}
        >
          {/* Header */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
            <span style={{
              width: '8px',
              height: '8px',
              borderRadius: '50%',
              background: stateDetails[hoveredSegment.segment.state].color
            }} />
            <strong style={{ color: '#fff' }}>{stateDetails[hoveredSegment.segment.state].label}</strong>
          </div>

          {/* Time range */}
          <div style={{ color: 'var(--text-muted)', fontSize: '0.78rem', marginBottom: '8px' }}>
            {formatTime(hoveredSegment.segment.start)} - {formatTime(hoveredSegment.segment.end)} ({formatDuration(hoveredSegment.segment.durationMinutes)})
          </div>

          {/* Context Details */}
          {hoveredSegment.segment.state === 'ACTIVE' && hoveredSegment.segment.metadata && (
            <div style={{ borderTop: '1px solid rgba(255, 255, 255, 0.08)', paddingTop: '6px', fontSize: '0.78rem' }}>
              {hoveredSegment.segment.metadata.description && (
                <div style={{ marginBottom: '4px' }}>
                  <span style={{ color: 'var(--text-muted)' }}>Work:</span> <strong style={{ color: '#6EE7B7' }}>{hoveredSegment.segment.metadata.description}</strong>
                </div>
              )}
              {hoveredSegment.segment.metadata.project && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginBottom: '4px' }}>
                  <span style={{ color: 'var(--text-muted)' }}>Proj:</span>
                  <span style={{
                    display: 'inline-block',
                    width: '6px',
                    height: '6px',
                    borderRadius: '50%',
                    background: hoveredSegment.segment.metadata.project.color
                  }} />
                  <span style={{ fontWeight: 500 }}>{hoveredSegment.segment.metadata.project.name}</span>
                </div>
              )}
              {hoveredSegment.segment.metadata.task && (
                <div>
                  <span style={{ color: 'var(--text-muted)' }}>Task:</span> <span>{hoveredSegment.segment.metadata.task.name}</span>
                </div>
              )}
            </div>
          )}

          {hoveredSegment.segment.state === 'BREAK' && (
            <div style={{ borderTop: '1px solid rgba(255, 255, 255, 0.08)', paddingTop: '6px', fontSize: '0.78rem', color: 'var(--text-muted)' }}>
              Break sessions refresh wellness and sustain active performance indexes.
            </div>
          )}

          {hoveredSegment.segment.state === 'IDLE' && (
            <div style={{ borderTop: '1px solid rgba(255, 255, 255, 0.08)', paddingTop: '6px', fontSize: '0.78rem', color: '#FCA5A5' }}>
              System logged an idle alert due to zero user input during active timer tracking.
            </div>
          )}

          {hoveredSegment.segment.state === 'OFFLINE' && (
            <div style={{ borderTop: '1px solid rgba(255, 255, 255, 0.08)', paddingTop: '6px', fontSize: '0.78rem', color: 'var(--text-muted)' }}>
              No time tracking entries or attendance clock-ins recorded.
            </div>
          )}
        </div>
      )}
    </div>
  );
}
