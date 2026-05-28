import { prisma } from './prisma.js';

export async function writeAudit(params: {
  workspaceId: string;
  actorUserId: string;
  action: string;
  targetType: string;
  targetId?: string;
  metadata?: unknown;
  clientIp?: string;
  userAgent?: string;
}) {
  await prisma.auditLog.create({
    data: {
      workspaceId: params.workspaceId,
      actorUserId: params.actorUserId,
      action: params.action,
      targetType: params.targetType,
      targetId: params.targetId,
      metadata: params.metadata ? (params.metadata as any) : null,
      clientIp: params.clientIp || '127.0.0.1',
      userAgent: params.userAgent || 'Unknown'
    }
  });
}
