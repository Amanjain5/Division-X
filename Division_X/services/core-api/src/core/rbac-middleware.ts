import type { FastifyReply, FastifyRequest } from 'fastify';
import { Permission, hasPermission } from './types.js';

export function requirePermission(permission: Permission) {
  return async (req: FastifyRequest, reply: FastifyReply) => {
    if (!req.ctx) {
      return reply.status(401).send({ error: 'unauthorized' });
    }
    if (!hasPermission(req.ctx.role, permission)) {
      return reply.status(403).send({ error: 'forbidden' });
    }
  };
}
