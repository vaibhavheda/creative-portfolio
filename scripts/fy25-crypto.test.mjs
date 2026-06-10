// Round-trip tests for the FY25 envelope crypto. Runs in Node 22 (global WebCrypto).
import test from 'node:test';
import assert from 'node:assert/strict';
import { encryptJson, decryptEnvelope } from '../src/shared/fy25-crypto.js';

const SAMPLE = { tagline: { heroDisplay: 'What I' }, stats: { total: 313 }, clients: ['Acme Steel'] };
const PASS = 'correct horse battery';

test('encrypt → decrypt round-trips the payload', async () => {
  const env = await encryptJson(SAMPLE, PASS);
  const out = await decryptEnvelope(env, PASS);
  assert.deepEqual(out, SAMPLE);
});

test('wrong password rejects (GCM auth failure)', async () => {
  const env = await encryptJson(SAMPLE, PASS);
  await assert.rejects(decryptEnvelope(env, 'wrong horse'), { name: 'OperationError' });
});

test('envelope is versioned base64 ciphertext with no plaintext leakage', async () => {
  const env = await encryptJson(SAMPLE, PASS);
  assert.equal(env.v, 1);
  for (const k of ['salt', 'iv', 'ct']) assert.match(env[k], /^[A-Za-z0-9+/]+=*$/);
  assert.ok(!JSON.stringify(env).includes('Acme'));
});

test('fresh salt + IV per encryption — same payload, different ciphertext', async () => {
  const a = await encryptJson(SAMPLE, PASS);
  const b = await encryptJson(SAMPLE, PASS);
  assert.notEqual(a.ct, b.ct);
  assert.notEqual(a.salt, b.salt);
  assert.notEqual(a.iv, b.iv);
  assert.equal(atob(a.salt).length, 16);
  assert.equal(atob(a.iv).length, 12);
});
