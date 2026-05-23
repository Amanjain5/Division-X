'use client';

export default function Loading() {
  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: 'linear-gradient(165deg, #011a13 0%, #052e21 40%, #0a4030 100%)' }}>
      {/* Sidebar Skeleton */}
      <aside style={{ width: 250, borderRight: '1px solid rgba(255, 255, 255, 0.1)', background: 'rgba(0, 0, 0, 0.25)', padding: 24, display: 'flex', flexDirection: 'column', gap: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div className="skeleton-pulse" style={{ width: 32, height: 32, borderRadius: '50%', background: 'rgba(255,255,255,0.08)' }} />
          <div className="skeleton-pulse" style={{ width: 100, height: 20, borderRadius: 4, background: 'rgba(255,255,255,0.08)' }} />
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16, marginTop: 20 }}>
          {[1, 2, 3, 4, 5, 6].map(i => (
            <div key={i} className="skeleton-pulse" style={{ width: '85%', height: 36, borderRadius: 8, background: 'rgba(255,255,255,0.05)' }} />
          ))}
        </div>
      </aside>

      {/* Main Content Skeleton */}
      <main style={{ flex: 1, padding: '28px 36px', display: 'flex', flexDirection: 'column', gap: 24 }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 8 }}>
          <div className="skeleton-pulse" style={{ width: 200, height: 28, borderRadius: 6, background: 'rgba(255,255,255,0.1)' }} />
          <div className="skeleton-pulse" style={{ width: 350, height: 16, borderRadius: 4, background: 'rgba(255,255,255,0.05)' }} />
        </div>

        {/* Stats Grid Skeleton */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16 }}>
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="skeleton-pulse" style={{ height: 110, borderRadius: 18, background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255, 255, 255, 0.1)', padding: 22, display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div style={{ width: 80, height: 12, borderRadius: 4, background: 'rgba(255,255,255,0.05)' }} />
              <div style={{ width: 120, height: 32, borderRadius: 6, background: 'rgba(255,255,255,0.08)' }} />
            </div>
          ))}
        </div>

        {/* Graph Card Skeleton */}
        <div className="skeleton-pulse" style={{ height: 300, borderRadius: 18, background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255, 255, 255, 0.1)', padding: 24, display: 'flex', flexDirection: 'column', gap: 20 }}>
          <div style={{ width: 140, height: 18, borderRadius: 4, background: 'rgba(255,255,255,0.08)' }} />
          <div style={{ display: 'flex', gap: 16, flex: 1, alignItems: 'flex-end', paddingTop: 20 }}>
            {[65, 80, 55, 90, 70, 30, 10].map((h, i) => (
              <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
                <div className="skeleton-pulse" style={{ width: '100%', maxWidth: 40, height: `${h}%`, minHeight: 12, background: 'rgba(255,255,255,0.05)', borderRadius: 4 }} />
                <div style={{ width: 24, height: 10, borderRadius: 2, background: 'rgba(255,255,255,0.03)' }} />
              </div>
            ))}
          </div>
        </div>
      </main>

      <style jsx global>{`
        @keyframes skeleton-shimmer {
          0% { opacity: 0.5; }
          50% { opacity: 0.95; }
          100% { opacity: 0.5; }
        }
        .skeleton-pulse {
          animation: skeleton-shimmer 1.5s ease-in-out infinite;
          position: relative;
          overflow: hidden;
        }
      `}</style>
    </div>
  );
}
