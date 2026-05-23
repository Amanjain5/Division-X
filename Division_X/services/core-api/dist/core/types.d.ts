export type Role = 'OWNER' | 'ADMIN' | 'MANAGER' | 'MEMBER';
export type RequestContext = {
    userId: string;
    workspaceId: string;
    role: Role;
};
export declare function hasRole(role: Role, allowed: Role[]): boolean;
//# sourceMappingURL=types.d.ts.map