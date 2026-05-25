import type { TimerStartRequest, TimerStartResponse } from '@divisionx/contracts';

const API_BASE = process.env.NEXT_PUBLIC_CORE_API_URL || 'http://localhost:5000';

type AuthResult = { token: string; refreshToken?: string; userId: string; workspaceId: string; role: string; email?: string };

function getToken() {
  return typeof window !== 'undefined' ? localStorage.getItem('thetime_token') : null;
}

function getRefreshToken() {
  return typeof window !== 'undefined' ? localStorage.getItem('thetime_refresh_token') : null;
}

async function rawApi(path: string, init?: RequestInit): Promise<Response> {
  const token = getToken();
  return fetch(`${API_BASE}${path}`, {
    ...init,
    headers: {
      'content-type': 'application/json',
      ...(token ? { authorization: `Bearer ${token}` } : {}),
      ...(init?.headers || {})
    }
  });
}

async function api<T>(path: string, init?: RequestInit): Promise<T> {
  let res = await rawApi(path, init);
  if (res.status === 401) {
    const refresh = getRefreshToken();
    if (refresh) {
      const refreshed = await fetch(`${API_BASE}/v1/auth/refresh`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ refreshToken: refresh })
      });
      if (refreshed.ok) {
        const next = (await refreshed.json()) as { token: string };
        localStorage.setItem('thetime_token', next.token);
        res = await rawApi(path, init);
      }
    }
  }
  if (!res.ok) throw new Error(`API error ${res.status}`);
  return res.json();
}

// --- Auth ---
export function persistAuth(result: AuthResult & { workspaces?: any[] }) {
  localStorage.setItem('thetime_token', result.token);
  if (result.refreshToken) localStorage.setItem('thetime_refresh_token', result.refreshToken);
  localStorage.setItem('thetime_role', result.role);
  localStorage.setItem('thetime_user_id', result.userId);
  localStorage.setItem('thetime_workspace_id', result.workspaceId);
  if (result.email) localStorage.setItem('thetime_user_email', result.email);
  if (result.workspaces) localStorage.setItem('thetime_workspaces', JSON.stringify(result.workspaces));
}

export function clearAuth() {
  localStorage.removeItem('thetime_token');
  localStorage.removeItem('thetime_refresh_token');
  localStorage.removeItem('thetime_role');
  localStorage.removeItem('thetime_user_id');
  localStorage.removeItem('thetime_workspace_id');
  localStorage.removeItem('thetime_user_email');
}

export function getCurrentRole(): string {
  return typeof window !== 'undefined' ? (localStorage.getItem('thetime_role') || 'MEMBER') : 'MEMBER';
}

export function isLoggedIn(): boolean {
  return typeof window !== 'undefined' ? !!localStorage.getItem('thetime_token') : false;
}

export async function signup(payload: { email: string; password: string; workspaceName: string; name?: string }): Promise<AuthResult> {
  return api('/v1/auth/signup', { method: 'POST', body: JSON.stringify(payload) });
}

export async function login(payload: { email: string; password: string }): Promise<AuthResult & { workspaces?: any[] }> {
  return api('/v1/auth/login', { method: 'POST', body: JSON.stringify(payload) });
}

export async function switchWorkspace(workspaceId: string, userId: string): Promise<AuthResult> {
  const result = await api<AuthResult>('/v1/auth/switch', {
    method: 'POST',
    body: JSON.stringify({ workspaceId, userId })
  });
  persistAuth(result);
  return result;
}

export async function acceptInvite(payload: { token: string; name?: string; password: string }): Promise<{ accepted: boolean; workspaceId: string; role: string }> {
  return api('/v1/workspace/invites/accept', { method: 'POST', body: JSON.stringify(payload) });
}

// --- Timer ---
export async function startTimer(payload: TimerStartRequest): Promise<TimerStartResponse> {
  return api('/v1/timer/start', { method: 'POST', body: JSON.stringify(payload) });
}

