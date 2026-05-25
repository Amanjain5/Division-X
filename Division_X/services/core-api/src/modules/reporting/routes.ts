import { prisma } from '../../core/prisma.js';
import { json } from '../../core/http.js';
import type { RequestContext } from '../../core/types.js';
import { hasRole } from '../../core/types.js';

function toCsv(rows: Array<Record<string, string | number | boolean>>) {
  if (!rows.length) return 'id,description,userId,project,billable,approved,startedAt,endedAt,durationHours\n';
  const headers = Object.keys(rows[0]);
  const lines = [headers.join(',')];
  for (const row of rows) lines.push(headers.map((h) => JSON.stringify(row[h] ?? '')).join(','));
  return `${lines.join('\n')}\n`;
}

function durationHours(start: Date, end: Date | null): number {
  const ms = (end?.getTime() || Date.now()) - start.getTime();
  return Number((ms / 3600000).toFixed(2));
}

export async function reportingRoutes(req: Request, ctx: RequestContext): Promise<Response | null> {
  const url = new URL(req.url);

  // --- Time report ---
  if (req.method === 'GET' && url.pathname === '/v1/reports/time') {
    const approved = url.searchParams.get('approved');
    const billable = url.searchParams.get('billable');
    const userId = url.searchParams.get('userId');
    const projectId = url.searchParams.get('projectId');
    const from = url.searchParams.get('from');
    const to = url.searchParams.get('to');
    const groupBy = url.searchParams.get('groupBy'); // project | user | tag
    const page = Number(url.searchParams.get('page') || '1');
    const pageSize = Number(url.searchParams.get('pageSize') || '20');
    const skip = (page - 1) * pageSize;

    const where: any = {
      workspaceId: ctx.workspaceId,
      ...(hasRole(ctx.role, ['OWNER', 'ADMIN', 'MANAGER']) ? (userId ? { userId } : {}) : { userId: ctx.userId }),
      ...(projectId ? { projectId } : {}),
      ...(approved !== null && approved !== undefined ? { approved: approved === 'true' } : {}),
      ...(billable !== null && billable !== undefined ? { billable: billable === 'true' } : {}),
      ...(from || to ? { startedAt: { ...(from ? { gte: new Date(from) } : {}), ...(to ? { lte: new Date(to) } : {}) } } : {})
    };

    const [items, totalItems, allForTotal, projects] = await Promise.all([
      prisma.timeEntry.findMany({ where, orderBy: { startedAt: 'desc' }, skip, take: pageSize, include: { project: true, task: true } }),
      prisma.timeEntry.count({ where }),
      prisma.timeEntry.findMany({
        where,
        select: {
          startedAt: true,
          endedAt: true,
          billable: true,
          approved: true,
          projectId: true
        }
      }),
      prisma.project.findMany({ where: { workspaceId: ctx.workspaceId } })
    ]);

    const totalMs = allForTotal.reduce((sum: number, i: any) => sum + ((i.endedAt?.getTime() || Date.now()) - i.startedAt.getTime()), 0);
    const billableMs = allForTotal.filter((i: any) => i.billable).reduce((sum: number, i: any) => sum + ((i.endedAt?.getTime() || Date.now()) - i.startedAt.getTime()), 0);
    const approvedCount = allForTotal.filter((i: any) => i.approved).length;

    // Optional grouping
    let grouped: any = null;
    if (groupBy === 'project') {
      const projectMap = Object.fromEntries(projects.map((p) => [p.id, p]));
      const map: Record<string, { name: string; hours: number; count: number; color: string }> = {};
      for (const e of allForTotal) {
        const key = e.projectId || 'unassigned';
        if (!map[key]) {
          const proj = e.projectId ? projectMap[e.projectId] : null;
          map[key] = {
            name: proj?.name || 'No Project',
            hours: 0,
            count: 0,
            color: proj?.color || '#6B7280'
          };
        }
        map[key].hours += durationHours(e.startedAt, e.endedAt);
        map[key].count++;
      }
      grouped = Object.entries(map).map(([id, v]) => ({ id, ...v, hours: Number(v.hours.toFixed(2)) }));
    }

    return json({
      totalHours: Number((totalMs / 3600000).toFixed(2)),
      billableHours: Number((billableMs / 3600000).toFixed(2)),
      itemsCount: totalItems,
      approvedCount,
      grouped,
      pagination: { page, pageSize, total: totalItems },
      items: items.map((i: any) => ({
        id: i.id, description: i.description, userId: i.userId, billable: i.billable, approved: i.approved, invoiced: i.invoiced,
        projectName: i.project?.name || null, taskName: i.task?.name || null,
        startedAt: i.startedAt, endedAt: i.endedAt,
        durationHours: durationHours(i.startedAt, i.endedAt)
      }))
    });
  }

  // --- Team activity report ---
  if (req.method === 'GET' && url.pathname === '/v1/reports/activity') {
    if (!hasRole(ctx.role, ['OWNER', 'ADMIN', 'MANAGER'])) return json({ error: 'forbidden' }, 403);
    const members = await prisma.workspaceMember.findMany({ where: { workspaceId: ctx.workspaceId }, include: { user: true } });
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const todayEntries = await prisma.timeEntry.findMany({ where: { workspaceId: ctx.workspaceId, startedAt: { gte: today } } });
    const runningEntries = await prisma.timeEntry.findMany({ where: { workspaceId: ctx.workspaceId, endedAt: null } });
    const policy = await prisma.workspacePolicy.findFirst({ where: { workspaceId: ctx.workspaceId } });

    const memberActivity = members.map((m: any) => {
      const myEntries = todayEntries.filter((e: any) => e.userId === m.userId);
      const totalMs = myEntries.reduce((sum: number, e: any) => sum + ((e.endedAt?.getTime() || Date.now()) - e.startedAt.getTime()), 0);
      const running = runningEntries.find((e: any) => e.userId === m.userId);
      const runningMinutes = running ? Math.floor((Date.now() - running.startedAt.getTime()) / 60000) : 0;
      return {
        userId: m.userId, email: m.user.email, name: m.user.name, role: m.role,
        todayHours: Number((totalMs / 3600000).toFixed(2)),
        isRunning: !!running,
        runningMinutes,
        isOvertime: totalMs / 3600000 > (policy?.overtimeHours || 8),
        isLongRunning: runningMinutes > (policy?.longRunningMinutes || 480),
        entryCount: myEntries.length
      };
    });

    return json({
      totalActive: runningEntries.length,
      totalMembers: members.length,
      members: memberActivity
    });
  }

  // --- CSV export ---
  if (req.method === 'GET' && url.pathname === '/v1/reports/time/export') {
    if (!hasRole(ctx.role, ['OWNER', 'ADMIN', 'MANAGER'])) return json({ error: 'forbidden' }, 403);
    const items = await prisma.timeEntry.findMany({ where: { workspaceId: ctx.workspaceId }, orderBy: { startedAt: 'desc' }, include: { project: true } });
    const csv = toCsv(items.map((i: any) => ({
      id: i.id, description: i.description, userId: i.userId, project: i.project?.name || '', billable: i.billable, approved: i.approved,
      startedAt: i.startedAt.toISOString(), endedAt: i.endedAt ? i.endedAt.toISOString() : '',
      durationHours: durationHours(i.startedAt, i.endedAt)
    })));
    return new Response(csv, { status: 200, headers: { 'content-type': 'text/csv; charset=utf-8', 'content-disposition': 'attachment; filename="time-report.csv"' } });
  }

  return null;
}
