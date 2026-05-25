import crypto from 'node:crypto';
import { prisma } from '../../core/prisma.js';
import { json, readJson } from '../../core/http.js';
import type { RequestContext } from '../../core/types.js';
import { hasRole } from '../../core/types.js';
import { writeAudit } from '../../core/audit.js';
import { sendInviteEmail } from '../../core/mail.js';

export async function workspaceRoutes(req: Request, ctx: RequestContext): Promise<Response | null> {
  const url = new URL(req.url);

  // --- Workspace info ---
  if (req.method === 'GET' && url.pathname === '/v1/workspace/me') {
    const workspace = await prisma.workspace.findUnique({ where: { id: ctx.workspaceId } });
    const members = await prisma.workspaceMember.findMany({ where: { workspaceId: ctx.workspaceId }, include: { user: true } });
    return json({
      workspaceId: ctx.workspaceId,
      workspaceName: workspace?.name || '',
      timezone: workspace?.timezone || 'UTC',
      role: ctx.role,
      members: members.map((m: any) => ({ id: m.userId, email: m.user.email, name: m.user.name, role: m.role }))
    });
  }

  // --- Consolidated Workspace Bootstrap ---
  if (req.method === 'GET' && url.pathname === '/v1/workspace/bootstrap') {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const [workspace, members, projects, runningTimer, attendance, policy] = await Promise.all([
      prisma.workspace.findUnique({ where: { id: ctx.workspaceId } }),
      prisma.workspaceMember.findMany({ where: { workspaceId: ctx.workspaceId }, include: { user: true } }),
      prisma.project.findMany({ where: { workspaceId: ctx.workspaceId }, include: { client: true }, orderBy: { name: 'asc' } }),
      prisma.timeEntry.findFirst({ where: { workspaceId: ctx.workspaceId, userId: ctx.userId, endedAt: null }, orderBy: { startedAt: 'desc' }, include: { project: true } }),
      prisma.attendanceLog.findFirst({ where: { workspaceId: ctx.workspaceId, userId: ctx.userId, date: today } }),
      prisma.workspacePolicy.findFirst({ where: { workspaceId: ctx.workspaceId } })
    ]);

    return json({
      workspace: {
        id: ctx.workspaceId,
        name: workspace?.name || '',
        timezone: workspace?.timezone || 'UTC',
        customDomain: workspace?.customDomain || null
      },
      role: ctx.role,
      members: members.map((m: any) => ({ id: m.userId, email: m.user.email, name: m.user.name, role: m.role })),
      projects: projects,
      runningTimer: runningTimer || null,
      attendance: attendance || null,
      policy: policy || { forceTimer: false, idleMinutes: 10, overtimeHours: 8, pomodoroMinutes: 25, breakMinutes: 5, longRunningMinutes: 480, reminderEnabled: true, weekStartDay: 1 }
    });
  }

  // --- Update workspace ---
  if (req.method === 'PATCH' && url.pathname === '/v1/workspace') {
    if (!hasRole(ctx.role, ['OWNER', 'ADMIN'])) return json({ error: 'forbidden' }, 403);
    const body = (await readJson(req)) as { name?: string; timezone?: string };
    const updated = await prisma.workspace.update({ where: { id: ctx.workspaceId }, data: { ...(body.name ? { name: body.name } : {}), ...(body.timezone ? { timezone: body.timezone } : {}) } });
    await writeAudit({ workspaceId: ctx.workspaceId, actorUserId: ctx.userId, action: 'workspace.update', targetType: 'workspace', targetId: ctx.workspaceId, metadata: body });
    return json({ workspace: updated });
  }

  // --- Members ---
  if (req.method === 'PATCH' && url.pathname.startsWith('/v1/workspace/members/') && url.pathname.endsWith('/role')) {
    if (!hasRole(ctx.role, ['OWNER', 'ADMIN'])) return json({ error: 'forbidden' }, 403);
    const memberId = url.pathname.split('/')[4];
    const body = (await readJson(req)) as { role?: 'OWNER' | 'ADMIN' | 'MANAGER' | 'MEMBER' };
    if (!body.role) return json({ error: 'invalid_payload' }, 400);
    const member = await prisma.workspaceMember.findFirst({ where: { workspaceId: ctx.workspaceId, userId: memberId } });
    if (!member) return json({ error: 'not_found' }, 404);
    const updated = await prisma.workspaceMember.update({ where: { id: member.id }, data: { role: body.role } });
    await writeAudit({ workspaceId: ctx.workspaceId, actorUserId: ctx.userId, action: 'member.role_change', targetType: 'workspace_member', targetId: memberId, metadata: { newRole: body.role } });
    return json({ member: updated });
  }

  if (req.method === 'DELETE' && url.pathname.startsWith('/v1/workspace/members/')) {
    if (!hasRole(ctx.role, ['OWNER', 'ADMIN'])) return json({ error: 'forbidden' }, 403);
    const memberId = url.pathname.split('/').pop()!;
    const member = await prisma.workspaceMember.findFirst({ where: { workspaceId: ctx.workspaceId, userId: memberId } });
    if (!member) return json({ error: 'not_found' }, 404);
    await prisma.workspaceMember.delete({ where: { id: member.id } });
    await writeAudit({ workspaceId: ctx.workspaceId, actorUserId: ctx.userId, action: 'member.remove', targetType: 'workspace_member', targetId: memberId });
    return json({ removed: true });
  }

  // --- Active timers (for team monitor) ---
  if (req.method === 'GET' && url.pathname === '/v1/workspace/active-timers') {
    if (!hasRole(ctx.role, ['OWNER', 'ADMIN', 'MANAGER'])) return json({ error: 'forbidden' }, 403);
    const timers = await prisma.timeEntry.findMany({
      where: { workspaceId: ctx.workspaceId, endedAt: null },
      orderBy: { startedAt: 'desc' },
      include: {
        project: true,
        user: { select: { id: true, email: true, name: true } }
      }
    });
    const items = timers.map((t: any) => ({
      ...t,
      runningMinutes: Math.floor((Date.now() - t.startedAt.getTime()) / 60000)
    }));
    return json({ items });
  }

  // --- Invites ---
  if (req.method === 'GET' && url.pathname === '/v1/workspace/invites') {
    if (!hasRole(ctx.role, ['OWNER', 'ADMIN'])) return json({ error: 'forbidden' }, 403);
    const invites = await prisma.invite.findMany({ where: { workspaceId: ctx.workspaceId }, orderBy: { expiresAt: 'desc' } });
    return json({ items: invites });
  }

  if (req.method === 'POST' && url.pathname === '/v1/workspace/invites') {
    if (!hasRole(ctx.role, ['OWNER', 'ADMIN'])) return json({ error: 'forbidden' }, 403);
    const body = (await readJson(req)) as { email?: string; role?: 'OWNER' | 'ADMIN' | 'MANAGER' | 'MEMBER' };
    if (!body.email) return json({ error: 'invalid_payload' }, 400);

    // Verify if user is already a workspace member
    const existingMember = await prisma.workspaceMember.findFirst({
      where: {
        workspaceId: ctx.workspaceId,
        user: { email: body.email }
      }
    });
    if (existingMember) {
      return json({ error: 'user_already_member' }, 400);
    }

    const token = crypto.randomBytes(20).toString('hex');
    const invite = await prisma.invite.create({
      data: { workspaceId: ctx.workspaceId, email: body.email, role: body.role || 'MEMBER', token, expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 7) }
    });

    // Resolve workspace name and dispatch invitation email asynchronously
    const workspace = await prisma.workspace.findUnique({
      where: { id: ctx.workspaceId },
      select: { name: true }
    });
    const workspaceName = workspace?.name || 'Your Workspace';
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
    const inviteLink = `${frontendUrl}/auth/accept-invite?token=${token}`;

    sendInviteEmail(body.email, workspaceName, inviteLink).catch((err) => {
      console.error('❌ Failed to dispatch invitation email:', err);
    });

    await writeAudit({ workspaceId: ctx.workspaceId, actorUserId: ctx.userId, action: 'invite.create', targetType: 'invite', targetId: invite.id, metadata: { email: body.email, role: body.role } });
    return json({ inviteId: invite.id, token: invite.token, workspaceId: ctx.workspaceId, email: invite.email, role: invite.role }, 201);
  }

  if (req.method === 'DELETE' && url.pathname.startsWith('/v1/workspace/invites/')) {
    if (!hasRole(ctx.role, ['OWNER', 'ADMIN'])) return json({ error: 'forbidden' }, 403);
    const inviteId = url.pathname.split('/').pop()!;
    const invite = await prisma.invite.findFirst({ where: { id: inviteId, workspaceId: ctx.workspaceId } });
    if (!invite) return json({ error: 'not_found' }, 404);
    await prisma.invite.delete({ where: { id: inviteId } });
    await writeAudit({ workspaceId: ctx.workspaceId, actorUserId: ctx.userId, action: 'invite.revoke', targetType: 'invite', targetId: inviteId, metadata: { email: invite.email } });
    return json({ deleted: true });
  }

  if (req.method === 'POST' && url.pathname === '/v1/workspace/invites/accept') {
    const body = (await readJson(req)) as { token?: string; name?: string; password?: string };
    if (!body.token || !body.password) return json({ error: 'invalid_payload' }, 400);
    const invite = await prisma.invite.findUnique({ where: { token: body.token } });
    if (!invite || invite.acceptedAt || invite.expiresAt.getTime() < Date.now()) return json({ error: 'invalid_invite' }, 400);
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
    await writeAudit({ workspaceId: invite.workspaceId, actorUserId: user.id, action: 'invite.accept', targetType: 'invite', targetId: invite.id, metadata: { email: invite.email } });
    return json({ accepted: true, workspaceId: invite.workspaceId, role: invite.role });
  }

  // --- Teams ---
  if (req.method === 'GET' && url.pathname === '/v1/teams') {
    const teams = await prisma.team.findMany({ where: { workspaceId: ctx.workspaceId }, include: { members: true }, orderBy: { name: 'asc' } });
    return json({ items: teams });
  }

  if (req.method === 'POST' && url.pathname === '/v1/teams') {
    if (!hasRole(ctx.role, ['OWNER', 'ADMIN'])) return json({ error: 'forbidden' }, 403);
    const body = (await readJson(req)) as { name?: string };
    if (!body.name) return json({ error: 'invalid_payload' }, 400);
    const team = await prisma.team.create({ data: { workspaceId: ctx.workspaceId, name: body.name } });
    await writeAudit({ workspaceId: ctx.workspaceId, actorUserId: ctx.userId, action: 'team.create', targetType: 'team', targetId: team.id });
    return json({ team }, 201);
  }

  if (req.method === 'PATCH' && url.pathname.startsWith('/v1/teams/') && !url.pathname.includes('/members')) {
    if (!hasRole(ctx.role, ['OWNER', 'ADMIN'])) return json({ error: 'forbidden' }, 403);
    const teamId = url.pathname.split('/').pop()!;
    const body = (await readJson(req)) as { name?: string };
    const team = await prisma.team.update({ where: { id: teamId }, data: { ...(body.name ? { name: body.name } : {}) } });
    await writeAudit({ workspaceId: ctx.workspaceId, actorUserId: ctx.userId, action: 'team.update', targetType: 'team', targetId: teamId, metadata: body });
    return json({ team });
  }

  if (req.method === 'DELETE' && url.pathname.startsWith('/v1/teams/') && !url.pathname.includes('/members')) {
    if (!hasRole(ctx.role, ['OWNER', 'ADMIN'])) return json({ error: 'forbidden' }, 403);
    const teamId = url.pathname.split('/').pop()!;
    await prisma.team.delete({ where: { id: teamId } });
    await writeAudit({ workspaceId: ctx.workspaceId, actorUserId: ctx.userId, action: 'team.delete', targetType: 'team', targetId: teamId });
    return json({ deleted: true });
  }

  // Team members
  if (req.method === 'POST' && url.pathname.match(/^\/v1\/teams\/[^/]+\/members$/)) {
    if (!hasRole(ctx.role, ['OWNER', 'ADMIN', 'MANAGER'])) return json({ error: 'forbidden' }, 403);
    const teamId = url.pathname.split('/')[3];
    const body = (await readJson(req)) as { userId?: string };
    if (!body.userId) return json({ error: 'invalid_payload' }, 400);
    const member = await prisma.teamMember.create({ data: { teamId, userId: body.userId } }).catch(() => null);
    if (member) {
      await writeAudit({ workspaceId: ctx.workspaceId, actorUserId: ctx.userId, action: 'team.member_add', targetType: 'team', targetId: teamId, metadata: { userId: body.userId } });
    }
    return json({ member: member || { teamId, userId: body.userId } }, 201);
  }

  if (req.method === 'DELETE' && url.pathname.match(/^\/v1\/teams\/[^/]+\/members\/[^/]+$/)) {
    if (!hasRole(ctx.role, ['OWNER', 'ADMIN', 'MANAGER'])) return json({ error: 'forbidden' }, 403);
    const parts = url.pathname.split('/');
    const teamId = parts[3];
    const userId = parts[5];
    await prisma.teamMember.deleteMany({ where: { teamId, userId } });
    await writeAudit({ workspaceId: ctx.workspaceId, actorUserId: ctx.userId, action: 'team.member_remove', targetType: 'team', targetId: teamId, metadata: { userId } });
    return json({ removed: true });
  }

  return null;
}
