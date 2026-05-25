'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { AppShell } from '../../components/app-shell';
import { getReport, getTimeEntries, getCurrentRole, getActivityReport, clockInAttendance, getWorkspaceBootstrap } from '@divisionx/api-client';
import { requestNotificationPermission, notifyCritical } from '../../components/notification-manager';

function formatDuration(ms: number): string {
  const h = Math.floor(ms / 3600000);
  const m = Math.floor((ms % 3600000) / 60000);
  return `${h}h ${m}m`;
}

export default function DashboardPage() {
  const [stats, setStats] = useState({ totalHours: 0, billableHours: 0, itemsCount: 0, approvedCount: 0 });
  const [policy, setPolicy] = useState<any>(null);
  const [running, setRunning] = useState<any>(null);
  const [recentEntries, setRecentEntries] = useState<any[]>([]);
  const [weeklyData, setWeeklyData] = useState<number[]>([0, 0, 0, 0, 0, 0, 0]);
  const [teamActivity, setTeamActivity] = useState<{ totalActive: number; totalMembers: number } | null>(null);
  const [attendance, setAttendance] = useState<any>(null);
  const [attProgress, setAttProgress] = useState(0);
  const [attRemaining, setAttRemaining] = useState('');
  const [attAlert, setAttAlert] = useState<string | null>(null);
  const notifiedRef = useRef<Set<string>>(new Set());
  const role = typeof window !== 'undefined' ? getCurrentRole() : 'MEMBER';
  const isManager = ['OWNER', 'ADMIN', 'MANAGER'].includes(role);

  const refresh = useCallback(async () => {
    try {
      const now = new Date();
      const weekStart = new Date(now); weekStart.setDate(now.getDate() - now.getDay() + 1); weekStart.setHours(0, 0, 0, 0);
      const weekEnd = new Date(weekStart); weekEnd.setDate(weekStart.getDate() + 6); weekEnd.setHours(23, 59, 59, 999);

      const [report, bootstrap, entries, att] = await Promise.all([
        getReport({ from: weekStart.toISOString(), to: weekEnd.toISOString() }),
        getWorkspaceBootstrap(),
        getTimeEntries({ pageSize: 5 }),
        clockInAttendance()
      ]);

      setStats({ totalHours: report.totalHours, billableHours: report.billableHours || 0, itemsCount: report.itemsCount, approvedCount: report.approvedCount || 0 });
      setPolicy(bootstrap.policy);
      setRunning(bootstrap.runningTimer);
      setRecentEntries(entries.items.slice(0, 5));
      setAttendance(att.attendance);

      // Build weekly chart data
      const daily = [0, 0, 0, 0, 0, 0, 0];
      for (const item of (report.items || []) as any[]) {
        const d = new Date(item.startedAt).getDay();
        const idx = d === 0 ? 6 : d - 1; // Mon=0
        daily[idx] += item.durationHours || 0;
      }
      setWeeklyData(daily.map((v: number) => Number(v.toFixed(1))));

      if (isManager) {
        try { const act = await getActivityReport(); setTeamActivity(act); } catch { /* ok */ }
      }
    } catch { /* ok */ }
  }, [isManager]);

  useEffect(() => { refresh(); }, [refresh]);

  // Request browser notification permission
  useEffect(() => { requestNotificationPermission(); }, []);

  // Live attendance progress bar + countdown reminders
  useEffect(() => {
    if (!attendance || attendance.clockOutAt) return;
    const clockIn = new Date(attendance.clockInAt).getTime();
    const today5pm = new Date();
    today5pm.setHours(17, 0, 0, 0);
    const endTime = today5pm.getTime();
    const totalDuration = endTime - clockIn;

    function tick() {
      const now = Date.now();
      const elapsed = now - clockIn;
      const pct = Math.min(100, Math.max(0, (elapsed / totalDuration) * 100));
      setAttProgress(pct);

      const remainMs = Math.max(0, endTime - now);
      const rH = Math.floor(remainMs / 3600000);
      const rM = Math.floor((remainMs % 3600000) / 60000);
      setAttRemaining(remainMs <= 0 ? 'Day complete' : `${rH}h ${rM}m remaining`);

      // Countdown reminders
      const minLeft = Math.floor(remainMs / 60000);
      if (minLeft <= 30 && minLeft > 15 && !notifiedRef.current.has('30m')) {
        notifiedRef.current.add('30m');
        setAttAlert('⏰ 30 minutes until auto clock-out at 5:00 PM');
        notifyCritical('TheTime — 30 min left', 'Your day ends at 5:00 PM. 30 minutes remaining.', 'att-30');
      }
      if (minLeft <= 15 && minLeft > 5 && !notifiedRef.current.has('15m')) {
        notifiedRef.current.add('15m');
        setAttAlert('⚠️ 15 minutes until auto clock-out at 5:00 PM');
        notifyCritical('TheTime — 15 min left', 'Your day ends at 5:00 PM. 15 minutes remaining!', 'att-15');
      }
      if (minLeft <= 5 && minLeft > 0 && !notifiedRef.current.has('5m')) {
        notifiedRef.current.add('5m');
        setAttAlert('🚨 5 minutes until auto clock-out!');
        notifyCritical('TheTime — 5 min left!', 'Your day ends at 5:00 PM. Wrap up your work!', 'att-5');
      }
      if (remainMs <= 0 && !notifiedRef.current.has('done')) {
        notifiedRef.current.add('done');
        setAttAlert(null);
        notifyCritical('TheTime — Day Complete', 'You have been clocked out at 5:00 PM. Great work today!', 'att-done');
      }
    }

    tick();
    const iv = setInterval(tick, 30000); // update every 30s
    return () => clearInterval(iv);
  }, [attendance]);

  const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  const maxHours = Math.max(...weeklyData, 1);

  return (
    <AppShell title="Dashboard">
      {/* Running Timer Banner */}
      {running && (
        <div className="card card-dark mb-6" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <div style={{ fontSize: '0.85rem', color: 'rgba(255,255,255,0.7)' }}>Currently tracking</div>
            <div style={{ fontSize: '1.2rem', fontWeight: 600 }}>{running.description}</div>
          </div>
          <div style={{ fontFamily: 'monospace', fontSize: '1.5rem', fontWeight: 700 }}>
            {formatDuration(Date.now() - new Date(running.startedAt).getTime())}
          </div>
        </div>
      )}

      {/* Attendance Progress Bar */}
      {attendance && (
        <div className="card mb-6" style={{ background: 'var(--bg-glass)', padding: '20px 24px' }}>
          {/* Alert Banner */}
          {attAlert && (
            <div style={{ background: 'rgba(245, 158, 11, 0.15)', border: '1px solid rgba(245, 158, 11, 0.4)', borderRadius: 'var(--radius-sm)', padding: '10px 16px', marginBottom: 16, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ color: '#F59E0B', fontWeight: 600, fontSize: '0.9rem' }}>{attAlert}</span>
              <button style={{ background: 'none', border: 'none', color: '#F59E0B', cursor: 'pointer', fontSize: '1rem' }} onClick={() => setAttAlert(null)}>✕</button>
            </div>
          )}
          {/* Header Row */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <div>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: 2 }}>Daily Attendance</div>
              <div style={{ fontSize: '1.05rem', fontWeight: 600, color: 'var(--text-main)' }}>
                {attendance.clockOutAt ? '✓ Day Complete' : 'Clocked in'}
              </div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{attRemaining || (attendance.clockOutAt ? 'Finished' : '')}</div>
              <div style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--primary)' }}>{Math.round(attProgress)}%</div>
            </div>
          </div>
          {/* Progress Track */}
          <div style={{ height: 10, background: 'rgba(255,255,255,0.08)', borderRadius: 5, overflow: 'hidden', position: 'relative' }}>
            <div style={{
              height: '100%',
              width: `${attendance.clockOutAt ? 100 : attProgress}%`,
              background: attProgress >= 90 ? 'linear-gradient(90deg, var(--primary), #F59E0B)' : 'linear-gradient(90deg, var(--primary), #34D399)',
              borderRadius: 5,
              transition: 'width 1s ease-out',
              boxShadow: '0 0 8px rgba(52, 211, 153, 0.3)'
            }} />
          </div>
          {/* Time Labels */}
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 6 }}>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
              {new Date(attendance.clockInAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </span>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>5:00 PM</span>
          </div>
        </div>
      )}

      {/* Stat Cards */}
      <div className="grid-cards mb-6">
        <div className="card stat-card">
          <span className="stat-title">This Week</span>
          <span className="stat-value">{stats.totalHours}h</span>
          <span className="stat-trend trend-up">{stats.itemsCount} entries</span>
        </div>
        <div className="card stat-card">
          <span className="stat-title">Billable Hours</span>
          <span className="stat-value">{stats.billableHours}h</span>
        </div>
        <div className="card stat-card">
          <span className="stat-title">Approved</span>
          <span className="stat-value">{stats.approvedCount}</span>
          <span className="stat-trend">{stats.itemsCount > 0 ? Math.round((stats.approvedCount / stats.itemsCount) * 100) : 0}% rate</span>
        </div>
        {isManager && teamActivity && (
          <div className="card stat-card">
            <span className="stat-title">Active Timers</span>
            <span className="stat-value">{teamActivity.totalActive}</span>
            <span className="stat-trend">{teamActivity.totalMembers} members</span>
          </div>
        )}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 24 }}>
        {/* Weekly Chart */}
        <div className="card">
          <h3 style={{ margin: '0 0 24px 0', fontSize: '1.1rem' }}>Weekly Overview</h3>
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: 12, height: 160 }}>
            {weeklyData.map((h, i) => (
              <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)' }}>{h}h</span>
                <div style={{ width: '100%', maxWidth: 40, height: `${Math.max((h / maxHours) * 120, 4)}px`, background: h > 0 ? 'var(--primary)' : 'var(--border-light)', borderRadius: 'var(--radius-sm)', transition: 'height 0.3s ease' }} />
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{days[i]}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Policy + Info */}
        <div className="card">
          <h3 style={{ margin: '0 0 16px 0', fontSize: '1.1rem' }}>Workspace Policy</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span className="label">Force Timer</span>
              <span className={`badge ${policy?.forceTimer ? 'badge-warning' : 'badge-success'}`}>{policy?.forceTimer ? 'ON' : 'OFF'}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span className="label">Idle Timeout</span>
              <span style={{ fontWeight: 600 }}>{policy?.idleMinutes ?? 10}m</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span className="label">Overtime</span>
              <span style={{ fontWeight: 600 }}>{policy?.overtimeHours ?? 8}h</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span className="label">Pomodoro</span>
              <span style={{ fontWeight: 600 }}>{policy?.pomodoroMinutes ?? 25}m / {policy?.breakMinutes ?? 5}m</span>
            </div>
          </div>
        </div>
      </div>

      {/* Recent entries */}
      <div className="card mt-4">
        <h3 style={{ margin: '0 0 16px 0', fontSize: '1.1rem' }}>Recent Entries</h3>
        {recentEntries.length === 0 && <div style={{ color: 'var(--text-muted)', textAlign: 'center', padding: 16 }}>No entries yet</div>}
        {recentEntries.map((e: any) => (
          <div key={e.id} className="list-row" style={{ gridTemplateColumns: '2fr 1fr 100px' }}>
            <div>
              <strong style={{ fontWeight: 500 }}>{e.description}</strong>
              {e.project && <span style={{ fontSize: '0.8rem', color: e.project?.color || 'var(--primary)', marginLeft: 8 }}>● {e.project.name}</span>}
            </div>
            <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>{new Date(e.startedAt).toLocaleString()}</span>
            <span><span className={`badge ${e.billable ? 'badge-success' : 'badge-neutral'}`}>{e.billable ? 'Billable' : 'Non-billable'}</span></span>
          </div>
        ))}
      </div>
    </AppShell>
  );
}
