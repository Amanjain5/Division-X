'use client';

import { useEffect, useState, useCallback } from 'react';
import { AppShell } from '../../../components/app-shell';
import { Toast } from '../../../components/toast';
import { getCatalog, createCatalog, updateCatalog, deleteCatalog } from '@divisionx/api-client';

export default function ProjectsPage() {
  const [items, setItems] = useState<any[]>([]);
  const [name, setName] = useState('');
  const [color, setColor] = useState('#059669');
  const [editId, setEditId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [toast, setToast] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  const refresh = useCallback(async () => {
    try { const d = await getCatalog('projects'); setItems(d.items); } catch { setToast({ text: 'Failed to load', type: 'error' }); }
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  async function onCreate() {
    if (!name.trim()) return;
    try { await createCatalog('projects', { name, color }); setName(''); await refresh(); setToast({ text: 'Project created', type: 'success' }); }
    catch { setToast({ text: 'Failed to create', type: 'error' }); }
  }

  async function onUpdate(id: string) {
    try { await updateCatalog('projects', id, { name: editName }); setEditId(null); await refresh(); }
    catch { setToast({ text: 'Failed to update', type: 'error' }); }
  }

  async function onDelete(id: string) {
    try { await deleteCatalog('projects', id); await refresh(); setToast({ text: 'Project deleted', type: 'success' }); }
    catch { setToast({ text: 'Failed to delete', type: 'error' }); }
  }

  return (
    <AppShell title="Projects">
      <div className="card mb-6" style={{ display: 'flex', gap: 12, alignItems: 'flex-end', flexWrap: 'wrap' }}>
        <div className="input-group">
          <label className="label">Project Name</label>
          <input className="input" value={name} onChange={(e) => setName(e.target.value)} placeholder="New project" onKeyDown={(e) => { if (e.key === 'Enter') onCreate(); }} />
        </div>
        <div className="input-group">
          <label className="label">Color</label>
          <input type="color" value={color} onChange={(e) => setColor(e.target.value)} style={{ width: 48, height: 40, border: '1px solid var(--border-light)', borderRadius: 'var(--radius-sm)', cursor: 'pointer' }} />
        </div>
        <button className="btn btn-primary" onClick={onCreate}>+ Add Project</button>
      </div>

      <div className="card">
        <h3 style={{ margin: '0 0 16px 0', fontSize: '1.1rem' }}>All Projects</h3>
        {items.length === 0 && <div style={{ padding: 24, textAlign: 'center', color: 'var(--text-muted)' }}>No projects yet</div>}
        {items.map((item: any) => (
          <div key={item.id} className="list-row" style={{ gridTemplateColumns: '40px 2fr 1fr auto auto' }}>
            <div style={{ width: 12, height: 12, borderRadius: '50%', background: item.color || '#059669' }} />
            {editId === item.id ? (
              <input className="input" value={editName} onChange={(e) => setEditName(e.target.value)} onBlur={() => onUpdate(item.id)} onKeyDown={(e) => { if (e.key === 'Enter') onUpdate(item.id); }} autoFocus />
            ) : (
              <strong style={{ fontWeight: 500 }}>{item.name}</strong>
            )}
            <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>{item.client?.name || 'No client'}</span>
            <button className="btn btn-secondary" style={{ padding: '4px 10px', fontSize: '0.75rem' }} onClick={() => { setEditId(item.id); setEditName(item.name); }}>Edit</button>
            <button className="btn btn-secondary" style={{ padding: '4px 10px', fontSize: '0.75rem', color: '#DC2626' }} onClick={() => onDelete(item.id)}>Delete</button>
          </div>
        ))}
      </div>
      <Toast message={toast?.text || ''} type={toast?.type || 'success'} onClose={() => setToast(null)} />
    </AppShell>
  );
}
