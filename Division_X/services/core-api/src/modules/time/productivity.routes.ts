import { prisma } from '../../core/prisma.js';
import { json, readJson } from '../../core/http.js';
import type { RequestContext } from '../../core/types.js';
import { hasRole } from '../../core/types.js';
import { writeAudit } from '../../core/audit.js';
import { sendGlobalNotification } from '../../core/notifications.js';

async function getPolicy(workspaceId: string) { return prisma.workspacePolicy.findFirst({ where: { workspaceId } }); }

export async function timeRoutes(req: Request, ctx: RequestContext): Promise<Response | null> {
  const url = new URL(req.url);

  if (req.method === 'POST' && url.pathname === '/v1/break/start') {
    const br = await prisma.breakSession.create({ data: { workspaceId: ctx.workspaceId, userId: ctx.userId } });
    await writeAudit({ workspaceId: ctx.workspaceId, actorUserId: ctx.userId, action: 'break.start', targetType: 'break_session', targetId: br.id });
    await sendGlobalNotification(ctx.workspaceId, ctx.userId, 'Break Started', 'Has gone on a break');
    return json({ break: br }, 201);
  }
  if (req.method === 'POST' && url.pathname === '/v1/break/stop') {
    const running = await prisma.breakSession.findFirst({ where: { workspaceId: ctx.workspaceId, userId: ctx.userId, endedAt: null }, orderBy: { startedAt: 'desc' } });
    if (!running) return json({ message: 'no_running_break' });
    const br = await prisma.breakSession.update({ where: { id: running.id }, data: { endedAt: new Date() } });
    await sendGlobalNotification(ctx.workspaceId, ctx.userId, 'Break Stopped', 'Ended break session');
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
    await sendGlobalNotification(ctx.workspaceId, ctx.userId, 'Pomodoro Started', 'Began a Pomodoro focus session');
    return json({ started: true, focusMinutes: policy.pomodoroMinutes ?? 25, breakMinutes: policy.breakMinutes ?? 5, startedAt: new Date().toISOString() });
  }

  if (req.method === 'POST' && url.pathname === '/v1/time/idle') {
    const body = (await readJson(req)) as { keystrokes?: number; mouseMovement?: number; clicks?: number };
    await writeAudit({ 
      workspaceId: ctx.workspaceId, 
      actorUserId: ctx.userId, 
      action: 'idle.detected', 
      targetType: 'user', 
      targetId: ctx.userId, 
      metadata: {
        reason: 'user_inactivity',
        keystrokes: body.keystrokes || 0,
        mouseMovementPixels: body.mouseMovement || 0,
        clicks: body.clicks || 0
      }
    });
    
    const policy = await getPolicy(ctx.workspaceId);
    let autoPaused = false;
    let breakSession = null;

    if (policy?.autoPauseOnIdle) {
      const running = await prisma.timeEntry.findFirst({
        where: { workspaceId: ctx.workspaceId, userId: ctx.userId, endedAt: null },
        orderBy: { startedAt: 'desc' }
      });
      if (running) {
        await prisma.timeEntry.update({ where: { id: running.id }, data: { endedAt: new Date() } });
        await prisma.runningTimer.deleteMany({ where: { userId: ctx.userId } });
        breakSession = await prisma.breakSession.create({ data: { workspaceId: ctx.workspaceId, userId: ctx.userId } });
        await writeAudit({ workspaceId: ctx.workspaceId, actorUserId: ctx.userId, action: 'break.start', targetType: 'break_session', targetId: breakSession.id, metadata: { reason: 'auto_pause_on_idle' } });
        autoPaused = true;
      }
    }

    if (autoPaused) {
      await sendGlobalNotification(ctx.workspaceId, ctx.userId, 'Idle Auto-Pause', 'Timer automatically paused and break started due to idle inactivity');
    } else {
      await sendGlobalNotification(ctx.workspaceId, ctx.userId, 'Idle Detected', 'User has been inactive while active timer is running');
    }

    return json({ success: true, autoPaused, breakSession });
  }

  return null;
}
