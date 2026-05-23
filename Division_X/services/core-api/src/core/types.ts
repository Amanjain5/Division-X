export type Role = 'OWNER' | 'ADMIN' | 'MANAGER' | 'MEMBER';

export type RequestContext = {
  userId: string;
  workspaceId: string;
  role: Role;
};

export function hasRole(role: Role, allowed: Role[]): boolean {
  return allowed.includes(role);
}
