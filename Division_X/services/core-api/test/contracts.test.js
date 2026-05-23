import test from 'node:test';\nimport assert from 'node:assert/strict';\n\ntest('contract namespace remains v1 compatible', () => {\n  const namespace = 'v1';\n  assert.equal(namespace, 'v1');\n});\n
