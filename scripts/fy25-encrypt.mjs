#!/usr/bin/env node
// Encrypts content/fy25.private.json → public/fy25.enc (AES-256-GCM envelope).
// Password comes from FY25_PASSWORD or a hidden interactive prompt. The
// password and the plaintext never touch the repo; only the envelope does.
// Usage: FY25_PASSWORD='...' npm run fy25:encrypt   (or run bare and type it)
import { readFile, writeFile } from 'node:fs/promises';
import { createInterface } from 'node:readline';
import { encryptJson, decryptEnvelope } from '../src/shared/fy25-crypto.js';

const SRC = new URL('../content/fy25.private.json', import.meta.url);
const OUT = new URL('../public/fy25.enc', import.meta.url);

function promptHidden(question) {
  return new Promise((resolve) => {
    const rl = createInterface({ input: process.stdin, output: process.stdout });
    const write = rl._writeToOutput.bind(rl);
    rl._writeToOutput = (s) => { if (s.includes(question)) write(s); };
    rl.question(question, (answer) => { rl.close(); process.stdout.write('\n'); resolve(answer); });
  });
}

const content = JSON.parse(await readFile(SRC, 'utf8'));
const password = process.env.FY25_PASSWORD || await promptHidden('FY25 password: ');
if (!password || password.length < 8) {
  console.error('Refusing: password shorter than 8 chars. Use a 3+ word passphrase.');
  process.exit(1);
}
const envelope = await encryptJson(content, password);
await decryptEnvelope(envelope, password); // round-trip sanity before writing
await writeFile(OUT, JSON.stringify(envelope));
console.log('Wrote public/fy25.enc — ' + JSON.stringify(envelope).length + ' bytes of ciphertext, safe to commit.');
