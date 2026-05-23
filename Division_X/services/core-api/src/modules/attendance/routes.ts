import { prisma } from '../../core/prisma.js';
import { json } from '../../core/http.js';
import type { RequestContext } from '../../core/types.js';

export async function attendanceRoutes(req: Request, ctx: RequestContext): Promise<Response | null> {
  const url = new URL(req.url);

  if (req.method === 'POST' && url.pathname === '/v1/attendance/clock-in') {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const existing = await prisma.attendanceLog.findFirst({
      where: { workspaceId: ctx.workspaceId, userId: ctx.userId, date: today }
    });

    if (existing) {
      // If it exists, check if it's past 5 PM in server time
      const now = new Date();
      if (now.getHours() >= 17 && !existing.clockOutAt) {
        const outTime = new Date();
        outTime.setHours(17, 0, 0, 0);
        await prisma.attendanceLog.update({
          where: { id: existing.id },
          data: { clockOutAt: outTime }
        });
        existing.clockOutAt = outTime;
      }
      return json({ attendance: existing });
    }

    // Create new attendance
    const attendance = await prisma.attendanceLog.create({
      data: {
        workspaceId: ctx.workspaceId,
        userId: ctx.userId,
        date: today,
        clockInAt: new Date()
      }
    });

    return json({ attendance });
  }

  if (req.method === 'GET' && url.pathname === '/v1/attendance/today') {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const existing = await prisma.attendanceLog.findFirst({
      where: { workspaceId: ctx.workspaceId, userId: ctx.userId, date: today }
    });

    if (existing) {
      // Auto-cap if past 5 PM
      const now = new Date();
      if (now.getHours() >= 17 && !existing.clockOutAt) {
        const outTime = new Date();
        outTime.setHours(17, 0, 0, 0);
        await prisma.attendanceLog.update({
          where: { id: existing.id },
          data: { clockOutAt: outTime }
        });
        existing.clockOutAt = outTime;
      }
    }

    return json({ attendance: existing });
  }

  return null;
}
