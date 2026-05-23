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
export function persistAuth(result) {
    localStorage.setItem('thetime_token', result.token);
    if (result.refreshToken)
        localStorage.setItem('thetime_refresh_token', result.refreshToken);
    localStorage.setItem('thetime_role', result.role);
}
export function getCurrentRole() {
    return typeof window !== 'undefined' ? (localStorage.getItem('thetime_role') || 'MEMBER') : 'MEMBER';
}
export async function signup(payload) {
    return api('/v1/auth/signup', { method: 'POST', body: JSON.stringify(payload) });
}
export async function login(payload) {
    return api('/v1/auth/login', { method: 'POST', body: JSON.stringify(payload) });
}
export async function acceptInvite(payload) {
    return api('/v1/workspace/invites/accept', { method: 'POST', body: JSON.stringify(payload) });
}
export async function createInvite(payload) {
    return api('/v1/workspace/invites', { method: 'POST', body: JSON.stringify(payload) });
}
export async function startTimer(payload) {
    return api('/v1/timer/start', { method: 'POST', body: JSON.stringify(payload) });
}
export async function stopTimer() {
    return api('/v1/timer/stop', { method: 'POST' });
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
export async function stopMemberTimer(memberUserId) {
    return api('/v1/timer/stop-member', { method: 'POST', body: JSON.stringify({ memberUserId }) });
}
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
    const suffix = q.toString() ? `?${q.toString()}` : '';
    return api(`/v1/time-entries${suffix}`);
}
export async function getReport(params) {
    const qs = new URLSearchParams();
    if (typeof params?.approved === 'boolean')
        qs.set('approved', String(params.approved));
    if (typeof params?.billable === 'boolean')
        qs.set('billable', String(params.billable));
    if (params?.userId)
        qs.set('userId', params.userId);
    if (params?.from)
        qs.set('from', params.from);
    if (params?.to)
        qs.set('to', params.to);
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
export async function getPolicies() {
    return api('/v1/policies');
}
export async function updatePolicies(payload) {
    return api('/v1/policies', { method: 'PATCH', body: JSON.stringify(payload) });
}
export async function getWorkspace() {
    return api('/v1/workspace/me');
}
export async function getAudit() {
    return api('/v1/audit');
}
export async function getCatalog(kind) {
    return api(`/v1/${kind}`);
}
export async function createCatalog(kind, name) {
    return api(`/v1/${kind}`, { method: 'POST', body: JSON.stringify({ name }) });
}
