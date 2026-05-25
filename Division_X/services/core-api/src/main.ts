import Fastify from 'fastify';
import cors from '@fastify/cors';
import fastifyWebsocket from '@fastify/websocket';
import compress from '@fastify/compress';
import etag from '@fastify/etag';
import rateLimit from '@fastify/rate-limit';
import { configureFastify } from './core/fastify-types.js';
import { authenticate } from './core/http.js';
import { samlProvider } from './core/sso.js';
import { prisma } from './core/prisma.js';
import { hasPermission, type Permission } from './core/types.js';
import { verifyAccessToken } from './core/auth.js';
import { registerAdminSocket, unregisterAdminSocket } from './core/notifications.js';
import { authRoutes } from './modules/auth/routes.js';
import { workspaceRoutes } from './modules/workspace/routes.js';
import { catalogRoutes } from './modules/catalog/routes.js';
import { timeRoutes } from './modules/time/routes.js';
import { timeRoutes as productivityTimeRoutes } from './modules/time/productivity.routes.js';
import { policyRoutes } from './modules/policy/routes.js';
import { reportingRoutes } from './modules/reporting/routes.js';
import { auditRoutes } from './modules/audit/routes.js';
import { attendanceRoutes } from './modules/attendance/routes.js';
import { activityRoutes } from './modules/activity/routes.js';

const app = Fastify({ logger: true });

// Allow empty JSON bodies without throwing FST_ERR_CTP_EMPTY_JSON_BODY
app.addContentTypeParser('application/json', { parseAs: 'string' }, (req, body, done) => {
  const bodyStr = typeof body === 'string' ? body : (body as any).toString('utf8');
  if (!bodyStr || bodyStr.trim() === '') {
    done(null, undefined);
    return;
  }
  try {
    const json = JSON.parse(bodyStr);
    done(null, json);
  } catch (err: any) {
    err.statusCode = 400;
    done(err);
  }
});

// Setup Zod compilers
configureFastify(app);

// Setup CORS
await app.register(cors, {
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'x-user-id', 'x-workspace-id', 'x-role']
});

// Register Fastify Websocket Plugin
await app.register(fastifyWebsocket);

// Register Compression Plugin for Brotli/Gzip content encoding
await app.register(compress, { global: true });

// Register ETag Plugin for automatic 304 browser caching
await app.register(etag);

// Register dynamic Rate Limiting for security and threat resilience
await app.register(rateLimit, {
  global: true,
  timeWindow: '1 minute',
  max: (req) => {
    const url = req.url;
    if (url.includes('/v1/auth/login')) return 10;
    if (url.includes('/v1/auth/signup')) return 5;
    if (url.includes('/v1/auth/forgot-password')) return 3;
    return 200;
  }
});

// Register real-time WebSocket endpoint for Admins/Owners
app.get('/v1/notifications/ws', { websocket: true }, (socket, req) => {
  const url = new URL(req.url, `http://${req.hostname}`);
  const token = url.searchParams.get('token');
  if (!token) {
    socket.close(4001, 'unauthorized_missing_token');
    return;
  }

  const claims = verifyAccessToken(token);
  if (!claims || !['OWNER', 'ADMIN'].includes(claims.role)) {
    socket.close(4003, 'forbidden_not_admin');
    return;
  }

  const workspaceId = claims.workspaceId;
  registerAdminSocket(workspaceId, socket);
  app.log.info(`🔌 Admin WebSocket connected to workspace: ${workspaceId}`);

  // Setup keep-alive ping heartbeat
  const pingInterval = setInterval(() => {
    if (socket.readyState === 1) { // OPEN
      socket.ping();
    }
  }, 30000);

  socket.on('close', () => {
    clearInterval(pingInterval);
    unregisterAdminSocket(workspaceId, socket);
    app.log.info(`🔌 Admin WebSocket disconnected from workspace: ${workspaceId}`);
  });

  socket.on('error', (err: any) => {
    app.log.error('❌ WebSocket Connection Error:', err);
    clearInterval(pingInterval);
    unregisterAdminSocket(workspaceId, socket);
  });
});

// Setup dynamic auth & custom domain hook globally
app.addHook('preHandler', authenticate);

