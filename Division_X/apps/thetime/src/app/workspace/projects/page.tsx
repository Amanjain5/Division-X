'use client';

import { useEffect, useState, useCallback } from 'react';
import { AppShell } from '../../../components/app-shell';
import { Toast } from '../../../components/toast';
import { 
  getCatalog, 
  createCatalog, 
  updateCatalog, 
  deleteCatalog,
  bindProjectToTeam,
  unbindProjectFromTeam,
  getTeams
} from '@divisionx/api-client';

export default function ProjectsPage() {
  const [items, setItems] = useState<any[]>([]);
  const [allTeams, setAllTeams] = useState<any[]>([]);
  
  // Creation States
  const [name, setName] = useState('');
  const [color, setColor] = useState('#059669');
  
  // Edit States
  const [editId, setEditId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  
  // Team Scoping States
  const [activeScopeProjectId, setActiveScopeProjectId] = useState<string | null>(null);
  const [selectedTeamId, setSelectedTeamId] = useState('');

  const [toast, setToast] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  const refresh = useCallback(async () => {
    try { 
      const [projData, teamsData] = await Promise.all([
        getCatalog('projects'),
        getTeams()
      ]);
      setItems(projData.items || []);
      setAllTeams(teamsData.items || []);
    } catch { 
      setToast({ text: 'Failed to load projects or teams catalog', type: 'error' }); 
    }
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  async function onCreate() {
    if (!name.trim()) return;
    try { 
      await createCatalog('projects', { name, color }); 
      setName(''); 
      await refresh(); 
      setToast({ text: 'Project created successfully', type: 'success' }); 
    } catch { 
      setToast({ text: 'Failed to create project', type: 'error' }); 
    }
  }

  async function onUpdate(id: string) {
    try { 
      await updateCatalog('projects', id, { name: editName }); 
      setEditId(null); 
      await refresh(); 
      setToast({ text: 'Project updated successfully', type: 'success' });
    } catch { 
      setToast({ text: 'Failed to update project', type: 'error' }); 
    }
  }

  async function onDelete(id: string) {
    try { 
      await deleteCatalog('projects', id); 
      await refresh(); 
      setToast({ text: 'Project deleted successfully', type: 'success' }); 
    } catch { 
      setToast({ text: 'Failed to delete project', type: 'error' }); 
    }
  }

  async function handleAddTeamScope(projectId: string) {
    if (!selectedTeamId) return;
    try {
      await bindProjectToTeam(projectId, selectedTeamId);
      setSelectedTeamId('');
      setActiveScopeProjectId(null);
      await refresh();
      setToast({ text: 'Team scope added to project', type: 'success' });
    } catch {
      setToast({ text: 'Failed to add team scope', type: 'error' });
    }
  }

  async function handleRemoveTeamScope(projectId: string, teamId: string) {
    try {
      await unbindProjectFromTeam(projectId, teamId);
      await refresh();
      setToast({ text: 'Team scope removed from project', type: 'success' });
    } catch {
      setToast({ text: 'Failed to remove team scope', type: 'error' });
    }
  }

  return (
    <AppShell title="Projects">
      
      {/* ── Add Project Bar ── */}
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

      {/* ── Projects List ── */}
      <div className="card">
        <h3 style={{ margin: '0 0 16px 0', fontSize: '1.1rem', fontWeight: 600 }}>All Projects</h3>
        
        {items.length === 0 && (
          <div style={{ padding: 24, textAlign: 'center', color: 'var(--text-muted)' }}>
            No projects yet
          </div>
        )}

        {items.map((item: any) => {
          // Resolve currently bound teams for this project
          const boundTeamIds = (item.projectTeams || []).map((pt: any) => pt.teamId);
          const boundTeams = allTeams.filter(t => boundTeamIds.includes(t.id));

          return (
            <div 
              key={item.id} 
              className="list-row" 
              style={{ 
                gridTemplateColumns: '24px 2fr 2fr 1fr auto auto',
                alignItems: 'center',
                gap: '12px'
              }}
            >
              {/* Project Color Circle */}
              <div style={{ width: 12, height: 12, borderRadius: '50%', background: item.color || '#059669' }} />
              
              {/* Project Name & Input */}
              {editId === item.id ? (
                <input className="input" value={editName} onChange={(e) => setEditName(e.target.value)} onBlur={() => onUpdate(item.id)} onKeyDown={(e) => { if (e.key === 'Enter') onUpdate(item.id); }} autoFocus />
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  <strong style={{ fontWeight: 500 }}>{item.name}</strong>
                  <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>{item.client?.name || 'No client'}</span>
                </div>
              )}

              {/* Team Scopes Badge Section */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                {boundTeams.length === 0 ? (
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>🌍 Public Workspace</span>
                ) : (
                  boundTeams.map(team => (
                    <span
                      key={team.id}
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '6px',
                        background: 'rgba(52, 211, 153, 0.1)',
                        border: '1px solid rgba(52, 211, 153, 0.25)',
                        color: '#6EE7B7',
                        borderRadius: '6px',
                        padding: '2px 8px',
                        fontSize: '0.72rem'
                      }}
                    >
                      👥 {team.name}
                      <span
                        onClick={() => handleRemoveTeamScope(item.id, team.id)}
                        style={{
                          cursor: 'pointer',
                          color: '#FCA5A5',
                          fontWeight: 'bold',
                          marginLeft: '2px'
                        }}
                        title="Remove Team Scope"
                      >
                        ×
                      </span>
                    </span>
                  ))
                )}

                {/* Team scoping controls popover */}
                {activeScopeProjectId === item.id ? (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <select
                      value={selectedTeamId}
                      onChange={(e) => setSelectedTeamId(e.target.value)}
                      style={{
                        background: 'rgba(0,0,0,0.3)',
                        border: '1px solid rgba(255,255,255,0.1)',
                        color: '#fff',
                        borderRadius: '6px',
                        padding: '3px 6px',
                        fontSize: '0.72rem',
                        outline: 'none',
                        cursor: 'pointer'
                      }}
                    >
                      <option value="">Select Team...</option>
                      {allTeams
                        .filter(t => !boundTeamIds.includes(t.id))
                        .map(t => (
                          <option key={t.id} value={t.id}>{t.name}</option>
                        ))}
                    </select>
                    <button 
                      className="btn btn-primary" 
                      style={{ padding: '3px 8px', fontSize: '0.7rem' }}
                      onClick={() => handleAddTeamScope(item.id)}
                    >
                      Add
                    </button>
                    <button 
                      className="btn btn-secondary" 
                      style={{ padding: '3px 8px', fontSize: '0.7rem', color: 'var(--text-dim)' }}
                      onClick={() => setActiveScopeProjectId(null)}
                    >
                      Cancel
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => setActiveScopeProjectId(item.id)}
                    style={{
                      background: 'rgba(255, 255, 255, 0.05)',
                      border: '1px dashed rgba(255,255,255,0.15)',
                      color: 'var(--text-muted)',
                      borderRadius: '6px',
                      padding: '2px 8px',
                      fontSize: '0.72rem',
                      cursor: 'pointer',
                      transition: 'all 0.15s'
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.borderColor = '#34D399'}
                    onMouseLeave={(e) => e.currentTarget.style.borderColor = 'rgba(255,255,255,0.15)'}
                  >
                    + Limit Access
                  </button>
                )}
              </div>

              {/* Action Buttons */}
              <div /> {/* spacing grid columns */}
              <button className="btn btn-secondary" style={{ padding: '4px 10px', fontSize: '0.75rem' }} onClick={() => { setEditId(item.id); setEditName(item.name); }}>Edit</button>
              <button className="btn btn-secondary" style={{ padding: '4px 10px', fontSize: '0.75rem', color: '#DC2626' }} onClick={() => onDelete(item.id)}>Delete</button>
            
            </div>
          );
        })}
      </div>
      <Toast message={toast?.text || ''} type={toast?.type || 'success'} onClose={() => setToast(null)} />
    </AppShell>
  );
}
