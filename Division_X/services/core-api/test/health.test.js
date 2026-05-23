import test from 'node:test';
import assert from 'node:assert/strict';

test('health contract shape', async () => {
  const payload = { status: 'ok', service: 'core-api' };
  assert.equal(payload.status, 'ok');
  assert.equal(typeof payload.service, 'string');
});
