'use client';

import { useEffect, useState, useCallback } from 'react';
import { AppShell } from '../../../components/app-shell';
import { getAudit } from '@divisionx/api-client';

export default function AuditPage() {
  const [items, setItems] = useState<any[]>([]);

  const refresh = useCallback(async () => {
    try { const d = await getAudit(); setItems(d.items); } catch { /* ok */ }
  }, []);
  useEffect(() => { refresh(); }, [refresh]);

  function actionColor(action: string): string {
    if (action.includes('approve')) return 'badge-success';
    if (action.includes('delete') || action.includes('reject') || action.includes('remove')) return 'badge-danger';
    if (action.includes('create') || action.includes('start')) return 'badge-success';
    return 'badge-neutral';
  }

  return (
    <AppShell title="Audit Log">
      <div className="card">
        <h3 style={{ margin: '0 0 16px 0', fontSize: '1.1rem' }}>Recent Activity</h3>
        <div className="list-header" style={{ gridTemplateColumns: '2fr 1fr 1.5fr 1fr' }}>
          <span>Action</span><span>Target</span><span>Actor</span><span>Time</span>
        </div>
        {items.length === 0 && <div style={{ padding: 24, textAlign: 'center', color: 'var(--text-muted)' }}>No audit entries yet</div>}
        {items.map((i: any) => (
          <div key={i.id} className="list-row" style={{ gridTemplateColumns: '2fr 1fr 1.5fr 1fr' }}>
            <span><span className={`badge ${actionColor(i.action)}`}>{i.action}</span></span>
            <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>{i.targetType}</span>
            <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>{i.actorUserId?.slice(0, 10)}…</span>
            <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>{new Date(i.createdAt).toLocaleString()}</span>
          </div>
        ))}
      </div>
    </AppShell>
  );
}
