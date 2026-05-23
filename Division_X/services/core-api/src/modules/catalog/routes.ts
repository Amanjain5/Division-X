import { prisma } from '../../core/prisma.js';
import { json, readJson } from '../../core/http.js';
import { hasRole, type RequestContext } from '../../core/types.js';
import { writeAudit } from '../../core/audit.js';

export async function catalogRoutes(req: Request, ctx: RequestContext): Promise<Response | null> {
  const url = new URL(req.url);
  const canManage = hasRole(ctx.role, ['OWNER', 'ADMIN', 'MANAGER']);

  // --- Projects ---
  if (req.method === 'GET' && url.pathname === '/v1/projects') {
    const items = await prisma.project.findMany({ where: { workspaceId: ctx.workspaceId }, include: { client: true }, orderBy: { name: 'asc' } });
    return json({ items });
  }
  if (req.method === 'POST' && url.pathname === '/v1/projects') {
    if (!canManage) return json({ error: 'forbidden' }, 403);
    const b = (await readJson(req)) as { name?: string; color?: string; clientId?: string };
    const item = await prisma.project.create({ data: { workspaceId: ctx.workspaceId, name: b.name || 'Untitled', color: b.color || '#059669', clientId: b.clientId || null } });
    await writeAudit({ workspaceId: ctx.workspaceId, actorUserId: ctx.userId, action: 'project.create', targetType: 'project', targetId: item.id });
    return json({ item }, 201);
  }
  if (req.method === 'PATCH' && url.pathname.startsWith('/v1/projects/')) {
    if (!canManage) return json({ error: 'forbidden' }, 403);
    const id = url.pathname.split('/').pop()!;
    const b = (await readJson(req)) as { name?: string; color?: string; clientId?: string; archived?: boolean };
    const item = await prisma.project.update({ where: { id }, data: { ...(b.name ? { name: b.name } : {}), ...(b.color ? { color: b.color } : {}), ...(b.clientId !== undefined ? { clientId: b.clientId || null } : {}), ...(b.archived !== undefined ? { archived: b.archived } : {}) } });
    return json({ item });
  }
  if (req.method === 'DELETE' && url.pathname.startsWith('/v1/projects/')) {
    if (!canManage) return json({ error: 'forbidden' }, 403);
    const id = url.pathname.split('/').pop()!;
    await prisma.project.delete({ where: { id } });
    return json({ deleted: true });
  }

  // --- Tasks ---
  if (req.method === 'GET' && url.pathname === '/v1/tasks') {
    const projectId = url.searchParams.get('projectId');
    const items = await prisma.task.findMany({
      where: {
        workspaceId: ctx.workspaceId,
        ...(projectId ? { projectId } : {}),
        ...(!canManage ? { userId: ctx.userId } : {})
      },
      orderBy: { name: 'asc' }
    });
    return json({ items });
  }
  if (req.method === 'POST' && url.pathname === '/v1/tasks') {
    const b = (await readJson(req)) as { name?: string; projectId?: string; status?: string; priority?: string };
    const item = await prisma.task.create({ data: { workspaceId: ctx.workspaceId, userId: ctx.userId, name: b.name || 'Untitled', projectId: b.projectId || null, status: b.status || 'To Do', priority: b.priority || 'Low' } });
    return json({ item }, 201);
  }
  if (req.method === 'PATCH' && url.pathname.startsWith('/v1/tasks/')) {
    const id = url.pathname.split('/').pop()!;
    const existing = await prisma.task.findFirst({ where: { id, workspaceId: ctx.workspaceId } });
    if (!existing) return json({ error: 'not_found' }, 404);
    if (!canManage && existing.userId !== ctx.userId) return json({ error: 'forbidden' }, 403);
    const b = (await readJson(req)) as { name?: string; projectId?: string; status?: string; priority?: string };
    const item = await prisma.task.update({ where: { id }, data: { ...(b.name ? { name: b.name } : {}), ...(b.projectId !== undefined ? { projectId: b.projectId || null } : {}), ...(b.status ? { status: b.status } : {}), ...(b.priority ? { priority: b.priority } : {}) } });
    return json({ item });
  }
  if (req.method === 'DELETE' && url.pathname.startsWith('/v1/tasks/')) {
    const id = url.pathname.split('/').pop()!;
    const existing = await prisma.task.findFirst({ where: { id, workspaceId: ctx.workspaceId } });
    if (!existing) return json({ error: 'not_found' }, 404);
    if (!canManage && existing.userId !== ctx.userId) return json({ error: 'forbidden' }, 403);
    await prisma.task.delete({ where: { id } });
    return json({ deleted: true });
  }

  // --- Tags ---
  if (req.method === 'GET' && url.pathname === '/v1/tags') {
    const items = await prisma.tag.findMany({ where: { workspaceId: ctx.workspaceId }, orderBy: { name: 'asc' } });
    return json({ items });
  }
  if (req.method === 'POST' && url.pathname === '/v1/tags') {
    if (!canManage) return json({ error: 'forbidden' }, 403);
    const b = (await readJson(req)) as { name?: string; color?: string };
    const item = await prisma.tag.create({ data: { workspaceId: ctx.workspaceId, name: b.name || 'Untitled', color: b.color || '#6B7280' } });
    return json({ item }, 201);
  }
  if (req.method === 'PATCH' && url.pathname.startsWith('/v1/tags/')) {
    if (!canManage) return json({ error: 'forbidden' }, 403);
    const id = url.pathname.split('/').pop()!;
    const b = (await readJson(req)) as { name?: string; color?: string };
    const item = await prisma.tag.update({ where: { id }, data: { ...(b.name ? { name: b.name } : {}), ...(b.color ? { color: b.color } : {}) } });
    return json({ item });
  }
  if (req.method === 'DELETE' && url.pathname.startsWith('/v1/tags/')) {
    if (!canManage) return json({ error: 'forbidden' }, 403);
    const id = url.pathname.split('/').pop()!;
    await prisma.tag.delete({ where: { id } });
    return json({ deleted: true });
  }

  // --- Clients ---
  if (req.method === 'GET' && url.pathname === '/v1/clients') {
    const items = await prisma.client.findMany({ where: { workspaceId: ctx.workspaceId }, orderBy: { name: 'asc' } });
    return json({ items });
  }
  if (req.method === 'POST' && url.pathname === '/v1/clients') {
    if (!canManage) return json({ error: 'forbidden' }, 403);
    const b = (await readJson(req)) as { name?: string; email?: string };
    const item = await prisma.client.create({ data: { workspaceId: ctx.workspaceId, name: b.name || 'Untitled', email: b.email || null } });
    return json({ item }, 201);
  }
  if (req.method === 'PATCH' && url.pathname.startsWith('/v1/clients/')) {
    if (!canManage) return json({ error: 'forbidden' }, 403);
    const id = url.pathname.split('/').pop()!;
    const b = (await readJson(req)) as { name?: string; email?: string };
    const item = await prisma.client.update({ where: { id }, data: { ...(b.name ? { name: b.name } : {}), ...(b.email !== undefined ? { email: b.email || null } : {}) } });
    return json({ item });
  }
  if (req.method === 'DELETE' && url.pathname.startsWith('/v1/clients/')) {
    if (!canManage) return json({ error: 'forbidden' }, 403);
    const id = url.pathname.split('/').pop()!;
    await prisma.client.delete({ where: { id } });
    return json({ deleted: true });
  }

  return null;
}