// Resolve permission required for specific url + method
function getRequiredPermission(method: string, pathname: string): Permission | null {
  // Time entries permissions
  if (pathname === '/v1/time-entries/approve' || pathname === '/v1/time-entries/approve-bulk') {
    return 'time_entries:approve';
  }
  if (pathname.startsWith('/v1/time-entries/')) {
    if (method === 'DELETE') return 'time_entries:delete';
    if (method === 'PATCH') return 'time_entries:edit';
  }
  if (pathname === '/v1/time-entries' || pathname === '/v1/time-entries/pending') {
    if (method === 'POST') return 'time_entries:create';
    return 'time_entries:view';
  }

  // Projects permissions
  if (pathname.startsWith('/v1/projects')) {
    if (method === 'POST') return 'projects:create';
    if (method === 'PATCH') return 'projects:update';
    if (method === 'DELETE') return 'projects:delete';
  }

  // Tasks permissions
  if (pathname.startsWith('/v1/tasks')) {
    if (method === 'POST') return 'tasks:create';
    if (method === 'PATCH') return 'tasks:update';
    if (method === 'DELETE') return 'tasks:delete';
  }

  // Tags permissions
  if (pathname.startsWith('/v1/tags')) {
    if (method === 'POST') return 'tags:create';
    if (method === 'PATCH') return 'tags:update';
    if (method === 'DELETE') return 'tags:delete';
  }

  // Clients permissions
  if (pathname.startsWith('/v1/clients')) {
    if (method === 'POST') return 'clients:create';
    if (method === 'PATCH') return 'clients:update';
    if (method === 'DELETE') return 'clients:delete';
  }

  // Policies & Settings permissions
  if (pathname === '/v1/policies') {
    if (method === 'PATCH') return 'workspace:policy:edit';
  }
  if (pathname === '/v1/workspace') {
    if (method === 'PATCH') return 'workspace:settings:edit';
  }
  if (pathname.startsWith('/v1/workspace/members')) {
    return 'workspace:members:manage';
  }

  // Teams permissions
  if (pathname.startsWith('/v1/teams')) {
    return 'teams:manage';
  }

  // Audit Logs permissions
  if (pathname === '/v1/audit') {
    return 'audit_logs:view';
  }

  return null;
}

// New SAML SSO Native Routes
app.get('/v1/auth/sso/login', async (req, reply) => {
  const url = await samlProvider.getAuthorizeUrlAsync('', '', {});
  return reply.redirect(url);
});

app.post('/v1/auth/sso/callback', async (req, reply) => {
  try {
    const bodyObj = (typeof req.body === 'string' ? JSON.parse(req.body) : req.body) as Record<string, string>;
    const { profile } = await samlProvider.validatePostResponseAsync(bodyObj);
    if (!profile || !profile.email) {
      return reply.status(400).send({ error: 'invalid_saml_profile' });
    }
    const email = profile.email;
    
    // Find or create user
    let user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      user = await prisma.user.create({
        data: {
          email,
          passwordHash: 'sso-managed-hash',
          name: (profile.name as string) || email.split('@')[0]
        }
      });
    }
    
    // Find their workspace membership, or put them in demo-workspace
    let membership = await prisma.workspaceMember.findFirst({ where: { userId: user.id } });
    if (!membership) {
      membership = await prisma.workspaceMember.create({
        data: {
          workspaceId: 'demo-workspace',
          userId: user.id,
          role: 'MEMBER'
        }
      });
    }
    
    // Issue token
    const jwt = await import('jsonwebtoken');
    const token = jwt.default.sign({ sub: user.id, workspaceId: membership.workspaceId, role: membership.role }, process.env.JWT_ACCESS_SECRET || 'dev-access-secret', { expiresIn: '1h' });
    
    // Redirect back to frontend
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
    return reply.redirect(`${frontendUrl}/auth/login?token=${token}&userId=${user.id}&workspaceId=${membership.workspaceId}&role=${membership.role}`);
  } catch (err) {
    return reply.status(500).send({ error: 'sso_failed', details: String(err) });
  }
});

// Register standard route prefix handlers
const routePrefixes: Record<string, any> = {
  '/v1/auth': authRoutes,
  '/v1/workspace': workspaceRoutes,
  '/v1/teams': workspaceRoutes,
  '/v1/projects': catalogRoutes,
  '/v1/tasks': catalogRoutes,
  '/v1/tags': catalogRoutes,
  '/v1/clients': catalogRoutes,
  '/v1/timer': timeRoutes,
  '/v1/time-entries': timeRoutes,
  '/v1/break': productivityTimeRoutes,
  '/v1/pomodoro': productivityTimeRoutes,
  '/v1/time': productivityTimeRoutes,
  '/v1/policies': policyRoutes,
  '/v1/reports': reportingRoutes,
  '/v1/audit': auditRoutes,
  '/v1/attendance': attendanceRoutes,
  '/v1/activity': activityRoutes
};

