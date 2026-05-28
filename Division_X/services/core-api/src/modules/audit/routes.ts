import { prisma } from '../../core/prisma.js';
import { json } from '../../core/http.js';
import type { RequestContext } from '../../core/types.js';
import { hasRole } from '../../core/types.js';

export async function auditRoutes(req: Request, ctx: RequestContext): Promise<Response | null> {
  const url = new URL(req.url);
  if (req.method === 'GET' && url.pathname === '/v1/audit') {
    if (!hasRole(ctx.role, ['OWNER', 'ADMIN', 'MANAGER'])) return json({ error: 'forbidden' }, 403);
    
    const searchParams = url.searchParams;
    const filterActorId = searchParams.get('userId');
    const filterAction = searchParams.get('action');
    const filterTargetType = searchParams.get('targetType');

    const where: any = { workspaceId: ctx.workspaceId };
    if (filterActorId) where.actorUserId = filterActorId;
    if (filterAction) where.action = filterAction;
    if (filterTargetType) where.targetType = filterTargetType;

    const items = await prisma.auditLog.findMany({ 
      where, 
      orderBy: { createdAt: 'desc' }, 
      take: 100 
    });

    // Dynamically resolve actor profiles (name, email)
    const actorIds = Array.from(new Set(items.map(i => i.actorUserId)));
    const users = await prisma.user.findMany({
      where: { id: { in: actorIds } },
      select: { id: true, name: true, email: true }
    });

    const userMap = new Map(users.map(u => [u.id, u]));

    const itemsWithActors = items.map(item => ({
      ...item,
      actor: userMap.get(item.actorUserId) || {
        id: item.actorUserId,
        name: item.actorUserId === 'system' ? 'System Orchestrator' : 'Unknown Actor',
        email: item.actorUserId === 'system' ? 'system@thetime.com' : 'unknown@thetime.com'
      }
    }));

    return json({ items: itemsWithActors });
  }
  return null;
}

