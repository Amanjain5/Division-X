import type { Role } from '@divisionx/types';

export const ROLE_PRIORITY: Record<Role, number> = {
  OWNER: 4,
  ADMIN: 3,
  MANAGER: 2,
  MEMBER: 1
};

export function canManageTime(role: Role): boolean {
  return role === 'OWNER' || role === 'ADMIN' || role === 'MANAGER';
}

export function canManageWorkspace(role: Role): boolean {
  return role === 'OWNER' || role === 'ADMIN';
}