// Public health endpoint registered directly on Fastify
app.get('/health', async () => {
  return { status: 'healthy', timestamp: new Date().toISOString() };
});

const methods: Array<'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'> = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'];
for (const [prefix, handler] of Object.entries(routePrefixes)) {
  for (const method of methods) {
    app.route({
      method,
      url: `${prefix}*`,
      handler: async (req, reply) => {
        const port = Number(process.env.CORE_API_PORT || 5000);
        const host = req.headers.host || req.hostname || 'localhost';
        const requestUrl = host.includes(':') ? `http://${host}${req.url}` : `http://${host}:${port}${req.url}`;
        
        // Sanitise headers to prevent Fetch Request constructor validation errors
        const sanitizedHeaders = new Headers();
        for (const [key, val] of Object.entries(req.headers)) {
          if (val === undefined) continue;
          const lowerKey = key.toLowerCase();
          if (['content-length', 'host', 'connection', 'keep-alive'].includes(lowerKey)) {
            continue;
          }
          if (Array.isArray(val)) {
            for (const v of val) sanitizedHeaders.append(key, v);
          } else {
            sanitizedHeaders.set(key, val);
          }
        }

        // Safe body extraction: NEVER pass body for GET/HEAD methods (throws TypeError in Web standards)
        const hasBody = req.method !== 'GET' && req.method !== 'HEAD';
        let requestBody: any = undefined;
        if (hasBody && req.body) {
          requestBody = typeof req.body === 'string' ? req.body : JSON.stringify(req.body);
        }

        // Construct standard Fetch Request object
        const request = new Request(requestUrl, {
          method: req.method,
          headers: sanitizedHeaders,
          ...(hasBody && requestBody ? { body: requestBody } : {})
        });

        // Serialization bypass: cache parsed body directly on adapted standard Request object
        if (req.body) {
          (request as any).parsedBody = req.body;
        }

        const url = new URL(requestUrl);
        const requiredPermission = getRequiredPermission(req.method, url.pathname);
        if (requiredPermission && req.ctx) {
          if (!hasPermission(req.ctx.role, requiredPermission)) {
            return reply.status(403).send({ error: 'forbidden', message: `missing_permission: ${requiredPermission}` });
          }
        }

        try {
          const response = await handler(request, req.ctx);
          if (response) {
            reply.status(response.status);
            for (const [key, val] of response.headers.entries()) {
              reply.header(key, val);
            }
            return reply.send(await response.text());
          }
        } catch (err) {
          app.log.error(err);
          return reply.status(500).send({ error: 'internal_server_error', message: 'An unexpected error occurred' });
        }

        // Overlapping prefix check: if `/v1/timer` is not processed by timeRoutes, fall back to productivityTimeRoutes
        if (prefix === '/v1/timer') {
          try {
            const response = await productivityTimeRoutes(request, req.ctx);
            if (response) {
              reply.status(response.status);
              for (const [key, val] of response.headers.entries()) {
                reply.header(key, val);
              }
              return reply.send(await response.text());
            }
          } catch (err) {
            app.log.error(err);
            return reply.status(500).send({ error: 'internal_server_error', message: 'An unexpected error occurred' });
          }
        }

        return reply.status(404).send({ error: 'not_found' });
      }
    });
  }
}

// High-resolution API latency logging hooks
app.addHook('onRequest', async (req) => {
  (req as any).startTime = process.hrtime();
});
app.addHook('onResponse', async (req, reply) => {
  const start = (req as any).startTime;
  if (start) {
    const diff = process.hrtime(start);
    const durationMs = (diff[0] * 1e3 + diff[1] * 1e-6).toFixed(2);
    app.log.info(`⏱️ [API LATENCY] ${req.method} ${req.url} - ${reply.statusCode} - ${durationMs}ms`);
  }
});

const port = Number(process.env.CORE_API_PORT || 5000);
app.listen({ port, host: '0.0.0.0' }, (err) => {
  if (err) {
    app.log.error(err);
    process.exit(1);
  }
  console.log(`core-api running on Fastify listening on ${port}`);
});
