import { prisma } from '../../core/prisma.js';
import { json, readJson } from '../../core/http.js';
import { hasRole } from '../../core/types.js';
async function list(model, workspaceId) {
    return prisma[model].findMany({ where: { workspaceId }, orderBy: { name: 'asc' } });
}
export async function catalogRoutes(req, ctx) {
    const url = new URL(req.url);
    const canManage = hasRole(ctx.role, ['OWNER', 'ADMIN', 'MANAGER']);
    if (req.method === 'GET' && url.pathname === '/v1/projects')
        return json({ items: await list('project', ctx.workspaceId) });
    if (req.method === 'GET' && url.pathname === '/v1/tasks')
        return json({ items: await list('task', ctx.workspaceId) });
    if (req.method === 'GET' && url.pathname === '/v1/tags')
        return json({ items: await list('tag', ctx.workspaceId) });
    if (req.method === 'GET' && url.pathname === '/v1/clients')
        return json({ items: await list('client', ctx.workspaceId) });
    if (!canManage)
        return null;
    if (req.method === 'POST' && url.pathname === '/v1/projects') {
        const b = (await readJson(req));
        return json({ item: await prisma.project.create({ data: { workspaceId: ctx.workspaceId, name: b.name || 'Untitled' } }) }, 201);
    }
    if (req.method === 'POST' && url.pathname === '/v1/tasks') {
        const b = (await readJson(req));
        return json({ item: await prisma.task.create({ data: { workspaceId: ctx.workspaceId, name: b.name || 'Untitled' } }) }, 201);
    }
    if (req.method === 'POST' && url.pathname === '/v1/tags') {
        const b = (await readJson(req));
        return json({ item: await prisma.tag.create({ data: { workspaceId: ctx.workspaceId, name: b.name || 'Untitled' } }) }, 201);
    }
    if (req.method === 'POST' && url.pathname === '/v1/clients') {
        const b = (await readJson(req));
        return json({ item: await prisma.client.create({ data: { workspaceId: ctx.workspaceId, name: b.name || 'Untitled' } }) }, 201);
    }
    return null;
}
