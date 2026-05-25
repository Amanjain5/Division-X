import type { FastifyReply, FastifyRequest } from 'fastify';
import { verifyAccessToken } from './auth.js';
import { prisma } from './prisma.js';
import type { Role } from './types.js';

export function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'content-type': 'application/json' }
  });
}

export async function readJson(req: Request): Promise<any> {
  if ((req as any).parsedBody) {
    return (req as any).parsedBody;
  }
  const raw = await req.text();
  if (!raw) return {};
  try {
    return JSON.parse(raw);
  } catch {
    return {};
  }
}

interface CacheEntry {
  workspaceId: string | null;
  expiresAt: number;
}
const customDomainCache = new Map<string, CacheEntry>();
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

export async function authenticate(req: FastifyRequest, reply: FastifyReply) {
  const url = new URL(req.url, `http://${req.hostname}`);
  const isPublic = 
    url.pathname === '/health' ||
    url.pathname.startsWith('/v1/auth/') ||
    url.pathname === '/v1/workspace/invites/accept';

  let workspaceId: string | null = null;

  // Custom Domain Support: check if host matches a custom domain workspace
  const host = req.headers.host;
  if (host && !host.includes('localhost') && !host.includes('127.0.0.1')) {
    const now = Date.now();
    const cached = customDomainCache.get(host);
    if (cached && cached.expiresAt > now) {
      workspaceId = cached.workspaceId;
    } else {
      const ws = await prisma.workspace.findFirst({ where: { customDomain: host } });
      workspaceId = ws ? ws.id : null;
      customDomainCache.set(host, {
        workspaceId,
        expiresAt: now + CACHE_TTL_MS
      });
    }
  }

  const auth = req.headers.authorization;
  if (auth && typeof auth === 'string' && auth.startsWith('Bearer ')) {
    const claims = verifyAccessToken(auth.slice(7));
    if (claims) {
      req.ctx = {
        userId: claims.sub,
        workspaceId: workspaceId || claims.workspaceId,
        role: claims.role
      };
      return;
    }
  }

  // Development bypass
  if (process.env.NODE_ENV !== 'production' && process.env.ENABLE_DEV_BYPASS === 'true') {
    req.ctx = {
      userId: (req.headers['x-user-id'] as string) || 'demo-user',
      workspaceId: workspaceId || (req.headers['x-workspace-id'] as string) || 'demo-workspace',
      role: (req.headers['x-role'] as Role) || 'OWNER'
    };
    return;
  }

  if (!isPublic) {
    return reply.status(401).send({ error: 'unauthorized' });
  }

  // Safe dummy context for public routes so they don't crash
  req.ctx = {
    userId: 'anonymous',
    workspaceId: workspaceId || 'anonymous',
    role: 'MEMBER'
  };
}
