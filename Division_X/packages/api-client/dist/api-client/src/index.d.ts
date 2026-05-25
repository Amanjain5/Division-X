import type { TimerStartRequest, TimerStartResponse } from '@divisionx/contracts';
type AuthResult = {
    token: string;
    refreshToken?: string;
    userId: string;
    workspaceId: string;
    role: string;
    email?: string;
};
export declare function persistAuth(result: AuthResult & {
    workspaces?: any[];
}): void;
export declare function clearAuth(): void;
export declare function getCurrentRole(): string;
export declare function isLoggedIn(): boolean;
export declare function signup(payload: {
    email: string;
    password: string;
    workspaceName: string;
    name?: string;
}): Promise<AuthResult>;
export declare function login(payload: {
    email: string;
    password: string;
}): Promise<AuthResult & {
    workspaces?: any[];
}>;
export declare function switchWorkspace(workspaceId: string, userId: string): Promise<AuthResult>;
export declare function acceptInvite(payload: {
    token: string;
    name?: string;
    password: string;
}): Promise<{
    accepted: boolean;
    workspaceId: string;
    role: string;
}>;
export declare function startTimer(payload: TimerStartRequest): Promise<TimerStartResponse>;
export declare function stopTimer(): Promise<{
    running: boolean;
}>;
export declare function resumeTimer(entryId: string): Promise<{
    running: boolean;
    entry: any;
}>;
export declare function changeTimerStart(newStartedAt: string): Promise<{
    entry: any;
}>;
export declare function getRunningTimer(): Promise<{
    running: boolean;
    entry: any | null;
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
export declare function getTimeEntries(params?: {
    page?: number;
    pageSize?: number;
    from?: string;
    to?: string;
    projectId?: string;
    userId?: string;
}): Promise<{
    items: any[];
    pagination: {
        page: number;
        pageSize: number;
        total: number;
    };
}>;
export declare function editTimeEntry(entryId: string, data: {
    description?: string;
    startedAt?: string;
    endedAt?: string;
    billable?: boolean;
    projectId?: string;
    taskId?: string;
    tagId?: string;
}): Promise<{
    entry: any;
}>;
export declare function deleteTimeEntry(entryId: string): Promise<{
    deleted: boolean;
}>;
export declare function createManualEntry(data: {
    userId: string;
    description: string;
    startedAt: string;
    endedAt: string;
    billable?: boolean;
    projectId?: string;
    taskId?: string;
    tagId?: string;
}): Promise<{
    entry: any;
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
    items: any[];
    pagination: {
        page: number;
        pageSize: number;
        total: number;
    };
}>;
export declare function getWorkspace(): Promise<{
    workspaceId: string;
    workspaceName: string;
    timezone: string;
    role: string;
    members: Array<{
        id: string;
        email: string;
        name: string;
        role: string;
    }>;
}>;
export declare function getWorkspaceBootstrap(): Promise<{
    workspace: {
        id: string;
        name: string;
        timezone: string;
        customDomain: string | null;
    };
    role: string;
    members: Array<{
        id: string;
        email: string;
        name: string;
        role: string;
    }>;
    projects: any[];
    runningTimer: any | null;
    attendance: any | null;
    policy: any;
}>;
export declare function updateWorkspace(data: {
    name?: string;
    timezone?: string;
}): Promise<{
    workspace: any;
}>;
export declare function changeMemberRole(memberId: string, role: string): Promise<{
    member: any;
}>;
export declare function removeMember(memberId: string): Promise<{
    removed: boolean;
}>;
export declare function stopMemberTimer(memberUserId: string): Promise<{
    running: boolean;
}>;
export declare function getActiveTimers(): Promise<{
    items: any[];
}>;
export declare function getInvites(): Promise<{
    items: any[];
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
export declare function revokeInvite(inviteId: string): Promise<{
    deleted: boolean;
}>;
export declare function getTeams(): Promise<{
    items: any[];
}>;
export declare function createTeam(name: string): Promise<{
    team: any;
}>;
export declare function updateTeam(teamId: string, name: string): Promise<{
    team: any;
}>;
export declare function deleteTeam(teamId: string): Promise<{
    deleted: boolean;
}>;
export declare function addTeamMember(teamId: string, userId: string): Promise<{
    member: any;
}>;
export declare function removeTeamMember(teamId: string, userId: string): Promise<{
    removed: boolean;
}>;
export declare function getCatalog(kind: 'projects' | 'tasks' | 'tags' | 'clients'): Promise<{
    items: any[];
}>;
export declare function createCatalog(kind: 'projects' | 'tasks' | 'tags' | 'clients', data: {
    name: string;
    color?: string;
    email?: string;
    clientId?: string;
    projectId?: string;
    status?: string;
    priority?: string;
}): Promise<{
    item: any;
}>;
export declare function updateCatalog(kind: 'projects' | 'tasks' | 'tags' | 'clients', id: string, data: {
    name?: string;
    color?: string;
    email?: string;
    clientId?: string;
    archived?: boolean;
    status?: string;
    priority?: string;
}): Promise<{
    item: any;
}>;
export declare function deleteCatalog(kind: 'projects' | 'tasks' | 'tags' | 'clients', id: string): Promise<{
    deleted: boolean;
}>;
export declare function getReport(params?: {
    approved?: boolean;
    billable?: boolean;
    userId?: string;
    projectId?: string;
    from?: string;
    to?: string;
    groupBy?: string;
    page?: number;
    pageSize?: number;
}): Promise<any>;
export declare function getReportExportUrl(): string;
export declare function getActivityReport(): Promise<{
    totalActive: number;
    totalMembers: number;
    members: any[];
}>;
export declare function getPolicies(): Promise<any>;
export declare function updatePolicies(payload: any): Promise<any>;
export declare function getAudit(params?: {
    page?: number;
}): Promise<{
    items: any[];
}>;
export declare function clockInAttendance(): Promise<{
    attendance: any;
}>;
export declare function clockOutAttendance(): Promise<{
    attendance: any;
}>;
export declare function getTodayAttendance(): Promise<{
    attendance: any | null;
}>;
export declare function reportIdle(): Promise<{
    success: boolean;
}>;
export declare function getActivityTimeline(userId?: string, date?: string): Promise<{
    date: string;
    userId: string;
    timeline: Array<{
        start: string;
        end: string;
        state: 'ACTIVE' | 'BREAK' | 'IDLE' | 'OFFLINE';
        durationMinutes: number;
        metadata?: any;
    }>;
    policy: {
        autoPauseOnIdle: boolean;
        idleMinutes: number;
    };
}>;
export declare function getActivityMetrics(userId?: string): Promise<{
    userId: string;
    metrics: {
        weeklyActiveHours: number;
        weeklyIdleHours: number;
        weeklyBreakHours: number;
        efficiencyIndex: number;
        breakRatio: number;
        consecutiveActiveMinutes: number;
        breakNudge: boolean;
        breakNudgeMessage: string;
    };
}>;
export {};
//# sourceMappingURL=index.d.ts.map