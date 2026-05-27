'use client';

import React from 'react';

// Base pulse wrapper
export function SkeletonPulse({ children, style }: { children?: React.ReactNode; style?: React.CSSProperties }) {
  return (
    <div className="skeleton-pulse" style={style}>
      {children}
      <style jsx global>{`
        @keyframes skeleton-shimmer {
          0% { opacity: 0.45; }
          50% { opacity: 0.85; }
          100% { opacity: 0.45; }
        }
        .skeleton-pulse {
          animation: skeleton-shimmer 1.6s ease-in-out infinite;
          position: relative;
          overflow: hidden;
        }
      `}</style>
    </div>
  );
}

// Simple shimmering block element
export function SkeletonBlock({ width = '100%', height = '16px', borderRadius = '6px', style }: { width?: string | number; height?: string | number; borderRadius?: string | number; style?: React.CSSProperties }) {
  return (
    <SkeletonPulse
      style={{
        width,
        height,
        borderRadius,
        background: 'rgba(255, 255, 255, 0.06)',
        border: '1px solid rgba(255, 255, 255, 0.03)',
        ...style
      }}
    />
  );
}

// Stats Cards Grid Skeleton (Dashboard / Reports)
export function SkeletonStatsGrid() {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', marginBottom: '24px' }}>
      {[1, 2, 3, 4].map((i) => (
        <div key={i} style={{ height: '110px', borderRadius: '18px', background: 'rgba(255, 255, 255, 0.04)', border: '1px solid rgba(255, 255, 255, 0.06)', padding: '22px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <SkeletonBlock width={80} height={12} />
          <SkeletonBlock width={120} height={32} />
        </div>
      ))}
    </div>
  );
}

// Lists & Tables rows skeleton (Recent items, compliance feeds, project list rows)
export function SkeletonList({ rows = 4, cols = 4 }: { rows?: number; cols?: number }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', width: '100%' }}>
      {/* Header mock */}
      <div style={{ display: 'flex', gap: '16px', padding: '10px 16px', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
        {Array.from({ length: cols }).map((_, i) => (
          <SkeletonBlock key={i} width={`${100 / cols - 2}%`} height={12} />
        ))}
      </div>
      {/* Row items */}
      {Array.from({ length: rows }).map((_, r) => (
        <div key={r} style={{ display: 'flex', gap: '16px', padding: '16px', background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.04)', borderRadius: '10px', alignItems: 'center' }}>
          {Array.from({ length: cols }).map((_, c) => (
            <SkeletonBlock key={c} width={`${100 / cols - 2}%`} height={16} />
          ))}
        </div>
      ))}
    </div>
  );
}

// Custom Dashboard Page Skeleton
export function SkeletonDashboard() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', width: '100%' }}>
      {/* Stats Cards */}
      <SkeletonStatsGrid />

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px', flexWrap: 'wrap' }}>
        {/* Weekly Chart */}
        <div style={{ background: 'rgba(255, 255, 255, 0.03)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '18px', padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px', height: '320px' }}>
          <SkeletonBlock width={140} height={18} />
          <div style={{ display: 'flex', gap: '16px', flex: 1, alignItems: 'flex-end', paddingTop: '20px' }}>
            {[65, 80, 55, 90, 70, 30, 45].map((h, i) => (
              <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px', height: '100%', justifyContent: 'flex-end' }}>
                <SkeletonBlock width="100%" height={`${h}%`} borderRadius="4px" />
                <SkeletonBlock width={24} height={10} />
              </div>
            ))}
          </div>
        </div>

        {/* Recent Activity List */}
        <div style={{ background: 'rgba(255, 255, 255, 0.03)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '18px', padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <SkeletonBlock width={180} height={18} />
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {[1, 2, 3, 4].map((i) => (
              <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: '12px', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', width: '70%' }}>
                  <SkeletonBlock width="80%" height={16} />
                  <SkeletonBlock width="40%" height={12} />
                </div>
                <SkeletonBlock width="15%" height={20} />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// Custom Tracker Page Skeleton
export function SkeletonTracker() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', width: '100%' }}>
      {/* Upper active tracking section mock */}
      <div style={{ display: 'flex', justifyContent: 'space-between', padding: '24px', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '18px', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', width: '50%' }}>
          <SkeletonBlock width="70%" height={24} />
          <SkeletonBlock width="35%" height={14} />
        </div>
        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
          <SkeletonBlock width={100} height={40} />
          <SkeletonBlock width={80} height={40} />
        </div>
      </div>

      {/* Kanban Board columns mock */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '16px', minWidth: '800px', overflowX: 'auto', paddingBottom: '12px' }}>
        {['To Do', 'In Progress', 'In Review', 'Blocked', 'Completed'].map((status, i) => (
          <div key={i} style={{ background: 'rgba(0,0,0,0.15)', border: '1px solid rgba(255,255,255,0.04)', borderRadius: '14px', padding: '16px', display: 'flex', flexDirection: 'column', gap: '14px', minHeight: '400px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <SkeletonBlock width="60%" height={14} />
              <SkeletonBlock width={20} height={14} borderRadius="50%" />
            </div>
            {[1, 2].map((j) => (
              <div key={j} style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '10px', padding: '12px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <SkeletonBlock width="90%" height={14} />
                <SkeletonBlock width="40%" height={10} />
                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '6px' }}>
                  <SkeletonBlock width={40} height={16} />
                  <SkeletonBlock width={20} height={20} borderRadius="50%" />
                </div>
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

// Custom Timesheet Page Skeleton
export function SkeletonTimesheet() {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '280px 1fr', gap: '24px', width: '100%', alignItems: 'stretch' }}>
      {/* Sidebar mini-calendar mock */}
      <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '18px', padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
        <SkeletonBlock width="70%" height={16} />
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '8px' }}>
          {Array.from({ length: 35 }).map((_, i) => (
            <SkeletonBlock key={i} width="100%" height={24} borderRadius="4px" />
          ))}
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '16px' }}>
          <SkeletonBlock width="80%" height={14} />
          <SkeletonBlock width="50%" height={14} />
        </div>
      </div>

      {/* Calendar Week view mock */}
      <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '18px', padding: '24px', display: 'flex', flexDirection: 'column', gap: '18px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <SkeletonBlock width="30%" height={20} />
          <div style={{ display: 'flex', gap: '8px' }}>
            <SkeletonBlock width={80} height={32} />
            <SkeletonBlock width={80} height={32} />
          </div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '12px', flex: 1, minHeight: '350px' }}>
          {Array.from({ length: 7 }).map((_, i) => (
            <div key={i} style={{ display: 'flex', flexDirection: 'column', gap: '10px', height: '100%', borderRight: i < 6 ? '1px solid rgba(255,255,255,0.05)' : 'none', paddingRight: '8px' }}>
              <SkeletonBlock width="80%" height={14} />
              <SkeletonBlock width="40%" height={10} />
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '8px', paddingTop: '16px' }}>
                {i % 3 === 0 && (
                  <div style={{ background: 'rgba(5,150,105,0.1)', border: '1px solid rgba(5,150,105,0.2)', borderRadius: '6px', padding: '8px', height: '80px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    <SkeletonBlock width="90%" height={10} />
                    <SkeletonBlock width="50%" height={8} />
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// Custom Reports Page Skeleton
export function SkeletonReports() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', width: '100%' }}>
      {/* Stat Cards */}
      <SkeletonStatsGrid />

      {/* Filter panel mock */}
      <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', padding: '20px', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '18px' }}>
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} style={{ display: 'flex', flexDirection: 'column', gap: '8px', flex: 1, minWidth: '150px' }}>
            <SkeletonBlock width="40%" height={12} />
            <SkeletonBlock width="100%" height={36} />
          </div>
        ))}
      </div>

      {/* Grouped project breakdown bars */}
      <div style={{ background: 'rgba(255, 255, 255, 0.03)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '18px', padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
        <SkeletonBlock width={140} height={16} />
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          {[80, 50, 30].map((w, i) => (
            <div key={i} style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
              <SkeletonBlock width={100} height={14} />
              <div style={{ flex: 1 }}>
                <SkeletonBlock width={`${w}%`} height={20} />
              </div>
              <SkeletonBlock width={40} height={14} />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
