import http from 'node:http';
import { getContext, json } from './core/http.js';
import { authRoutes } from './modules/auth/routes.js';
import { workspaceRoutes } from './modules/workspace/routes.js';
import { catalogRoutes } from './modules/catalog/routes.js';
import { timeRoutes } from './modules/time/routes.js';
import { timeRoutes as productivityTimeRoutes } from './modules/time/productivity.routes.js';
import { policyRoutes } from './modules/policy/routes.js';
import { reportingRoutes } from './modules/reporting/routes.js';
import { auditRoutes } from './modules/audit/routes.js';
const port = Number(process.env.CORE_API_PORT || 5000);
const server = http.createServer(async (req, res) => {
    const request = new Request(`http://localhost:${port}${req.url}`, {
        method: req.method,
        headers: req.headers
    });
    if (req.url === '/health') {
        res.writeHead(200, { 'content-type': 'application/json' });
        res.end(JSON.stringify({ status: 'ok', service: 'core-api' }));
        return;
    }
    const ctx = getContext(request);
    const routeHandlers = [
        () => authRoutes(request),
        () => workspaceRoutes(request, ctx),
        () => catalogRoutes(request, ctx),
        () => timeRoutes(request, ctx),
        () => productivityTimeRoutes(request, ctx),
        () => policyRoutes(request, ctx),
        () => reportingRoutes(request, ctx),
        () => auditRoutes(request, ctx)
    ];
    for (const handler of routeHandlers) {
        const response = await handler();
        if (response) {
            res.writeHead(response.status, Object.fromEntries(response.headers.entries()));
            res.end(await response.text());
            return;
        }
    }
    const notFound = json({ error: 'not_found' }, 404);
    res.writeHead(notFound.status, Object.fromEntries(notFound.headers.entries()));
    res.end(await notFound.text());
});
server.listen(port, () => {
    console.log(`core-api listening on ${port}`);
});
