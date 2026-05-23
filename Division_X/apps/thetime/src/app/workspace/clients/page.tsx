'use client';

import { useEffect, useState, useCallback } from 'react';
import { AppShell } from '../../../components/app-shell';
import { Toast } from '../../../components/toast';
import { getCatalog, createCatalog, updateCatalog, deleteCatalog } from '@divisionx/api-client';

export default function ClientsPage() {
  const [items, setItems] = useState<any[]>([]);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [editId, setEditId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [toast, setToast] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  const refresh = useCallback(async () => {
    try { const d = await getCatalog('clients'); setItems(d.items); } catch { setToast({ text: 'Failed to load', type: 'error' }); }
  }, []);
  useEffect(() => { refresh(); }, [refresh]);

  async function onCreate() {
    if (!name.trim()) return;
    try { await createCatalog('clients', { name, email: email || undefined }); setName(''); setEmail(''); await refresh(); setToast({ text: 'Client created', type: 'success' }); }
    catch { setToast({ text: 'Failed to create', type: 'error' }); }
  }

  return (
    <AppShell title="Clients">
      <div className="card mb-6" style={{ display: 'flex', gap: 12, alignItems: 'flex-end', flexWrap: 'wrap' }}>
        <div className="input-group"><label className="label">Client Name</label><input className="input" value={name} onChange={(e) => setName(e.target.value)} placeholder="Acme Inc" /></div>
        <div className="input-group"><label className="label">Email</label><input className="input" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="contact@acme.com" /></div>
        <button className="btn btn-primary" onClick={onCreate}>+ Add Client</button>
      </div>
      <div className="card">
        <h3 style={{ margin: '0 0 16px 0', fontSize: '1.1rem' }}>All Clients</h3>
        {items.length === 0 && <div style={{ padding: 24, textAlign: 'center', color: 'var(--text-muted)' }}>No clients yet</div>}
        {items.map((item: any) => (
          <div key={item.id} className="list-row" style={{ gridTemplateColumns: '2fr 1.5fr auto auto' }}>
            {editId === item.id ? <input className="input" value={editName} onChange={(e) => setEditName(e.target.value)} onBlur={async () => { await updateCatalog('clients', item.id, { name: editName }); setEditId(null); refresh(); }} autoFocus /> : <strong style={{ fontWeight: 500 }}>{item.name}</strong>}
            <span style={{ color: 'var(--text-muted)' }}>{item.email || '—'}</span>
            <button className="btn btn-secondary" style={{ padding: '4px 10px', fontSize: '0.75rem' }} onClick={() => { setEditId(item.id); setEditName(item.name); }}>Edit</button>
            <button className="btn btn-secondary" style={{ padding: '4px 10px', fontSize: '0.75rem', color: '#DC2626' }} onClick={async () => { await deleteCatalog('clients', item.id); refresh(); }}>Delete</button>
          </div>
        ))}
      </div>
      <Toast message={toast?.text || ''} type={toast?.type || 'success'} onClose={() => setToast(null)} />
    </AppShell>
  );
}