export async function stopTimer(): Promise<{ running: boolean }> {
  return api('/v1/timer/stop', { method: 'POST' });
}

export async function resumeTimer(entryId: string): Promise<{ running: boolean; entry: any }> {
  return api('/v1/timer/resume', { method: 'POST', body: JSON.stringify({ entryId }) });
}

export async function changeTimerStart(newStartedAt: string): Promise<{ entry: any }> {
  return api('/v1/timer/change-start', { method: 'POST', body: JSON.stringify({ newStartedAt }) });
}

export async function getRunningTimer(): Promise<{ running: boolean; entry: any | null }> {
  return api('/v1/timer/running');
}

export async function startBreak(): Promise<{ break: { id: string } }> {
  return api('/v1/break/start', { method: 'POST' });
}

export async function stopBreak(): Promise<{ break: { id: string } }> {
  return api('/v1/break/stop', { method: 'POST' });
}

export async function startPomodoro(): Promise<{ started: boolean; focusMinutes: number; breakMinutes: number; startedAt: string }> {
  return api('/v1/pomodoro/start', { method: 'POST' });
}

export async function getTimerAlerts(): Promise<{ longRunning: boolean; runningMinutes: number; overtimeThreshold: number }> {
  return api('/v1/timer/alerts');
}

// --- Time Entries ---
export async function getTimeEntries(params?: { page?: number; pageSize?: number; from?: string; to?: string; projectId?: string; userId?: string }): Promise<{ items: any[]; pagination: { page: number; pageSize: number; total: number } }> {
  const q = new URLSearchParams();
  if (params?.page) q.set('page', String(params.page));
  if (params?.pageSize) q.set('pageSize', String(params.pageSize));
  if (params?.from) q.set('from', params.from);
  if (params?.to) q.set('to', params.to);
  if (params?.projectId) q.set('projectId', params.projectId);
  if (params?.userId) q.set('userId', params.userId);
  const suffix = q.toString() ? `?${q.toString()}` : '';
  return api(`/v1/time-entries${suffix}`);
}

export async function editTimeEntry(entryId: string, data: { description?: string; startedAt?: string; endedAt?: string; billable?: boolean; projectId?: string; taskId?: string; tagId?: string }): Promise<{ entry: any }> {
  return api(`/v1/time-entries/${entryId}`, { method: 'PATCH', body: JSON.stringify(data) });
}

export async function deleteTimeEntry(entryId: string): Promise<{ deleted: boolean }> {
  return api(`/v1/time-entries/${entryId}`, { method: 'DELETE' });
}

export async function createManualEntry(data: { userId: string; description: string; startedAt: string; endedAt: string; billable?: boolean; projectId?: string; taskId?: string; tagId?: string }): Promise<{ entry: any }> {
  return api('/v1/time-entries/manual', { method: 'POST', body: JSON.stringify(data) });
}

// --- Approvals ---
export async function approveEntry(entryId: string, approved = true): Promise<{ entry: { id: string; approved: boolean } }> {
  return api('/v1/time-entries/approve', { method: 'POST', body: JSON.stringify({ entryId, approved }) });
}

export async function approveEntriesBulk(entryIds: string[], approved = true): Promise<{ updated: number }> {
  return api('/v1/time-entries/approve-bulk', { method: 'POST', body: JSON.stringify({ entryIds, approved }) });
}

export async function getPendingEntries(params?: { page?: number; pageSize?: number; userId?: string; from?: string; to?: string }): Promise<{ items: any[]; pagination: { page: number; pageSize: number; total: number } }> {
  const q = new URLSearchParams();
  if (params?.page) q.set('page', String(params.page));
  if (params?.pageSize) q.set('pageSize', String(params.pageSize));
  if (params?.userId) q.set('userId', params.userId);
  if (params?.from) q.set('from', params.from);
  if (params?.to) q.set('to', params.to);
  const suffix = q.toString() ? `?${q.toString()}` : '';
  return api(`/v1/time-entries/pending${suffix}`);
}

