const API_BASE = process.env.NEXT_PUBLIC_CORE_API_URL || 'http://localhost:5000';
function getToken() {
    return typeof window !== 'undefined' ? localStorage.getItem('thetime_token') : null;
}
function getRefreshToken() {
    return typeof window !== 'undefined' ? localStorage.getItem('thetime_refresh_token') : null;
}
async function rawApi(path, init) {
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
async function api(path, init) {
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
                const next = (await refreshed.json());
                localStorage.setItem('thetime_token', next.token);
                res = await rawApi(path, init);
            }
        }
    }
    if (!res.ok)
        throw new Error(`API error ${res.status}`);
    return res.json();
}
// --- Auth ---
export function persistAuth(result) {
    localStorage.setItem('thetime_token', result.token);
    if (result.refreshToken)
        localStorage.setItem('thetime_refresh_token', result.refreshToken);
    localStorage.setItem('thetime_role', result.role);
    localStorage.setItem('thetime_user_id', result.userId);
    localStorage.setItem('thetime_workspace_id', result.workspaceId);
    if (result.email)
        localStorage.setItem('thetime_user_email', result.email);
    if (result.workspaces)
        localStorage.setItem('thetime_workspaces', JSON.stringify(result.workspaces));
}
export function clearAuth() {
    localStorage.removeItem('thetime_token');
    localStorage.removeItem('thetime_refresh_token');
    localStorage.removeItem('thetime_role');
    localStorage.removeItem('thetime_user_id');
    localStorage.removeItem('thetime_workspace_id');
    localStorage.removeItem('thetime_user_email');
}
export function getCurrentRole() {
    return typeof window !== 'undefined' ? (localStorage.getItem('thetime_role') || 'MEMBER') : 'MEMBER';
}
export function isLoggedIn() {
    return typeof window !== 'undefined' ? !!localStorage.getItem('thetime_token') : false;
}
export async function signup(payload) {
    return api('/v1/auth/signup', { method: 'POST', body: JSON.stringify(payload) });
}
export async function login(payload) {
    return api('/v1/auth/login', { method: 'POST', body: JSON.stringify(payload) });
}
export async function switchWorkspace(workspaceId, userId) {
    const result = await api('/v1/auth/switch', {
        method: 'POST',
        body: JSON.stringify({ workspaceId, userId })
    });
    persistAuth(result);
    return result;
}
export async function acceptInvite(payload) {
    return api('/v1/workspace/invites/accept', { method: 'POST', body: JSON.stringify(payload) });
}
// --- Timer ---
export async function startTimer(payload) {
    return api('/v1/timer/start', { method: 'POST', body: JSON.stringify(payload) });
}
export async function stopTimer() {
    return api('/v1/timer/stop', { method: 'POST' });
}
export async function resumeTimer(entryId) {
    return api('/v1/timer/resume', { method: 'POST', body: JSON.stringify({ entryId }) });
}
export async function changeTimerStart(newStartedAt) {
    return api('/v1/timer/change-start', { method: 'POST', body: JSON.stringify({ newStartedAt }) });
}
export async function getRunningTimer() {
    return api('/v1/timer/running');
}
export async function startBreak() {
    return api('/v1/break/start', { method: 'POST' });
}
export async function stopBreak() {
    return api('/v1/break/stop', { method: 'POST' });
}
export async function startPomodoro() {
    return api('/v1/pomodoro/start', { method: 'POST' });
}
export async function getTimerAlerts() {
    return api('/v1/timer/alerts');
}
// --- Time Entries ---
export async function getTimeEntries(params) {
    const q = new URLSearchParams();
    if (params?.page)
        q.set('page', String(params.page));
    if (params?.pageSize)
        q.set('pageSize', String(params.pageSize));
    if (params?.from)
        q.set('from', params.from);
    if (params?.to)
        q.set('to', params.to);
    if (params?.projectId)
        q.set('projectId', params.projectId);
    if (params?.userId)
        q.set('userId', params.userId);
    const suffix = q.toString() ? `?${q.toString()}` : '';
    return api(`/v1/time-entries${suffix}`);
}
export async function editTimeEntry(entryId, data) {
    return api(`/v1/time-entries/${entryId}`, { method: 'PATCH', body: JSON.stringify(data) });
}
export async function deleteTimeEntry(entryId) {
    return api(`/v1/time-entries/${entryId}`, { method: 'DELETE' });
}
export async function createManualEntry(data) {
    return api('/v1/time-entries/manual', { method: 'POST', body: JSON.stringify(data) });
}
// --- Approvals ---
export async function approveEntry(entryId, approved = true) {
    return api('/v1/time-entries/approve', { method: 'POST', body: JSON.stringify({ entryId, approved }) });
}
export async function approveEntriesBulk(entryIds, approved = true) {
    return api('/v1/time-entries/approve-bulk', { method: 'POST', body: JSON.stringify({ entryIds, approved }) });
}
export async function getPendingEntries(params) {
    const q = new URLSearchParams();
    if (params?.page)
        q.set('page', String(params.page));
    if (params?.pageSize)
        q.set('pageSize', String(params.pageSize));
    if (params?.userId)
        q.set('userId', params.userId);
    if (params?.from)
        q.set('from', params.from);
    if (params?.to)
        q.set('to', params.to);
    const suffix = q.toString() ? `?${q.toString()}` : '';
    return api(`/v1/time-entries/pending${suffix}`);
}
// --- Workspace ---
export async function getWorkspace() {
    return api('/v1/workspace/me');
}
export async function getWorkspaceBootstrap() {
    return api('/v1/workspace/bootstrap');
}
export async function updateWorkspace(data) {
    return api('/v1/workspace', { method: 'PATCH', body: JSON.stringify(data) });
}
export async function changeMemberRole(memberId, role) {
    return api(`/v1/workspace/members/${memberId}/role`, { method: 'PATCH', body: JSON.stringify({ role }) });
}
export async function removeMember(memberId) {
    return api(`/v1/workspace/members/${memberId}`, { method: 'DELETE' });
}
export async function stopMemberTimer(memberUserId) {
    return api('/v1/timer/stop-member', { method: 'POST', body: JSON.stringify({ memberUserId }) });
}
export async function getActiveTimers() {
    return api('/v1/workspace/active-timers');
}
// --- Invites ---
export async function getInvites() {
    return api('/v1/workspace/invites');
}
export async function createInvite(payload) {
    return api('/v1/workspace/invites', { method: 'POST', body: JSON.stringify(payload) });
}
export async function revokeInvite(inviteId) {
    return api(`/v1/workspace/invites/${inviteId}`, { method: 'DELETE' });
}
// --- Teams ---
export async function getTeams() {
    return api('/v1/teams');
}
export async function createTeam(name) {
    return api('/v1/teams', { method: 'POST', body: JSON.stringify({ name }) });
}
export async function updateTeam(teamId, name) {
    return api(`/v1/teams/${teamId}`, { method: 'PATCH', body: JSON.stringify({ name }) });
}
export async function deleteTeam(teamId) {
    return api(`/v1/teams/${teamId}`, { method: 'DELETE' });
}
export async function addTeamMember(teamId, userId) {
    return api(`/v1/teams/${teamId}/members`, { method: 'POST', body: JSON.stringify({ userId }) });
}
export async function removeTeamMember(teamId, userId) {
    return api(`/v1/teams/${teamId}/members/${userId}`, { method: 'DELETE' });
}
// --- Catalog ---
export async function getCatalog(kind) {
    return api(`/v1/${kind}`);
}
export async function createCatalog(kind, data) {
    return api(`/v1/${kind}`, { method: 'POST', body: JSON.stringify(data) });
}
export async function updateCatalog(kind, id, data) {
    return api(`/v1/${kind}/${id}`, { method: 'PATCH', body: JSON.stringify(data) });
}
export async function deleteCatalog(kind, id) {
    return api(`/v1/${kind}/${id}`, { method: 'DELETE' });
}
// --- Reports ---
export async function getReport(params) {
    const qs = new URLSearchParams();
    if (typeof params?.approved === 'boolean')
        qs.set('approved', String(params.approved));
    if (typeof params?.billable === 'boolean')
        qs.set('billable', String(params.billable));
    if (params?.userId)
        qs.set('userId', params.userId);
    if (params?.projectId)
        qs.set('projectId', params.projectId);
    if (params?.from)
        qs.set('from', params.from);
    if (params?.to)
        qs.set('to', params.to);
    if (params?.groupBy)
        qs.set('groupBy', params.groupBy);
    if (params?.page)
        qs.set('page', String(params.page));
    if (params?.pageSize)
        qs.set('pageSize', String(params.pageSize));
    const suffix = qs.toString() ? `?${qs.toString()}` : '';
    return api(`/v1/reports/time${suffix}`);
}
export function getReportExportUrl() {
    return `${API_BASE}/v1/reports/time/export`;
}
export async function getActivityReport() {
    return api('/v1/reports/activity');
}
// --- Policies ---
export async function getPolicies() {
    return api('/v1/policies');
}
export async function updatePolicies(payload) {
    return api('/v1/policies', { method: 'PATCH', body: JSON.stringify(payload) });
}
// --- Audit ---
export async function getAudit(params) {
    const q = new URLSearchParams();
    if (params?.page)
        q.set('page', String(params.page));
    if (params?.userId)
        q.set('userId', params.userId);
    if (params?.action)
        q.set('action', params.action);
    if (params?.targetType)
        q.set('targetType', params.targetType);
    const suffix = q.toString() ? `?${q.toString()}` : '';
    return api(`/v1/audit${suffix}`);
}
// --- Attendance ---
export async function clockInAttendance() {
    return api('/v1/attendance/clock-in', { method: 'POST' });
}
export async function clockOutAttendance() {
    return api('/v1/attendance/clock-out', { method: 'POST' });
}
export async function getTodayAttendance() {
    return api('/v1/attendance/today');
}
export async function reportIdle(payload) {
    return api('/v1/time/idle', {
        method: 'POST',
        body: payload ? JSON.stringify(payload) : undefined
    });
}
// --- Activity Monitoring ---
export async function getActivityTimeline(userId, date) {
    const q = new URLSearchParams();
    if (userId)
        q.set('userId', userId);
    if (date)
        q.set('date', date);
    const suffix = q.toString() ? `?${q.toString()}` : '';
    return api(`/v1/activity/timeline${suffix}`);
}
export async function getActivityMetrics(userId) {
    const q = new URLSearchParams();
    if (userId)
        q.set('userId', userId);
    const suffix = q.toString() ? `?${q.toString()}` : '';
    return api(`/v1/activity/metrics${suffix}`);
}
// --- Enterprise Organizations ---
export async function getOrganizations() {
    return api('/v1/organizations/me');
}
export async function createOrganization(name) {
    return api('/v1/organizations', {
        method: 'POST',
        body: JSON.stringify({ name })
    });
}
export async function bindWorkspaceToOrg(orgId, workspaceId) {
    return api(`/v1/organizations/${orgId}/workspaces`, {
        method: 'POST',
        body: JSON.stringify({ workspaceId })
    });
}
export async function getOrganizationCompliance(orgId) {
    return api(`/v1/organizations/${orgId}/compliance`);
}
// --- Project Team Bindings ---
export async function bindProjectToTeam(projectId, teamId) {
    return api(`/v1/projects/${projectId}/teams`, {
        method: 'POST',
        body: JSON.stringify({ teamId })
    });
}
export async function unbindProjectFromTeam(projectId, teamId) {
    return api(`/v1/projects/${projectId}/teams/${teamId}`, {
        method: 'DELETE'
    });
}
