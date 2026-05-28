'use client';

import { useEffect, useState } from 'react';
import { AppShell } from '../../../components/app-shell';
import { Toast } from '../../../components/toast';
import { getPolicies, updatePolicies, getWorkspace, updateWorkspace } from '@divisionx/api-client';

export default function SettingsPage() {
  const [workspaceName, setWorkspaceName] = useState('');
  const [timezone, setTimezone] = useState('UTC');
  const [forceTimer, setForceTimer] = useState(false);
  const [idleMinutes, setIdleMinutes] = useState(10);
  const [overtimeHours, setOvertimeHours] = useState(8);
  const [pomodoroMinutes, setPomodoroMinutes] = useState(25);
  const [breakMinutes, setBreakMinutes] = useState(5);
  const [longRunningMinutes, setLongRunningMinutes] = useState(480);
  const [reminderEnabled, setReminderEnabled] = useState(true);
  const [weekStartDay, setWeekStartDay] = useState(1);
  const [fiscalYearStartMonth, setFiscalYearStartMonth] = useState(1);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  useEffect(() => {
    Promise.all([getPolicies(), getWorkspace()]).then(([p, ws]) => {
      setForceTimer(p.forceTimer); setIdleMinutes(p.idleMinutes); setOvertimeHours(p.overtimeHours);
      setPomodoroMinutes(p.pomodoroMinutes ?? 25); setBreakMinutes(p.breakMinutes ?? 5);
      setLongRunningMinutes(p.longRunningMinutes ?? 480); setReminderEnabled(p.reminderEnabled ?? true);
      setWeekStartDay(p.weekStartDay ?? 1);
      setFiscalYearStartMonth(p.fiscalYearStartMonth ?? 1);
      setWorkspaceName(ws.workspaceName || ''); setTimezone(ws.timezone || 'UTC');
    }).catch(() => setToast({ text: 'Failed to load settings', type: 'error' })).finally(() => setLoading(false));
  }, []);

  async function saveWorkspace() {
    try { await updateWorkspace({ name: workspaceName, timezone }); setToast({ text: 'Workspace updated', type: 'success' }); }
    catch { setToast({ text: 'Failed to save', type: 'error' }); }
  }

  async function savePolicies() {
    try { 
      await updatePolicies({ 
        forceTimer, 
        idleMinutes, 
        overtimeHours, 
        pomodoroMinutes, 
        breakMinutes, 
        longRunningMinutes, 
        reminderEnabled, 
        weekStartDay,
        fiscalYearStartMonth
      }); 
      setToast({ text: 'Policies saved', type: 'success' }); 
    }
    catch { setToast({ text: 'Failed to save', type: 'error' }); }
  }

  if (loading) return <AppShell title="Settings"><div className="card" style={{ textAlign: 'center', padding: 40, color: 'var(--text-muted)' }}>Loading...</div></AppShell>;

  return (
    <AppShell title="Settings">
      {/* Workspace Info */}
      <div className="card mb-6">
        <h3 style={{ margin: '0 0 16px 0', fontSize: '1.1rem' }}>Workspace</h3>
        <div style={{ display: 'flex', gap: 12, alignItems: 'flex-end', flexWrap: 'wrap' }}>
          <div className="input-group"><label className="label">Workspace Name</label><input className="input" value={workspaceName} onChange={(e) => setWorkspaceName(e.target.value)} /></div>
          <div className="input-group"><label className="label">Timezone</label>
            <select className="select" value={timezone} onChange={(e) => setTimezone(e.target.value)}>
              <option value="UTC">UTC</option><option value="America/New_York">US Eastern</option><option value="America/Chicago">US Central</option><option value="America/Los_Angeles">US Pacific</option><option value="Europe/London">London</option><option value="Europe/Berlin">Berlin</option><option value="Asia/Kolkata">India</option><option value="Asia/Tokyo">Tokyo</option>
            </select>
          </div>
          <button className="btn btn-primary" onClick={saveWorkspace}>Save</button>
        </div>
      </div>

      {/* Policy settings */}
      <div className="card mb-6">
        <h3 style={{ margin: '0 0 24px 0', fontSize: '1.1rem' }}>Policies</h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: 20 }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer' }}>
            <input type="checkbox" checked={forceTimer} onChange={(e) => setForceTimer(e.target.checked)} />
            <div><strong style={{ fontWeight: 500 }}>Force Timer Mode</strong><div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Disable manual time entry</div></div>
          </label>
          <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer' }}>
            <input type="checkbox" checked={reminderEnabled} onChange={(e) => setReminderEnabled(e.target.checked)} />
            <div><strong style={{ fontWeight: 500 }}>Reminders</strong><div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Notify when working without timer</div></div>
          </label>
          <div className="input-group"><label className="label">Idle Timeout (minutes)</label><input className="input" type="number" value={idleMinutes} onChange={(e) => setIdleMinutes(Number(e.target.value))} /></div>
          <div className="input-group"><label className="label">Overtime Threshold (hours)</label><input className="input" type="number" value={overtimeHours} onChange={(e) => setOvertimeHours(Number(e.target.value))} /></div>
          <div className="input-group"><label className="label">Long Running Alert (minutes)</label><input className="input" type="number" value={longRunningMinutes} onChange={(e) => setLongRunningMinutes(Number(e.target.value))} /></div>
          <div className="input-group"><label className="label">Pomodoro Focus (minutes)</label><input className="input" type="number" value={pomodoroMinutes} onChange={(e) => setPomodoroMinutes(Number(e.target.value))} /></div>
          <div className="input-group"><label className="label">Break Duration (minutes)</label><input className="input" type="number" value={breakMinutes} onChange={(e) => setBreakMinutes(Number(e.target.value))} /></div>
          <div className="input-group"><label className="label">Week Starts On</label>
            <select className="select" value={weekStartDay} onChange={(e) => setWeekStartDay(Number(e.target.value))}>
              <option value={0}>Sunday</option><option value={1}>Monday</option><option value={6}>Saturday</option>
            </select>
          </div>
          <div className="input-group"><label className="label">Fiscal Year Starts In</label>
            <select className="select" value={fiscalYearStartMonth} onChange={(e) => setFiscalYearStartMonth(Number(e.target.value))}>
              <option value={1}>January</option>
              <option value={2}>February</option>
              <option value={3}>March</option>
              <option value={4}>April</option>
              <option value={5}>May</option>
              <option value={6}>June</option>
              <option value={7}>July</option>
              <option value={8}>August</option>
              <option value={9}>September</option>
              <option value={10}>October</option>
              <option value={11}>November</option>
              <option value={12}>December</option>
            </select>
          </div>
        </div>
        <div style={{ marginTop: 24 }}><button className="btn btn-primary" onClick={savePolicies}>Save Policies</button></div>
      </div>

      <Toast message={toast?.text || ''} type={toast?.type || 'success'} onClose={() => setToast(null)} />
    </AppShell>
  );
}
