'use client';

import { useEffect, useState, useCallback, useMemo } from 'react';
import { AppShell } from '../../../components/app-shell';
import { getAudit, getWorkspaceBootstrap } from '@divisionx/api-client';
import { SkeletonList } from '../../../components/skeleton';

export default function AuditPage() {
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [members, setMembers] = useState<any[]>([]);
  
  // Filters & Search
  const [userIdFilter, setUserIdFilter] = useState('');
  const [actionFilter, setActionFilter] = useState('');
  const [targetTypeFilter, setTargetTypeFilter] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  
  // Interactive UI State
  const [expandedItemId, setExpandedItemId] = useState<string | null>(null);

  // Load Workspace bootstrap for user list
  useEffect(() => {
    async function loadBootstrap() {
      try {
        const d = await getWorkspaceBootstrap();
        setMembers(d.members || []);
      } catch (err) {
        console.error('Failed to load workspace members for audit filter:', err);
      }
    }
    loadBootstrap();
  }, []);

  // Fetch Audits with server-side filters
  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const d = await getAudit({
        userId: userIdFilter || undefined,
        action: actionFilter || undefined,
        targetType: targetTypeFilter || undefined
      });
      setItems(d.items || []);
    } catch (err) {
      console.error('Failed to fetch audit log entries:', err);
    } finally {
      setLoading(false);
    }
  }, [userIdFilter, actionFilter, targetTypeFilter]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  // Actions catalog for filter dropdown
  const uniqueActions = useMemo(() => {
    const actions = [
      'timer.start', 'timer.stop', 'timer.resume', 'timer.change-start', 'timer.stop-member',
      'break.start', 'break.stop', 'pomodoro.start', 'idle.detected',
      'policy.create', 'policy.update', 'team.create', 'team.update', 'team.delete',
      'project.create', 'project.update', 'project.delete',
      'task.create', 'task.update', 'task.delete',
      'tag.create', 'tag.update', 'tag.delete',
      'client.create', 'client.update', 'client.delete',
      'attendance.clock-in', 'attendance.clock-out'
    ];
    return actions;
  }, []);

  // Target types catalog for filter dropdown
  const uniqueTargetTypes = useMemo(() => {
    return ['user', 'time_entry', 'break_session', 'workspace_policy', 'team', 'project', 'task', 'tag', 'client', 'attendance_log'];
  }, []);

  // Client-side search match (fuzzy search over description, actions, target, metadata, ip, actor details)
  const filteredItems = useMemo(() => {
    if (!searchQuery.trim()) return items;
    const query = searchQuery.toLowerCase().trim();
    return items.filter((i: any) => {
      const actorName = i.actor?.name?.toLowerCase() || '';
      const actorEmail = i.actor?.email?.toLowerCase() || '';
      const action = i.action?.toLowerCase() || '';
      const targetType = i.targetType?.toLowerCase() || '';
      const ip = i.clientIp?.toLowerCase() || '';
      const ua = i.userAgent?.toLowerCase() || '';
      const metadata = i.metadata ? JSON.stringify(i.metadata).toLowerCase() : '';
      
      return actorName.includes(query) || 
             actorEmail.includes(query) || 
             action.includes(query) || 
             targetType.includes(query) || 
             ip.includes(query) || 
             ua.includes(query) ||
             metadata.includes(query);
    });
  }, [items, searchQuery]);

  // Metrics calculators
  const stats = useMemo(() => {
    const total = items.length;
    const alerts = items.filter(i => i.action.includes('delete') || i.action === 'idle.detected').length;
    const activeActors = new Set(items.map(i => i.actorUserId)).size;
    return { total, alerts, activeActors };
  }, [items]);

  // Helper to format action names into human friendly tags
  function formatAction(action: string): string {
    return action.replace(/\./g, ' ').toUpperCase();
  }

  // Visual status badge colors for action types
  function getActionColors(action: string) {
    if (action.includes('delete') || action.includes('reject') || action === 'idle.detected') {
      return { bg: 'rgba(239, 68, 68, 0.1)', text: '#F87171', border: 'rgba(239, 68, 68, 0.2)' };
    }
    if (action.includes('create') || action.includes('start') || action.includes('approve') || action.includes('clock-in')) {
      return { bg: 'rgba(16, 185, 129, 0.1)', text: '#34D399', border: 'rgba(16, 185, 129, 0.2)' };
    }
    if (action.includes('update') || action.includes('change') || action.includes('stop') || action.includes('clock-out')) {
      return { bg: 'rgba(245, 158, 11, 0.1)', text: '#FBBF24', border: 'rgba(245, 158, 11, 0.2)' };
    }
    return { bg: 'rgba(59, 130, 246, 0.1)', text: '#60A5FA', border: 'rgba(59, 130, 246, 0.2)' };
  }

  // Parse User Agent strings into friendly names
  function getFriendlyUA(ua: string): string {
    if (!ua) return 'Unknown Browser';
    const lower = ua.toLowerCase();
    if (lower.includes('firefox')) return 'Firefox Browser';
    if (lower.includes('chrome')) return 'Chrome Browser';
    if (lower.includes('safari') && !lower.includes('chrome')) return 'Safari Browser';
    if (lower.includes('edge')) return 'Edge Browser';
    if (lower.includes('postman')) return 'Postman REST Client';
    if (lower.includes('node')) return 'Node.js runtime';
    return ua.slice(0, 18) + (ua.length > 18 ? '...' : '');
  }

  return (
    <AppShell title="Audit Compliance Forensics">
      <div className="audit-container" style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
        
        {/* --- 1. SOC 2 Compliance Header & Stats --- */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px' }}>
          
          <div className="stat-card" style={statCardStyle}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '0.85rem', color: 'rgba(255,255,255,0.5)', fontWeight: 500 }}>TOTAL AUDITED EVENTS</span>
              <span style={{ fontSize: '1.4rem' }}>📜</span>
            </div>
            <div style={{ fontSize: '1.8rem', fontWeight: 700, color: '#fff', marginTop: '12px' }}>
              {loading ? '...' : stats.total}
            </div>
            <div style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.3)', marginTop: '4px' }}>
              Workspace actions ledger entries
            </div>
          </div>

          <div className="stat-card" style={statCardStyle}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '0.85rem', color: 'rgba(255,255,255,0.5)', fontWeight: 500 }}>FORENSICS & DELETIONS</span>
              <span style={{ fontSize: '1.4rem' }}>⚠️</span>
            </div>
            <div style={{ fontSize: '1.8rem', fontWeight: 700, color: stats.alerts > 0 ? '#F87171' : '#fff', marginTop: '12px' }}>
              {loading ? '...' : stats.alerts}
            </div>
            <div style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.3)', marginTop: '4px' }}>
              Inactivity triggers & soft deletions
            </div>
          </div>

          <div className="stat-card" style={statCardStyle}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '0.85rem', color: 'rgba(255,255,255,0.5)', fontWeight: 500 }}>ACTIVE COMPLIANCE ACTORS</span>
              <span style={{ fontSize: '1.4rem' }}>👥</span>
            </div>
            <div style={{ fontSize: '1.8rem', fontWeight: 700, color: '#34D399', marginTop: '12px' }}>
              {loading ? '...' : stats.activeActors}
            </div>
            <div style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.3)', marginTop: '4px' }}>
              Distinct operators in recent feed
            </div>
          </div>

          <div className="stat-card" style={{ ...statCardStyle, border: '1px solid rgba(16, 185, 129, 0.25)', background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.05) 0%, rgba(16, 185, 129, 0.02) 100%)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '0.85rem', color: 'rgba(52, 211, 153, 0.8)', fontWeight: 600, letterSpacing: '0.5px' }}>SOC 2 COMPLIANCE</span>
              <span className="pulse-indicator" style={pulseStyle}></span>
            </div>
            <div style={{ fontSize: '1.2rem', fontWeight: 700, color: '#34D399', marginTop: '14px' }}>
              ACTIVE PROTECTED
            </div>
            <div style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.4)', marginTop: '8px' }}>
              Ip network mapping & JSON payloads enabled
            </div>
          </div>

        </div>

        {/* --- 2. Advanced Multi-Filter Control Console --- */}
        <div className="card" style={{ padding: '20px', background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '18px' }}>
          <h4 style={{ margin: '0 0 16px 0', fontSize: '0.95rem', fontWeight: 600, color: 'rgba(255,255,255,0.8)', textTransform: 'uppercase', letterSpacing: '0.5px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span>🔍</span> Filters & Compliance Search Console
          </h4>
          
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '12px' }}>
            
            {/* User Filter Dropdown */}
            <div style={filterFieldStyle}>
              <label style={labelStyle}>Audit Actor</label>
              <select 
                value={userIdFilter} 
                onChange={(e) => setUserIdFilter(e.target.value)}
                style={selectStyle}
              >
                <option value="">All Team Operators</option>
                {members.map(m => (
                  <option key={m.id} value={m.id}>{m.name || m.email} ({m.role})</option>
                ))}
              </select>
            </div>

            {/* Action Filter Dropdown */}
            <div style={filterFieldStyle}>
              <label style={labelStyle}>Operational Action</label>
              <select 
                value={actionFilter} 
                onChange={(e) => setActionFilter(e.target.value)}
                style={selectStyle}
              >
                <option value="">All Action Types</option>
                {uniqueActions.map(act => (
                  <option key={act} value={act}>{act}</option>
                ))}
              </select>
            </div>

            {/* Target Type Filter Dropdown */}
            <div style={filterFieldStyle}>
              <label style={labelStyle}>Target Resource</label>
              <select 
                value={targetTypeFilter} 
                onChange={(e) => setTargetTypeFilter(e.target.value)}
                style={selectStyle}
              >
                <option value="">All Resource Scopes</option>
                {uniqueTargetTypes.map(tgt => (
                  <option key={tgt} value={tgt}>{tgt.toUpperCase()}</option>
                ))}
              </select>
            </div>

            {/* Client Search Input */}
            <div style={{ ...filterFieldStyle, gridColumn: 'span 1' }}>
              <label style={labelStyle}>Fuzzy Search Query</label>
              <div style={{ position: 'relative' }}>
                <input
                  type="text"
                  placeholder="Filter by description, IP..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  style={{ ...selectStyle, paddingLeft: '32px' }}
                />
                <span style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', opacity: 0.4, fontSize: '0.85rem' }}>🔍</span>
              </div>
            </div>

          </div>

          {(userIdFilter || actionFilter || targetTypeFilter || searchQuery) && (
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '14px' }}>
              <button 
                onClick={() => {
                  setUserIdFilter('');
                  setActionFilter('');
                  setTargetTypeFilter('');
                  setSearchQuery('');
                }}
                style={clearButtonStyle}
              >
                Reset Compliance Filters
              </button>
            </div>
          )}
        </div>

        {/* --- 3. Structured Visual Feed --- */}
        <div className="card" style={{ padding: '24px', borderRadius: '18px', background: 'rgba(255,255,255,0.01)', border: '1px solid rgba(255,255,255,0.04)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
            <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 600 }}>Active Forensics Timeline</h3>
            <span style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.4)' }}>
              Showing {filteredItems.length} records
            </span>
          </div>

          {loading ? (
            <div style={{ padding: '12px 0' }}>
              <SkeletonList rows={5} cols={3} />
            </div>
          ) : filteredItems.length === 0 ? (
            <div style={{ padding: '60px 20px', textAlign: 'center', background: 'rgba(255,255,255,0.01)', borderRadius: '14px', border: '1px dashed rgba(255,255,255,0.06)' }}>
              <div style={{ fontSize: '2.5rem', marginBottom: '16px', opacity: 0.5 }}>📂</div>
              <h5 style={{ margin: '0 0 6px 0', fontSize: '1rem', fontWeight: 600, color: 'rgba(255,255,255,0.8)' }}>No Audit Logs Found</h5>
              <p style={{ margin: 0, fontSize: '0.85rem', color: 'rgba(255,255,255,0.4)', maxWidth: '380px', marginLeft: 'auto', marginRight: 'auto' }}>
                No database records match your active search terms or operational filters. Try expanding your search queries.
              </p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {filteredItems.map((item: any) => {
                const colors = getActionColors(item.action);
                const isExpanded = expandedItemId === item.id;
                const initials = item.actor?.name 
                  ? item.actor.name.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase()
                  : item.actor?.email?.slice(0, 2).toUpperCase() || 'OP';

                return (
                  <div 
                    key={item.id} 
                    style={{
                      ...logRowStyle,
                      borderLeft: `4px solid ${colors.text}`,
                      background: isExpanded ? 'rgba(255,255,255,0.03)' : 'rgba(255,255,255,0.01)'
                    }}
                  >
                    
                    {/* Top Row - Interactive Click-to-Expand Area */}
                    <div 
                      onClick={() => setExpandedItemId(isExpanded ? null : item.id)}
                      style={{ display: 'flex', gap: '16px', alignItems: 'center', cursor: 'pointer', flexWrap: 'wrap', width: '100%', padding: '16px' }}
                    >
                      {/* Actor Avatar Profile Initialist */}
                      <div style={{ ...avatarStyle, border: `1.5px solid ${colors.text}`, color: colors.text }}>
                        {initials}
                      </div>

                      {/* Main Statement */}
                      <div style={{ flex: 1, minWidth: '220px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                          <span style={{ fontWeight: 600, fontSize: '0.9rem', color: '#fff' }}>
                            {item.actor?.name || 'Workspace Member'}
                          </span>
                          <span style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.4)' }}>
                            ({item.actor?.email})
                          </span>
                          <span 
                            style={{ 
                              fontSize: '0.7rem', 
                              fontWeight: 700, 
                              padding: '2px 8px', 
                              borderRadius: '4px',
                              background: colors.bg,
                              color: colors.text,
                              border: `1px solid ${colors.border}`,
                              letterSpacing: '0.5px'
                            }}
                          >
                            {formatAction(item.action)}
                          </span>
                        </div>
                        
                        <div style={{ fontSize: '0.82rem', color: 'rgba(255,255,255,0.6)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <span>Target:</span>
                          <span style={{ color: 'rgba(255,255,255,0.85)', fontFamily: 'monospace', background: 'rgba(255,255,255,0.05)', padding: '1px 6px', borderRadius: '4px', fontSize: '0.75rem' }}>
                            {item.targetType.toUpperCase()}
                          </span>
                          {item.targetId && (
                            <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.75rem', fontFamily: 'monospace' }}>
                              (ID: {item.targetId.slice(0, 12)}...)
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Network & Time Forensics Info */}
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '6px', minWidth: '160px' }}>
                        {/* Badges container */}
                        <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                          <span title="Client IP Address" style={badgeStyle}>
                            🌐 {item.clientIp}
                          </span>
                          <span title={item.userAgent} style={badgeStyle}>
                            💻 {getFriendlyUA(item.userAgent)}
                          </span>
                        </div>
                        {/* Time representation */}
                        <div style={{ fontSize: '0.78rem', color: 'rgba(255,255,255,0.4)' }}>
                          ⏰ {new Date(item.createdAt).toLocaleString()}
                        </div>
                      </div>

                      {/* Expanded/Collapsed Caret */}
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '24px', height: '24px', opacity: 0.5 }}>
                        <span style={{ transition: 'transform 0.2s', transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)', fontSize: '0.8rem' }}>
                          ▼
                        </span>
                      </div>

                    </div>

                    {/* Collapsible Metadata Explorer Panel (SOC 2 JSONB) */}
                    {isExpanded && (
                      <div 
                        style={{ 
                          padding: '16px 20px', 
                          borderTop: '1px solid rgba(255,255,255,0.05)', 
                          background: 'rgba(0, 0, 0, 0.2)',
                          borderBottomLeftRadius: '12px',
                          borderBottomRightRadius: '12px'
                        }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                          <span style={{ fontSize: '0.78rem', fontWeight: 600, color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                            Forensics Event Metadata Payload
                          </span>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              navigator.clipboard.writeText(JSON.stringify(item.metadata || {}, null, 2));
                              alert('Metadata copied to clipboard!');
                            }}
                            style={{ background: 'none', border: 'none', color: '#60A5FA', fontSize: '0.75rem', cursor: 'pointer', padding: 0 }}
                          >
                            📋 Copy Payload JSON
                          </button>
                        </div>
                        
                        {item.metadata ? (
                          <pre style={jsonBlockStyle}>
                            <code>{JSON.stringify(item.metadata, null, 2)}</code>
                          </pre>
                        ) : (
                          <div style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.3)', fontStyle: 'italic', padding: '6px 0' }}>
                            No additional structural metadata payload is logged for this action event.
                          </div>
                        )}

                        {/* Extended network agent details */}
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '12px', marginTop: '14px', paddingTop: '12px', borderTop: '1px dashed rgba(255,255,255,0.04)' }}>
                          <div style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.45)' }}>
                            <span style={{ fontWeight: 600, color: 'rgba(255,255,255,0.65)' }}>Client Network IP:</span> {item.clientIp}
                          </div>
                          <div style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.45)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={item.userAgent}>
                            <span style={{ fontWeight: 600, color: 'rgba(255,255,255,0.65)' }}>User Agent String:</span> {item.userAgent}
                          </div>
                        </div>
                      </div>
                    )}

                  </div>
                );
              })}
            </div>
          )}

        </div>

      </div>
    </AppShell>
  );
}

