'use client';

import { useEffect, useState, useCallback } from 'react';
import { AppShell } from '../../../components/app-shell';
import { Toast } from '../../../components/toast';
import { getPendingEntries, approveEntry, approveEntriesBulk } from '@divisionx/api-client';
import { PaginationBar } from '../../../components/pagination-bar';

export default function ApprovalsPage() {
  const [items, setItems] = useState<any[]>([]);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [selected, setSelected] = useState<Record<string, boolean>>({});
  const [toast, setToast] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  const refresh = useCallback(async () => {
    try {
      const d = await getPendingEntries({ page, pageSize: 20 });
      setItems(d.items);
      setTotal(d.pagination.total);
      setSelected({});
    } catch { setToast({ text: 'Failed to load', type: 'error' }); }
  }, [page]);
  useEffect(() => { refresh(); }, [refresh]);

  async function onApprove(id: string, approved: boolean) {
    try { await approveEntry(id, approved); await refresh(); setToast({ text: approved ? 'Approved' : 'Rejected', type: 'success' }); }
    catch { setToast({ text: 'Failed', type: 'error' }); }
  }

  async function onBulk(approved: boolean) {
    const ids = Object.keys(selected).filter((k) => selected[k]);
    if (!ids.length) return;
    try { await approveEntriesBulk(ids, approved); await refresh(); setToast({ text: `${approved ? 'Approved' : 'Rejected'} ${ids.length} entries`, type: 'success' }); }
    catch { setToast({ text: 'Failed', type: 'error' }); }
  }

  function toggleAll(checked: boolean) {
    const s: Record<string, boolean> = {};
    if (checked) items.forEach((i: any) => { s[i.id] = true; });
    setSelected(s);
  }

  const selectedCount = Object.values(selected).filter(Boolean).length;

  return (
    <AppShell title="Approvals">
      <div className="card mb-6" style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
        <span style={{ fontWeight: 600 }}>{total} pending entries</span>
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 8 }}>
          {selectedCount > 0 && <span style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>{selectedCount} selected</span>}
          <button className="btn btn-primary" onClick={() => onBulk(true)} disabled={selectedCount === 0}>Approve Selected</button>
          <button className="btn btn-secondary" style={{ color: '#DC2626' }} onClick={() => onBulk(false)} disabled={selectedCount === 0}>Reject Selected</button>
        </div>
      </div>
      <div className="card">
        <div className="list-header" style={{ gridTemplateColumns: '40px 2fr 1fr 1fr auto auto' }}>
          <input type="checkbox" onChange={(e) => toggleAll(e.target.checked)} />
          <span>Description</span><span>User</span><span>Date</span><span></span><span></span>
        </div>
        {items.length === 0 && <div style={{ padding: 24, textAlign: 'center', color: 'var(--text-muted)' }}>No pending entries</div>}
        {items.map((i: any) => (
          <div key={i.id} className="list-row" style={{ gridTemplateColumns: '40px 2fr 1fr 1fr auto auto' }}>
            <input type="checkbox" checked={!!selected[i.id]} onChange={(e) => setSelected((s) => ({ ...s, [i.id]: e.target.checked }))} />
            <div>
              <strong style={{ fontWeight: 500 }}>{i.description}</strong>
              {i.project && <span style={{ fontSize: '0.8rem', color: 'var(--primary)', marginLeft: 8 }}>● {i.project.name}</span>}
            </div>
            <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>{i.userId.slice(0, 8)}…</span>
            <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>{new Date(i.startedAt).toLocaleDateString()}</span>
            <button className="btn btn-primary" style={{ padding: '4px 12px', fontSize: '0.75rem' }} onClick={() => onApprove(i.id, true)}>Approve</button>
            <button className="btn btn-secondary" style={{ padding: '4px 12px', fontSize: '0.75rem', color: '#DC2626' }} onClick={() => onApprove(i.id, false)}>Reject</button>
          </div>
        ))}
        <div className="mt-4"><PaginationBar page={page} total={total} pageSize={20} onPrev={() => setPage((p) => p - 1)} onNext={() => setPage((p) => p + 1)} /></div>
      </div>
      <Toast message={toast?.text || ''} type={toast?.type || 'success'} onClose={() => setToast(null)} />
    </AppShell>
  );
}
