import { prisma } from './prisma.js';
export async function writeAudit(params) {
    await prisma.auditLog.create({
        data: {
            workspaceId: params.workspaceId,
            actorUserId: params.actorUserId,
            action: params.action,
            targetType: params.targetType,
            targetId: params.targetId,
            metadata: params.metadata ? JSON.stringify(params.metadata) : null
        }
    });
}