// Inline CSS Styles variables for rich premium dark-mode glassmorphic aesthetics
const statCardStyle: React.CSSProperties = {
  background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.03) 0%, rgba(255, 255, 255, 0.01) 100%)',
  border: '1px solid rgba(255, 255, 255, 0.05)',
  borderRadius: '18px',
  padding: '20px 24px',
  display: 'flex',
  flexDirection: 'column',
  transition: 'transform 0.2s, box-shadow 0.2s',
  boxShadow: '0 4px 20px rgba(0, 0, 0, 0.2)'
};

const pulseStyle: React.CSSProperties = {
  width: '10px',
  height: '10px',
  borderRadius: '50%',
  background: '#10B981',
  boxShadow: '0 0 0 0 rgba(16, 185, 129, 0.7)',
  animation: 'pulse-active 2s infinite'
};

const filterFieldStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: '6px'
};

const labelStyle: React.CSSProperties = {
  fontSize: '0.75rem',
  fontWeight: 600,
  color: 'rgba(255,255,255,0.4)',
  textTransform: 'uppercase',
  letterSpacing: '0.5px'
};

const selectStyle: React.CSSProperties = {
  background: 'rgba(255, 255, 255, 0.04)',
  border: '1px solid rgba(255, 255, 255, 0.08)',
  borderRadius: '10px',
  padding: '10px 14px',
  color: '#fff',
  fontSize: '0.85rem',
  outline: 'none',
  width: '100%',
  transition: 'border-color 0.2s, background-color 0.2s'
};

