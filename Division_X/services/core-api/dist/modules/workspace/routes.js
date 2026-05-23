import crypto from 'node:crypto';
import { prisma } from '../../core/prisma.js';
import { json, readJson } from '../../core/http.js';
import { hasRole } from '../../core/types.js';
export async function workspaceRoutes(req, ctx) {
    const url = new URL(req.url);
    if (req.method === 'GET' && url.pathname === '/v1/workspace/me') {
        const members = await prisma.workspaceMember.findMany({ where: { workspaceId: ctx.workspaceId }, include: { user: true } });
        return json({ workspaceId: ctx.workspaceId, role: ctx.role, members: members.map((m) => ({ id: m.userId, email: m.user.email, role: m.role })) });
    }
    if (req.method === 'POST' && url.pathname === '/v1/workspace/invites') {
        if (!hasRole(ctx.role, ['OWNER', 'ADMIN']))
            return json({ error: 'forbidden' }, 403);
        const body = (await readJson(req));
        if (!body.email)
            return json({ error: 'invalid_payload' }, 400);
        const token = crypto.randomBytes(20).toString('hex');
        const invite = await prisma.invite.create({
            data: {
                workspaceId: ctx.workspaceId,
                email: body.email,
                role: body.role || 'MEMBER',
                token,
                expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 7)
            }
        });
        return json({ inviteId: invite.id, token: invite.token, workspaceId: ctx.workspaceId, email: invite.email, role: invite.role }, 201);
    }
    if (req.method === 'POST' && url.pathname === '/v1/workspace/invites/accept') {
        const body = (await readJson(req));
        if (!body.token || !body.password)
            return json({ error: 'invalid_payload' }, 400);
        const invite = await prisma.invite.findUnique({ where: { token: body.token } });
        if (!invite || invite.acceptedAt || invite.expiresAt.getTime() < Date.now())
            return json({ error: 'invalid_invite' }, 400);
        const bcrypt = await import('bcryptjs');
        const passwordHash = await bcrypt.default.hash(body.password, 10);
        let user = await prisma.user.findUnique({ where: { email: invite.email } });
        if (!user) {
            user = await prisma.user.create({ data: { email: invite.email, passwordHash, name: body.name } });
        }
        await prisma.workspaceMember.upsert({
            where: { workspaceId_userId: { workspaceId: invite.workspaceId, userId: user.id } },
            create: { workspaceId: invite.workspaceId, userId: user.id, role: invite.role },
            update: { role: invite.role }
        });
        await prisma.invite.update({ where: { id: invite.id }, data: { acceptedAt: new Date() } });
        return json({ accepted: true, workspaceId: invite.workspaceId, role: invite.role });
    }
    return null;
}
