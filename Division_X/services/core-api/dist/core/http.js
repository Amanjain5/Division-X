import { verifyAccessToken } from './auth.js';
export function getContext(req) {
    const auth = req.headers.get('authorization');
    if (auth?.startsWith('Bearer ')) {
        const claims = verifyAccessToken(auth.slice(7));
        if (claims) {
            return { userId: claims.sub, workspaceId: claims.workspaceId, role: claims.role };
        }
    }
    return {
        userId: req.headers.get('x-user-id') || 'demo-user',
        workspaceId: req.headers.get('x-workspace-id') || 'demo-workspace',
        role: req.headers.get('x-role') || 'OWNER'
    };
}
export function json(data, status = 200) {
    return new Response(JSON.stringify(data), {
        status,
        headers: { 'content-type': 'application/json' }
    });
}
export async function readJson(req) {
    const raw = await req.text();
    if (!raw)
        return {};
    try {
        return JSON.parse(raw);
    }
    catch {
        return {};
    }
}
