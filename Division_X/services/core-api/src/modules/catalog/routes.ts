import { prisma } from '../../core/prisma.js';
import { json, readJson } from '../../core/http.js';
import { hasRole, type RequestContext } from '../../core/types.js';
import { writeAudit } from '../../core/audit.js';
import { sendGlobalNotification } from '../../core/notifications.js';

export async function catalogRoutes(req: Request, ctx: RequestContext): Promise<Response | null> {
  const url = new URL(req.url);
  const canManage = hasRole(ctx.role, ['OWNER', 'ADMIN', 'MANAGER']);
  // --- Projects ---
  if (req.method === 'GET' && url.pathname === '/v1/projects') {
    let items;
    if (hasRole(ctx.role, ['OWNER', 'ADMIN', 'MANAGER'])) {
      items = await prisma.project.findMany({
        where: { workspaceId: ctx.workspaceId },
        include: { client: true, projectTeams: true },
        orderBy: { name: 'asc' }
      });
    } else {
      const userTeams = await prisma.teamMember.findMany({
        where: { userId: ctx.userId },
        select: { teamId: true }
      });
      const teamIds = userTeams.map(ut => ut.teamId);
      items = await prisma.project.findMany({
        where: {
          workspaceId: ctx.workspaceId,
          OR: [
            { projectTeams: { none: {} } },
            { projectTeams: { some: { teamId: { in: teamIds } } } }
          ]
        },
        include: { client: true, projectTeams: true },
        orderBy: { name: 'asc' }
      });
    }
    return json({ items });
  }

  if (req.method === 'POST' && url.pathname.startsWith('/v1/projects/') && url.pathname.endsWith('/teams')) {
    if (!canManage) return json({ error: 'forbidden' }, 403);
    const pathParts = url.pathname.split('/');
    const projectId = pathParts[pathParts.length - 2];
    const body = (await readJson(req)) as { teamId?: string };
    if (!body.teamId) return json({ error: 'invalid_payload' }, 400);

    const project = await prisma.project.findFirst({ where: { id: projectId, workspaceId: ctx.workspaceId } });
    const team = await prisma.team.findFirst({ where: { id: body.teamId, workspaceId: ctx.workspaceId } });
    if (!project || !team) return json({ error: 'not_found' }, 404);

    const projectTeam = await prisma.projectTeam.upsert({
      where: {
        projectId_teamId: { projectId, teamId: body.teamId }
      },
      create: { projectId, teamId: body.teamId },
      update: {}
    });

    await writeAudit({ workspaceId: ctx.workspaceId, actorUserId: ctx.userId, action: 'project.bind_team', targetType: 'project', targetId: projectId, metadata: { teamId: body.teamId } });
    return json({ projectTeam }, 201);
  }

  if (req.method === 'DELETE' && url.pathname.startsWith('/v1/projects/') && url.pathname.includes('/teams/')) {
    if (!canManage) return json({ error: 'forbidden' }, 403);
    const pathParts = url.pathname.split('/');
    const teamId = pathParts.pop()!;
    const projectId = pathParts[pathParts.length - 2];

    const project = await prisma.project.findFirst({ where: { id: projectId, workspaceId: ctx.workspaceId } });
    if (!project) return json({ error: 'not_found' }, 404);

    await prisma.projectTeam.deleteMany({
      where: { projectId, teamId }
    });

    await writeAudit({ workspaceId: ctx.workspaceId, actorUserId: ctx.userId, action: 'project.unbind_team', targetType: 'project', targetId: projectId, metadata: { teamId } });
    return json({ unbound: true });
  }

  if (req.method === 'POST' && url.pathname === '/v1/projects') {
    if (!canManage) return json({ error: 'forbidden' }, 403);
    const b = (await readJson(req)) as { name?: string; color?: string; clientId?: string };
    if (b.clientId) {
      const client = await prisma.client.findFirst({ where: { id: b.clientId, workspaceId: ctx.workspaceId } });
      if (!client) return json({ error: 'invalid_client_reference' }, 400);
    }
    const item = await prisma.project.create({ data: { workspaceId: ctx.workspaceId, name: b.name || 'Untitled', color: b.color || '#059669', clientId: b.clientId || null } });
    await writeAudit({ workspaceId: ctx.workspaceId, actorUserId: ctx.userId, action: 'project.create', targetType: 'project', targetId: item.id });
    return json({ item }, 201);
  }
  if (req.method === 'PATCH' && url.pathname.startsWith('/v1/projects/')) {
    if (!canManage) return json({ error: 'forbidden' }, 403);
    const id = url.pathname.split('/').pop()!;
    const existing = await prisma.project.findFirst({ where: { id, workspaceId: ctx.workspaceId } });
    if (!existing) return json({ error: 'not_found' }, 404);
    const b = (await readJson(req)) as { name?: string; color?: string; clientId?: string; archived?: boolean };
    if (b.clientId) {
      const client = await prisma.client.findFirst({ where: { id: b.clientId, workspaceId: ctx.workspaceId } });
      if (!client) return json({ error: 'invalid_client_reference' }, 400);
    }
    const item = await prisma.project.update({ where: { id }, data: { ...(b.name ? { name: b.name } : {}), ...(b.color ? { color: b.color } : {}), ...(b.clientId !== undefined ? { clientId: b.clientId || null } : {}), ...(b.archived !== undefined ? { archived: b.archived } : {}) } });
    await writeAudit({ workspaceId: ctx.workspaceId, actorUserId: ctx.userId, action: 'project.update', targetType: 'project', targetId: item.id, metadata: b });
    return json({ item });
  }
  if (req.method === 'DELETE' && url.pathname.startsWith('/v1/projects/')) {
    if (!canManage) return json({ error: 'forbidden' }, 403);
    const id = url.pathname.split('/').pop()!;
    await prisma.project.delete({ where: { id } });
    await writeAudit({ workspaceId: ctx.workspaceId, actorUserId: ctx.userId, action: 'project.delete', targetType: 'project', targetId: id });
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
    if (b.projectId) {
      const project = await prisma.project.findFirst({ where: { id: b.projectId, workspaceId: ctx.workspaceId } });
      if (!project) return json({ error: 'invalid_project_reference' }, 400);
    }
    const item = await prisma.task.create({ data: { workspaceId: ctx.workspaceId, userId: ctx.userId, name: b.name || 'Untitled', projectId: b.projectId || null, status: b.status || 'To Do', priority: b.priority || 'Low' } });
    await writeAudit({ workspaceId: ctx.workspaceId, actorUserId: ctx.userId, action: 'task.create', targetType: 'task', targetId: item.id });
    await sendGlobalNotification(ctx.workspaceId, ctx.userId, 'Task Created', `Created a new task: "${item.name}"`);
    return json({ item }, 201);
  }
  if (req.method === 'PATCH' && url.pathname.startsWith('/v1/tasks/')) {
    const id = url.pathname.split('/').pop()!;
    const existing = await prisma.task.findFirst({ where: { id, workspaceId: ctx.workspaceId } });
    if (!existing) return json({ error: 'not_found' }, 404);
    if (!canManage && existing.userId !== ctx.userId) return json({ error: 'forbidden' }, 403);
    const b = (await readJson(req)) as { name?: string; projectId?: string; status?: string; priority?: string };
    if (b.projectId) {
      const project = await prisma.project.findFirst({ where: { id: b.projectId, workspaceId: ctx.workspaceId } });
      if (!project) return json({ error: 'invalid_project_reference' }, 400);
    }
    const item = await prisma.task.update({ where: { id }, data: { ...(b.name ? { name: b.name } : {}), ...(b.projectId !== undefined ? { projectId: b.projectId || null } : {}), ...(b.status ? { status: b.status } : {}), ...(b.priority ? { priority: b.priority } : {}) } });
    await writeAudit({ workspaceId: ctx.workspaceId, actorUserId: ctx.userId, action: 'task.update', targetType: 'task', targetId: item.id, metadata: b });
    return json({ item });
  }
  if (req.method === 'DELETE' && url.pathname.startsWith('/v1/tasks/')) {
    const id = url.pathname.split('/').pop()!;
    const existing = await prisma.task.findFirst({ where: { id, workspaceId: ctx.workspaceId } });
    if (!existing) return json({ error: 'not_found' }, 404);
    if (!canManage && existing.userId !== ctx.userId) return json({ error: 'forbidden' }, 403);
    await prisma.task.delete({ where: { id } });
    await writeAudit({ workspaceId: ctx.workspaceId, actorUserId: ctx.userId, action: 'task.delete', targetType: 'task', targetId: id });
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
    await writeAudit({ workspaceId: ctx.workspaceId, actorUserId: ctx.userId, action: 'tag.create', targetType: 'tag', targetId: item.id });
    return json({ item }, 201);
  }
  if (req.method === 'PATCH' && url.pathname.startsWith('/v1/tags/')) {
    if (!canManage) return json({ error: 'forbidden' }, 403);
    const id = url.pathname.split('/').pop()!;
    const b = (await readJson(req)) as { name?: string; color?: string };
    const item = await prisma.tag.update({ where: { id }, data: { ...(b.name ? { name: b.name } : {}), ...(b.color ? { color: b.color } : {}) } });
    await writeAudit({ workspaceId: ctx.workspaceId, actorUserId: ctx.userId, action: 'tag.update', targetType: 'tag', targetId: item.id, metadata: b });
    return json({ item });
  }
  if (req.method === 'DELETE' && url.pathname.startsWith('/v1/tags/')) {
    if (!canManage) return json({ error: 'forbidden' }, 403);
    const id = url.pathname.split('/').pop()!;
    await prisma.tag.delete({ where: { id } });
    await writeAudit({ workspaceId: ctx.workspaceId, actorUserId: ctx.userId, action: 'tag.delete', targetType: 'tag', targetId: id });
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
    await writeAudit({ workspaceId: ctx.workspaceId, actorUserId: ctx.userId, action: 'client.create', targetType: 'client', targetId: item.id });
    return json({ item }, 201);
  }
  if (req.method === 'PATCH' && url.pathname.startsWith('/v1/clients/')) {
    if (!canManage) return json({ error: 'forbidden' }, 403);
    const id = url.pathname.split('/').pop()!;
    const b = (await readJson(req)) as { name?: string; email?: string };
    const item = await prisma.client.update({ where: { id }, data: { ...(b.name ? { name: b.name } : {}), ...(b.email !== undefined ? { email: b.email || null } : {}) } });
    await writeAudit({ workspaceId: ctx.workspaceId, actorUserId: ctx.userId, action: 'client.update', targetType: 'client', targetId: item.id, metadata: b });
    return json({ item });
  }
  if (req.method === 'DELETE' && url.pathname.startsWith('/v1/clients/')) {
    if (!canManage) return json({ error: 'forbidden' }, 403);
    const id = url.pathname.split('/').pop()!;
    await prisma.client.delete({ where: { id } });
    await writeAudit({ workspaceId: ctx.workspaceId, actorUserId: ctx.userId, action: 'client.delete', targetType: 'client', targetId: id });
    return json({ deleted: true });
  }

  return null;
}
