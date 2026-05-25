'use client';

import { useEffect, useState, useTransition } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { getCurrentRole, clearAuth, switchWorkspace } from '@divisionx/api-client';
import { AuthGuard } from './auth-guard';
import { requestNotificationPermission, notifyCritical } from './notification-manager';

const allLinks: Array<[string, string, string, Array<'OWNER' | 'ADMIN' | 'MANAGER' | 'MEMBER'>]> = [
  ['⏱', 'Tracker', '/tracker', ['OWNER', 'ADMIN', 'MANAGER', 'MEMBER']],
  ['📋', 'Timesheet', '/timesheet', ['OWNER', 'ADMIN', 'MANAGER', 'MEMBER']],
  ['📊', 'Dashboard', '/dashboard', ['OWNER', 'ADMIN', 'MANAGER', 'MEMBER']],
  ['📈', 'Reports', '/reports', ['OWNER', 'ADMIN', 'MANAGER', 'MEMBER']],
  ['📁', 'Projects', '/workspace/projects', ['OWNER', 'ADMIN', 'MANAGER']],
  ['👥', 'Teams', '/workspace/teams', ['OWNER', 'ADMIN', 'MANAGER']],
  ['✅', 'Approvals', '/workspace/approvals', ['OWNER', 'ADMIN', 'MANAGER']],
  ['🏢', 'Clients', '/workspace/clients', ['OWNER', 'ADMIN', 'MANAGER']],
  ['🏷', 'Tags', '/workspace/tags', ['OWNER', 'ADMIN', 'MANAGER']],
  ['📜', 'Audit Log', '/workspace/audit', ['OWNER', 'ADMIN']],
  ['⚙', 'Settings', '/workspace/settings', ['OWNER', 'ADMIN']],
];

