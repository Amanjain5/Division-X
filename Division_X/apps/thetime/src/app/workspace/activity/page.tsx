'use client';

import React, { useEffect, useState } from 'react';
import { AppShell } from '../../../components/app-shell';
import { 
  getWorkspaceBootstrap, 
  getActivityTimeline, 
  getActivityMetrics, 
  stopMemberTimer,
  getCurrentRole
} from '@divisionx/api-client';
import { DailyBarcode } from '../../../components/daily-barcode';

interface Member {
  id: string;
  name: string;
  email: string;
  role: string;
}

interface HUDState {
  userId: string;
  userName: string;
  userEmail: string;
  status: 'ACTIVE' | 'BREAK' | 'IDLE' | 'OFFLINE';
  activeTaskDescription?: string;
  activeProjectName?: string;
  activeProjectColor?: string;
  startedAt?: string;
}

interface SocketMessage {
  id: string;
  timestamp: string;
  title: string;
  userName: string;
  message: string;
}

export default function ActivityMonitoringPage() {
  const [loading, setLoading] = useState(true);
  const [members, setMembers] = useState<Member[]>([]);
  const [selectedMemberId, setSelectedMemberId] = useState<string>('');
  const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [currentUserRole, setCurrentUserRole] = useState<string>('MEMBER');

  // Timeline & Metrics for selected member
  const [timelineData, setTimelineData] = useState<any | null>(null);
  const [metricsData, setMetricsData] = useState<any | null>(null);
  const [loadingTimeline, setLoadingTimeline] = useState(false);

  // HUD grid states
  const [hudStates, setHudStates] = useState<HUDState[]>([]);
  const [timeCounters, setTimeCounters] = useState<Record<string, number>>({});

  // Real-time scrolling ticker feed
  const [socketFeed, setSocketFeed] = useState<SocketMessage[]>([]);

  // Initialize page metadata and Bootstrap
  useEffect(() => {
    async function loadBootstrap() {
      try {
        const roleStr = getCurrentRole();
        setCurrentUserRole(roleStr);

        const data = await getWorkspaceBootstrap();
        setMembers(data.members || []);
        
        // Default select the first member (or requesting user)
        const myUserId = localStorage.getItem('thetime_user_id') || '';
        const hasMe = data.members.some(m => m.id === myUserId);
        const initialSelectedId = hasMe ? myUserId : (data.members[0]?.id || '');
        setSelectedMemberId(initialSelectedId);

        // Build initial HUD state based on active-timers or member states
        // In full platform, we can determine active timers from bootstrapping
        const initialHUD = data.members.map((m: any) => {
          // Check if this member has a running timer in bootstrap
          const isTimerActive = data.runningTimer && data.runningTimer.userId === m.id;
          
          return {
            userId: m.id,
            userName: m.name || m.email.split('@')[0],
            userEmail: m.email,
            status: isTimerActive ? 'ACTIVE' as const : 'OFFLINE' as const,
            activeTaskDescription: isTimerActive ? data.runningTimer.description : undefined,
            startedAt: isTimerActive ? data.runningTimer.startedAt : undefined
          };
        });
        setHudStates(initialHUD);
      } catch (err) {
        console.error('Failed to bootstrap activity dashboard:', err);
      } finally {
        setLoading(false);
      }
    }

    loadBootstrap();
  }, []);

  // Fetch timeline and metrics when selected member or date changes
  useEffect(() => {
    if (!selectedMemberId) return;

    async function fetchMemberDetails() {
      setLoadingTimeline(true);
      try {
        const [timelineRes, metricsRes] = await Promise.all([
          getActivityTimeline(selectedMemberId, selectedDate),
          getActivityMetrics(selectedMemberId).catch(() => null) // metrics might fail if new/no track logs
        ]);
        
        setTimelineData(timelineRes || null);
        if (metricsRes) {
          setMetricsData(metricsRes.metrics || null);
        } else {
          setMetricsData(null);
        }

        // Dynamically update this specific user's status in the HUD based on latest timeline compilation
        setHudStates(prev => prev.map(hud => {
          if (hud.userId === selectedMemberId && timelineRes.timeline.length > 0) {
            const lastSegment = timelineRes.timeline[timelineRes.timeline.length - 1];
            
            // Check if timer is actively running
            const activeEntry = timelineRes.timeline.find((t: any) => t.state === 'ACTIVE' && !t.end);
            
            return {
              ...hud,
              status: lastSegment.state,
              activeTaskDescription: lastSegment.state === 'ACTIVE' ? lastSegment.metadata?.description : undefined,
              activeProjectName: lastSegment.state === 'ACTIVE' ? lastSegment.metadata?.project?.name : undefined,
              activeProjectColor: lastSegment.state === 'ACTIVE' ? lastSegment.metadata?.project?.color : undefined,
              startedAt: lastSegment.state === 'ACTIVE' ? lastSegment.start : undefined
            };
          }
          return hud;
        }));
      } catch (err) {
        console.error('Failed to load timeline:', err);
        setTimelineData(null);
      } finally {
        setLoadingTimeline(false);
      }
    }

    fetchMemberDetails();
  }, [selectedMemberId, selectedDate]);

  // Connect to live WebSocket feed for sub-second team alerts
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const token = localStorage.getItem('thetime_token');
    if (!token) return;

    const wsUrl = `ws://localhost:5000/v1/notifications/ws?token=${encodeURIComponent(token)}`;
    let ws: WebSocket | null = null;
    let keepAlive: any = null;

    try {
      ws = new WebSocket(wsUrl);

      ws.onopen = () => {
        console.log('🔌 Live Activity HUD WebSocket connected');
        keepAlive = setInterval(() => {
          if (ws && ws.readyState === WebSocket.OPEN) {
            ws.send('ping');
          }
        }, 20000);
      };

      ws.onmessage = (event) => {
        if (event.data === 'pong') return;
        try {
          const payload = JSON.parse(event.data);
          if (payload.title && payload.userName) {
            // Append message to scroll feed
            const newMsg: SocketMessage = {
              id: payload.eventId || Math.random().toString(),
              timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
              title: payload.title,
              userName: payload.userName,
              message: payload.message
            };

            setSocketFeed(prev => [newMsg, ...prev].slice(0, 20));

            // Dynamically patch HUD statuses in real-time
            setHudStates(prev => prev.map(hud => {
              const matchedName = hud.userName.toLowerCase() === payload.userName.toLowerCase();
              if (matchedName) {
                let nextStatus: HUDState['status'] = hud.status;
                let taskDesc = hud.activeTaskDescription;
                let startedAt = hud.startedAt;

                if (payload.title.toLowerCase().includes('started') || payload.title.toLowerCase().includes('resume')) {
                  nextStatus = 'ACTIVE';
                  startedAt = new Date().toISOString();
                  // Extract description e.g. Started tracking task: "Feature X"
                  const descMatch = payload.message.match(/"([^"]+)"/);
                  taskDesc = descMatch ? descMatch[1] : 'Tracking work';
                } else if (payload.title.toLowerCase().includes('stopped')) {
                  nextStatus = 'OFFLINE';
                  taskDesc = undefined;
                  startedAt = undefined;
                } else if (payload.title.toLowerCase().includes('break started')) {
                  nextStatus = 'BREAK';
                  taskDesc = undefined;
                  startedAt = undefined;
                } else if (payload.title.toLowerCase().includes('break stopped')) {
                  nextStatus = 'IDLE';
                  taskDesc = undefined;
                  startedAt = undefined;
                } else if (payload.title.toLowerCase().includes('idle')) {
                  nextStatus = 'IDLE';
                }

                return {
                  ...hud,
                  status: nextStatus,
                  activeTaskDescription: taskDesc,
                  startedAt
                };
              }
              return hud;
            }));

            // If the live alert belongs to our selected member, refresh their timeline
            const selectedMember = members.find(m => m.id === selectedMemberId);
            if (selectedMember && selectedMember.name === payload.userName) {
              // Trigger a background refresh
              getActivityTimeline(selectedMemberId, selectedDate).then(timelineRes => {
                setTimelineData(timelineRes || null);
              });
              getActivityMetrics(selectedMemberId).then(metricsRes => {
                setMetricsData(metricsRes?.metrics || null);
              });
            }
          }
        } catch (err) {
          console.error('WebSocket payload error:', err);
        }
      };

      ws.onclose = () => {
        console.log('🔌 Live Activity HUD WebSocket disconnected');
        clearInterval(keepAlive);
      };
    } catch (err) {
      console.error('WebSocket build error:', err);
    }

    return () => {
      if (ws) ws.close();
      clearInterval(keepAlive);
    };
  }, [members, selectedMemberId, selectedDate]);

  // Live timer counters incrementing in real-time
  useEffect(() => {
    const timer = setInterval(() => {
      const updatedCounters: Record<string, number> = {};
      
      hudStates.forEach(hud => {
        if (hud.status === 'ACTIVE' && hud.startedAt) {
          const elapsedMs = Date.now() - new Date(hud.startedAt).getTime();
          updatedCounters[hud.userId] = Math.max(0, Math.floor(elapsedMs / 1000));
        }
      });

      setTimeCounters(updatedCounters);
    }, 1000);

    return () => clearInterval(timer);
  }, [hudStates]);

  const handleStopTimer = async (userId: string) => {
    if (!window.confirm('Are you sure you want to stop this member\'s active timer?')) return;
    try {
      await stopMemberTimer(userId);
      // Immediately reflect offline status in the HUD grid
      setHudStates(prev => prev.map(hud => {
        if (hud.userId === userId) {
          return { ...hud, status: 'OFFLINE', activeTaskDescription: undefined, startedAt: undefined };
        }
        return hud;
      }));
    } catch (err) {
      alert('Failed to force stop member timer');
    }
  };

  const getStatusColor = (status: HUDState['status']) => {
    switch (status) {
      case 'ACTIVE': return '#10b981'; // Green
      case 'BREAK': return '#f59e0b'; // Amber
      case 'IDLE': return '#ef4444'; // Red
      case 'OFFLINE': default: return 'rgba(255, 255, 255, 0.3)'; // Slate
    }
  };

  const formatElapsedTime = (totalSeconds: number) => {
    const hrs = Math.floor(totalSeconds / 3600);
    const mins = Math.floor((totalSeconds % 3600) / 60);
    const secs = totalSeconds % 60;
    return `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <AppShell title="Activity Monitoring">
      <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', height: '100%', overflowY: 'auto', paddingRight: '4px' }}>
        
        {/* ── Page Header ── */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
          <div>
            <h1 style={{ fontSize: '1.8rem', fontWeight: 700, margin: 0, background: 'linear-gradient(90deg, #fff 0%, #34D399 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
              Activity Monitoring
            </h1>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', margin: '4px 0 0 0' }}>
              Real-time team tracking, barcodes of inactivity, and productivity nudge engines.
            </p>
          </div>

          {/* Filter Bar */}
          <div style={{ display: 'flex', gap: '12px', alignItems: 'center', background: 'var(--bg-glass)', padding: '8px 16px', borderRadius: '12px', border: '1px solid var(--border-light)' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <span style={{ fontSize: '0.7rem', textTransform: 'uppercase', color: 'var(--text-muted)', fontWeight: 600 }}>Date Range</span>
              <input 
                type="date" 
                value={selectedDate} 
                onChange={(e) => setSelectedDate(e.target.value)}
                style={{ background: 'rgba(0,0,0,0.2)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', borderRadius: '6px', padding: '4px 8px', outline: 'none', fontSize: '0.85rem' }} 
              />
            </div>
          </div>
        </div>

        {/* ── Main Layout: 2 Columns ── */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: '24px', flexGrow: 1, minHeight: 0 }}>
          
          {/* Left Column: Team Grid & Focus Timelines */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', minWidth: 0 }}>
            
            {/* 1. Real-Time HUD Status Grid */}
            <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-light)', borderRadius: 'var(--radius-md)', padding: '20px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                <h3 style={{ fontSize: '1.15rem', fontWeight: 600, margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ display: 'inline-block', width: '8px', height: '8px', borderRadius: '50%', background: '#34D399', boxShadow: '0 0 10px #34D399' }} />
                  Real-Time Team HUD
                </h3>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                  Active Timers: {hudStates.filter(h => h.status === 'ACTIVE').length} / {hudStates.length}
                </span>
              </div>

              {loading ? (
                <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>Bootstrapping team monitors...</div>
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '16px' }}>
                  {hudStates.map((hud) => {
                    const isSelf = hud.userId === localStorage.getItem('thetime_user_id');
                    const elapsed = timeCounters[hud.userId] || 0;
                    const statusColor = getStatusColor(hud.status);
                    const isSelected = hud.userId === selectedMemberId;

                    return (
                      <div 
                        key={hud.userId}
                        onClick={() => setSelectedMemberId(hud.userId)}
                        style={{
                          background: isSelected ? 'rgba(52, 211, 153, 0.08)' : 'rgba(255, 255, 255, 0.03)',
                          border: isSelected ? '1px solid rgba(52, 211, 153, 0.4)' : '1px solid rgba(255, 255, 255, 0.05)',
                          borderRadius: '12px',
                          padding: '16px',
                          cursor: 'pointer',
                          position: 'relative',
                          transition: 'all 0.2s',
                          boxShadow: isSelected ? '0 0 15px rgba(52, 211, 153, 0.05)' : 'none'
                        }}
                      >
                        {/* Status Pulse Ring */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
                          <div style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <div style={{
                              width: '28px',
                              height: '28px',
                              borderRadius: '50%',
                              border: `2px solid ${statusColor}`,
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center'
                            }}>
                              <span style={{ fontSize: '0.85rem' }}>👤</span>
                            </div>
                            {hud.status === 'ACTIVE' && (
                              <div style={{
                                position: 'absolute',
                                width: '28px',
                                height: '28px',
                                borderRadius: '50%',
                                border: '2px solid #10b981',
                                animation: 'pulse 1.8s infinite',
                                pointerEvents: 'none'
                              }} />
                            )}
                          </div>

                          <div style={{ minWidth: 0 }}>
                            <h4 style={{ fontSize: '0.92rem', fontWeight: 600, margin: 0, textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>
                              {hud.userName} {isSelf && <span style={{ fontSize: '0.75rem', color: '#34D399', fontWeight: 500 }}>(You)</span>}
                            </h4>
                            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{hud.userEmail}</span>
                          </div>
                        </div>

                        {/* Middle Activity Block */}
                        <div style={{ minHeight: '44px', marginBottom: '12px', fontSize: '0.8rem' }}>
                          {hud.status === 'ACTIVE' ? (
                            <div>
                              <div style={{ color: '#6EE7B7', fontWeight: 500 }}>
                                {hud.activeTaskDescription || 'Tracking Active Work'}
                              </div>
                              {hud.activeProjectName && (
                                <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginTop: '4px', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                                  <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: hud.activeProjectColor || '#10b981' }} />
                                  {hud.activeProjectName}
                                </div>
                              )}
                            </div>
                          ) : hud.status === 'BREAK' ? (
                            <div style={{ color: '#FCD34D', display: 'flex', alignItems: 'center', gap: '4px' }}>
                              <span>☕ On Official Break</span>
                            </div>
                          ) : hud.status === 'IDLE' ? (
                            <div style={{ color: '#FCA5A5', display: 'flex', alignItems: 'center', gap: '4px' }}>
                              <span>⚠️ Inactive / Idle Detected</span>
                            </div>
                          ) : (
                            <span style={{ color: 'var(--text-dim)' }}>Offline / Rest Mode</span>
                          )}
                        </div>

                        {/* Footer Info Row */}
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid rgba(255, 255, 255, 0.05)', paddingTop: '10px' }}>
                          {hud.status === 'ACTIVE' && elapsed > 0 ? (
                            <span style={{ fontFamily: 'monospace', fontWeight: 600, color: '#6EE7B7', fontSize: '0.85rem' }}>
                              ⏱ {formatElapsedTime(elapsed)}
                            </span>
                          ) : (
                            <span style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>
                              {hud.status === 'OFFLINE' ? 'No timer active' : 'Time log pending'}
                            </span>
                          )}

                          {/* Stop Timer Action Button */}
                          {hud.status === 'ACTIVE' && ['OWNER', 'ADMIN', 'MANAGER'].includes(currentUserRole) && !isSelf && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleStopTimer(hud.userId);
                              }}
                              style={{
                                background: 'rgba(248, 113, 113, 0.15)',
                                color: '#FCA5A5',
                                border: '1px solid rgba(248, 113, 113, 0.3)',
                                borderRadius: '6px',
                                padding: '3px 8px',
                                fontSize: '0.72rem',
                                cursor: 'pointer',
                                transition: 'all 0.15s'
                              }}
                              onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(248, 113, 113, 0.25)'}
                              onMouseLeave={(e) => e.currentTarget.style.background = 'rgba(248, 113, 113, 0.15)'}
                            >
                              Force Stop
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* 2. Interactive Barcode Timeline Bar */}
            <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-light)', borderRadius: 'var(--radius-md)', padding: '20px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                <div>
                  <h3 style={{ fontSize: '1.15rem', fontWeight: 600, margin: 0 }}>
                    Daily Inactivity Heatmap
                  </h3>
                  <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', margin: '4px 0 0 0' }}>
                    Showing barcode timelines for member:{' '}
                    <strong style={{ color: '#34D399' }}>
                      {members.find(m => m.id === selectedMemberId)?.name || 'Select a user'}
                    </strong>
                  </p>
                </div>

                {/* Member Selector dropdown */}
                <select
                  value={selectedMemberId}
                  onChange={(e) => setSelectedMemberId(e.target.value)}
                  style={{
                    background: 'rgba(0,0,0,0.3)',
                    border: '1px solid rgba(255,255,255,0.1)',
                    color: '#fff',
                    borderRadius: '8px',
                    padding: '6px 12px',
                    outline: 'none',
                    fontSize: '0.85rem',
                    cursor: 'pointer'
                  }}
                >
                  {members.map(m => (
                    <option key={m.id} value={m.id}>{m.name || m.email}</option>
                  ))}
                </select>
              </div>

              {loadingTimeline ? (
                <div style={{ padding: '60px 0', textAlign: 'center', color: 'var(--text-muted)' }}>
                  Compiling chronological barcode matrix...
                </div>
              ) : timelineData && timelineData.timeline && timelineData.timeline.length > 0 ? (
                <DailyBarcode timeline={timelineData.timeline} dateString={selectedDate} />
              ) : (
                <div style={{ padding: '50px', textAlign: 'center', background: 'rgba(255,255,255,0.01)', border: '1px dashed rgba(255,255,255,0.08)', borderRadius: '8px', color: 'var(--text-dim)' }}>
                  No tracking segments or clock-in intervals logged for this member on the selected date.
                </div>
              )}
            </div>
          </div>

          {/* Right Column: Metrics Scorecard & Live Event Feed */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            
            {/* 1. Productivity Scorecard Card */}
            <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-light)', borderRadius: 'var(--radius-md)', padding: '20px' }}>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 600, marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span>🎯</span> Productivity Scorecard
              </h3>

              {metricsData ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  
                  {/* Efficiency Meter (Gauge style text) */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(255,255,255,0.02)', padding: '12px', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.04)' }}>
                    <div>
                      <span style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: 'var(--text-muted)', fontWeight: 600 }}>Active Index</span>
                      <div style={{ fontSize: '1.5rem', fontWeight: 700, color: metricsData.efficiencyIndex >= 80 ? '#6EE7B7' : metricsData.efficiencyIndex >= 50 ? '#FCD34D' : '#FCA5A5' }}>
                        {metricsData.efficiencyIndex}%
                      </div>
                    </div>
                    <div style={{ textAlign: 'right', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                      <div>Active Work vs Idle Time</div>
                      <div style={{ fontSize: '0.72rem', color: 'var(--text-dim)' }}>Over last 7 days</div>
                    </div>
                  </div>

                  {/* Hourly stats */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                    <div style={{ background: 'rgba(255,255,255,0.02)', padding: '10px', borderRadius: '8px' }}>
                      <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Active Hours</span>
                      <div style={{ fontSize: '1.05rem', fontWeight: 600, color: '#fff', marginTop: '2px' }}>{metricsData.weeklyActiveHours}h</div>
                    </div>
                    <div style={{ background: 'rgba(255,255,255,0.02)', padding: '10px', borderRadius: '8px' }}>
                      <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Idle Logged</span>
                      <div style={{ fontSize: '1.05rem', fontWeight: 600, color: '#FCA5A5', marginTop: '2px' }}>{metricsData.weeklyIdleHours}h</div>
                    </div>
                  </div>

                  {/* Wellness indicator */}
                  <div style={{ borderTop: '1px solid rgba(255, 255, 255, 0.05)', paddingTop: '12px' }}>
                    <span style={{ fontSize: '0.72rem', textTransform: 'uppercase', color: 'var(--text-muted)', fontWeight: 600, display: 'block', marginBottom: '6px' }}>
                      Wellness Status
                    </span>
                    {metricsData.breakNudge ? (
                      <div style={{ background: 'rgba(251, 191, 36, 0.08)', border: '1px solid rgba(251, 191, 36, 0.25)', padding: '10px', borderRadius: '8px', color: '#FCD34D', fontSize: '0.78rem', lineHeight: '1.4' }}>
                        <strong>⚠️ Continuously active:</strong> {metricsData.consecutiveActiveMinutes}m. {metricsData.breakNudgeMessage}
                      </div>
                    ) : (
                      <div style={{ color: '#6EE7B7', fontSize: '0.78rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span>🟢 Well-balanced rest ratios (Break ratio: {metricsData.breakRatio}%)</span>
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div style={{ color: 'var(--text-dim)', fontSize: '0.8rem', textAlign: 'center', padding: '20px 0' }}>
                  No metrics calculated for this week yet. Active tracking logs are required to generate indexes.
                </div>
              )}
            </div>

            {/* 2. Real-time Live Event Ticker Feed */}
            <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-light)', borderRadius: 'var(--radius-md)', padding: '20px', flexGrow: 1, display: 'flex', flexDirection: 'column', minHeight: '300px', maxHeight: '500px' }}>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 600, marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span style={{ display: 'inline-block', width: '6px', height: '6px', borderRadius: '50%', background: '#EF4444', animation: 'pulse 1.2s infinite' }} />
                Real-Time Ticker Feed
              </h3>

              {/* Scrolling events box */}
              <div 
                style={{
                  flexGrow: 1,
                  overflowY: 'auto',
                  background: 'rgba(0,0,0,0.3)',
                  border: '1px solid rgba(255,255,255,0.06)',
                  borderRadius: '8px',
                  padding: '10px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '10px',
                  fontSize: '0.78rem',
                  fontFamily: 'monospace'
                }}
              >
                {socketFeed.length === 0 ? (
                  <div style={{ color: 'var(--text-dim)', textAlign: 'center', margin: 'auto', fontStyle: 'italic' }}>
                    Awaiting live WS team triggers...
                  </div>
                ) : (
                  socketFeed.map((feed) => {
                    const isIdleAlert = feed.title.toLowerCase().includes('idle');
                    const color = isIdleAlert ? '#FCA5A5' : '#6EE7B7';

                    return (
                      <div 
                        key={feed.id} 
                        style={{
                          borderBottom: '1px solid rgba(255,255,255,0.03)',
                          paddingBottom: '8px',
                          lineHeight: '1.4'
                        }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-muted)', marginBottom: '2px', fontSize: '0.72rem' }}>
                          <span>[{feed.timestamp}]</span>
                          <span style={{ color }}>{feed.title}</span>
                        </div>
                        <div>
                          <strong style={{ color: '#fff' }}>{feed.userName}</strong>: {feed.message}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

          </div>

        </div>

      </div>
    </AppShell>
  );
}
