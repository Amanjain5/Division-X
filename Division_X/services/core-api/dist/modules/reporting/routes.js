import { prisma } from '../../core/prisma.js';
import { json } from '../../core/http.js';
import { hasRole } from '../../core/types.js';
function toCsv(rows) {
    if (!rows.length)
        return 'id,description,userId,billable,approved,startedAt,endedAt,durationHours\n';
    const headers = Object.keys(rows[0]);
    const lines = [headers.join(',')];
    for (const row of rows)
        lines.push(headers.map((h) => JSON.stringify(row[h] ?? '')).join(','));
    return `${lines.join('\n')}\n`;
}
export async function reportingRoutes(req, ctx) {
    const url = new URL(req.url);
    if (req.method === 'GET' && url.pathname === '/v1/reports/time') {
        const approved = url.searchParams.get('approved');
        const billable = url.searchParams.get('billable');
        const userId = url.searchParams.get('userId');
        const from = url.searchParams.get('from');
        const to = url.searchParams.get('to');
        const page = Number(url.searchParams.get('page') || '1');
        const pageSize = Number(url.searchParams.get('pageSize') || '20');
        const skip = (page - 1) * pageSize;
        const where = { workspaceId: ctx.workspaceId, ...(userId ? { userId } : {}), ...(approved !== null ? { approved: approved === 'true' } : {}), ...(billable !== null ? { billable: billable === 'true' } : {}), ...(from || to ? { startedAt: { ...(from ? { gte: new Date(from) } : {}), ...(to ? { lte: new Date(to) } : {}) } } : {}) };
        const [items, totalItems, allForTotal] = await Promise.all([prisma.timeEntry.findMany({ where, orderBy: { startedAt: 'desc' }, skip, take: pageSize }), prisma.timeEntry.count({ where }), prisma.timeEntry.findMany({ where })]);
        const totalMs = allForTotal.reduce((sum, i) => sum + ((i.endedAt?.getTime() || Date.now()) - i.startedAt.getTime()), 0);
        return json({ totalHours: Number((totalMs / 3600000).toFixed(2)), itemsCount: totalItems, pagination: { page, pageSize, total: totalItems }, items: items.map((i) => ({ id: i.id, description: i.description, userId: i.userId, billable: i.billable, approved: i.approved, startedAt: i.startedAt, endedAt: i.endedAt, durationHours: Number((((i.endedAt?.getTime() || Date.now()) - i.startedAt.getTime()) / 3600000).toFixed(2)) })) });
    }
    if (req.method === 'GET' && url.pathname === '/v1/reports/time/export') {
        if (!hasRole(ctx.role, ['OWNER', 'ADMIN', 'MANAGER']))
            return json({ error: 'forbidden' }, 403);
        const items = await prisma.timeEntry.findMany({ where: { workspaceId: ctx.workspaceId }, orderBy: { startedAt: 'desc' } });
        const csv = toCsv(items.map((i) => ({ id: i.id, description: i.description, userId: i.userId, billable: i.billable, approved: i.approved, startedAt: i.startedAt.toISOString(), endedAt: i.endedAt ? i.endedAt.toISOString() : '', durationHours: Number((((i.endedAt?.getTime() || Date.now()) - i.startedAt.getTime()) / 3600000).toFixed(2)) })));
        return new Response(csv, { status: 200, headers: { 'content-type': 'text/csv; charset=utf-8', 'content-disposition': 'attachment; filename="time-report.csv"' } });
    }
    return null;
}
