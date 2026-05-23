'use client';

import { useEffect, useState, useCallback } from 'react';
import { AppShell } from '../../components/app-shell';
import { Toast } from '../../components/toast';
import { getReport, getReportExportUrl, getCurrentRole } from '@divisionx/api-client';
import { PaginationBar } from '../../components/pagination-bar';

export default function ReportsPage() {
  const [items, setItems] = useState<any[]>([]);
  const [stats, setStats] = useState({ totalHours: 0, billableHours: 0, itemsCount: 0, approvedCount: 0 });
  const [grouped, setGrouped] = useState<any[] | null>(null);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [billable, setBillable] = useState<string>('');
  const [approved, setApproved] = useState<string>('');
  const [groupBy, setGroupBy] = useState<string>('');
  const [toast, setToast] = useState<{ text: string; type: 'success' | 'error' } | null>(null);
  const role = typeof window !== 'undefined' ? getCurrentRole() : 'MEMBER';

  const refresh = useCallback(async () => {
    try {
      const params: any = { page, pageSize: 20 };
      if (from) params.from = from;
      if (to) params.to = to;
      if (billable) params.billable = billable === 'true';
      if (approved) params.approved = approved === 'true';
      if (groupBy) params.groupBy = groupBy;
      const d = await getReport(params);
      setItems(d.items || []);
      setStats({ totalHours: d.totalHours, billableHours: d.billableHours || 0, itemsCount: d.itemsCount, approvedCount: d.approvedCount || 0 });
      setGrouped(d.grouped || null);
      setTotal(d.pagination?.total || 0);
    } catch { setToast({ text: 'Failed to load', type: 'error' }); }
  }, [page, from, to, billable, approved, groupBy]);

  useEffect(() => { refresh(); }, [refresh]);

  const maxGroupHours = grouped ? Math.max(...grouped.map((g: any) => g.hours), 1) : 1;

  return (
    <AppShell title="Reports">
      {/* Stat Cards */}
      <div className="grid-cards mb-6">
        <div className="card stat-card"><span className="stat-title">Total Hours</span><span className="stat-value">{stats.totalHours}h</span></div>
        <div className="card stat-card"><span className="stat-title">Billable</span><span className="stat-value">{stats.billableHours}h</span></div>
        <div className="card stat-card"><span className="stat-title">Entries</span><span className="stat-value">{stats.itemsCount}</span></div>
        <div className="card stat-card"><span className="stat-title">Approved</span><span className="stat-value">{stats.approvedCount}</span></div>
      </div>

      {/* Filters */}
      <div className="card mb-6" style={{ display: 'flex', gap: 12, alignItems: 'flex-end', flexWrap: 'wrap' }}>
        <div className="input-group"><label className="label">From</label><input className="input" type="date" value={from} onChange={(e) => setFrom(e.target.value)} /></div>
        <div className="input-group"><label className="label">To</label><input className="input" type="date" value={to} onChange={(e) => setTo(e.target.value)} /></div>
        <div className="input-group"><label className="label">Billable</label>
          <select className="select" value={billable} onChange={(e) => setBillable(e.target.value)}><option value="">All</option><option value="true">Billable</option><option value="false">Non-billable</option></select>
        </div>
        <div className="input-group"><label className="label">Approved</label>
          <select className="select" value={approved} onChange={(e) => setApproved(e.target.value)}><option value="">All</option><option value="true">Approved</option><option value="false">Pending</option></select>
        </div>
        <div className="input-group"><label className="label">Group By</label>
          <select className="select" value={groupBy} onChange={(e) => setGroupBy(e.target.value)}><option value="">None</option><option value="project">Project</option></select>
        </div>
        <button className="btn btn-primary" onClick={() => { setPage(1); refresh(); }}>Apply</button>
        {['OWNER', 'ADMIN', 'MANAGER'].includes(role) && (
          <a href={getReportExportUrl()} className="btn btn-secondary" download>Export CSV</a>
        )}
      </div>

      {/* Project Breakdown Chart */}
      {grouped && grouped.length > 0 && (
        <div className="card mb-6">
          <h3 style={{ margin: '0 0 20px 0', fontSize: '1.1rem' }}>By Project</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {grouped.map((g: any) => (
              <div key={g.id} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{ width: 12, height: 12, borderRadius: '50%', background: g.color, flexShrink: 0 }} />
                <span style={{ width: 120, fontWeight: 500, fontSize: '0.9rem' }}>{g.name}</span>
                <div style={{ flex: 1, height: 24, background: 'var(--bg-app)', borderRadius: 'var(--radius-sm)', overflow: 'hidden' }}>
                  <div style={{ width: `${(g.hours / maxGroupHours) * 100}%`, height: '100%', background: g.color, borderRadius: 'var(--radius-sm)', transition: 'width 0.3s ease' }} />
                </div>
                <span style={{ fontWeight: 600, fontSize: '0.9rem', minWidth: 50, textAlign: 'right' }}>{g.hours}h</span>
                <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem', minWidth: 60, textAlign: 'right' }}>{g.count} entries</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Entries Table */}
      <div className="card">
        <h3 style={{ margin: '0 0 16px 0', fontSize: '1.1rem' }}>Entries</h3>
        <div className="list-header" style={{ gridTemplateColumns: '2fr 1fr 80px 80px 80px' }}>
          <span>Description</span><span>Duration</span><span>Billable</span><span>Approved</span><span>Date</span>
        </div>
        {items.length === 0 && <div style={{ padding: 24, textAlign: 'center', color: 'var(--text-muted)' }}>No entries match your filters</div>}
        {items.map((i: any) => (
          <div key={i.id} className="list-row" style={{ gridTemplateColumns: '2fr 1fr 80px 80px 80px' }}>
            <div>
              <strong style={{ fontWeight: 500 }}>{i.description}</strong>
              {i.projectName && <span style={{ fontSize: '0.8rem', color: 'var(--primary)', marginLeft: 8 }}>● {i.projectName}</span>}
            </div>
            <span style={{ fontFamily: 'monospace', color: 'var(--text-muted)' }}>{i.durationHours}h</span>
            <span><span className={`badge ${i.billable ? 'badge-success' : 'badge-neutral'}`}>{i.billable ? '✓' : '–'}</span></span>
            <span><span className={`badge ${i.approved ? 'badge-success' : 'badge-warning'}`}>{i.approved ? '✓' : '○'}</span></span>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{new Date(i.startedAt).toLocaleDateString()}</span>
          </div>
        ))}
        <div className="mt-4"><PaginationBar page={page} total={total} pageSize={20} onPrev={() => setPage((p) => p - 1)} onNext={() => setPage((p) => p + 1)} /></div>
      </div>
      <Toast message={toast?.text || ''} type={toast?.type || 'success'} onClose={() => setToast(null)} />
    </AppShell>
  );
}
