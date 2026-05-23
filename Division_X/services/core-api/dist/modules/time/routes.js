import { prisma } from '../../core/prisma.js';
import { json, readJson } from '../../core/http.js';
import { hasRole } from '../../core/types.js';
import { writeAudit } from '../../core/audit.js';
async function getPolicy(workspaceId) {
    return prisma.workspacePolicy.findFirst({ where: { workspaceId } });
}
export async function timeRoutes(req, ctx) {
    const url = new URL(req.url);
    if (req.method === 'POST' && url.pathname === '/v1/timer/start') {
        const body = (await readJson(req));
        const startedAt = new Date();
        const entry = await prisma.timeEntry.create({ data: { workspaceId: ctx.workspaceId, userId: ctx.userId, projectId: body.projectId, description: body.description || 'Untitled work', startedAt, billable: Boolean(body.billable) } });
        await writeAudit({ workspaceId: ctx.workspaceId, actorUserId: ctx.userId, action: 'timer.start', targetType: 'time_entry', targetId: entry.id });
        return json({ running: true, entry });
    }
    if (req.method === 'POST' && url.pathname === '/v1/timer/stop') {
        const last = await prisma.timeEntry.findFirst({ where: { workspaceId: ctx.workspaceId, userId: ctx.userId, endedAt: null }, orderBy: { startedAt: 'desc' } });
        if (!last)
            return json({ running: false, message: 'no_running_entry' });
        const entry = await prisma.timeEntry.update({ where: { id: last.id }, data: { endedAt: new Date() } });
        await writeAudit({ workspaceId: ctx.workspaceId, actorUserId: ctx.userId, action: 'timer.stop', targetType: 'time_entry', targetId: entry.id });
        return json({ running: false, entry });
    }
    if (req.method === 'POST' && url.pathname === '/v1/timer/stop-member') {
        if (!hasRole(ctx.role, ['OWNER', 'ADMIN', 'MANAGER']))
            return json({ error: 'forbidden' }, 403);
        const body = (await readJson(req));
        if (!body.memberUserId)
            return json({ error: 'invalid_payload' }, 400);
        const last = await prisma.timeEntry.findFirst({ where: { workspaceId: ctx.workspaceId, userId: body.memberUserId, endedAt: null }, orderBy: { startedAt: 'desc' } });
        if (!last)
            return json({ running: false, message: 'no_running_entry' });
        const entry = await prisma.timeEntry.update({ where: { id: last.id }, data: { endedAt: new Date() } });
        await writeAudit({ workspaceId: ctx.workspaceId, actorUserId: ctx.userId, action: 'timer.stop_member', targetType: 'time_entry', targetId: entry.id, metadata: { memberUserId: body.memberUserId } });
        return json({ running: false, entry });
    }
    if (req.method === 'POST' && url.pathname === '/v1/time-entries/manual') {
        if (!hasRole(ctx.role, ['OWNER', 'ADMIN', 'MANAGER']))
            return json({ error: 'forbidden' }, 403);
        const policy = await getPolicy(ctx.workspaceId);
        if (policy?.forceTimer)
            return json({ error: 'force_timer_enabled' }, 403);
        const body = (await readJson(req));
        if (!body.userId || !body.startedAt || !body.endedAt)
            return json({ error: 'invalid_payload' }, 400);
        const entry = await prisma.timeEntry.create({ data: { workspaceId: ctx.workspaceId, userId: body.userId, description: body.description || 'Manual entry', startedAt: new Date(body.startedAt), endedAt: new Date(body.endedAt), billable: Boolean(body.billable) } });
        await writeAudit({ workspaceId: ctx.workspaceId, actorUserId: ctx.userId, action: 'time_entry.manual_create', targetType: 'time_entry', targetId: entry.id });
        return json({ entry }, 201);
    }
    if (req.method === 'POST' && url.pathname === '/v1/time-entries/approve') {
        if (!hasRole(ctx.role, ['OWNER', 'ADMIN', 'MANAGER']))
            return json({ error: 'forbidden' }, 403);
        const body = (await readJson(req));
        if (!body.entryId)
            return json({ error: 'invalid_payload' }, 400);
        const entry = await prisma.timeEntry.update({ where: { id: body.entryId }, data: { approved: body.approved ?? true } });
        await writeAudit({ workspaceId: ctx.workspaceId, actorUserId: ctx.userId, action: 'time_entry.approve', targetType: 'time_entry', targetId: entry.id, metadata: { approved: body.approved ?? true } });
        return json({ entry });
    }
    if (req.method === 'POST' && url.pathname === '/v1/time-entries/approve-bulk') {
        if (!hasRole(ctx.role, ['OWNER', 'ADMIN', 'MANAGER']))
            return json({ error: 'forbidden' }, 403);
        const body = (await readJson(req));
        if (!body.entryIds?.length)
            return json({ error: 'invalid_payload' }, 400);
        const result = await prisma.timeEntry.updateMany({ where: { workspaceId: ctx.workspaceId, id: { in: body.entryIds } }, data: { approved: body.approved ?? true } });
        await writeAudit({ workspaceId: ctx.workspaceId, actorUserId: ctx.userId, action: 'time_entry.approve_bulk', targetType: 'time_entry', metadata: { entryIds: body.entryIds, approved: body.approved ?? true, count: result.count } });
        return json({ updated: result.count });
    }
    if (req.method === 'GET' && url.pathname === '/v1/time-entries/pending') {
        if (!hasRole(ctx.role, ['OWNER', 'ADMIN', 'MANAGER']))
            return json({ error: 'forbidden' }, 403);
        const page = Number(url.searchParams.get('page') || '1');
        const pageSize = Number(url.searchParams.get('pageSize') || '20');
        const userId = url.searchParams.get('userId');
        const from = url.searchParams.get('from');
        const to = url.searchParams.get('to');
        const skip = (page - 1) * pageSize;
        const where = {
            workspaceId: ctx.workspaceId,
            approved: false,
            ...(userId ? { userId } : {}),
            ...(from || to ? { startedAt: { ...(from ? { gte: new Date(from) } : {}), ...(to ? { lte: new Date(to) } : {}) } } : {})
        };
        const [items, total] = await Promise.all([
            prisma.timeEntry.findMany({ where, orderBy: { startedAt: 'desc' }, skip, take: pageSize }),
            prisma.timeEntry.count({ where })
        ]);
        return json({ items, pagination: { page, pageSize, total } });
    }
    if (req.method === 'GET' && url.pathname === '/v1/time-entries') {
        const page = Number(url.searchParams.get('page') || '1');
        const pageSize = Number(url.searchParams.get('pageSize') || '20');
        const from = url.searchParams.get('from');
        const to = url.searchParams.get('to');
        const skip = (page - 1) * pageSize;
        const where = {
            workspaceId: ctx.workspaceId,
            userId: ctx.userId,
            ...(from || to ? { startedAt: { ...(from ? { gte: new Date(from) } : {}), ...(to ? { lte: new Date(to) } : {}) } } : {})
        };
        const [items, total] = await Promise.all([
            prisma.timeEntry.findMany({ where, orderBy: { startedAt: 'desc' }, skip, take: pageSize }),
            prisma.timeEntry.count({ where })
        ]);
        return json({ items, pagination: { page, pageSize, total } });
    }
    return null;
}
