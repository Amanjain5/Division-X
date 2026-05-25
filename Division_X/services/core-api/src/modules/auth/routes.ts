import crypto from 'node:crypto';
import bcrypt from 'bcryptjs';
import { prisma } from '../../core/prisma.js';
import { json, readJson } from '../../core/http.js';
import { generateRefreshToken, signAccessToken } from '../../core/auth.js';
import { sendPasswordResetEmail } from '../../core/mail.js';

async function issueSession(userId: string, workspaceId: string, role: 'OWNER' | 'ADMIN' | 'MANAGER' | 'MEMBER') {
  const refreshToken = generateRefreshToken();
  const expiresAt = new Date(Date.now() + 1000 * 60 * 60 * 24 * 14);
  await prisma.session.create({ data: { userId, workspaceId, role, refreshToken, expiresAt } });
  const token = signAccessToken({ sub: userId, workspaceId, role });
  return { token, refreshToken };
}

export async function authRoutes(req: Request): Promise<Response | null> {
  const url = new URL(req.url);
  if (req.method === 'POST' && url.pathname === '/v1/auth/signup') {
    const body = (await readJson(req)) as { email?: string; password?: string; name?: string; workspaceName?: string };
    if (!body.email || !body.password || !body.workspaceName) return json({ error: 'invalid_payload' }, 400);

    const emailDomain = body.email.split('@')[1]?.toLowerCase();
    if (emailDomain) {
      const matchingPolicy = await prisma.workspacePolicy.findFirst({
        where: {
          permittedDomains: {
            contains: emailDomain
          }
        },
        include: {
          workspace: true
        }
      });

      if (matchingPolicy) {
        const domains = matchingPolicy.permittedDomains.split(',').map(d => d.trim().toLowerCase());
        if (domains.includes(emailDomain)) {
          if (!matchingPolicy.allowSelfRegistration) {
            return json({
              error: 'registration_locked_by_policy',
              message: 'Self-registration is disabled for your corporate domain. Please authenticate via your company Single Sign-On (SAML SSO) portal.'
            }, 403);
          }

          const passwordHash = await bcrypt.hash(body.password, 10);
          try {
            let user = await prisma.user.findUnique({ where: { email: body.email } });
            if (!user) {
              user = await prisma.user.create({
                data: {
                  email: body.email,
                  passwordHash,
                  name: body.name
                }
              });
            }

            const membership = await prisma.workspaceMember.create({
              data: {
                workspaceId: matchingPolicy.workspaceId,
                userId: user.id,
                role: 'MEMBER'
              }
            });

            const session = await issueSession(user.id, matchingPolicy.workspaceId, membership.role);
            return json({ ...session, userId: user.id, workspaceId: matchingPolicy.workspaceId, role: membership.role, email: body.email }, 201);
          } catch (err: any) {
            if (err.code === 'P2002') {
              return json({ error: 'email_already_exists' }, 400);
            }
            throw err;
          }
        }
      }
    }

    const passwordHash = await bcrypt.hash(body.password, 10);
    try {
      const created = await prisma.workspace.create({
        data: {
          name: body.workspaceName,
          members: {
            create: {
              role: 'OWNER',
              user: { create: { email: body.email, passwordHash, name: body.name } }
            }
          },
          policies: { create: { forceTimer: false, idleMinutes: 10, overtimeHours: 8, allowSelfRegistration: true } }
        },
        include: { members: { include: { user: true } } }
      });

      const member = created.members[0];
      const session = await issueSession(member.userId, created.id, member.role);
      return json({ ...session, userId: member.userId, workspaceId: created.id, role: member.role, email: body.email }, 201);
    } catch (err: any) {
      if (err.code === 'P2002') {
        return json({ error: 'email_already_exists' }, 400);
      }
      throw err;
    }
  }

  if (req.method === 'POST' && url.pathname === '/v1/auth/login') {
    const body = (await readJson(req)) as { email?: string; password?: string };
    if (!body.email || !body.password) return json({ error: 'invalid_payload' }, 400);

    const user = await prisma.user.findUnique({
      where: { email: body.email },
      include: { memberships: { include: { workspace: true } } }
    });
    if (!user) return json({ error: 'invalid_credentials' }, 401);

    const ok = await bcrypt.compare(body.password, user.passwordHash);
    if (!ok || user.memberships.length === 0) return json({ error: 'invalid_credentials' }, 401);

    const membership = user.memberships[0];
    const session = await issueSession(user.id, membership.workspaceId, membership.role);
    const workspaces = user.memberships.map((m: any) => ({
      id: m.workspaceId,
      name: m.workspace.name,
      role: m.role
    }));
    return json({
      ...session,
      userId: user.id,
      workspaceId: membership.workspaceId,
      role: membership.role,
      email: user.email,
      workspaces
    });
  }

  if (req.method === 'POST' && url.pathname === '/v1/auth/switch') {
    const body = (await readJson(req)) as { workspaceId?: string; userId?: string };
    const userId = body.userId || (req.headers.get('x-user-id') || undefined);
    if (!body.workspaceId || !userId) return json({ error: 'invalid_payload' }, 400);

    const membership = await prisma.workspaceMember.findFirst({
      where: { userId, workspaceId: body.workspaceId },
      include: { workspace: true }
    });
    if (!membership) return json({ error: 'forbidden' }, 403);

    const session = await issueSession(userId, membership.workspaceId, membership.role);
    return json({
      ...session,
      userId,
      workspaceId: membership.workspaceId,
      role: membership.role
    });
  }

  if (req.method === 'POST' && url.pathname === '/v1/auth/refresh') {
    const body = (await readJson(req)) as { refreshToken?: string };
    if (!body.refreshToken) return json({ error: 'invalid_payload' }, 400);

    const existing = await prisma.session.findUnique({ where: { refreshToken: body.refreshToken } });
    if (!existing || existing.expiresAt.getTime() < Date.now()) return json({ error: 'invalid_refresh' }, 401);

    const token = signAccessToken({ sub: existing.userId, workspaceId: existing.workspaceId, role: existing.role });
    return json({ token });
  }

  if (req.method === 'POST' && url.pathname === '/v1/auth/forgot-password') {
    const body = (await readJson(req)) as { email?: string };
    if (!body.email) return json({ error: 'invalid_payload' }, 400);

    const user = await prisma.user.findUnique({ where: { email: body.email } });
    if (!user) {
      // Return success to prevent email enumeration attacks
      return json({ success: true });
    }

    const token = crypto.randomBytes(32).toString('hex');
    const expires = new Date(Date.now() + 1000 * 60 * 60); // 1 hour expiration
    await prisma.user.update({
      where: { id: user.id },
      data: { resetToken: token, resetTokenExpires: expires }
    });

    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
    const resetLink = `${frontendUrl}/auth/reset-password?token=${token}`;

    sendPasswordResetEmail(user.email, user.name || '', resetLink).catch((err) => {
      console.error('❌ Failed to dispatch password reset email:', err);
    });

    return json({ success: true });
  }

  if (req.method === 'POST' && url.pathname === '/v1/auth/reset-password') {
    const body = (await readJson(req)) as { token?: string; password?: string };
    if (!body.token || !body.password || body.password.length < 6) {
      return json({ error: 'invalid_payload' }, 400);
    }

    const user = await prisma.user.findUnique({ where: { resetToken: body.token } });
    if (!user || !user.resetTokenExpires || user.resetTokenExpires.getTime() < Date.now()) {
      return json({ error: 'invalid_or_expired_token' }, 400);
    }

    const passwordHash = await bcrypt.hash(body.password, 10);
    await prisma.user.update({
      where: { id: user.id },
      data: { passwordHash, resetToken: null, resetTokenExpires: null }
    });

    return json({ success: true });
  }

  if (req.method === 'POST' && url.pathname === '/v1/auth/logout') {
    const body = (await readJson(req)) as { refreshToken?: string };
    if (body.refreshToken) {
      await prisma.session.deleteMany({ where: { refreshToken: body.refreshToken } });
    }
    return json({ success: true });
  }

  return null;
}
