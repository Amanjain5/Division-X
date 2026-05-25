import { prisma } from '../../core/prisma.js';
import { json, readJson } from '../../core/http.js';
import type { RequestContext } from '../../core/types.js';
import { writeAudit } from '../../core/audit.js';

export async function organizationRoutes(req: Request, ctx: RequestContext): Promise<Response | null> {
  const url = new URL(req.url);

  // 1. List parent organizations for the active user
  if (req.method === 'GET' && url.pathname === '/v1/organizations/me') {
    const orgMemberships = await prisma.organizationMember.findMany({
      where: { userId: ctx.userId },
      include: {
        organization: {
          include: {
            workspaces: true
          }
        }
      }
    });

    const items = orgMemberships.map(membership => ({
      id: membership.organization.id,
      name: membership.organization.name,
      billingPlan: membership.organization.billingPlan,
      createdAt: membership.organization.createdAt,
      role: membership.role,
      workspaces: membership.organization.workspaces.map(ws => ({
        id: ws.id,
        name: ws.name,
        customDomain: ws.customDomain
      }))
    }));

    return json({ items });
  }

  // 2. Create a new organization
  if (req.method === 'POST' && url.pathname === '/v1/organizations') {
    const body = (await readJson(req)) as { name?: string };
    if (!body.name) {
      return json({ error: 'bad_request', message: 'missing_name' }, 400);
    }

    const org = await prisma.organization.create({
      data: {
        name: body.name,
        orgMembers: {
          create: {
            userId: ctx.userId,
            role: 'ORG_ADMIN'
          }
        }
      }
    });

    await writeAudit({
      workspaceId: ctx.workspaceId,
      actorUserId: ctx.userId,
      action: 'organization.create',
      targetType: 'organization',
      targetId: org.id
    });

    return json({ organization: org }, 201);
  }

  // 3. Bind a workspace to an organization
  if (req.method === 'POST' && url.pathname.startsWith('/v1/organizations/') && url.pathname.endsWith('/workspaces')) {
    const pathParts = url.pathname.split('/');
    const orgId = pathParts[pathParts.length - 2];

    const body = (await readJson(req)) as { workspaceId?: string };
    if (!body.workspaceId) {
      return json({ error: 'bad_request', message: 'missing_workspace_id' }, 400);
    }

    // Security Check 1: User must be ORG_ADMIN in the target organization
    const orgMembership = await prisma.organizationMember.findUnique({
      where: {
        orgId_userId: {
          orgId,
          userId: ctx.userId
        }
      }
    });

    if (!orgMembership || orgMembership.role !== 'ORG_ADMIN') {
      return json({ error: 'forbidden', message: 'not_organization_admin' }, 403);
    }

    // Security Check 2: User must be OWNER or ADMIN in the target workspace
    const workspaceMembership = await prisma.workspaceMember.findUnique({
      where: {
        workspaceId_userId: {
          workspaceId: body.workspaceId,
          userId: ctx.userId
        }
      }
    });

    if (!workspaceMembership || !['OWNER', 'ADMIN'].includes(workspaceMembership.role)) {
      return json({ error: 'forbidden', message: 'insufficient_workspace_role' }, 403);
    }

    // Bind Workspace under Organization
    const updatedWorkspace = await prisma.workspace.update({
      where: { id: body.workspaceId },
      data: { organizationId: orgId }
    });

    await writeAudit({
      workspaceId: body.workspaceId,
      actorUserId: ctx.userId,
      action: 'workspace.bind_organization',
      targetType: 'workspace',
      targetId: body.workspaceId,
      metadata: { orgId }
    });

    return json({ workspace: updatedWorkspace });
  }

  // 4. Compliance & Audit Logs aggregator across all subsidiaries
  if (req.method === 'GET' && url.pathname.startsWith('/v1/organizations/') && url.pathname.endsWith('/compliance')) {
    const pathParts = url.pathname.split('/');
    const orgId = pathParts[pathParts.length - 2];

    // Security Check: User must be ORG_ADMIN
    const orgMembership = await prisma.organizationMember.findUnique({
      where: {
        orgId_userId: {
          orgId,
          userId: ctx.userId
        }
      }
    });

    if (!orgMembership || orgMembership.role !== 'ORG_ADMIN') {
      return json({ error: 'forbidden', message: 'not_organization_admin' }, 403);
    }

    // Fetch all child workspaces
    const workspaces = await prisma.workspace.findMany({
      where: { organizationId: orgId },
      select: { id: true, name: true }
    });

    const workspaceIds = workspaces.map(ws => ws.id);

    // Fetch aggregate audit logs across subsidiaries
    const auditLogs = await prisma.auditLog.findMany({
      where: {
        workspaceId: { in: workspaceIds }
      },
      orderBy: { createdAt: 'desc' },
      take: 100
    });

    // Count members across subsidiaries
    const totalMembersCount = await prisma.workspaceMember.count({
      where: {
        workspaceId: { in: workspaceIds }
      }
    });

    // Count projects across subsidiaries
    const totalProjectsCount = await prisma.project.count({
      where: {
        workspaceId: { in: workspaceIds }
      }
    });

    return json({
      workspaces: workspaces.map(ws => ({
        id: ws.id,
        name: ws.name,
        membersCount: 0 // Will map dynamically in frontend or DB query
      })),
      totalMembers: totalMembersCount,
      totalProjects: totalProjectsCount,
      auditLogs
    });
  }

  return null;
}
