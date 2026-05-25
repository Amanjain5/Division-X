'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { AppShell } from '../../../components/app-shell';
import { Toast } from '../../../components/toast';
import { 
  getOrganizations, 
  createOrganization, 
  bindWorkspaceToOrg, 
  getOrganizationCompliance,
  getWorkspaceBootstrap
} from '@divisionx/api-client';

export default function OrganizationPage() {
  const [loading, setLoading] = useState(true);
  const [organizations, setOrganizations] = useState<any[]>([]);
  const [selectedOrgId, setSelectedOrgId] = useState<string>('');
  const [complianceData, setComplianceData] = useState<any | null>(null);
  
  // Creation States
  const [newOrgName, setNewOrgName] = useState('');
  const [currentWorkspaceId, setCurrentWorkspaceId] = useState('');
  
  // UI polish states
  const [toast, setToast] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  const refreshOrgs = useCallback(async () => {
    try {
      const bootstrap = await getWorkspaceBootstrap();
      setCurrentWorkspaceId(bootstrap.workspace.id);

      const res = await getOrganizations();
      setOrganizations(res.items || []);
      
      if (res.items && res.items.length > 0) {
        setSelectedOrgId(res.items[0].id);
      }
    } catch (err) {
      setToast({ text: 'Failed to load corporate organizations', type: 'error' });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshOrgs();
  }, [refreshOrgs]);

  // Fetch compliance when selected organization changes
  useEffect(() => {
    if (!selectedOrgId) {
      setComplianceData(null);
      return;
    }

    async function loadCompliance() {
      try {
        const res = await getOrganizationCompliance(selectedOrgId);
        setComplianceData(res);
      } catch {
        setComplianceData(null);
      }
    }

    loadCompliance();
  }, [selectedOrgId]);

  const handleCreateOrg = async () => {
    if (!newOrgName.trim()) return;
    try {
      await createOrganization(newOrgName);
      setNewOrgName('');
      setToast({ text: 'Organization created successfully', type: 'success' });
      await refreshOrgs();
    } catch {
      setToast({ text: 'Failed to create organization', type: 'error' });
    }
  };

  const handleBindCurrentWorkspace = async () => {
    if (!selectedOrgId || !currentWorkspaceId) return;
    try {
      await bindWorkspaceToOrg(selectedOrgId, currentWorkspaceId);
      setToast({ text: 'Current Workspace bound to parent Organization', type: 'success' });
      await refreshOrgs();
    } catch (err: any) {
      setToast({ text: 'Failed to bind workspace under organization', type: 'error' });
    }
  };

  return (
    <AppShell title="Enterprise Organization">
      <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', height: '100%', overflowY: 'auto' }}>
        
        {/* ── Header ── */}
        <div>
          <h1 style={{ fontSize: '1.8rem', fontWeight: 700, margin: 0, background: 'linear-gradient(90deg, #fff 0%, #34D399 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
            Enterprise Organizations
          </h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', margin: '4px 0 0 0' }}>
            Centralized parent corporation cockpit, compliance monitoring, and workspace sandboxes.
          </p>
        </div>

        {loading ? (
          <div style={{ padding: '60px', textAlign: 'center', color: 'var(--text-muted)' }}>
            Bootstrapping organization matrices...
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 350px', gap: '24px' }}>
            
            {/* ── Left Column: Subsidiaries & Audits ── */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', minWidth: 0 }}>
              
              {/* 1. Selector and Binding */}
              <div className="card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
                <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                  <label className="label" style={{ margin: 0 }}>Active Org:</label>
                  {organizations.length === 0 ? (
                    <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>No organizations linked yet.</span>
                  ) : (
                    <select
                      value={selectedOrgId}
                      onChange={(e) => setSelectedOrgId(e.target.value)}
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
                      {organizations.map(org => (
                        <option key={org.id} value={org.id}>{org.name}</option>
                      ))}
                    </select>
                  )}
                </div>

                {selectedOrgId && (
                  <button 
                    className="btn btn-primary"
                    style={{ fontSize: '0.8rem', padding: '6px 12px' }}
                    onClick={handleBindCurrentWorkspace}
                  >
                    🔗 Bind Workspace to Org
                  </button>
                )}
              </div>

              {/* 2. Subsidiaries Workspace Grid */}
              <div className="card">
                <h3 style={{ fontSize: '1.1rem', fontWeight: 600, margin: '0 0 16px 0' }}>
                  Subsidiary Workspaces
                </h3>

                {complianceData && complianceData.workspaces && complianceData.workspaces.length > 0 ? (
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: '16px' }}>
                    {complianceData.workspaces.map((ws: any) => {
                      const isCurrent = ws.id === currentWorkspaceId;
                      return (
                        <div
                          key={ws.id}
                          style={{
                            background: isCurrent ? 'rgba(52, 211, 153, 0.08)' : 'rgba(255,255,255,0.02)',
                            border: isCurrent ? '1px solid rgba(52, 211, 153, 0.4)' : '1px solid rgba(255,255,255,0.06)',
                            borderRadius: '12px',
                            padding: '16px',
                            position: 'relative'
                          }}
                        >
                          <h4 style={{ margin: '0 0 6px 0', fontSize: '0.95rem', fontWeight: 600 }}>
                            {ws.name} {isCurrent && <span style={{ color: '#34D399', fontSize: '0.75rem' }}>(Active)</span>}
                          </h4>
                          <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                            <span>Tenant ID: <code style={{ fontFamily: 'monospace' }}>{ws.id.slice(0, 8)}...</code></span>
                            {ws.customDomain && <span>Domain: <code style={{ color: '#6EE7B7' }}>{ws.customDomain}</code></span>}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div style={{ padding: '40px', textAlign: 'center', border: '1px dashed rgba(255,255,255,0.08)', borderRadius: '8px', color: 'var(--text-dim)' }}>
                    No subsidiary workspaces bound under this corporate organization. Bind your current workspace to get started!
                  </div>
                )}
              </div>

              {/* 3. Global Compliance Audit feed */}
              <div className="card">
                <h3 style={{ fontSize: '1.1rem', fontWeight: 600, margin: '0 0 12px 0' }}>
                  Enterprise Compliance Audit Feed
                </h3>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem', margin: '0 0 16px 0' }}>
                  Centralized, immutable sequence of security and tracking logs across all corporate subsidiaries.
                </p>

                <div 
                  style={{
                    maxHeight: '300px',
                    overflowY: 'auto',
                    background: 'rgba(0,0,0,0.2)',
                    border: '1px solid rgba(255,255,255,0.05)',
                    borderRadius: '8px',
                    padding: '12px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '10px',
                    fontFamily: 'monospace',
                    fontSize: '0.78rem'
                  }}
                >
                  {complianceData && complianceData.auditLogs && complianceData.auditLogs.length > 0 ? (
                    complianceData.auditLogs.map((log: any) => (
                      <div key={log.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.03)', paddingBottom: '8px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-muted)', marginBottom: '2px' }}>
                          <span>[{new Date(log.createdAt).toLocaleString()}]</span>
                          <span style={{ color: '#34D399' }}>{log.action}</span>
                        </div>
                        <div>
                          Actor: <strong style={{ color: '#fff' }}>{log.actorUserId.slice(0, 10)}</strong> | Scope: Workspace {log.workspaceId.slice(0, 8)}... | Target: {log.targetType} ({log.targetId?.slice(0, 8) || 'N/A'})
                        </div>
                      </div>
                    ))
                  ) : (
                    <div style={{ color: 'var(--text-dim)', textAlign: 'center', margin: 'auto', fontStyle: 'italic' }}>
                      No compliance logs compiled. Onboard workspaces to view global security actions.
                    </div>
                  )}
                </div>
              </div>

            </div>

            {/* ── Right Column: Metrics & Onboarding ── */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
              
              {/* 1. Onboarding Metrics */}
              <div className="card">
                <h3 style={{ fontSize: '1.1rem', fontWeight: 600, marginBottom: '16px' }}>
                  Corporate Footprint
                </h3>

                {complianceData ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', background: 'rgba(255,255,255,0.02)', padding: '12px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.04)' }}>
                      <div>
                        <span style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: 'var(--text-muted)', fontWeight: 600 }}>Workspaces</span>
                        <div style={{ fontSize: '1.5rem', fontWeight: 700, color: '#34D399' }}>{complianceData.workspaces?.length || 0}</div>
                      </div>
                      <div style={{ textAlign: 'right', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                        <div>Subsidiary Business Units</div>
                      </div>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                      <div style={{ background: 'rgba(255,255,255,0.02)', padding: '10px', borderRadius: '8px' }}>
                        <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Global Users</span>
                        <div style={{ fontSize: '1.1rem', fontWeight: 600, color: '#fff', marginTop: '2px' }}>{complianceData.totalMembers}</div>
                      </div>
                      <div style={{ background: 'rgba(255,255,255,0.02)', padding: '10px', borderRadius: '8px' }}>
                        <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Active Projects</span>
                        <div style={{ fontSize: '1.1rem', fontWeight: 600, color: '#fff', marginTop: '2px' }}>{complianceData.totalProjects}</div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div style={{ color: 'var(--text-dim)', fontSize: '0.8rem', textAlign: 'center' }}>
                    Select an active corporation to load metrics.
                  </div>
                )}
              </div>

              {/* 2. Onboard New Parent Organization */}
              <div className="card">
                <h3 style={{ fontSize: '1.1rem', fontWeight: 600, marginBottom: '12px' }}>
                  Register Corporation
                </h3>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem', margin: '0 0 16px 0' }}>
                  Create an organizational umbrella to govern dynamic team policies, custom SSO routes, and subsidiary timesheets.
                </p>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  <div className="input-group">
                    <label className="label">Corporation Name</label>
                    <input 
                      className="input" 
                      value={newOrgName} 
                      onChange={(e) => setNewOrgName(e.target.value)} 
                      placeholder="e.g. General Electric" 
                      onKeyDown={(e) => { if (e.key === 'Enter') handleCreateOrg(); }}
                    />
                  </div>
                  <button className="btn btn-primary" onClick={handleCreateOrg} style={{ width: '100%' }}>
                    + Register Org
                  </button>
                </div>
              </div>

            </div>

          </div>
        )}

      </div>
      <Toast message={toast?.text || ''} type={toast?.type || 'success'} onClose={() => setToast(null)} />
    </AppShell>
  );
}
