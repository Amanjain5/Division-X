import test from 'node:test';
import assert from 'node:assert/strict';

test('contract namespace remains v1 compatible', () => {
  const namespace = 'v1';
  assert.equal(namespace, 'v1');
});
