import type { TimerStartRequest, TimerStartResponse } from '@divisionx/contracts';
type AuthResult = {
    token: string;
    refreshToken?: string;
    userId: string;
    workspaceId: string;
    role: string;
};
export declare function persistAuth(result: AuthResult): void;
export declare function getCurrentRole(): string;
export declare function signup(payload: {
    email: string;
    password: string;
    workspaceName: string;
    name?: string;
}): Promise<AuthResult>;
export declare function login(payload: {
    email: string;
    password: string;
}): Promise<AuthResult>;
export declare function acceptInvite(payload: {
    token: string;
    name?: string;
    password: string;
}): Promise<{
    accepted: boolean;
    workspaceId: string;
    role: string;
}>;
export declare function createInvite(payload: {
    email: string;
    role: 'OWNER' | 'ADMIN' | 'MANAGER' | 'MEMBER';
}): Promise<{
    inviteId: string;
    token: string;
    email: string;
    role: string;
}>;
export declare function startTimer(payload: TimerStartRequest): Promise<TimerStartResponse>;
export declare function stopTimer(): Promise<{
    running: boolean;
}>;
export declare function startBreak(): Promise<{
    break: {
        id: string;
    };
}>;
export declare function stopBreak(): Promise<{
    break: {
        id: string;
    };
}>;
export declare function startPomodoro(): Promise<{
    started: boolean;
    focusMinutes: number;
    breakMinutes: number;
    startedAt: string;
}>;
export declare function getTimerAlerts(): Promise<{
    longRunning: boolean;
    runningMinutes: number;
    overtimeThreshold: number;
}>;
export declare function stopMemberTimer(memberUserId: string): Promise<{
    running: boolean;
}>;
export declare function approveEntry(entryId: string, approved?: boolean): Promise<{
    entry: {
        id: string;
        approved: boolean;
    };
}>;
export declare function approveEntriesBulk(entryIds: string[], approved?: boolean): Promise<{
    updated: number;
}>;
export declare function getPendingEntries(params?: {
    page?: number;
    pageSize?: number;
    userId?: string;
    from?: string;
    to?: string;
}): Promise<{
    items: Array<{
        id: string;
        description: string;
        startedAt: string;
        endedAt: string | null;
        userId: string;
        billable: boolean;
        approved: boolean;
    }>;
    pagination: {
        page: number;
        pageSize: number;
        total: number;
    };
}>;
export declare function getTimeEntries(params?: {
    page?: number;
    pageSize?: number;
    from?: string;
    to?: string;
}): Promise<{
    items: Array<{
        id: string;
        description: string;
        startedAt: string;
        endedAt: string | null;
        billable: boolean;
        approved?: boolean;
    }>;
    pagination?: {
        page: number;
        pageSize: number;
        total: number;
    };
}>;
export declare function getReport(params?: {
    approved?: boolean;
    billable?: boolean;
    userId?: string;
    from?: string;
    to?: string;
    page?: number;
    pageSize?: number;
}): Promise<{
    totalHours: number;
    itemsCount: number;
    pagination: {
        page: number;
        pageSize: number;
        total: number;
    };
    items: Array<{
        id: string;
        description: string;
        userId: string;
        billable: boolean;
        approved: boolean;
        startedAt: string;
        endedAt: string | null;
        durationHours: number;
    }>;
}>;
export declare function getReportExportUrl(): string;
export declare function getPolicies(): Promise<{
    forceTimer: boolean;
    idleMinutes: number;
    overtimeHours: number;
}>;
export declare function updatePolicies(payload: {
    forceTimer?: boolean;
    idleMinutes?: number;
    overtimeHours?: number;
}): Promise<{
    forceTimer: boolean;
    idleMinutes: number;
    overtimeHours: number;
}>;
export declare function getWorkspace(): Promise<{
    workspaceId: string;
    role: string;
    members: Array<{
        id: string;
        email: string;
        role: string;
    }>;
}>;
export declare function getAudit(): Promise<{
    items: Array<{
        id: string;
        action: string;
        targetType: string;
        createdAt: string;
    }>;
}>;
export declare function getCatalog(kind: 'projects' | 'tasks' | 'tags' | 'clients'): Promise<{
    items: Array<{
        id: string;
        name: string;
    }>;
}>;
export declare function createCatalog(kind: 'projects' | 'tasks' | 'tags' | 'clients', name: string): Promise<{
    item: {
        id: string;
        name: string;
    };
}>;
export {};
//# sourceMappingURL=index.d.ts.map