'use client';

import { useEffect, useState, useCallback, useRef, useMemo } from 'react';
import { AppShell } from '../../components/app-shell';
import { Toast } from '../../components/toast';
import { SkeletonTracker } from '../../components/skeleton';
import {
  getTimeEntries, startTimer, stopTimer,
  getRunningTimer, getCatalog, createCatalog, updateCatalog, getCurrentRole, startBreak, stopBreak,
  startPomodoro, getTimerAlerts, getPolicies, reportIdle
} from '@divisionx/api-client';
import { requestNotificationPermission, notifyCritical } from '../../components/notification-manager';
import { useActivityTracker } from '../../hooks/use-activity-tracker';

function formatDuration(ms: number): string {
  const h = Math.floor(ms / 3600000);
  const m = Math.floor((ms % 3600000) / 60000);
  const s = Math.floor((ms % 60000) / 1000);
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

const KANBAN_STATUSES = ['To Do', 'In Progress', 'In Review', 'Blocked', 'Completed'];

type Mode = 'timer' | 'pomodoro';

// Leaf Active Timer Clock component to isolate 1000ms re-render ticks from the parent board
interface ActiveTimerBannerProps {
  running: any;
  onBreak: boolean;
  frozenElapsed: string | null;
  totalBreakMs: number;
  toggleBreak: () => void;
  onStop: () => void;
  actionPending: boolean;
  actionType: string | null;
}

function ActiveTimerBanner({
  running,
  onBreak,
  frozenElapsed,
  totalBreakMs,
  toggleBreak,
  onStop,
  actionPending,
  actionType,
}: ActiveTimerBannerProps) {
  const [elapsed, setElapsed] = useState('00:00:00');

  useEffect(() => {
    let intervalId: any = null;
    if (running && !onBreak) {
      const tick = () => {
        const ms = Date.now() - new Date(running.startedAt).getTime() - totalBreakMs;
        setElapsed(formatDuration(Math.max(0, ms)));
      };
      tick();
      intervalId = setInterval(tick, 1000);
    } else {
      setElapsed('00:00:00');
    }
    return () => {
      if (intervalId) clearInterval(intervalId);
    };
  }, [running, onBreak, totalBreakMs]);

  if (!running) return null;

  return (
    <div className="card card-dark mb-6">
      {onBreak && (
        <div style={{ background: '#F59E0B', color: 'white', padding: '8px 16px', borderRadius: 'var(--radius-sm)', marginBottom: 12, fontWeight: 600, textAlign: 'center', fontSize: '0.9rem' }}>
          ☕ On Break — Timer paused
        </div>
      )}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={{ fontSize: '0.85rem', color: 'rgba(255,255,255,0.6)' }}>Currently tracking:</span>
          <strong style={{ fontSize: '1.1rem', color: 'white' }}>{running.description}</strong>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ fontFamily: 'monospace', fontSize: '1.5rem', fontWeight: 700, color: onBreak ? '#F59E0B' : 'white' }}>{frozenElapsed || elapsed}</div>
          <button 
            className="btn btn-secondary" 
            style={{ padding: '6px 10px', fontSize: '0.85rem' }} 
            onClick={toggleBreak}
            disabled={actionPending}
          >
            {actionType === 'break' ? <span className="spinner" /> : '☕ '}
            {onBreak ? 'End Break' : 'Break'}
          </button>
          <button 
            className="btn btn-danger" 
            onClick={onStop}
            disabled={actionPending}
          >
            {actionType === 'stop' ? <span className="spinner" /> : '■ '}
            Stop
          </button>
        </div>
      </div>
    </div>
  );
}

interface LiveForensicsHUDProps {
  metrics: {
    keystrokes: number;
    mouseMovement: number;
    clicks: number;
    activeScore: number;
  };
  isActive: boolean;
}

