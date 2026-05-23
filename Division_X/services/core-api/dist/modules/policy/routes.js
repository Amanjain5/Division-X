import { prisma } from '../../core/prisma.js';
import { json, readJson } from '../../core/http.js';
import { hasRole } from '../../core/types.js';
import { writeAudit } from '../../core/audit.js';
export async function policyRoutes(req, ctx) {
    const url = new URL(req.url);
    if (req.method === 'GET' && url.pathname === '/v1/policies') {
        const policy = await prisma.workspacePolicy.findFirst({ where: { workspaceId: ctx.workspaceId } });
        return json(policy || { forceTimer: false, idleMinutes: 10, overtimeHours: 8 });
    }
    if (req.method === 'PATCH' && url.pathname === '/v1/policies') {
        if (!hasRole(ctx.role, ['OWNER', 'ADMIN']))
            return json({ error: 'forbidden' }, 403);
        const body = (await readJson(req));
        const existing = await prisma.workspacePolicy.findFirst({ where: { workspaceId: ctx.workspaceId } });
        if (!existing) {
            const created = await prisma.workspacePolicy.create({ data: { workspaceId: ctx.workspaceId, forceTimer: Boolean(body.forceTimer), idleMinutes: body.idleMinutes ?? 10, overtimeHours: body.overtimeHours ?? 8 } });
            await writeAudit({ workspaceId: ctx.workspaceId, actorUserId: ctx.userId, action: 'policy.create', targetType: 'workspace_policy', targetId: created.id, metadata: body });
            return json(created, 201);
        }
        const updated = await prisma.workspacePolicy.update({ where: { id: existing.id }, data: body });
        await writeAudit({ workspaceId: ctx.workspaceId, actorUserId: ctx.userId, action: 'policy.update', targetType: 'workspace_policy', targetId: updated.id, metadata: body });
        return json(updated);
    }
    return null;
}
