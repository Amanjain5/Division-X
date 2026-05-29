'use client';

import { useEffect, useState, useCallback } from 'react';
import { AppShell } from '../../../components/app-shell';
import { Toast } from '../../../components/toast';
import { getCatalog, createCatalog, updateCatalog, deleteCatalog } from '@divisionx/api-client';

export default function TagsPage() {
  const [items, setItems] = useState<any[]>([]);
  const [name, setName] = useState('');
  const [color, setColor] = useState('#6B7280');
  const [editId, setEditId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [toast, setToast] = useState<{ text: string; type: 'success' | 'error' } | null>(null);
  const [actionPending, setActionPending] = useState(false);
  const [actionType, setActionType] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try { const d = await getCatalog('tags'); setItems(d.items); } catch { setToast({ text: 'Failed to load', type: 'error' }); }
  }, []);
  useEffect(() => { refresh(); }, [refresh]);

  async function onCreate() {
    if (!name.trim() || actionPending) return;
    setActionPending(true);
    setActionType('create');
    try {
      await createCatalog('tags', { name, color });
      setName('');
      await refresh();
      setToast({ text: 'Tag created', type: 'success' });
    } catch {
      setToast({ text: 'Failed to create tag', type: 'error' });
    } finally {
      setActionType(null);
      setActionPending(false);
    }
  }

  async function onUpdate(id: string, newName: string) {
    if (actionPending) return;
    setActionPending(true);
    setActionType(`update-${id}`);
    try {
      await updateCatalog('tags', id, { name: newName });
      setEditId(null);
      await refresh();
      setToast({ text: 'Tag updated', type: 'success' });
    } catch {
      setToast({ text: 'Failed to update tag', type: 'error' });
    } finally {
      setActionType(null);
      setActionPending(false);
    }
  }

  async function onDelete(id: string) {
    if (actionPending) return;
    setActionPending(true);
    setActionType(`delete-${id}`);
    try {
      await deleteCatalog('tags', id);
      await refresh();
      setToast({ text: 'Tag deleted', type: 'success' });
    } catch {
      setToast({ text: 'Failed to delete tag', type: 'error' });
    } finally {
      setActionType(null);
      setActionPending(false);
    }
  }

  return (
    <AppShell title="Tags">
      <div className="card mb-6" style={{ display: 'flex', gap: 12, alignItems: 'flex-end', flexWrap: 'wrap' }}>
        <div className="input-group"><label className="label">Tag Name</label><input className="input" value={name} onChange={(e) => setName(e.target.value)} placeholder="Design" disabled={actionPending} /></div>
        <div className="input-group"><label className="label">Color</label><input type="color" value={color} onChange={(e) => setColor(e.target.value)} style={{ width: 48, height: 40, border: '1px solid var(--border-light)', borderRadius: 'var(--radius-sm)', cursor: 'pointer' }} disabled={actionPending} /></div>
        <button className="btn btn-primary" onClick={onCreate} disabled={actionPending}>
          {actionType === 'create' ? <span className="spinner" /> : ''}
          + Add Tag
        </button>
      </div>
      <div className="card">
        <h3 style={{ margin: '0 0 16px 0', fontSize: '1.1rem' }}>All Tags</h3>
        {items.length === 0 && <div style={{ padding: 24, textAlign: 'center', color: 'var(--text-muted)' }}>No tags yet</div>}
        {items.map((item: any) => (
          <div key={item.id} className="list-row" style={{ gridTemplateColumns: '40px 2fr auto auto' }}>
            <div style={{ width: 12, height: 12, borderRadius: '50%', background: item.color || '#6B7280' }} />
            {editId === item.id ? (
              <input 
                className="input" 
                value={editName} 
                onChange={(e) => setEditName(e.target.value)} 
                onBlur={() => onUpdate(item.id, editName)} 
                onKeyDown={(e) => { if (e.key === 'Enter') onUpdate(item.id, editName); }} 
                disabled={actionPending}
                autoFocus 
              />
            ) : (
              <strong style={{ fontWeight: 500 }}>{item.name}</strong>
            )}
            <button className="btn btn-secondary" style={{ padding: '4px 10px', fontSize: '0.75rem' }} onClick={() => { setEditId(item.id); setEditName(item.name); }} disabled={actionPending}>Edit</button>
            <button className="btn btn-secondary" style={{ padding: '4px 10px', fontSize: '0.75rem', color: '#DC2626' }} onClick={() => onDelete(item.id)} disabled={actionPending}>
              {actionType === `delete-${item.id}` ? <span className="spinner" style={{ marginRight: 0 }} /> : 'Delete'}
            </button>
          </div>
        ))}
      </div>
      <Toast message={toast?.text || ''} type={toast?.type || 'success'} onClose={() => setToast(null)} />
    </AppShell>
  );
}
