export type Role = 'OWNER' | 'ADMIN' | 'MANAGER' | 'MEMBER';
export type EntryStatus = 'PENDING' | 'APPROVED' | 'INVOICED';
export type WorkspacePolicy = {
    forceTimer: boolean;
    idleMinutes: number;
    overtimeHours: number;
};
//# sourceMappingURL=index.d.ts.map