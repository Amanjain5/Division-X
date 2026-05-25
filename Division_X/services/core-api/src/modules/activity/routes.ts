import { prisma } from '../../core/prisma.js';
import { json } from '../../core/http.js';
import type { RequestContext } from '../../core/types.js';
import { hasRole } from '../../core/types.js';

export async function activityRoutes(req: Request, ctx: RequestContext): Promise<Response | null> {
  const url = new URL(req.url);

  if (req.method === 'GET' && url.pathname === '/v1/activity/timeline') {
    const userIdParam = url.searchParams.get('userId');
    const dateParam = url.searchParams.get('date'); // YYYY-MM-DD

    const targetUserId = userIdParam || ctx.userId;

    // Security Check: If requesting another user's activity, must be OWNER, ADMIN, or MANAGER
    if (targetUserId !== ctx.userId) {
      if (!hasRole(ctx.role, ['OWNER', 'ADMIN', 'MANAGER'])) {
        return json({ error: 'forbidden', message: 'insufficient_role' }, 403);
      }
      // Assert that target user belongs to the same workspace
      const isMember = await prisma.workspaceMember.findFirst({
        where: { workspaceId: ctx.workspaceId, userId: targetUserId }
      });
      if (!isMember) {
        return json({ error: 'not_found', message: 'user_not_found_in_workspace' }, 404);
      }
    }

    // Determine 24h interval for the requested date (default to today)
    const targetDate = dateParam ? new Date(dateParam) : new Date();
    if (isNaN(targetDate.getTime())) {
      return json({ error: 'bad_request', message: 'invalid_date_format' }, 400);
    }

    const startOfDay = new Date(targetDate);
    startOfDay.setHours(0, 0, 0, 0);

    const endOfDay = new Date(targetDate);
    endOfDay.setHours(23, 59, 59, 999);

    const policy = await prisma.workspacePolicy.findFirst({
      where: { workspaceId: ctx.workspaceId }
    }) || { idleMinutes: 10, autoPauseOnIdle: false };

    // Fetch parallel timeline data: TimeEntries, Breaks, AuditLogs (idle), AttendanceLogs
    const [timeEntries, breaks, idleAudits, attendance] = await Promise.all([
      prisma.timeEntry.findMany({
        where: {
          workspaceId: ctx.workspaceId,
          userId: targetUserId,
          startedAt: { lt: endOfDay },
          OR: [
            { endedAt: null },
            { endedAt: { gt: startOfDay } }
          ]
        },
        include: {
          project: true,
          task: true
        },
        orderBy: { startedAt: 'asc' }
      }),
      prisma.breakSession.findMany({
        where: {
          workspaceId: ctx.workspaceId,
          userId: targetUserId,
          startedAt: { lt: endOfDay },
          OR: [
            { endedAt: null },
            { endedAt: { gt: startOfDay } }
          ]
        },
        orderBy: { startedAt: 'asc' }
      }),
      prisma.auditLog.findMany({
        where: {
          workspaceId: ctx.workspaceId,
          actorUserId: targetUserId,
          action: 'idle.detected',
          createdAt: { gte: startOfDay, lte: endOfDay }
        },
        orderBy: { createdAt: 'asc' }
      }),
      prisma.attendanceLog.findFirst({
        where: {
          workspaceId: ctx.workspaceId,
          userId: targetUserId,
          date: startOfDay
        }
      })
    ]);

    // Build timeline intervals
    interface Interval {
      start: Date;
      end: Date;
      state: 'ACTIVE' | 'BREAK' | 'IDLE' | 'OFFLINE';
      metadata?: any;
    }

    const intervals: Interval[] = [];

    // 1. Initial State: the entire day is OFFLINE
    intervals.push({
      start: startOfDay,
      end: endOfDay,
      state: 'OFFLINE'
    });

    // 2. Attendance Overlay
    if (attendance) {
      const clockIn = new Date(attendance.clockInAt);
      const clockOut = attendance.clockOutAt ? new Date(attendance.clockOutAt) : new Date();

      // If user is clocked in, the interval between clockIn and clockOut is IDLE by default (unless active/break/etc overlays it)
      intervals.push({
        start: clockIn > startOfDay ? clockIn : startOfDay,
        end: clockOut < endOfDay ? clockOut : endOfDay,
        state: 'IDLE'
      });
    }

    // 3. TimeEntries (ACTIVE)
    for (const entry of timeEntries) {
      const start = new Date(entry.startedAt);
      const end = entry.endedAt ? new Date(entry.endedAt) : new Date();
      intervals.push({
        start: start > startOfDay ? start : startOfDay,
        end: end < endOfDay ? end : endOfDay,
        state: 'ACTIVE',
        metadata: {
          entryId: entry.id,
          description: entry.description,
          project: entry.project ? { id: entry.project.id, name: entry.project.name, color: entry.project.color } : null,
          task: entry.task ? { id: entry.task.id, name: entry.task.name } : null
        }
      });
    }

    // 4. Breaks (BREAK)
    for (const br of breaks) {
      const start = new Date(br.startedAt);
      const end = br.endedAt ? new Date(br.endedAt) : new Date();
      intervals.push({
        start: start > startOfDay ? start : startOfDay,
        end: end < endOfDay ? end : endOfDay,
        state: 'BREAK',
        metadata: { breakId: br.id }
      });
    }

    // 5. Idle audits (IDLE)
    const idleDurationMs = (policy.idleMinutes || 10) * 60 * 1000;
    for (const audit of idleAudits) {
      const eventTime = new Date(audit.createdAt);
      const start = new Date(eventTime.getTime() - idleDurationMs);
      intervals.push({
        start: start > startOfDay ? start : startOfDay,
        end: eventTime < endOfDay ? eventTime : endOfDay,
        state: 'IDLE',
        metadata: { auditId: audit.id }
      });
    }

    // Resolve Overlaps using a Boundary-scanning Sweep-line Algorithm
    const boundaries: { time: number; type: 'start' | 'end'; interval: Interval }[] = [];
    for (const interval of intervals) {
      if (interval.start.getTime() >= interval.end.getTime()) continue;
      boundaries.push({ time: interval.start.getTime(), type: 'start', interval });
      boundaries.push({ time: interval.end.getTime(), type: 'end', interval });
    }

    // Sort boundaries chronologically
    boundaries.sort((a, b) => a.time - b.time || (a.type === 'end' ? -1 : 1));

    const activeIntervals: Interval[] = [];
    const resolvedTimeline: { start: string; end: string; state: 'ACTIVE' | 'BREAK' | 'IDLE' | 'OFFLINE'; durationMinutes: number; metadata?: any }[] = [];

    const statePrecedence = {
      'BREAK': 3,
      'IDLE': 2,
      'ACTIVE': 1,
      'OFFLINE': 0
    };

    let lastTime = startOfDay.getTime();

    for (let i = 0; i < boundaries.length; i++) {
      const boundary = boundaries[i];
      const currentTime = boundary.time;

      if (currentTime > lastTime && activeIntervals.length > 0) {
        // Find interval with highest precedence
        let bestInterval = activeIntervals[0];
        for (const act of activeIntervals) {
          if (statePrecedence[act.state] > statePrecedence[bestInterval.state]) {
            bestInterval = act;
          }
        }

        const durationMinutes = Math.round((currentTime - lastTime) / 60000);
        if (durationMinutes > 0) {
          resolvedTimeline.push({
            start: new Date(lastTime).toISOString(),
            end: new Date(currentTime).toISOString(),
            state: bestInterval.state,
            durationMinutes,
            metadata: bestInterval.metadata
          });
        }
      }

      if (boundary.type === 'start') {
        activeIntervals.push(boundary.interval);
      } else {
        const idx = activeIntervals.indexOf(boundary.interval);
        if (idx !== -1) {
          activeIntervals.splice(idx, 1);
        }
      }

      lastTime = currentTime;
    }

    // Merge adjacent segments with identical states to keep barcode payload compact
    const consolidatedTimeline: typeof resolvedTimeline = [];
    for (const segment of resolvedTimeline) {
      if (consolidatedTimeline.length === 0) {
        consolidatedTimeline.push(segment);
        continue;
      }

      const prev = consolidatedTimeline[consolidatedTimeline.length - 1];
      if (prev.state === segment.state && JSON.stringify(prev.metadata) === JSON.stringify(segment.metadata)) {
        prev.end = segment.end;
        prev.durationMinutes += segment.durationMinutes;
      } else {
        consolidatedTimeline.push(segment);
      }
    }

    return json({
      date: startOfDay.toISOString().split('T')[0],
      userId: targetUserId,
      timeline: consolidatedTimeline,
      policy: {
        autoPauseOnIdle: policy.autoPauseOnIdle,
        idleMinutes: policy.idleMinutes
      }
    });
  }

  if (req.method === 'GET' && url.pathname === '/v1/activity/metrics') {
    const userIdParam = url.searchParams.get('userId');
    const targetUserId = userIdParam || ctx.userId;

    // Security Check: OWNER, ADMIN, MANAGER to view others
    if (targetUserId !== ctx.userId) {
      if (!hasRole(ctx.role, ['OWNER', 'ADMIN', 'MANAGER'])) {
        return json({ error: 'forbidden', message: 'insufficient_role' }, 403);
      }
      const isMember = await prisma.workspaceMember.findFirst({
        where: { workspaceId: ctx.workspaceId, userId: targetUserId }
      });
      if (!isMember) {
        return json({ error: 'not_found', message: 'user_not_found_in_workspace' }, 404);
      }
    }

    const policy = await prisma.workspacePolicy.findFirst({
      where: { workspaceId: ctx.workspaceId }
    }) || { idleMinutes: 10, autoPauseOnIdle: false };

    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    sevenDaysAgo.setHours(0, 0, 0, 0);

    const now = new Date();

    // Fetch last 7 days: Time entries, breaks, idle logs
    const [timeEntries, breaks, idleAudits, runningTimer] = await Promise.all([
      prisma.timeEntry.findMany({
        where: {
          workspaceId: ctx.workspaceId,
          userId: targetUserId,
          startedAt: { gte: sevenDaysAgo }
        }
      }),
      prisma.breakSession.findMany({
        where: {
          workspaceId: ctx.workspaceId,
          userId: targetUserId,
          startedAt: { gte: sevenDaysAgo }
        }
      }),
      prisma.auditLog.findMany({
        where: {
          workspaceId: ctx.workspaceId,
          actorUserId: targetUserId,
          action: 'idle.detected',
          createdAt: { gte: sevenDaysAgo }
        }
      }),
      prisma.timeEntry.findFirst({
        where: {
          workspaceId: ctx.workspaceId,
          userId: targetUserId,
          endedAt: null
        },
        include: {
          project: true,
          task: true
        }
      })
    ]);

    // Calculate Active Hours
    let activeMinutes = 0;
    for (const entry of timeEntries) {
      const start = entry.startedAt.getTime();
      const end = entry.endedAt ? entry.endedAt.getTime() : now.getTime();
      activeMinutes += Math.max(0, (end - start) / 60000);
    }

    // Calculate Break Hours
    let breakMinutes = 0;
    for (const br of breaks) {
      const start = br.startedAt.getTime();
      const end = br.endedAt ? br.endedAt.getTime() : now.getTime();
      breakMinutes += Math.max(0, (end - start) / 60000);
    }

    // Calculate Idle Hours (based on audit logs * policy idleMinutes)
    const idleCount = idleAudits.length;
    const idleMinutesPerEvent = policy.idleMinutes || 10;
    const idleMinutes = idleCount * idleMinutesPerEvent;

    // Active-to-Idle ratio
    const totalTrackedMinutes = activeMinutes + idleMinutes;
    const efficiencyIndex = totalTrackedMinutes > 0
      ? Math.round((activeMinutes / totalTrackedMinutes) * 100)
      : 100;

    // Break ratio (Break vs Active)
    const breakRatio = activeMinutes > 0
      ? Math.round((breakMinutes / activeMinutes) * 100)
      : 0;

    // Calculate consecutive tracking time for wellness nudge alerts
    let breakNudge = false;
    let breakNudgeMessage = '';
    let consecutiveActiveMinutes = 0;

    if (runningTimer) {
      const currentTimerStart = runningTimer.startedAt.getTime();
      
      // Find breaks since this timer started
      const breaksSinceStart = await prisma.breakSession.findMany({
        where: {
          workspaceId: ctx.workspaceId,
          userId: targetUserId,
          startedAt: { gte: runningTimer.startedAt }
        }
      });

      if (breaksSinceStart.length === 0) {
        consecutiveActiveMinutes = Math.floor((now.getTime() - currentTimerStart) / 60000);
        if (consecutiveActiveMinutes >= 120) { // 2 hours
          breakNudge = true;
          breakNudgeMessage = `You have been working continuously for over ${Math.floor(consecutiveActiveMinutes / 60)} hours without a break. Consider taking a 5-minute break to stay fresh and focused!`;
        }
      }
    }

    return json({
      userId: targetUserId,
      metrics: {
        weeklyActiveHours: parseFloat((activeMinutes / 60).toFixed(2)),
        weeklyIdleHours: parseFloat((idleMinutes / 60).toFixed(2)),
        weeklyBreakHours: parseFloat((breakMinutes / 60).toFixed(2)),
        efficiencyIndex,
        breakRatio,
        consecutiveActiveMinutes,
        breakNudge,
        breakNudgeMessage
      }
    });
  }

  return null;
}
