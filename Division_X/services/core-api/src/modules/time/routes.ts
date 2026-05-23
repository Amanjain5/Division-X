import { prisma } from '../../core/prisma.js';
import { json, readJson } from '../../core/http.js';
import type { RequestContext } from '../../core/types.js';
import { hasRole } from '../../core/types.js';
import { writeAudit } from '../../core/audit.js';
import { sendGlobalNotification } from '../../core/notifications.js';

async function getPolicy(workspaceId: string) {
  return prisma.workspacePolicy.findFirst({ where: { workspaceId } });
}

export async function timeRoutes(req: Request, ctx: RequestContext): Promise<Response | null> {
  const url = new URL(req.url);

  // --- Timer lifecycle ---

  if (req.method === 'POST' && url.pathname === '/v1/timer/start') {
    const body = (await readJson(req)) as { description?: string; projectId?: string; taskId?: string; tagId?: string; billable?: boolean };
    // Stop any existing running entry first
    const existing = await prisma.timeEntry.findFirst({ where: { workspaceId: ctx.workspaceId, userId: ctx.userId, endedAt: null }, orderBy: { startedAt: 'desc' } });
    if (existing) {
      await prisma.timeEntry.update({ where: { id: existing.id }, data: { endedAt: new Date() } });
      await prisma.runningTimer.deleteMany({ where: { userId: ctx.userId } });
    }
    const startedAt = new Date();
    const entry = await prisma.timeEntry.create({ data: { workspaceId: ctx.workspaceId, userId: ctx.userId, projectId: body.projectId || null, taskId: body.taskId || null, tagId: body.tagId || null, description: body.description || 'Untitled work', startedAt, billable: Boolean(body.billable) } });
    await prisma.runningTimer.create({ data: { workspaceId: ctx.workspaceId, userId: ctx.userId, entryId: entry.id, startedAt } }).catch(() => {/* ignore duplicate */});
    await writeAudit({ workspaceId: ctx.workspaceId, actorUserId: ctx.userId, action: 'timer.start', targetType: 'time_entry', targetId: entry.id });
    await sendGlobalNotification(ctx.workspaceId, ctx.userId, 'Timer Started', `Started tracking task: "${entry.description}"`);
    return json({ running: true, entry });
  }

  if (req.method === 'POST' && url.pathname === '/v1/timer/stop') {
    const last = await prisma.timeEntry.findFirst({ where: { workspaceId: ctx.workspaceId, userId: ctx.userId, endedAt: null }, orderBy: { startedAt: 'desc' } });
    if (!last) return json({ running: false, message: 'no_running_entry' });
    const entry = await prisma.timeEntry.update({ where: { id: last.id }, data: { endedAt: new Date() } });
    await prisma.runningTimer.deleteMany({ where: { userId: ctx.userId } });
    await writeAudit({ workspaceId: ctx.workspaceId, actorUserId: ctx.userId, action: 'timer.stop', targetType: 'time_entry', targetId: entry.id });
    await sendGlobalNotification(ctx.workspaceId, ctx.userId, 'Timer Stopped', `Stopped active task: "${entry.description}"`);
    return json({ running: false, entry });
  }

  if (req.method === 'POST' && url.pathname === '/v1/timer/resume') {
    const body = (await readJson(req)) as { entryId?: string };
    if (!body.entryId) return json({ error: 'invalid_payload' }, 400);
    const original = await prisma.timeEntry.findFirst({ where: { id: body.entryId, workspaceId: ctx.workspaceId } });
    if (!original) return json({ error: 'not_found' }, 404);
    // Stop current timer if any
    const running = await prisma.timeEntry.findFirst({ where: { workspaceId: ctx.workspaceId, userId: ctx.userId, endedAt: null } });
    if (running) {
      await prisma.timeEntry.update({ where: { id: running.id }, data: { endedAt: new Date() } });
      await prisma.runningTimer.deleteMany({ where: { userId: ctx.userId } });
    }
    // Create new entry from the original
    const startedAt = new Date();
    const entry = await prisma.timeEntry.create({ data: { workspaceId: ctx.workspaceId, userId: ctx.userId, projectId: original.projectId, taskId: original.taskId, tagId: original.tagId, description: original.description, startedAt, billable: original.billable } });
    await prisma.runningTimer.create({ data: { workspaceId: ctx.workspaceId, userId: ctx.userId, entryId: entry.id, startedAt } }).catch(() => {});
    await writeAudit({ workspaceId: ctx.workspaceId, actorUserId: ctx.userId, action: 'timer.resume', targetType: 'time_entry', targetId: entry.id, metadata: { resumedFrom: body.entryId } });
    await sendGlobalNotification(ctx.workspaceId, ctx.userId, 'Timer Started', `Started tracking task: "${entry.description}"`);
    return json({ running: true, entry });
  }

  if (req.method === 'POST' && url.pathname === '/v1/timer/change-start') {
    const body = (await readJson(req)) as { newStartedAt?: string };
    if (!body.newStartedAt) return json({ error: 'invalid_payload' }, 400);
    const running = await prisma.timeEntry.findFirst({ where: { workspaceId: ctx.workspaceId, userId: ctx.userId, endedAt: null }, orderBy: { startedAt: 'desc' } });
    if (!running) return json({ error: 'no_running_entry' }, 400);
    const entry = await prisma.timeEntry.update({ where: { id: running.id }, data: { startedAt: new Date(body.newStartedAt) } });
    await writeAudit({ workspaceId: ctx.workspaceId, actorUserId: ctx.userId, action: 'timer.change_start', targetType: 'time_entry', targetId: entry.id });
    return json({ entry });
  }

  if (req.method === 'GET' && url.pathname === '/v1/timer/running') {
    const running = await prisma.timeEntry.findFirst({ where: { workspaceId: ctx.workspaceId, userId: ctx.userId, endedAt: null }, orderBy: { startedAt: 'desc' } });
    return json({ running: !!running, entry: running || null });
  }

  // --- Manager stop member timer ---
  if (req.method === 'POST' && url.pathname === '/v1/timer/stop-member') {
    if (!hasRole(ctx.role, ['OWNER', 'ADMIN', 'MANAGER'])) return json({ error: 'forbidden' }, 403);
    const body = (await readJson(req)) as { memberUserId?: string };
    if (!body.memberUserId) return json({ error: 'invalid_payload' }, 400);
    const last = await prisma.timeEntry.findFirst({ where: { workspaceId: ctx.workspaceId, userId: body.memberUserId, endedAt: null }, orderBy: { startedAt: 'desc' } });
    if (!last) return json({ running: false, message: 'no_running_entry' });
    const entry = await prisma.timeEntry.update({ where: { id: last.id }, data: { endedAt: new Date() } });
    await prisma.runningTimer.deleteMany({ where: { userId: body.memberUserId } });
    await writeAudit({ workspaceId: ctx.workspaceId, actorUserId: ctx.userId, action: 'timer.stop_member', targetType: 'time_entry', targetId: entry.id, metadata: { memberUserId: body.memberUserId } });
    return json({ running: false, entry });
  }

  // --- Manual entry (Admin/Manager only, blocked by force-timer policy) ---
  if (req.method === 'POST' && url.pathname === '/v1/time-entries/manual') {
    if (!hasRole(ctx.role, ['OWNER', 'ADMIN', 'MANAGER'])) return json({ error: 'forbidden' }, 403);
    const policy = await getPolicy(ctx.workspaceId);
    if (policy?.forceTimer) return json({ error: 'force_timer_enabled' }, 403);
    const body = (await readJson(req)) as { userId?: string; description?: string; startedAt?: string; endedAt?: string; billable?: boolean; projectId?: string; taskId?: string; tagId?: string };
    if (!body.userId || !body.startedAt || !body.endedAt) return json({ error: 'invalid_payload' }, 400);
    const entry = await prisma.timeEntry.create({ data: { workspaceId: ctx.workspaceId, userId: body.userId, description: body.description || 'Manual entry', startedAt: new Date(body.startedAt), endedAt: new Date(body.endedAt), billable: Boolean(body.billable), projectId: body.projectId || null, taskId: body.taskId || null, tagId: body.tagId || null } });
    await writeAudit({ workspaceId: ctx.workspaceId, actorUserId: ctx.userId, action: 'time_entry.manual_create', targetType: 'time_entry', targetId: entry.id });
    return json({ entry }, 201);
  }

  // --- Edit entry (Admin/Manager only) ---
  if (req.method === 'PATCH' && url.pathname.startsWith('/v1/time-entries/') && !url.pathname.includes('approve')) {
    if (!hasRole(ctx.role, ['OWNER', 'ADMIN', 'MANAGER'])) return json({ error: 'forbidden' }, 403);
    const entryId = url.pathname.split('/').pop()!;
    const body = (await readJson(req)) as { description?: string; startedAt?: string; endedAt?: string; billable?: boolean; projectId?: string; taskId?: string; tagId?: string };
    const existing = await prisma.timeEntry.findFirst({ where: { id: entryId, workspaceId: ctx.workspaceId } });
    if (!existing) return json({ error: 'not_found' }, 404);
    const entry = await prisma.timeEntry.update({
      where: { id: entryId },
      data: {
        ...(body.description !== undefined ? { description: body.description } : {}),
        ...(body.startedAt ? { startedAt: new Date(body.startedAt) } : {}),
        ...(body.endedAt ? { endedAt: new Date(body.endedAt) } : {}),
        ...(body.billable !== undefined ? { billable: body.billable } : {}),
        ...(body.projectId !== undefined ? { projectId: body.projectId || null } : {}),
        ...(body.taskId !== undefined ? { taskId: body.taskId || null } : {}),
        ...(body.tagId !== undefined ? { tagId: body.tagId || null } : {})
      }
    });
    await writeAudit({ workspaceId: ctx.workspaceId, actorUserId: ctx.userId, action: 'time_entry.edit', targetType: 'time_entry', targetId: entry.id, metadata: body });
    return json({ entry });
  }

  // --- Delete entry ---
  if (req.method === 'DELETE' && url.pathname.startsWith('/v1/time-entries/')) {
    const entryId = url.pathname.split('/').pop()!;
    const existing = await prisma.timeEntry.findFirst({ where: { id: entryId, workspaceId: ctx.workspaceId } });
    if (!existing) return json({ error: 'not_found' }, 404);
    // Members can only delete their own; managers+ can delete any
    if (existing.userId !== ctx.userId && !hasRole(ctx.role, ['OWNER', 'ADMIN', 'MANAGER'])) return json({ error: 'forbidden' }, 403);
    await prisma.timeEntry.delete({ where: { id: entryId } });
    await writeAudit({ workspaceId: ctx.workspaceId, actorUserId: ctx.userId, action: 'time_entry.delete', targetType: 'time_entry', targetId: entryId });
    return json({ deleted: true });
  }

  // --- Approvals ---
  if (req.method === 'POST' && url.pathname === '/v1/time-entries/approve') {
    if (!hasRole(ctx.role, ['OWNER', 'ADMIN', 'MANAGER'])) return json({ error: 'forbidden' }, 403);
    const body = (await readJson(req)) as { entryId?: string; approved?: boolean };
    if (!body.entryId) return json({ error: 'invalid_payload' }, 400);
    const entry = await prisma.timeEntry.update({ where: { id: body.entryId }, data: { approved: body.approved ?? true } });
    await writeAudit({ workspaceId: ctx.workspaceId, actorUserId: ctx.userId, action: 'time_entry.approve', targetType: 'time_entry', targetId: entry.id, metadata: { approved: body.approved ?? true } });
    return json({ entry });
  }

  if (req.method === 'POST' && url.pathname === '/v1/time-entries/approve-bulk') {
    if (!hasRole(ctx.role, ['OWNER', 'ADMIN', 'MANAGER'])) return json({ error: 'forbidden' }, 403);
    const body = (await readJson(req)) as { entryIds?: string[]; approved?: boolean };
    if (!body.entryIds?.length) return json({ error: 'invalid_payload' }, 400);
    const result = await prisma.timeEntry.updateMany({ where: { workspaceId: ctx.workspaceId, id: { in: body.entryIds } }, data: { approved: body.approved ?? true } });
    await writeAudit({ workspaceId: ctx.workspaceId, actorUserId: ctx.userId, action: 'time_entry.approve_bulk', targetType: 'time_entry', metadata: { entryIds: body.entryIds, approved: body.approved ?? true, count: result.count } });
    return json({ updated: result.count });
  }

  // --- List entries ---
  if (req.method === 'GET' && url.pathname === '/v1/time-entries/pending') {
    if (!hasRole(ctx.role, ['OWNER', 'ADMIN', 'MANAGER'])) return json({ error: 'forbidden' }, 403);
    const page = Number(url.searchParams.get('page') || '1');
    const pageSize = Number(url.searchParams.get('pageSize') || '20');
    const userId = url.searchParams.get('userId');
    const from = url.searchParams.get('from');
    const to = url.searchParams.get('to');
    const skip = (page - 1) * pageSize;
    const where: any = { workspaceId: ctx.workspaceId, approved: false, ...(userId ? { userId } : {}), ...(from || to ? { startedAt: { ...(from ? { gte: new Date(from) } : {}), ...(to ? { lte: new Date(to) } : {}) } } : {}) };
    const [items, total] = await Promise.all([
      prisma.timeEntry.findMany({ where, orderBy: { startedAt: 'desc' }, skip, take: pageSize, include: { project: true, task: true } }),
      prisma.timeEntry.count({ where })
    ]);
    return json({ items, pagination: { page, pageSize, total } });
  }

  if (req.method === 'GET' && url.pathname === '/v1/time-entries') {
    const page = Number(url.searchParams.get('page') || '1');
    const pageSize = Number(url.searchParams.get('pageSize') || '50');
    const from = url.searchParams.get('from');
    const to = url.searchParams.get('to');
    const projectId = url.searchParams.get('projectId');
    const userId = url.searchParams.get('userId');
    const skip = (page - 1) * pageSize;
    const where: any = {
      workspaceId: ctx.workspaceId,
      ...(hasRole(ctx.role, ['OWNER', 'ADMIN', 'MANAGER'])
        ? (userId ? { userId } : {})
        : { userId: ctx.userId }),
      ...(projectId ? { projectId } : {}),
      ...(from || to ? { startedAt: { ...(from ? { gte: new Date(from) } : {}), ...(to ? { lte: new Date(to) } : {}) } } : {})
    };
    const [items, total] = await Promise.all([
      prisma.timeEntry.findMany({ where, orderBy: { startedAt: 'desc' }, skip, take: pageSize, include: { project: true, task: true } }),
      prisma.timeEntry.count({ where })
    ]);
    return json({ items, pagination: { page, pageSize, total } });
  }

  return null;
}
