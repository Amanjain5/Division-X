'use client';

import { useEffect, useState, useCallback } from 'react';
import { AppShell } from '../../../components/app-shell';
import { Toast } from '../../../components/toast';
import { getWorkspace, createInvite, stopMemberTimer, changeMemberRole, removeMember, getActiveTimers, getCurrentRole } from '@divisionx/api-client';

export default function TeamsPage() {
  const [members, setMembers] = useState<any[]>([]);
  const [activeTimers, setActiveTimers] = useState<any[]>([]);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<'OWNER' | 'ADMIN' | 'MANAGER' | 'MEMBER'>('MEMBER');
  const [toast, setToast] = useState<{ text: string; type: 'success' | 'error' } | null>(null);
  const role = typeof window !== 'undefined' ? getCurrentRole() : 'MEMBER';
  const isAdmin = ['OWNER', 'ADMIN'].includes(role);
  const isManager = ['OWNER', 'ADMIN', 'MANAGER'].includes(role);

  const refresh = useCallback(async () => {
    try {
      const ws = await getWorkspace();
      setMembers(ws.members);
      if (isManager) { try { const t = await getActiveTimers(); setActiveTimers(t.items); } catch { /* ok */ } }
    } catch { setToast({ text: 'Failed to load', type: 'error' }); }
  }, [isManager]);
  useEffect(() => { refresh(); }, [refresh]);

  const activeMap = new Map(activeTimers.map((t: any) => [t.userId, t]));

  async function sendInvite() {
    if (!inviteEmail.trim()) return;
    try { await createInvite({ email: inviteEmail, role: inviteRole }); setToast({ text: `Invite sent to ${inviteEmail}`, type: 'success' }); setInviteEmail(''); await refresh(); }
    catch { setToast({ text: 'Failed to send invite', type: 'error' }); }
  }

  async function onRoleChange(userId: string, newRole: string) {
    try { await changeMemberRole(userId, newRole); await refresh(); setToast({ text: 'Role updated', type: 'success' }); }
    catch { setToast({ text: 'Failed to change role', type: 'error' }); }
  }

  async function onRemove(userId: string) {
    try { await removeMember(userId); await refresh(); setToast({ text: 'Member removed', type: 'success' }); }
    catch { setToast({ text: 'Failed to remove', type: 'error' }); }
  }

  async function onStopTimer(userId: string) {
    try { await stopMemberTimer(userId); await refresh(); setToast({ text: 'Timer stopped', type: 'success' }); }
    catch { setToast({ text: 'Failed to stop', type: 'error' }); }
  }

  return (
    <AppShell title="Team Members">
      {/* Invite section */}
      {isAdmin && (
        <div className="card mb-6" style={{ display: 'flex', gap: 12, alignItems: 'flex-end', flexWrap: 'wrap' }}>
          <div className="input-group">
            <label className="label">Email Address</label>
            <input className="input" value={inviteEmail} onChange={(e) => setInviteEmail(e.target.value)} placeholder="colleague@company.com" />
          </div>
          <div className="input-group">
            <label className="label">Role</label>
            <select className="select" value={inviteRole} onChange={(e) => setInviteRole(e.target.value as any)}>
              <option value="MEMBER">Member</option><option value="MANAGER">Manager</option><option value="ADMIN">Admin</option><option value="OWNER">Owner</option>
            </select>
          </div>
          <button className="btn btn-primary" onClick={sendInvite}>Send Invite</button>
        </div>
      )}

      {/* Members list */}
      <div className="card">
        <h3 style={{ margin: '0 0 16px 0', fontSize: '1.1rem' }}>Members ({members.length})</h3>
        <div className="list-header" style={{ gridTemplateColumns: '2fr 1.5fr 1fr 100px auto auto' }}>
          <span>Member</span><span>Email</span><span>Role</span><span>Status</span><span></span><span></span>
        </div>
        {members.map((m: any) => {
          const timer = activeMap.get(m.id);
          return (
            <div key={m.id} className="list-row" style={{ gridTemplateColumns: '2fr 1.5fr 1fr 100px auto auto' }}>
              <strong style={{ fontWeight: 500 }}>{m.name || m.email.split('@')[0]}</strong>
              <span style={{ color: 'var(--text-muted)' }}>{m.email}</span>
              {isAdmin ? (
                <select className="select select-sm" value={m.role} onChange={(e) => onRoleChange(m.id, e.target.value)}>
                  <option value="MEMBER">Member</option><option value="MANAGER">Manager</option><option value="ADMIN">Admin</option><option value="OWNER">Owner</option>
                </select>
              ) : (
                <span><span className="badge badge-neutral">{m.role}</span></span>
              )}
              <span>
                {timer ? (
                  <span className="badge badge-success">Active</span>
                ) : (
                  <span className="badge badge-neutral">Idle</span>
                )}
              </span>
              {isManager && timer && <button className="btn btn-secondary" style={{ padding: '4px 10px', fontSize: '0.75rem' }} onClick={() => onStopTimer(m.id)}>Stop Timer</button>}
              {!timer && <span />}
              {isAdmin && <button className="btn btn-secondary" style={{ padding: '4px 10px', fontSize: '0.75rem', color: '#DC2626' }} onClick={() => onRemove(m.id)}>Remove</button>}
              {!isAdmin && <span />}
            </div>
          );
        })}
      </div>
      <Toast message={toast?.text || ''} type={toast?.type || 'success'} onClose={() => setToast(null)} />
    </AppShell>
  );
}
