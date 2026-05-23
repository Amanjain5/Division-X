import test from 'node:test';
import assert from 'node:assert/strict';
import { sendInviteEmail } from '../src/core/mail.js';

test('nodemailer invite email generation and template parsing', async () => {
  // Execute SMTP send with mocked local stream transporter
  const email = 'guest@enterprise.com';
  const workspaceName = 'Acme Corp';
  const inviteLink = 'http://localhost:3000/auth/accept-invite?token=abc123token';

  const info = await sendInviteEmail(email, workspaceName, inviteLink);

  // Validate dispatch envelope
  assert.ok(info.envelope);
  assert.equal(info.envelope.to[0], email);

  // Parse output message stream and inspect HTML content
  const rawMsg = info.message.toString();
  assert.match(rawMsg, /Join/);
  assert.match(rawMsg, /guest/);
  assert.match(rawMsg, /Workspace/);
});
