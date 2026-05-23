import bcrypt from 'bcryptjs';
import { prisma } from '../../core/prisma.js';
import { json, readJson } from '../../core/http.js';
import { generateRefreshToken, signAccessToken } from '../../core/auth.js';
async function issueSession(userId, workspaceId, role) {
    const refreshToken = generateRefreshToken();
    const expiresAt = new Date(Date.now() + 1000 * 60 * 60 * 24 * 14);
    await prisma.session.create({ data: { userId, workspaceId, role, refreshToken, expiresAt } });
    const token = signAccessToken({ sub: userId, workspaceId, role });
    return { token, refreshToken };
}
export async function authRoutes(req) {
    const url = new URL(req.url);
    if (req.method === 'POST' && url.pathname === '/v1/auth/signup') {
        const body = (await readJson(req));
        if (!body.email || !body.password || !body.workspaceName)
            return json({ error: 'invalid_payload' }, 400);
        const passwordHash = await bcrypt.hash(body.password, 10);
        const created = await prisma.workspace.create({
            data: {
                name: body.workspaceName,
                members: {
                    create: {
                        role: 'OWNER',
                        user: { create: { email: body.email, passwordHash, name: body.name } }
                    }
                },
                policies: { create: { forceTimer: false, idleMinutes: 10, overtimeHours: 8 } }
            },
            include: { members: { include: { user: true } } }
        });
        const member = created.members[0];
        const session = await issueSession(member.userId, created.id, member.role);
        return json({ ...session, userId: member.userId, workspaceId: created.id, role: member.role }, 201);
    }
    if (req.method === 'POST' && url.pathname === '/v1/auth/login') {
        const body = (await readJson(req));
        if (!body.email || !body.password)
            return json({ error: 'invalid_payload' }, 400);
        const user = await prisma.user.findUnique({ where: { email: body.email }, include: { memberships: true } });
        if (!user)
            return json({ error: 'invalid_credentials' }, 401);
        const ok = await bcrypt.compare(body.password, user.passwordHash);
        if (!ok || user.memberships.length === 0)
            return json({ error: 'invalid_credentials' }, 401);
        const membership = user.memberships[0];
        const session = await issueSession(user.id, membership.workspaceId, membership.role);
        return json({ ...session, userId: user.id, workspaceId: membership.workspaceId, role: membership.role });
    }
    if (req.method === 'POST' && url.pathname === '/v1/auth/refresh') {
        const body = (await readJson(req));
        if (!body.refreshToken)
            return json({ error: 'invalid_payload' }, 400);
        const existing = await prisma.session.findUnique({ where: { refreshToken: body.refreshToken } });
        if (!existing || existing.expiresAt.getTime() < Date.now())
            return json({ error: 'invalid_refresh' }, 401);
        const token = signAccessToken({ sub: existing.userId, workspaceId: existing.workspaceId, role: existing.role });
        return json({ token });
    }
    if (req.method === 'POST' && url.pathname === '/v1/auth/forgot-password')
        return json({ success: true });
    return null;
}