const clearButtonStyle: React.CSSProperties = {
  background: 'rgba(239, 68, 68, 0.1)',
  border: '1px solid rgba(239, 68, 68, 0.2)',
  color: '#F87171',
  padding: '8px 16px',
  borderRadius: '8px',
  fontSize: '0.8rem',
  fontWeight: 500,
  cursor: 'pointer',
  transition: 'background 0.2s, color 0.2s'
};

const logRowStyle: React.CSSProperties = {
  borderRadius: '12px',
  border: '1px solid rgba(255, 255, 255, 0.04)',
  display: 'flex',
  flexDirection: 'column',
  transition: 'transform 0.2s, background-color 0.2s',
  overflow: 'hidden'
};

const avatarStyle: React.CSSProperties = {
  width: '42px',
  height: '42px',
  borderRadius: '50%',
  background: 'rgba(255, 255, 255, 0.04)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  fontSize: '0.85rem',
  fontWeight: 700,
  letterSpacing: '0.5px',
  flexShrink: 0
};

const badgeStyle: React.CSSProperties = {
  fontSize: '0.72rem',
  color: 'rgba(255,255,255,0.5)',
  background: 'rgba(255,255,255,0.04)',
  border: '1px solid rgba(255,255,255,0.06)',
  padding: '2px 8px',
  borderRadius: '6px',
  fontFamily: 'monospace',
  display: 'inline-flex',
  alignItems: 'center',
  gap: '4px'
};

const jsonBlockStyle: React.CSSProperties = {
  margin: 0,
  padding: '14px',
  borderRadius: '8px',
  background: 'rgba(0, 0, 0, 0.3)',
  border: '1px solid rgba(255,255,255,0.06)',
  color: '#34D399',
  fontSize: '0.8rem',
  lineHeight: '1.4',
  maxHeight: '260px',
  overflowY: 'auto',
  fontFamily: 'Consolas, Monaco, "Andale Mono", "Ubuntu Mono", monospace'
};
