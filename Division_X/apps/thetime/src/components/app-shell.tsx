'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { getCurrentRole, clearAuth } from '@divisionx/api-client';
import { AuthGuard } from './auth-guard';

const allLinks: Array<[string, string, string, Array<'OWNER' | 'ADMIN' | 'MANAGER' | 'MEMBER'>]> = [
  ['⏱', 'Tracker', '/tracker', ['OWNER', 'ADMIN', 'MANAGER', 'MEMBER']],
  ['📋', 'Timesheet', '/timesheet', ['OWNER', 'ADMIN', 'MANAGER', 'MEMBER']],
  ['📊', 'Dashboard', '/dashboard', ['OWNER', 'ADMIN', 'MANAGER']],
  ['📈', 'Reports', '/reports', ['OWNER', 'ADMIN', 'MANAGER']],
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

  function handleLogout() {
    clearAuth();
    router.push('/auth/login');
  }

  return (
    <AuthGuard>
      <div className="app-layout">
        <aside className="sidebar">
          <div className="sidebar-header">
            <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'inherit' }}>
              <span style={{ fontSize: '1.2rem' }}>⏰</span>
              <span>TheTime</span>
            </Link>
          </div>

          {/* Role badge */}
          <div style={{ padding: '0 18px 12px' }}>
            <span className={`badge ${role === 'OWNER' ? 'badge-success' : role === 'ADMIN' ? 'badge-warning' : 'badge-neutral'}`}>{role}</span>
          </div>

          <nav className="nav-links">
            {/* Group: Tracking */}
            <div className="nav-section-label">Tracking</div>
            {links.filter(([, , href]) => ['/tracker', '/timesheet'].includes(href)).map(([icon, name, href]) => (
              <Link key={href} href={href} className={`nav-link ${pathname === href ? 'active' : ''}`}>
                <span style={{ fontSize: '0.95rem', width: 20, textAlign: 'center' }}>{icon}</span> {name}
              </Link>
            ))}

            {/* Group: Analytics */}
            {links.some(([, , href]) => ['/dashboard', '/reports'].includes(href)) && (
              <>
                <div className="nav-section-label">Analytics</div>
                {links.filter(([, , href]) => ['/dashboard', '/reports'].includes(href)).map(([icon, name, href]) => (
                  <Link key={href} href={href} className={`nav-link ${pathname === href ? 'active' : ''}`}>
                    <span style={{ fontSize: '0.95rem', width: 20, textAlign: 'center' }}>{icon}</span> {name}
                  </Link>
                ))}
              </>
            )}

            {/* Group: Workspace */}
            {links.some(([, , href]) => href.startsWith('/workspace/')) && (
              <>
                <div className="nav-section-label">Workspace</div>
                {links.filter(([, , href]) => href.startsWith('/workspace/')).map(([icon, name, href]) => (
                  <Link key={href} href={href} className={`nav-link ${pathname === href ? 'active' : ''}`}>
                    <span style={{ fontSize: '0.95rem', width: 20, textAlign: 'center' }}>{icon}</span> {name}
                  </Link>
                ))}
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
        <main className="main-content">
          <div className="page-header">
            <h1 className="page-title">{title}</h1>
          </div>
          {children}
        </main>
      </div>
    </AuthGuard>
  );
}