// --- Workspace ---
export async function getWorkspace(): Promise<{ workspaceId: string; workspaceName: string; timezone: string; role: string; members: Array<{ id: string; email: string; name: string; role: string }> }> {
  return api('/v1/workspace/me');
}

export async function getWorkspaceBootstrap(): Promise<{
  workspace: { id: string; name: string; timezone: string; customDomain: string | null };
  role: string;
  members: Array<{ id: string; email: string; name: string; role: string }>;
  projects: any[];
  runningTimer: any | null;
  attendance: any | null;
  policy: any;
}> {
  return api('/v1/workspace/bootstrap');
}

export async function updateWorkspace(data: { name?: string; timezone?: string }): Promise<{ workspace: any }> {
  return api('/v1/workspace', { method: 'PATCH', body: JSON.stringify(data) });
}

export async function changeMemberRole(memberId: string, role: string): Promise<{ member: any }> {
  return api(`/v1/workspace/members/${memberId}/role`, { method: 'PATCH', body: JSON.stringify({ role }) });
}

export async function removeMember(memberId: string): Promise<{ removed: boolean }> {
  return api(`/v1/workspace/members/${memberId}`, { method: 'DELETE' });
}

export async function stopMemberTimer(memberUserId: string): Promise<{ running: boolean }> {
  return api('/v1/timer/stop-member', { method: 'POST', body: JSON.stringify({ memberUserId }) });
}

export async function getActiveTimers(): Promise<{ items: any[] }> {
  return api('/v1/workspace/active-timers');
}

// --- Invites ---
export async function getInvites(): Promise<{ items: any[] }> {
  return api('/v1/workspace/invites');
}

export async function createInvite(payload: { email: string; role: 'OWNER' | 'ADMIN' | 'MANAGER' | 'MEMBER' }): Promise<{ inviteId: string; token: string; email: string; role: string }> {
  return api('/v1/workspace/invites', { method: 'POST', body: JSON.stringify(payload) });
}

export async function revokeInvite(inviteId: string): Promise<{ deleted: boolean }> {
  return api(`/v1/workspace/invites/${inviteId}`, { method: 'DELETE' });
}

// --- Teams ---
export async function getTeams(): Promise<{ items: any[] }> {
  return api('/v1/teams');
}

export async function createTeam(name: string): Promise<{ team: any }> {
  return api('/v1/teams', { method: 'POST', body: JSON.stringify({ name }) });
}

export async function updateTeam(teamId: string, name: string): Promise<{ team: any }> {
  return api(`/v1/teams/${teamId}`, { method: 'PATCH', body: JSON.stringify({ name }) });
}

export async function deleteTeam(teamId: string): Promise<{ deleted: boolean }> {
  return api(`/v1/teams/${teamId}`, { method: 'DELETE' });
}

export async function addTeamMember(teamId: string, userId: string): Promise<{ member: any }> {
  return api(`/v1/teams/${teamId}/members`, { method: 'POST', body: JSON.stringify({ userId }) });
}

export async function removeTeamMember(teamId: string, userId: string): Promise<{ removed: boolean }> {
  return api(`/v1/teams/${teamId}/members/${userId}`, { method: 'DELETE' });
}

// --- Catalog ---
export async function getCatalog(kind: 'projects' | 'tasks' | 'tags' | 'clients'): Promise<{ items: any[] }> {
  return api(`/v1/${kind}`);
}

export async function createCatalog(kind: 'projects' | 'tasks' | 'tags' | 'clients', data: { name: string; color?: string; email?: string; clientId?: string; projectId?: string; status?: string; priority?: string }): Promise<{ item: any }> {
  return api(`/v1/${kind}`, { method: 'POST', body: JSON.stringify(data) });
}

