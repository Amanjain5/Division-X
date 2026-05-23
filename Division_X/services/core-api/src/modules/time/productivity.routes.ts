import { prisma } from '../../core/prisma.js';
import { json, readJson } from '../../core/http.js';
import type { RequestContext } from '../../core/types.js';
import { hasRole } from '../../core/types.js';
import { writeAudit } from '../../core/audit.js';

async function getPolicy(workspaceId: string) { return prisma.workspacePolicy.findFirst({ where: { workspaceId } }); }

export async function timeRoutes(req: Request, ctx: RequestContext): Promise<Response | null> {
  const url = new URL(req.url);

  if (req.method === 'POST' && url.pathname === '/v1/break/start') {
    const br = await prisma.breakSession.create({ data: { workspaceId: ctx.workspaceId, userId: ctx.userId } });
    await writeAudit({ workspaceId: ctx.workspaceId, actorUserId: ctx.userId, action: 'break.start', targetType: 'break_session', targetId: br.id });
    return json({ break: br }, 201);
  }
  if (req.method === 'POST' && url.pathname === '/v1/break/stop') {
    const running = await prisma.breakSession.findFirst({ where: { workspaceId: ctx.workspaceId, userId: ctx.userId, endedAt: null }, orderBy: { startedAt: 'desc' } });
    if (!running) return json({ message: 'no_running_break' });
    const br = await prisma.breakSession.update({ where: { id: running.id }, data: { endedAt: new Date() } });
    return json({ break: br });
  }

  if (req.method === 'GET' && url.pathname === '/v1/timer/alerts') {
    const policy = (await getPolicy(ctx.workspaceId)) || { idleMinutes: 10, overtimeHours: 8, longRunningMinutes: 480 };
    const running = await prisma.timeEntry.findFirst({ where: { workspaceId: ctx.workspaceId, userId: ctx.userId, endedAt: null }, orderBy: { startedAt: 'desc' } });
    const now = Date.now();
    const runningMinutes = running ? Math.floor((now - running.startedAt.getTime()) / 60000) : 0;
    return json({ longRunning: runningMinutes > (policy.longRunningMinutes || 480), runningMinutes, overtimeThreshold: policy.overtimeHours });
  }

  if (req.method === 'POST' && url.pathname === '/v1/pomodoro/start') {
    const policy = (await getPolicy(ctx.workspaceId)) || { pomodoroMinutes: 25, breakMinutes: 5 };
    return json({ started: true, focusMinutes: policy.pomodoroMinutes ?? 25, breakMinutes: policy.breakMinutes ?? 5, startedAt: new Date().toISOString() });
  }

  return null;
}