export function AppShell({ title, children }: { title: string; children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const role = (typeof window !== 'undefined' ? getCurrentRole() : 'MEMBER') as 'OWNER' | 'ADMIN' | 'MANAGER' | 'MEMBER';
  const links = allLinks.filter(([, , , roles]) => roles.includes(role));
  const userEmail = typeof window !== 'undefined' ? localStorage.getItem('thetime_user_email') || localStorage.getItem('thetime_user_id')?.slice(0, 10) || 'User' : 'User';

  const [workspaces, setWorkspaces] = useState<any[]>([]);
  const [activeWorkspaceId, setActiveWorkspaceId] = useState<string>('');
  const [pendingHref, setPendingHref] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    setPendingHref(null);
  }, [pathname]);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const wsCached = localStorage.getItem('thetime_workspaces');
      if (wsCached) {
        try {
          setWorkspaces(JSON.parse(wsCached));
        } catch {}
      }
      setActiveWorkspaceId(localStorage.getItem('thetime_workspace_id') || '');
    }
  }, []);

  // Connect to Admin WebSocket notifications for OWNER/ADMIN roles
  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (role !== 'OWNER' && role !== 'ADMIN') return;

    let ws: WebSocket | null = null;
    let keepAliveInterval: any = null;
    let reconnectTimeout: any = null;

    async function initWebSocket() {
      await requestNotificationPermission();

      const token = localStorage.getItem('thetime_token');
      if (!token) return;

      const wsUrl = `ws://localhost:5000/v1/notifications/ws?token=${encodeURIComponent(token)}`;

      try {
        ws = new WebSocket(wsUrl);

        ws.onopen = () => {
          console.log('🔌 Admin WebSocket successfully connected');
          keepAliveInterval = setInterval(() => {
            if (ws && ws.readyState === WebSocket.OPEN) {
              ws.send('ping');
            }
          }, 25000);
        };

        ws.onmessage = (event) => {
          if (event.data === 'pong') return;
          try {
            const data = JSON.parse(event.data);
            if (data.title && data.userName && data.message) {
              notifyCritical(data.title, `${data.userName} ${data.message}`, `event-${data.eventId}`);
            }
          } catch (err) {
            console.error('Failed to parse WebSocket message:', err);
          }
        };

        ws.onclose = (event) => {
          console.log(`🔌 Admin WebSocket disconnected: ${event.code} ${event.reason}`);
          cleanup();
          if (event.code !== 4001 && event.code !== 4003) {
            reconnectTimeout = setTimeout(initWebSocket, 5000);
          }
        };

        ws.onerror = (err) => {
          console.error('❌ Admin WebSocket error:', err);
        };
      } catch (err) {
        console.error('Failed to establish WebSocket connection:', err);
      }
    }

    function cleanup() {
      if (keepAliveInterval) {
        clearInterval(keepAliveInterval);
        keepAliveInterval = null;
      }
      if (ws) {
        ws.close();
        ws = null;
      }
    }

    initWebSocket();

    return () => {
      cleanup();
      if (reconnectTimeout) {
        clearTimeout(reconnectTimeout);
      }
    };
  }, [role]);

  async function handleWorkspaceChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const newWorkspaceId = e.target.value;
    if (newWorkspaceId && newWorkspaceId !== activeWorkspaceId) {
      const userId = localStorage.getItem('thetime_user_id') || '';
      try {
        await switchWorkspace(newWorkspaceId, userId);
        window.location.reload();
      } catch {
        alert('Failed to switch workspace');
      }
    }
  }

  function handleLogout() {
    clearAuth();
    router.push('/auth/login');
  }

  function handleNavigate(e: React.MouseEvent<HTMLAnchorElement>, href: string) {
    if (href === pathname) return;
    e.preventDefault();
    setPendingHref(href);
    startTransition(() => {
      router.push(href);
    });
  }

  function prefetchRoute(href: string) {
    if (href !== pathname) {
      router.prefetch(href);
    }
  }

  function navClass(href: string) {
    const isActive = pathname === href;
    const isLoading = pendingHref === href || (isPending && pendingHref === href);
    return `nav-link ${isActive ? 'active' : ''} ${isLoading ? 'pending' : ''}`;
  }

  function renderNavLink(icon: string, name: string, href: string) {
    return (
      <Link
        key={href}
        href={href}
        onClick={(e) => handleNavigate(e, href)}
        onMouseEnter={() => prefetchRoute(href)}
        onFocus={() => prefetchRoute(href)}
        className={navClass(href)}
        aria-current={pathname === href ? 'page' : undefined}
      >
        <span style={{ fontSize: '0.95rem', width: 20, textAlign: 'center' }}>{icon}</span>
        <span>{name}</span>
      </Link>
    );
  }

  return (
    <AuthGuard>
      <div className="app-layout">
        {(isPending || pendingHref) && <div className="route-progress" />}
        <aside className="sidebar">
          <div className="sidebar-header">
            <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'inherit' }}>
              <span style={{ fontSize: '1.2rem' }}>⏰</span>
              <span>TheTime</span>
            </Link>
          </div>

          {/* Role badge */}
          <div style={{ padding: '0 18px 12px', display: 'flex', gap: 6, alignItems: 'center' }}>
            <span className={`badge ${role === 'OWNER' ? 'badge-success' : role === 'ADMIN' ? 'badge-warning' : 'badge-neutral'}`}>{role}</span>
          </div>

          {/* Workspace Switcher */}
          {workspaces.length > 0 && (
            <div style={{ padding: '0 18px 16px' }}>
              <div style={{ fontSize: '0.72rem', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: 6, fontWeight: 600, letterSpacing: '0.05em' }}>Organization</div>
              <select 
                className="select select-sidebar"
                value={activeWorkspaceId} 
                onChange={handleWorkspaceChange}
              >
                {workspaces.map((ws: any) => (
                  <option key={ws.id} value={ws.id}>
                    {ws.name} ({ws.role})
                  </option>
                ))}
              </select>
            </div>
          )}

          <nav className="nav-links">
            {/* Group: Tracking */}
            <div className="nav-section-label">Tracking</div>
            {links.filter(([, , href]) => ['/tracker', '/timesheet'].includes(href)).map(([icon, name, href]) => renderNavLink(icon, name, href))}

            {/* Group: Analytics */}
            {links.some(([, , href]) => ['/dashboard', '/reports'].includes(href)) && (
              <>
                <div className="nav-section-label">Analytics</div>
                {links.filter(([, , href]) => ['/dashboard', '/reports'].includes(href)).map(([icon, name, href]) => renderNavLink(icon, name, href))}
              </>
            )}

            {/* Group: Workspace */}
            {links.some(([, , href]) => href.startsWith('/workspace/')) && (
              <>
                <div className="nav-section-label">Workspace</div>
                {links.filter(([, , href]) => href.startsWith('/workspace/')).map(([icon, name, href]) => renderNavLink(icon, name, href))}
              </>
            )}
          </nav>

          {/* User footer */}
          <div style={{ marginTop: 'auto', padding: '16px 18px', borderTop: '1px solid var(--border-light)', display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'linear-gradient(135deg, var(--primary), #059669)', color: '#022c22', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: '0.8rem' }}>
              {(userEmail || 'U').charAt(0).toUpperCase()}
            </div>
            <div style={{ flex: 1, overflow: 'hidden' }}>
              <div style={{ fontSize: '0.82rem', fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: 'var(--text-secondary)' }}>{userEmail}</div>
            </div>
            <button
              onClick={handleLogout}
              title="Logout"
              style={{ background: 'var(--bg-glass)', border: '1px solid var(--border-light)', borderRadius: 8, cursor: 'pointer', padding: '6px 8px', color: 'var(--text-muted)', fontSize: '0.9rem', transition: 'all 0.2s' }}
            >↪</button>
          </div>
        </aside>
        <main className={`main-content route-content ${isPending || pendingHref ? 'route-content-pending' : ''}`}>
          <div className="page-header">
            <h1 className="page-title">{title}</h1>
          </div>
          {children}
        </main>
      </div>
    </AuthGuard>
  );
}