export async function updateCatalog(kind: 'projects' | 'tasks' | 'tags' | 'clients', id: string, data: { name?: string; color?: string; email?: string; clientId?: string; archived?: boolean; status?: string; priority?: string }): Promise<{ item: any }> {
  return api(`/v1/${kind}/${id}`, { method: 'PATCH', body: JSON.stringify(data) });
}

export async function deleteCatalog(kind: 'projects' | 'tasks' | 'tags' | 'clients', id: string): Promise<{ deleted: boolean }> {
  return api(`/v1/${kind}/${id}`, { method: 'DELETE' });
}

// --- Reports ---
export async function getReport(params?: { approved?: boolean; billable?: boolean; userId?: string; projectId?: string; from?: string; to?: string; groupBy?: string; page?: number; pageSize?: number }): Promise<any> {
  const qs = new URLSearchParams();
  if (typeof params?.approved === 'boolean') qs.set('approved', String(params.approved));
  if (typeof params?.billable === 'boolean') qs.set('billable', String(params.billable));
  if (params?.userId) qs.set('userId', params.userId);
  if (params?.projectId) qs.set('projectId', params.projectId);
  if (params?.from) qs.set('from', params.from);
  if (params?.to) qs.set('to', params.to);
  if (params?.groupBy) qs.set('groupBy', params.groupBy);
  if (params?.page) qs.set('page', String(params.page));
  if (params?.pageSize) qs.set('pageSize', String(params.pageSize));
  const suffix = qs.toString() ? `?${qs.toString()}` : '';
  return api(`/v1/reports/time${suffix}`);
}

export function getReportExportUrl(): string {
  return `${API_BASE}/v1/reports/time/export`;
}

export async function getActivityReport(): Promise<{ totalActive: number; totalMembers: number; members: any[] }> {
  return api('/v1/reports/activity');
}

// --- Policies ---
export async function getPolicies(): Promise<any> {
  return api('/v1/policies');
}

export async function updatePolicies(payload: any): Promise<any> {
  return api('/v1/policies', { method: 'PATCH', body: JSON.stringify(payload) });
}

// --- Audit ---
export async function getAudit(params?: { page?: number }): Promise<{ items: any[] }> {
  const q = new URLSearchParams();
  if (params?.page) q.set('page', String(params.page));
  const suffix = q.toString() ? `?${q.toString()}` : '';
  return api(`/v1/audit${suffix}`);
}

// --- Attendance ---
export async function clockInAttendance(): Promise<{ attendance: any }> {
  return api('/v1/attendance/clock-in', { method: 'POST' });
}

export async function clockOutAttendance(): Promise<{ attendance: any }> {
  return api('/v1/attendance/clock-out', { method: 'POST' });
}

export async function getTodayAttendance(): Promise<{ attendance: any | null }> {
  return api('/v1/attendance/today');
}

export async function reportIdle(): Promise<{ success: boolean }> {
  return api('/v1/time/idle', { method: 'POST' });
}

// --- Activity Monitoring ---
export async function getActivityTimeline(userId?: string, date?: string): Promise<{
  date: string;
  userId: string;
  timeline: Array<{ start: string; end: string; state: 'ACTIVE' | 'BREAK' | 'IDLE' | 'OFFLINE'; durationMinutes: number; metadata?: any }>;
  policy: { autoPauseOnIdle: boolean; idleMinutes: number };
}> {
  const q = new URLSearchParams();
  if (userId) q.set('userId', userId);
  if (date) q.set('date', date);
  const suffix = q.toString() ? `?${q.toString()}` : '';
  return api(`/v1/activity/timeline${suffix}`);
}

export async function getActivityMetrics(userId?: string): Promise<{
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
}> {
  const q = new URLSearchParams();
  if (userId) q.set('userId', userId);
  const suffix = q.toString() ? `?${q.toString()}` : '';
  return api(`/v1/activity/metrics${suffix}`);
}
