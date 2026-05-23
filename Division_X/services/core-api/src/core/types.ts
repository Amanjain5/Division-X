export type Role = 'OWNER' | 'ADMIN' | 'MANAGER' | 'MEMBER';

export type Permission =
  | 'time_entries:view'
  | 'time_entries:create'
  | 'time_entries:edit'
  | 'time_entries:delete'
  | 'time_entries:approve'
  | 'projects:create'
  | 'projects:update'
  | 'projects:delete'
  | 'tasks:create'
  | 'tasks:update'
  | 'tasks:delete'
  | 'tags:create'
  | 'tags:update'
  | 'tags:delete'
  | 'clients:create'
  | 'clients:update'
  | 'clients:delete'
  | 'workspace:policy:edit'
  | 'workspace:settings:edit'
  | 'workspace:members:manage'
  | 'teams:manage'
  | 'audit_logs:view';

const ROLE_PERMISSIONS: Record<Role, Permission[]> = {
  OWNER: [
    'time_entries:view', 'time_entries:create', 'time_entries:edit', 'time_entries:delete', 'time_entries:approve',
    'projects:create', 'projects:update', 'projects:delete',
    'tasks:create', 'tasks:update', 'tasks:delete',
    'tags:create', 'tags:update', 'tags:delete',
    'clients:create', 'clients:update', 'clients:delete',
    'workspace:policy:edit', 'workspace:settings:edit', 'workspace:members:manage', 'teams:manage', 'audit_logs:view'
  ],
  ADMIN: [
    'time_entries:view', 'time_entries:create', 'time_entries:edit', 'time_entries:delete', 'time_entries:approve',
    'projects:create', 'projects:update', 'projects:delete',
    'tasks:create', 'tasks:update', 'tasks:delete',
    'tags:create', 'tags:update', 'tags:delete',
    'clients:create', 'clients:update', 'clients:delete',
    'workspace:policy:edit', 'workspace:settings:edit', 'workspace:members:manage', 'teams:manage', 'audit_logs:view'
  ],
  MANAGER: [
    'time_entries:view', 'time_entries:create', 'time_entries:edit', 'time_entries:delete', 'time_entries:approve',
    'projects:create', 'projects:update', 'projects:delete',
    'tasks:create', 'tasks:update', 'tasks:delete',
    'tags:create', 'tags:update', 'tags:delete',
    'clients:create', 'clients:update', 'clients:delete',
    'teams:manage', 'audit_logs:view'
  ],
  MEMBER: [
    'time_entries:view', 'time_entries:create',
    'tasks:create', 'tasks:update'
  ]
};

export type RequestContext = {
  userId: string;
  workspaceId: string;
  role: Role;
};

export function hasRole(role: Role, allowed: Role[]): boolean {
  return allowed.includes(role);
}

export function hasPermission(role: Role, permission: Permission): boolean {
  return ROLE_PERMISSIONS[role]?.includes(permission) || false;
}
