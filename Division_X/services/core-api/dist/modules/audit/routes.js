import { prisma } from '../../core/prisma.js';
import { json } from '../../core/http.js';
import { hasRole } from '../../core/types.js';
export async function auditRoutes(req, ctx) {
    const url = new URL(req.url);
    if (req.method === 'GET' && url.pathname === '/v1/audit') {
        if (!hasRole(ctx.role, ['OWNER', 'ADMIN', 'MANAGER']))
            return json({ error: 'forbidden' }, 403);
        const items = await prisma.auditLog.findMany({ where: { workspaceId: ctx.workspaceId }, orderBy: { createdAt: 'desc' }, take: 100 });
        return json({ items });
    }
    return null;
}
