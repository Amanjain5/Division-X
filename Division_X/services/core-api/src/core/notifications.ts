import { prisma } from './prisma.js';
import nodemailer from 'nodemailer';

// Dynamic SMTP configuration for email alerts
const host = process.env.SMTP_HOST || '';
const port = Number(process.env.SMTP_PORT || 587);
const user = process.env.SMTP_USER || '';
const pass = process.env.SMTP_PASS || '';
const secure = process.env.SMTP_SECURE === 'true';
const from = process.env.SMTP_FROM || 'TheTime System <alerts@thetime.app>';

let transporter: nodemailer.Transporter | null = null;
function getTransporter(): nodemailer.Transporter {
  if (transporter) return transporter;
  if (host && user && pass) {
    transporter = nodemailer.createTransport({
      host,
      port,
      secure,
      auth: { user, pass },
      pool: true,
      maxConnections: 5
    });
  } else {
    transporter = nodemailer.createTransport({
      streamTransport: true,
      newline: 'unix',
      buffer: true
    });
  }
  return transporter;
}

// Memory pool mapping workspaceId -> Set of active admin WebSocket connections
export const activeAdminSockets = new Map<string, Set<any>>();

export function registerAdminSocket(workspaceId: string, socket: any) {
  if (!activeAdminSockets.has(workspaceId)) {
    activeAdminSockets.set(workspaceId, new Set());
  }
  activeAdminSockets.get(workspaceId)!.add(socket);
}

export function unregisterAdminSocket(workspaceId: string, socket: any) {
  const set = activeAdminSockets.get(workspaceId);
  if (set) {
    set.delete(socket);
    if (set.size === 0) {
      activeAdminSockets.delete(workspaceId);
    }
  }
}

/**
 * Dispatch real-time WebSocket alerts to connected browser desktops,
 * and asynchronously trigger visually breathtaking email notifications to all admins.
 */
export async function sendGlobalNotification(workspaceId: string, actorUserId: string, title: string, message: string) {
  // 1. Instantly push to active admin sockets in the workspace (sub-second latency)
  const sockets = activeAdminSockets.get(workspaceId);
  
  if (sockets && sockets.size > 0) {
    // Resolve employee name for the WS payload
    const actor = await prisma.user.findUnique({ where: { id: actorUserId }, select: { name: true, email: true } }).catch(() => null);
    const actorName = actor?.name || actor?.email || 'Someone';
    const wsPayload = JSON.stringify({
      eventId: Math.random().toString(36).slice(2, 9),
      title,
      userName: actorName,
      message
    });
    for (const socket of sockets) {
      try {
        if (socket.readyState === 1) { // OPEN state
          socket.send(wsPayload);
        }
      } catch (err) {
        console.error('❌ Failed to push event over WebSocket:', err);
      }
    }
  }

  // 2. Dispatch async SMTP notification emails to all workspace Owner and Admin accounts in the background
  sendEmailAlerts(workspaceId, actorUserId, title, message).catch((err) => {
    console.error('❌ Failed to dispatch email alerts:', err);
  });
}

async function sendEmailAlerts(workspaceId: string, actorUserId: string, title: string, message: string) {
  const [actor, admins, workspace] = await Promise.all([
    prisma.user.findUnique({ where: { id: actorUserId }, select: { name: true, email: true } }),
    prisma.workspaceMember.findMany({
      where: { workspaceId, role: { in: ['OWNER', 'ADMIN'] } },
      include: { user: true }
    }),
    prisma.workspace.findUnique({ where: { id: workspaceId }, select: { name: true } })
  ]);

  if (!admins || admins.length === 0) return;

  const actorName = actor?.name || actor?.email || 'Someone';
  const workspaceName = workspace?.name || 'Your Workspace';
  const mailer = getTransporter();

  // Vibrant aesthetic alerts template
  // Sunset amber gradient for Idle events, vibrant green for Timer events, etc.
  const isIdle = title.toLowerCase().includes('idle');
  const primaryColor = isIdle ? '#f59e0b' : '#059669';
  const secondaryColor = isIdle ? '#d97706' : '#047857';

  const htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
  <style>
    body { background-color: #0b0f19; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; margin: 0; padding: 0; }
    .wrapper { width: 100%; background-color: #0b0f19; padding: 40px 0; }
    .container { max-width: 580px; margin: 0 auto; background: rgba(17, 24, 39, 0.95); border: 1px solid rgba(255, 255, 255, 0.08); border-radius: 16px; overflow: hidden; box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.3); }
    .header { background: linear-gradient(135deg, ${primaryColor} 0%, ${secondaryColor} 100%); padding: 25px; text-align: center; }
    .header h1 { color: #ffffff; font-size: 22px; font-weight: 700; margin: 0; }
    .content { padding: 40px 30px; color: #d1d5db; line-height: 1.6; }
    .content p { font-size: 16px; margin: 0 0 20px 0; }
    .alert-card { background: rgba(255, 255, 255, 0.03); border: 1px solid rgba(255, 255, 255, 0.05); border-radius: 8px; padding: 20px; margin-bottom: 24px; }
    .alert-field { margin-bottom: 12px; }
    .alert-label { font-size: 12px; text-transform: uppercase; color: #9ca3af; font-weight: 600; letter-spacing: 0.05em; }
    .alert-value { font-size: 15px; color: #ffffff; font-weight: 500; }
    .footer { background-color: rgba(17, 24, 39, 0.5); border-top: 1px solid rgba(255, 255, 255, 0.05); padding: 24px 30px; text-align: center; color: #6b7280; font-size: 12px; }
  </style>
</head>
<body>
  <div class="wrapper">
    <div class="container">
      <div class="header">
        <h1>Global System Alert</h1>
      </div>
      <div class="content">
        <p>Hello Administrator,</p>
        <p>An employee activity has triggered a system notification inside your workspace <strong>${workspaceName}</strong>:</p>
        <div class="alert-card">
          <div class="alert-field">
            <div class="alert-label">Activity</div>
            <div class="alert-value" style="color: ${primaryColor}; font-weight: 600;">${title}</div>
          </div>
          <div class="alert-field">
            <div class="alert-label">Employee</div>
            <div class="alert-value">${actorName} (${actor?.email || 'N/A'})</div>
          </div>
          <div class="alert-field">
            <div class="alert-label">Details</div>
            <div class="alert-value">${message}</div>
          </div>
          <div class="alert-field" style="margin-bottom: 0;">
            <div class="alert-label">Timestamp</div>
            <div class="alert-value">${new Date().toLocaleString()}</div>
          </div>
        </div>
      </div>
      <div class="footer">
        <p>This is a real-time system alert from TheTime. Please configure your notification preferences in settings.</p>
        <p>© 2026 TheTime Inc. All rights reserved.</p>
      </div>
    </div>
  </div>
</body>
</html>
  `;

  await Promise.allSettled(
    admins.map(async (admin) => {
      if (!admin.user || !admin.user.email) return;
      try {
        await mailer.sendMail({
          from,
          to: admin.user.email,
          subject: `[TheTime Alert] ${actorName} - ${title}`,
          text: `Activity Alert: ${actorName} in ${workspaceName} - ${title}: ${message}`,
          html: htmlContent
        });
        console.log(`✉️ Email alert sent to admin: ${admin.user.email}`);
      } catch (err) {
        console.error(`❌ Failed to send email alert to admin ${admin.user.email}:`, err);
      }
    })
  );
}
