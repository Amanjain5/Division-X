import nodemailer from 'nodemailer';

const host = process.env.SMTP_HOST || '';
const port = Number(process.env.SMTP_PORT || 587);
const user = process.env.SMTP_USER || '';
const pass = process.env.SMTP_PASS || '';
const secure = process.env.SMTP_SECURE === 'true';
const from = process.env.SMTP_FROM || 'TheTime Workspace <invites@thetime.app>';

let transporter: nodemailer.Transporter | null = null;

// Initialize dynamic SMTP transporter
function getTransporter(): nodemailer.Transporter {
  if (transporter) return transporter;

  if (host && user && pass) {
    transporter = nodemailer.createTransport({
      host,
      port,
      secure,
      auth: { user, pass },
      pool: true, // Connection pooling for high-concurrency B2B saas
      maxConnections: 10,
      maxMessages: 100
    });
  } else {
    // Fallback: If SMTP env is missing, log mock messages in development
    console.warn('⚠️ SMTP mail service settings missing. Falling back to local development mock mailer.');
    transporter = nodemailer.createTransport({
      streamTransport: true,
      newline: 'unix',
      buffer: true
    });
  }

  return transporter;
}

export async function sendInviteEmail(email: string, workspaceName: string, inviteLink: string) {
  const mailer = getTransporter();

  // Premium, visually breathtaking B2B SaaS invitation HTML layout
  const htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Join ${workspaceName} on TheTime</title>
  <style>
    body {
      background-color: #0b0f19;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
      margin: 0;
      padding: 0;
      -webkit-font-smoothing: antialiased;
    }
    .wrapper {
      width: 100%;
      background-color: #0b0f19;
      padding: 40px 0;
    }
    .container {
      max-width: 580px;
      margin: 0 auto;
      background: rgba(17, 24, 39, 0.95);
      border: 1px solid rgba(255, 255, 255, 0.08);
      border-radius: 16px;
      overflow: hidden;
      box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.3), 0 10px 10px -5px rgba(0, 0, 0, 0.2);
    }
    .header {
      background: linear-gradient(135deg, #059669 0%, #10b981 100%);
      padding: 30px;
      text-align: center;
    }
    .header h1 {
      color: #ffffff;
      font-size: 26px;
      font-weight: 700;
      margin: 0;
      letter-spacing: -0.5px;
    }
    .content {
      padding: 40px 30px;
      color: #d1d5db;
      line-height: 1.6;
    }
    .content p {
      font-size: 16px;
      margin-top: 0;
      margin-bottom: 24px;
    }
    .workspace-badge {
      display: inline-block;
      background: rgba(5, 150, 105, 0.15);
      border: 1px solid rgba(5, 150, 105, 0.3);
      color: #34d399;
      font-size: 15px;
      font-weight: 600;
      padding: 6px 16px;
      border-radius: 9999px;
      margin-bottom: 24px;
    }
    .cta-container {
      text-align: center;
      margin: 35px 0;
    }
    .cta-button {
      display: inline-block;
      background: linear-gradient(135deg, #059669 0%, #047857 100%);
      color: #ffffff !important;
      text-decoration: none;
      font-size: 16px;
      font-weight: 600;
      padding: 14px 32px;
      border-radius: 8px;
      box-shadow: 0 4px 6px -1px rgba(5, 150, 105, 0.2), 0 2px 4px -1px rgba(5, 150, 105, 0.1);
      transition: transform 0.2s, box-shadow 0.2s;
    }
    .cta-button:hover {
      transform: translateY(-1px);
      box-shadow: 0 10px 15px -3px rgba(5, 150, 105, 0.3), 0 4px 6px -2px rgba(5, 150, 105, 0.15);
    }
    .footer {
      background-color: rgba(17, 24, 39, 0.5);
      border-top: 1px solid rgba(255, 255, 255, 0.05);
      padding: 24px 30px;
      text-align: center;
      color: #6b7280;
      font-size: 12px;
    }
    .footer a {
      color: #9ca3af;
      text-decoration: underline;
    }
    .divider {
      height: 1px;
      background: rgba(255, 255, 255, 0.05);
      margin: 30px 0;
    }
    .token-helper {
      font-size: 13px;
      color: #9ca3af;
      word-break: break-all;
    }
  </style>
</head>
<body>
  <div class="wrapper">
    <div class="container">
      <div class="header">
        <h1>Workspace Invitation</h1>
      </div>
      <div class="content">
        <p>Hello,</p>
        <p>You have been invited to join the following enterprise workspace on <strong>TheTime</strong> platform:</p>
        <div style="text-align: center;">
          <span class="workspace-badge">${workspaceName}</span>
        </div>
        <p>Click the button below to accept your invitation, create your enterprise user profile, and activate your workspace membership immediately:</p>
        <div class="cta-container">
          <a href="${inviteLink}" class="cta-button" target="_blank">Accept Invitation</a>
        </div>
        <div class="divider"></div>
        <p class="token-helper">
          If the button does not work, copy and paste the following URL into your web browser:<br>
          <a href="${inviteLink}" target="_blank" style="color: #10b981;">${inviteLink}</a>
        </p>
      </div>
      <div class="footer">
        <p>This is an automated notification from TheTime Enterprise. Please do not reply directly to this email.</p>
        <p>© 2026 TheTime Inc. All rights reserved.</p>
      </div>
    </div>
  </div>
</body>
</html>
  `;

  const info = await mailer.sendMail({
    from,
    to: email,
    subject: `Join ${workspaceName} on TheTime`,
    text: `You have been invited to join ${workspaceName} on TheTime. Please accept your invitation by visiting: ${inviteLink}`,
    html: htmlContent
  });

  // If using streamTransport, print the raw message for dev debugging/testing
  if ((info as any).message) {
    console.log(`✉️ Mock email dispatched to: ${email}`);
  }
  return info;
}

export async function sendPasswordResetEmail(email: string, userName: string, resetLink: string) {
  const mailer = getTransporter();

  // Premium, visually breathtaking B2B SaaS password reset HTML layout
  const htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Reset Your Password - TheTime</title>
  <style>
    body {
      background-color: #0b0f19;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
      margin: 0;
      padding: 0;
      -webkit-font-smoothing: antialiased;
    }
    .wrapper {
      width: 100%;
      background-color: #0b0f19;
      padding: 40px 0;
    }
    .container {
      max-width: 580px;
      margin: 0 auto;
      background: rgba(17, 24, 39, 0.95);
      border: 1px solid rgba(255, 255, 255, 0.08);
      border-radius: 16px;
      overflow: hidden;
      box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.3), 0 10px 10px -5px rgba(0, 0, 0, 0.2);
    }
    .header {
      background: linear-gradient(135deg, #059669 0%, #10b981 100%);
      padding: 30px;
      text-align: center;
    }
    .header h1 {
      color: #ffffff;
      font-size: 26px;
      font-weight: 700;
      margin: 0;
      letter-spacing: -0.5px;
    }
    .content {
      padding: 40px 30px;
      color: #d1d5db;
      line-height: 1.6;
    }
    .content p {
      font-size: 16px;
      margin-top: 0;
      margin-bottom: 24px;
    }
    .cta-container {
      text-align: center;
      margin: 35px 0;
    }
    .cta-button {
      display: inline-block;
      background: linear-gradient(135deg, #059669 0%, #047857 100%);
      color: #ffffff !important;
      text-decoration: none;
      font-size: 16px;
      font-weight: 600;
      padding: 14px 32px;
      border-radius: 8px;
      box-shadow: 0 4px 6px -1px rgba(5, 150, 105, 0.2), 0 2px 4px -1px rgba(5, 150, 105, 0.1);
      transition: transform 0.2s, box-shadow 0.2s;
    }
    .cta-button:hover {
      transform: translateY(-1px);
      box-shadow: 0 10px 15px -3px rgba(5, 150, 105, 0.3), 0 4px 6px -2px rgba(5, 150, 105, 0.15);
    }
    .footer {
      background-color: rgba(17, 24, 39, 0.5);
      border-top: 1px solid rgba(255, 255, 255, 0.05);
      padding: 24px 30px;
      text-align: center;
      color: #6b7280;
      font-size: 12px;
    }
    .divider {
      height: 1px;
      background: rgba(255, 255, 255, 0.05);
      margin: 30px 0;
    }
    .token-helper {
      font-size: 13px;
      color: #9ca3af;
      word-break: break-all;
    }
  </style>
</head>
<body>
  <div class="wrapper">
    <div class="container">
      <div class="header">
        <h1>Reset Password Request</h1>
      </div>
      <div class="content">
        <p>Hello ${userName || 'there'},</p>
        <p>We received a request to reset your password for your <strong>TheTime</strong> account. Click the button below to specify a new password:</p>
        <div class="cta-container">
          <a href="${resetLink}" class="cta-button" target="_blank">Reset Password</a>
        </div>
        <p>This password reset link is valid for **1 hour**. If you did not make this request, you can safely ignore this email; your password will remain secure and unchanged.</p>
        <div class="divider"></div>
        <p class="token-helper">
          If the button does not work, copy and paste the following URL into your web browser:<br>
          <a href="${resetLink}" target="_blank" style="color: #10b981;">${resetLink}</a>
        </p>
      </div>
      <div class="footer">
        <p>This is an automated notification from TheTime Enterprise. Please do not reply directly to this email.</p>
        <p>© 2026 TheTime Inc. All rights reserved.</p>
      </div>
    </div>
  </div>
</body>
</html>
  `;

  const info = await mailer.sendMail({
    from,
    to: email,
    subject: 'Reset Your Password - TheTime',
    text: `We received a request to reset your password for TheTime. Please reset your password by visiting: ${resetLink}`,
    html: htmlContent
  });

  if ((info as any).message) {
    console.log(`✉️ Password reset email mock dispatched to: ${email}`);
  }
  return info;
}