function LiveForensicsHUD({ metrics, isActive }: LiveForensicsHUDProps) {
  if (!isActive) return null;

  return (
    <div className="card card-dark mb-6" style={{
      background: 'linear-gradient(135deg, rgba(255,255,255,0.03) 0%, rgba(255,255,255,0.01) 100%)',
      border: '1px solid rgba(255,255,255,0.05)',
      padding: '16px 20px',
      borderRadius: '16px',
      boxShadow: '0 4px 30px rgba(0,0,0,0.35)',
      backdropFilter: 'blur(8px)'
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
        <h4 style={{ margin: 0, fontSize: '0.85rem', fontWeight: 600, color: 'rgba(255,255,255,0.6)', textTransform: 'uppercase', letterSpacing: '0.5px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span className="live-dot" style={liveDotStyle}></span> ⚡ Live Input Productivity Forensics HUD
        </h4>
        <span style={{
          fontSize: '0.72rem',
          fontWeight: 700,
          background: metrics.activeScore >= 70 ? 'rgba(16, 185, 129, 0.1)' : 'rgba(245, 158, 11, 0.1)',
          color: metrics.activeScore >= 70 ? '#34D399' : '#FBBF24',
          border: metrics.activeScore >= 70 ? '1px solid rgba(16, 185, 129, 0.2)' : '1px solid rgba(245, 158, 11, 0.2)',
          padding: '2px 8px',
          borderRadius: '6px',
          letterSpacing: '0.5px'
        }}>
          ACTIVE RATIO: {metrics.activeScore}%
        </span>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '14px' }}>
        
        {/* Keyboard Velocity */}
        <div style={hudMetricBlockStyle}>
          <div style={{ fontSize: '1.25rem' }}>⌨️</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
            <span style={hudLabelStyle}>Keystrokes</span>
            <span style={{ fontSize: '1.05rem', fontWeight: 700, color: '#fff', fontFamily: 'monospace' }}>
              {metrics.keystrokes}
            </span>
          </div>
        </div>

        {/* Mouse Vector Travel */}
        <div style={hudMetricBlockStyle}>
          <div style={{ fontSize: '1.25rem' }}>🖱️</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
            <span style={hudLabelStyle}>Pointer Travel</span>
            <span style={{ fontSize: '1.05rem', fontWeight: 700, color: '#fff', fontFamily: 'monospace' }}>
              {metrics.mouseMovement.toLocaleString()} px
            </span>
          </div>
        </div>

        {/* Click Density */}
        <div style={hudMetricBlockStyle}>
          <div style={{ fontSize: '1.25rem' }}>🖲️</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
            <span style={hudLabelStyle}>Click Counts</span>
            <span style={{ fontSize: '1.05rem', fontWeight: 700, color: '#fff', fontFamily: 'monospace' }}>
              {metrics.clicks} clicks
            </span>
          </div>
        </div>

        {/* Active Ratio Ring Tracker */}
        <div style={hudMetricBlockStyle}>
          <div style={{ fontSize: '1.25rem' }}>⚡</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
            <span style={hudLabelStyle}>State Tracker</span>
            <span style={{ fontSize: '1.05rem', fontWeight: 700, color: metrics.activeScore >= 70 ? '#34D399' : '#FBBF24', fontFamily: 'monospace' }}>
              {metrics.activeScore >= 70 ? '🟢 OPTIMAL' : '🟡 LOW INPUT'}
            </span>
          </div>
        </div>

      </div>
    </div>
  );
}

const liveDotStyle: React.CSSProperties = {
  width: '6px',
  height: '6px',
  borderRadius: '50%',
  background: '#EF4444',
  display: 'inline-block',
  boxShadow: '0 0 8px #EF4444',
  animation: 'pulse-active 2s infinite'
};

const hudMetricBlockStyle: React.CSSProperties = {
  background: 'rgba(255,255,255,0.02)',
  border: '1px solid rgba(255,255,255,0.04)',
  borderRadius: '10px',
  padding: '10px 14px',
  display: 'flex',
  alignItems: 'center',
  gap: '12px'
};

const hudLabelStyle: React.CSSProperties = {
  fontSize: '0.7rem',
  color: 'rgba(255,255,255,0.4)',
  textTransform: 'uppercase',
  fontWeight: 600,
  letterSpacing: '0.5px'
};

export default function TrackerPage() {
  const [loading, setLoading] = useState(true);
  const [description, setDescription] = useState('');
  const [projectId, setProjectId] = useState('');
  const [billable, setBillable] = useState(false);
  const [items, setItems] = useState<any[]>([]);
  const [projects, setProjects] = useState<any[]>([]);
  const [myTasks, setMyTasks] = useState<any[]>([]);
  const [newTaskName, setNewTaskName] = useState('');
  const [newTaskPriority, setNewTaskPriority] = useState('Low');
  const [newTaskProject, setNewTaskProject] = useState('');
  const [showNewTask, setShowNewTask] = useState(false);
  const [filterPriority, setFilterPriority] = useState('All');
  const [draggedTaskId, setDraggedTaskId] = useState<string | null>(null);
  const [running, setRunning] = useState<any | null>(null);
  const [toast, setToast] = useState<{ text: string; type: 'success' | 'error' } | null>(null);
  const role = typeof window !== 'undefined' ? getCurrentRole() : 'MEMBER';
  const [actionPending, setActionPending] = useState(false);
  const [actionType, setActionType] = useState<string | null>(null);

  // Pomodoro state
  const [mode, setMode] = useState<Mode>('timer');
  const [pomodoroActive, setPomodoroActive] = useState(false);
  const [pomodoroElapsed, setPomodoroElapsed] = useState('00:00');
  const [pomodoroPhase, setPomodoroPhase] = useState<'focus' | 'break'>('focus');
  const [pomodoroFocus, setPomodoroFocus] = useState(25);
  const [pomodoroBreak, setPomodoroBreak] = useState(5);
  const [pomodoroStartTime, setPomodoroStartTime] = useState<number | null>(null);
  const pomodoroRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Break state
  const [onBreak, setOnBreak] = useState(false);
  const [frozenElapsed, setFrozenElapsed] = useState<string | null>(null);
  const breakStartRef = useRef<number>(0);
  const totalBreakMsRef = useRef<number>(0);

  // Idle detection state
  const [idleAlert, setIdleAlert] = useState(false);
  const [longRunAlert, setLongRunAlert] = useState(false);
  const idleRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [idleMinutes, setIdleMinutes] = useState(10);

  // Hook to track active user browser pointer/typing activity metrics in real-time
  const activityMetrics = useActivityTracker(
    !!running && !onBreak,
    idleMinutes,
    () => {
      // onAutoPaused callback (timer auto-paused by backend policy)
      setRunning(null);
      setOnBreak(false);
      setToast({ text: 'Timer auto-paused due to inactivity break.', type: 'error' });
      refresh();
    },
    () => {
      // onIdleDetected callback (when autoPauseOnIdle is disabled)
      setIdleAlert(true);
      notifyCritical(
        'TheTime — Idle Detected',
        `You've been inactive for ${idleMinutes} minutes while the timer is running.`,
        'idle'
      );
    }
  );

  // Load project and task catalogs once on mount
  useEffect(() => {
    async function loadMetadata() {
      try {
        const [proj, tks] = await Promise.all([
          getCatalog('projects'),
          getCatalog('tasks')
        ]);
        setProjects(proj.items);
        setMyTasks(tks.items);
      } catch {
        setToast({ text: 'Failed to load workspace metadata', type: 'error' });
      }
    }
    loadMetadata();
  }, []);

  // Dedicated task reloader called only on structural task mutations
  const reloadTasks = useCallback(async () => {
    try {
      const tks = await getCatalog('tasks');
      setMyTasks(tks.items);
    } catch {}
  }, []);

  // Fetch only transactional entries and live timer status
  const refresh = useCallback(async () => {
    try {
      const currentUserId = typeof window !== 'undefined' ? localStorage.getItem('thetime_user_id') || undefined : undefined;
      const [entries, timer] = await Promise.all([
        getTimeEntries({ pageSize: 200, userId: currentUserId }),
        getRunningTimer()
      ]);
      setItems(entries.items);
      if (timer.running && timer.entry) {
        setRunning(timer.entry);
        setDescription(timer.entry.description || '');
      } else {
        setRunning(null);
      }
    } catch {
      setToast({ text: 'Failed to load data', type: 'error' });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  // Load running state from LocalStorage on initial client mount to eliminate visual flickers
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const cached = localStorage.getItem('thetime_running_timer');
      if (cached) {
        try {
          const parsed = JSON.parse(cached);
          if (parsed && parsed.startedAt) {
            setRunning(parsed);
            setDescription(parsed.description || '');
          }
        } catch (e) {
          console.error('Failed to parse cached timer state:', e);
        }
      }
    }
  }, []);

  // Synchronize running state with LocalStorage
  useEffect(() => {
    if (typeof window !== 'undefined') {
      if (running) {
        localStorage.setItem('thetime_running_timer', JSON.stringify(running));
      } else {
        localStorage.removeItem('thetime_running_timer');
      }
    }
  }, [running]);

  // Load policy for idle timeout
  useEffect(() => {
    getPolicies().then((p: any) => {
      setIdleMinutes(p.idleMinutes || 10);
      setPomodoroFocus(p.pomodoroMinutes || 25);
      setPomodoroBreak(p.breakMinutes || 5);
    }).catch(() => {});
  }, []);

  // Request browser notification permission
  useEffect(() => { requestNotificationPermission(); }, []);

  // Freeze elapsed timer display if on break
  useEffect(() => {
    if (onBreak && running) {
      const ms = Date.now() - new Date(running.startedAt).getTime() - totalBreakMsRef.current;
      setFrozenElapsed(formatDuration(Math.max(0, ms)));
    } else {
      setFrozenElapsed(null);
    }
  }, [onBreak, running]);

  // In-browser inputs activity density and SOC 2 forensics is now managed by the useActivityTracker hook above.
  useEffect(() => {
    // Basic fallback cleanup for backward compatibility
    return () => {
      if (idleRef.current) clearTimeout(idleRef.current);
    };
  }, []);

  // Long running timer check
  useEffect(() => {
    if (!running) { setLongRunAlert(false); return; }
    const check = () => {
      getTimerAlerts().then((a: any) => {
        if (a.longRunning && !longRunAlert) {
          notifyCritical('TheTime — Long Running Timer', 'Your timer has been running for an unusually long time.', 'longrun');
        }
        setLongRunAlert(a.longRunning);
      }).catch(() => {});
    };
    check();
    const interval = setInterval(check, 60000);
    return () => clearInterval(interval);
  }, [running, longRunAlert]);

  // Pomodoro timer
  useEffect(() => {
    if (pomodoroRef.current) clearInterval(pomodoroRef.current);
    if (pomodoroActive && pomodoroStartTime) {
      const totalMs = (pomodoroPhase === 'focus' ? pomodoroFocus : pomodoroBreak) * 60 * 1000;
      const tick = () => {
        const elapsedMs = Date.now() - pomodoroStartTime;
        const remaining = Math.max(0, totalMs - elapsedMs);
        const m = Math.floor(remaining / 60000);
        const s = Math.floor((remaining % 60000) / 1000);
        setPomodoroElapsed(`${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`);
        if (remaining <= 0) {
          if (pomodoroPhase === 'focus') {
            setPomodoroPhase('break');
            setPomodoroStartTime(Date.now());
            setToast({ text: '🍅 Focus done! Take a break.', type: 'success' });
            notifyCritical('🍅 Pomodoro — Focus Complete', 'Great work! Time for a break.', 'pomo-focus');
            startBreak().catch(() => {});
            setOnBreak(true);
          } else {
            setPomodoroActive(false);
            setPomodoroPhase('focus');
            setPomodoroStartTime(null);
            setToast({ text: '🍅 Break over! Ready for next focus.', type: 'success' });
            notifyCritical('🍅 Pomodoro — Break Over', 'Ready for your next focus session!', 'pomo-break');
            stopBreak().catch(() => {});
            setOnBreak(false);
          }
        }
      };
      tick();
      pomodoroRef.current = setInterval(tick, 1000);
    }
    return () => { if (pomodoroRef.current) clearInterval(pomodoroRef.current); };
  }, [pomodoroActive, pomodoroStartTime, pomodoroPhase, pomodoroFocus, pomodoroBreak]);

  // Keyboard shortcut
  useEffect(() => {
    function handler(e: KeyboardEvent) {
      if (actionPending) return;
      if (e.altKey && e.key === 's') {
        e.preventDefault();
        if (running) { onStop(); }
        else { onStartManualTimer(); }
      }
      if (e.altKey && e.key === 'b') {
        e.preventDefault();
        toggleBreak();
      }
      if (e.altKey && e.key === 'p') {
        e.preventDefault();
        togglePomodoro();
      }
    }
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [running, description, projectId, billable, refresh, onBreak, pomodoroActive, actionPending]);

  async function onStartManualTimer() {
    if (actionPending) return;
    setActionPending(true);
    setActionType('stop');
    try {
      await startTimer({ description: description || 'Quick start', projectId: projectId || undefined, billable });
      setDescription('');
      await refresh();
    } catch {
      setToast({ text: 'Failed to start timer', type: 'error' });
    } finally {
      setActionType(null);
      setActionPending(false);
    }
  }

  async function onStartTask(task: any) {
    if (actionPending) return;
    setActionPending(true);
    setActionType(`start-task-${task.id}`);
    try {
      await startTimer({ description: task.name, taskId: task.id, projectId: task.projectId || undefined, billable });
      await refresh();
    } catch { 
      setToast({ text: 'Failed to start task timer', type: 'error' }); 
    } finally {
      setActionType(null);
      setActionPending(false);
    }
  }

  async function onAddTask() {
    if (!newTaskName.trim()) return;
    if (actionPending) return;
    setActionPending(true);
    setActionType('add-task');
    try {
      await createCatalog('tasks', { name: newTaskName, status: 'To Do', priority: newTaskPriority, projectId: newTaskProject || undefined });
      setNewTaskName('');
      setNewTaskPriority('Low');
      setNewTaskProject('');
      setShowNewTask(false);
      await reloadTasks();
      setToast({ text: 'Task created', type: 'success' });
    } catch { 
      setToast({ text: 'Failed to create task', type: 'error' }); 
    } finally {
      setActionType(null);
      setActionPending(false);
    }
  }

  const filteredTasks = useMemo(() => {
    return filterPriority === 'All' ? myTasks : myTasks.filter(t => t.priority === filterPriority);
  }, [myTasks, filterPriority]);

  // Memoize task tracked durations to avoid expensive array reductions in the main rendering loop
  const taskDurations = useMemo(() => {
    const durationMap: Record<string, number> = {};
    const now = Date.now();
    for (const item of items) {
      if (!item.taskId) continue;
      const start = new Date(item.startedAt).getTime();
      const end = item.endedAt ? new Date(item.endedAt).getTime() : now;
      durationMap[item.taskId] = (durationMap[item.taskId] || 0) + (end - start);
    }
    return durationMap;
  }, [items]);

  function getTaskTrackedTime(taskId: string) {
    const ms = taskDurations[taskId] || 0;
    return formatDuration(ms);
  }

  // Kanban drag starts
  function handleDragStart(e: React.DragEvent, taskId: string) {
    setDraggedTaskId(taskId);
    e.dataTransfer.setData('text/plain', taskId);
    e.dataTransfer.effectAllowed = 'move';
  }

  function handleDragOver(e: React.DragEvent) {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  }

  async function handleDrop(e: React.DragEvent, status: string) {
    e.preventDefault();
    const taskId = e.dataTransfer.getData('text/plain') || draggedTaskId;
    if (!taskId) return;
    const task = myTasks.find(t => t.id === taskId);
    if (!task || task.status === status) return;
    
    setMyTasks(prev => prev.map(t => t.id === taskId ? { ...t, status } : t));
    
    if (actionPending) return;
    setActionPending(true);
    setActionType('drop-task');
    try {
      await updateCatalog('tasks', taskId, { status });
      await reloadTasks();
    } catch {
      setToast({ text: 'Failed to update task status', type: 'error' });
      await reloadTasks();
    } finally {
      setActionType(null);
      setActionPending(false);
    }
  }

  async function onStop() {
    if (actionPending) return;
    setActionPending(true);
    setActionType('stop');
    try {
      await stopTimer();
      setPomodoroActive(false);
      setOnBreak(false);
      await refresh();
    } catch { 
      setToast({ text: 'Failed to stop timer', type: 'error' }); 
    } finally {
      setActionType(null);
      setActionPending(false);
    }
  }

  async function toggleBreak() {
    if (actionPending) return;
    setActionPending(true);
    setActionType('break');
    try {
      if (onBreak) {
        totalBreakMsRef.current += Date.now() - breakStartRef.current;
        await stopBreak();
        setOnBreak(false);
        setToast({ text: 'Break ended', type: 'success' });
      } else {
        breakStartRef.current = Date.now();
        await startBreak();
        setOnBreak(true);
        setToast({ text: 'Break started', type: 'success' });
      }
    } catch { 
      setToast({ text: 'Break action failed', type: 'error' }); 
    } finally {
      setActionType(null);
      setActionPending(false);
    }
  }

  async function togglePomodoro() {
    if (actionPending) return;
    setActionPending(true);
    setActionType('pomodoro');
    try {
      if (pomodoroActive) {
        setPomodoroActive(false);
        setPomodoroPhase('focus');
        setPomodoroStartTime(null);
        await stopBreak().catch(() => {});
        setOnBreak(false);
      } else {
        setPomodoroActive(true);
        setPomodoroPhase('focus');
        setPomodoroStartTime(Date.now());
        if (!running) {
          await startTimer({ description: description || '🍅 Pomodoro Focus', projectId: projectId || undefined, billable });
          await refresh();
        }
      }
    } catch { 
      setToast({ text: 'Pomodoro action failed', type: 'error' }); 
    } finally {
      setActionType(null);
      setActionPending(false);
    }
  }

  if (loading) {
    return (
      <AppShell title="Time Tracker">
        <SkeletonTracker />
      </AppShell>
    );
  }

  return (
    <AppShell title="Time Tracker">
      {/* Idle Alert Banner */}
      {idleAlert && (
        <div className="card mb-6" style={{ background: 'var(--warning-bg)', border: '1px solid var(--warning-text)', padding: '14px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <strong style={{ color: 'var(--warning-text)' }}>⚠️ Idle Detected</strong>
            <span style={{ color: 'var(--warning-text)', marginLeft: 8, fontSize: '0.9rem' }}>You&apos;ve been inactive for {idleMinutes} minutes while the timer is running.</span>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="btn btn-secondary" style={{ padding: '6px 12px', fontSize: '0.8rem' }} onClick={() => setIdleAlert(false)}>Dismiss</button>
            <button className="btn btn-danger" style={{ padding: '6px 12px', fontSize: '0.8rem' }} onClick={() => { onStop(); setIdleAlert(false); }}>Stop Timer</button>
          </div>
        </div>
      )}

      {/* Long Running Alert Banner */}
      {longRunAlert && !idleAlert && (
        <div className="card mb-6" style={{ background: 'var(--danger-bg)', border: '1px solid var(--danger-text)', padding: '14px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <strong style={{ color: 'var(--danger-text)' }}>⏰ Long Running Timer</strong>
            <span style={{ color: 'var(--danger-text)', marginLeft: 8, fontSize: '0.9rem' }}>Your timer has been running for an unusually long time.</span>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="btn btn-secondary" style={{ padding: '6px 12px', fontSize: '0.8rem' }} onClick={() => setLongRunAlert(false)}>Dismiss</button>
            <button className="btn btn-danger" style={{ padding: '6px 12px', fontSize: '0.8rem' }} onClick={() => { onStop(); setLongRunAlert(false); }}>Stop Timer</button>
          </div>
        </div>
      )}

      {/* Mode Toggle + Pomodoro/Break Controls */}
      <div className="card mb-6" style={{ display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', borderRadius: 'var(--radius-md)', overflow: 'hidden', border: '1px solid var(--border-light)' }}>
          <button
            className="btn"
            style={{ borderRadius: 0, padding: '8px 16px', fontSize: '0.85rem', background: mode === 'timer' ? 'var(--primary)' : 'transparent', color: mode === 'timer' ? '#022c22' : 'var(--text-main)', border: 'none' }}
            onClick={() => { setMode('timer'); if (pomodoroActive) togglePomodoro(); }}
          >⏱ Timer</button>
          <button
            className="btn"
            style={{ borderRadius: 0, padding: '8px 16px', fontSize: '0.85rem', background: mode === 'pomodoro' ? 'var(--primary)' : 'transparent', color: mode === 'pomodoro' ? '#022c22' : 'var(--text-main)', border: 'none', borderLeft: '1px solid var(--border-light)' }}
            onClick={() => setMode('pomodoro')}
          >🍅 Pomodoro</button>
        </div>

        {running && (
          <button
            className="btn"
            style={{ padding: '8px 16px', fontSize: '0.85rem', background: onBreak ? '#F59E0B' : 'transparent', color: onBreak ? 'white' : 'var(--text-main)', border: '1px solid var(--border-light)' }}
            onClick={toggleBreak}
            disabled={actionPending}
          >
            {actionType === 'break' ? <span className="spinner" /> : (onBreak ? '☕ ' : '☕ ')}
            {onBreak ? 'End Break' : 'Take Break'}
          </button>
        )}

        {mode === 'pomodoro' && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginLeft: 'auto' }}>
            {pomodoroActive ? (
              <>
                <div style={{
                  padding: '8px 16px', borderRadius: 'var(--radius-md)',
                  background: pomodoroPhase === 'focus' ? 'var(--success-bg)' : 'var(--warning-bg)',
                  color: pomodoroPhase === 'focus' ? 'var(--success-text)' : 'var(--warning-text)',
                  fontWeight: 600, fontSize: '0.9rem'
                }}>
                  {pomodoroPhase === 'focus' ? '🎯 Focus' : '☕ Break'} — {pomodoroElapsed}
                </div>
                <button 
                  className="btn btn-secondary" 
                  style={{ padding: '6px 12px', fontSize: '0.8rem' }} 
                  onClick={togglePomodoro}
                  disabled={actionPending}
                >
                  {actionType === 'pomodoro' ? <span className="spinner" /> : ''}
                  Cancel
                </button>
              </>
            ) : (
              <>
                <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>{pomodoroFocus}m focus / {pomodoroBreak}m break</span>
                <button 
                  className="btn btn-primary" 
                  style={{ padding: '8px 16px', fontSize: '0.85rem' }} 
                  onClick={togglePomodoro}
                  disabled={actionPending}
                >
                  {actionType === 'pomodoro' ? <span className="spinner" /> : ''}
                  Start Pomodoro
                </button>
              </>
            )}
          </div>
        )}

        <div style={{ marginLeft: 'auto', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
          Alt+S start/stop · Alt+B break · Alt+P pomodoro
        </div>
      </div>

      <ActiveTimerBanner
        running={running}
        onBreak={onBreak}
        frozenElapsed={frozenElapsed}
        totalBreakMs={totalBreakMsRef.current}
        toggleBreak={toggleBreak}
        onStop={onStop}
        actionPending={actionPending}
        actionType={actionType}
      />

      <LiveForensicsHUD
        metrics={activityMetrics}
        isActive={!!running && !onBreak}
      />

      {/* Kanban Board */}
      <div style={{ padding: '0' }}>
        {/* Board Header — filters & new task */}
        <div className="card mb-4" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
          <h3 style={{ margin: 0, fontSize: '1.2rem', color: 'var(--text-main)' }}>Task Board</h3>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginLeft: 'auto' }}>
            {/* Priority Filter */}
            <select className="select select-sm" style={{ minWidth: 140 }} value={filterPriority} onChange={e => setFilterPriority(e.target.value)}>
              <option value="All">All Priorities</option>
              <option value="Low">Low</option>
              <option value="Medium">Medium</option>
              <option value="High">High</option>
            </select>
            <button className="btn btn-primary" style={{ padding: '8px 16px', fontSize: '0.85rem', fontWeight: 600 }} onClick={() => setShowNewTask(true)}>+ New Task</button>
          </div>
        </div>

        {/* New Task Modal */}
        {showNewTask && (
          <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }} onClick={() => setShowNewTask(false)}>
            <div className="card" style={{ width: 420, maxWidth: '90vw', padding: 24 }} onClick={e => e.stopPropagation()}>
              <h3 style={{ margin: '0 0 20px 0', fontSize: '1.1rem' }}>Create New Task</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                <input className="input" placeholder="Task name..." value={newTaskName} onChange={e => setNewTaskName(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') onAddTask(); }} autoFocus />
                <div style={{ display: 'flex', gap: 10 }}>
                  <select className="select" style={{ flex: 1 }} value={newTaskPriority} onChange={e => setNewTaskPriority(e.target.value)}>
                    <option value="Low">Low Priority</option>
                    <option value="Medium">Medium Priority</option>
                    <option value="High">High Priority</option>
                  </select>
                  <select className="select" style={{ flex: 1 }} value={newTaskProject} onChange={e => setNewTaskProject(e.target.value)}>
                    <option value="">No Project</option>
                    {projects.map((p: any) => <option key={p.id} value={p.id}>{p.name}</option>)}
                  </select>
                </div>
                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 4 }}>
                  <button className="btn btn-secondary" onClick={() => setShowNewTask(false)} disabled={actionPending}>Cancel</button>
                  <button 
                    className="btn btn-primary" 
                    onClick={onAddTask}
                    disabled={actionPending}
                  >
                    {actionType === 'add-task' ? <span className="spinner" /> : ''}
                    Create Task
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Columns */}
        <div style={{ display: 'flex', gap: 16, overflowX: 'auto', paddingBottom: 16 }}>
          {KANBAN_STATUSES.map(status => {
            const statusColor = status === 'To Do' ? 'var(--primary)' : status === 'In Progress' ? '#3B82F6' : status === 'In Review' ? '#F59E0B' : status === 'Blocked' ? '#DC2626' : '#10B981';
            const colTasks = filteredTasks.filter(t => t.status === status);
            return (
              <div
                key={status}
                style={{ minWidth: 280, flex: 1, flexShrink: 0, background: 'rgba(255,255,255,0.02)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-light)', display: 'flex', flexDirection: 'column' }}
                onDragOver={handleDragOver}
                onDrop={(e) => handleDrop(e, status)}
              >
                {/* Column Header */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px', borderBottom: `2px solid ${statusColor}`, background: 'rgba(255,255,255,0.03)', borderTopLeftRadius: 'var(--radius-md)', borderTopRightRadius: 'var(--radius-md)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ width: 8, height: 8, borderRadius: '50%', background: statusColor }} />
                    <h4 style={{ margin: 0, fontWeight: 600, fontSize: '0.9rem', color: 'var(--text-main)' }}>{status}</h4>
                  </div>
                  <span style={{ fontSize: '0.75rem', background: 'rgba(255,255,255,0.1)', padding: '2px 8px', borderRadius: 12, color: 'var(--text-muted)', fontWeight: 600 }}>{colTasks.length}</span>
                </div>

                {/* Cards */}
                <div style={{ padding: 12, display: 'flex', flexDirection: 'column', gap: 10, minHeight: 120 }}>
                  {colTasks.map(task => {
                    const priorityColor = task.priority === 'High' ? '#DC2626' : task.priority === 'Medium' ? '#F59E0B' : 'var(--primary)';
                    const priorityBg = task.priority === 'High' ? 'rgba(220,38,38,0.15)' : task.priority === 'Medium' ? 'rgba(245,158,11,0.15)' : 'rgba(52,211,153,0.15)';
                    const isActive = running?.description === task.name;
                    const proj = projects.find(p => p.id === task.projectId);

                    return (
                      <div
                        key={task.id}
                        draggable
                        onDragStart={(e) => handleDragStart(e, task.id)}
                        style={{
                          background: isActive ? 'rgba(52,211,153,0.08)' : 'var(--bg-glass)',
                          padding: '14px',
                          borderRadius: 'var(--radius-sm)',
                          border: isActive ? '1px solid var(--primary)' : '1px solid var(--border-light)',
                          cursor: 'grab',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: 10,
                          transition: 'border-color 0.2s, background 0.2s',
                          boxShadow: isActive ? '0 0 12px rgba(52,211,153,0.15)' : '0 2px 4px rgba(0,0,0,0.1)'
                        }}
                      >
                        {/* Top: project tag + priority */}
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          {proj ? <span style={{ fontSize: '0.7rem', fontWeight: 500, color: proj.color || 'var(--text-muted)' }}>● {proj.name}</span> : <span />}
                          <span style={{ fontSize: '0.65rem', fontWeight: 700, background: priorityBg, color: priorityColor, padding: '2px 8px', borderRadius: 4, textTransform: 'uppercase', letterSpacing: '0.5px' }}>{task.priority || 'Low'}</span>
                        </div>

                        {/* Task Name */}
                        <span style={{ fontWeight: 600, fontSize: '0.9rem', color: 'var(--text-main)', lineHeight: 1.4 }}>{task.name}</span>

                        {/* Tracked time */}
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                            ⏱ <strong style={{ color: 'var(--text-main)' }}>{getTaskTrackedTime(task.id)}</strong>
                          </span>

                          {isActive ? (
                            <div style={{ display: 'flex', gap: 4 }}>
                              <button 
                                className="btn btn-secondary" 
                                style={{ padding: '3px 7px', fontSize: '0.7rem' }} 
                                onClick={toggleBreak} 
                                disabled={actionPending}
                                title="Break"
                              >
                                {actionType === 'break' ? <span className="spinner" style={{ marginRight: 0 }} /> : '☕'}
                              </button>
                              <button 
                                className="btn btn-danger" 
                                style={{ padding: '3px 7px', fontSize: '0.7rem' }} 
                                onClick={onStop} 
                                disabled={actionPending}
                              >
                                {actionType === 'stop' ? <span className="spinner" style={{ marginRight: 0 }} /> : '■ Stop'}
                              </button>
                            </div>
                          ) : (
                            <button 
                              className="btn btn-primary" 
                              style={{ padding: '3px 10px', fontSize: '0.7rem' }} 
                              onClick={() => onStartTask(task)}
                              disabled={actionPending}
                            >
                              {actionType === `start-task-${task.id}` ? <span className="spinner" style={{ marginRight: 0 }} /> : '▶ Start'}
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}

                  {colTasks.length === 0 && (
                    <div style={{ textAlign: 'center', padding: '24px 8px', color: 'var(--text-muted)', fontSize: '0.8rem', opacity: 0.6 }}>Drop tasks here</div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <Toast message={toast?.text || ''} type={toast?.type || 'success'} onClose={() => setToast(null)} />
    </AppShell>
  );
}
