# FY25 Locked Deck Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a password-locked FY25 year-in-review to the OS portfolio — visible locked folder on both faces, AES-256-GCM-encrypted content, native Keynote-style deck window on unlock.

**Architecture:** Content ships only as ciphertext (`public/fy25.enc`); a PBKDF2-derived AES-GCM key decrypts it in-browser. An isomorphic crypto module is shared by the build-time encrypt script, the Node tests, and the runtime. A pure string-building slide renderer is shared by the desktop deck window and the phone viewer. Registry-driven integration: one `locked: true` entry in `PROJECTS` feeds Finder, phone grid, and Spotlight.

**Tech Stack:** Vanilla ES modules, Vite 5, WebCrypto (browser + Node 22), `node --test`. No new dependencies.

**Spec:** `docs/superpowers/specs/2026-06-10-fy25-locked-deck-design.md`

**SECURITY RULE FOR THIS PLAN:** This plan and the repo are public. Real FY25 content (client names) must NEVER appear in this file, in any committed file, or in any commit message. All committed test/dev data uses the fake fixture from Task 2. The real content enters only via the gitignored `content/fy25.private.json` in Task 9, executed locally.

**COMMIT RULE:** All commits go on `feature/fy25-locked-deck`. The user has approved committing on this branch as tasks complete (per-task atomic commits). NEVER run `git push` without explicit user approval. NEVER `git add content/` (it is gitignored — verify before every commit with `git status`).

---

### Task 0: Branch + docs commit

**Files:**
- Commit: `docs/superpowers/specs/2026-06-10-fy25-locked-deck-design.md`, `docs/superpowers/plans/2026-06-10-fy25-locked-deck.md`

- [ ] **Step 0.1: Create branch**

```bash
cd /Users/vaibhavheda/Documents/creative-portfolio
git checkout -b feature/fy25-locked-deck
```

Expected: `Switched to a new branch 'feature/fy25-locked-deck'`

- [ ] **Step 0.2: Commit design doc + plan**

```bash
git add docs/superpowers/specs/2026-06-10-fy25-locked-deck-design.md docs/superpowers/plans/2026-06-10-fy25-locked-deck.md
git commit -m "docs: FY25 locked deck design spec + implementation plan"
```

Do NOT add `.superpowers/` (brainstorm mockups stay local).

---

### Task 1: Isomorphic crypto module (TDD)

**Files:**
- Create: `src/shared/fy25-crypto.js`
- Test: `scripts/fy25-crypto.test.mjs`
- Modify: `package.json` (add `test` script)

- [ ] **Step 1.1: Add test script to package.json**

In `package.json`, change the `scripts` block to:

```json
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "preview": "vite preview",
    "test": "node --test scripts/",
    "fy25:encrypt": "node scripts/fy25-encrypt.mjs"
  },
```

(`fy25:encrypt` points at a script created in Task 2 — that's fine, nothing calls it yet.)

- [ ] **Step 1.2: Write the failing tests**

Create `scripts/fy25-crypto.test.mjs`:

```js
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
  await assert.rejects(decryptEnvelope(env, 'wrong horse'));
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
});
```

- [ ] **Step 1.3: Run tests to verify they fail**

Run: `npm test`
Expected: FAIL — `Cannot find module '../src/shared/fy25-crypto.js'`

- [ ] **Step 1.4: Implement the crypto module**

Create `src/shared/fy25-crypto.js`:

```js
// FY25 gate — AES-256-GCM envelope crypto. Isomorphic: the same module runs in
// the browser (unlock flow), in Node tests, and in scripts/fy25-encrypt.mjs.
// There is no stored password hash anywhere; the GCM auth tag failing on
// decrypt IS the wrong-password signal. The ciphertext envelope is public, so
// the only real defense against offline brute force is passphrase strength —
// PBKDF2 at 310k iterations just makes guessing slow.

var ITERATIONS = 310000;
var KEY_STORE = 'vheda-fy25-key';
var ENC_URL = '/fy25.enc';

function b64(buf) {
  var bytes = new Uint8Array(buf), s = '';
  for (var i = 0; i < bytes.length; i++) s += String.fromCharCode(bytes[i]);
  return btoa(s);
}
function unb64(str) {
  var s = atob(str), bytes = new Uint8Array(s.length);
  for (var i = 0; i < s.length; i++) bytes[i] = s.charCodeAt(i);
  return bytes;
}

async function deriveKey(password, salt) {
  var material = await crypto.subtle.importKey(
    'raw', new TextEncoder().encode(password), 'PBKDF2', false, ['deriveKey']);
  return crypto.subtle.deriveKey(
    { name: 'PBKDF2', hash: 'SHA-256', salt: salt, iterations: ITERATIONS },
    material, { name: 'AES-GCM', length: 256 }, true, ['encrypt', 'decrypt']);
}

async function decryptWithKey(envelope, key) {
  var pt = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv: unb64(envelope.iv) }, key, unb64(envelope.ct));
  return JSON.parse(new TextDecoder().decode(pt));
}

// Build-time + tests: object → { v, salt, iv, ct } envelope (all base64).
export async function encryptJson(obj, password) {
  var salt = crypto.getRandomValues(new Uint8Array(16));
  var iv = crypto.getRandomValues(new Uint8Array(12));
  var key = await deriveKey(password, salt);
  var ct = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv: iv }, key, new TextEncoder().encode(JSON.stringify(obj)));
  return { v: 1, salt: b64(salt), iv: b64(iv), ct: b64(ct) };
}

export async function decryptEnvelope(envelope, password) {
  var key = await deriveKey(password, unb64(envelope.salt));
  return decryptWithKey(envelope, key);
}

// ---- Browser-only session flow (never called from Node) ----
var cachedContent = null;
var envelopePromise = null;

function fetchEnvelope() {
  if (!envelopePromise) {
    envelopePromise = fetch(ENC_URL).then(function (r) {
      if (!r.ok) throw new Error('fy25.enc missing (' + r.status + ')');
      return r.json();
    });
    // A network failure shouldn't poison every later attempt.
    envelopePromise.catch(function () { envelopePromise = null; });
  }
  return envelopePromise;
}

export function isUnlocked() { return cachedContent !== null; }

// Rejects on wrong password. On success caches content in memory and the raw
// AES key in sessionStorage — survives a mid-demo refresh, dies with the tab.
export async function unlockWithPassword(password) {
  var envelope = await fetchEnvelope();
  var key = await deriveKey(password, unb64(envelope.salt));
  cachedContent = await decryptWithKey(envelope, key);
  try {
    var raw = await crypto.subtle.exportKey('raw', key);
    sessionStorage.setItem(KEY_STORE, b64(raw));
  } catch (e) { /* private mode — persistence is best-effort */ }
  return cachedContent;
}

// Silent restore on load. Resolves null when still locked (no prompt shown).
export async function tryRestore() {
  if (cachedContent) return cachedContent;
  var rawB64 = null;
  try { rawB64 = sessionStorage.getItem(KEY_STORE); } catch (e) {}
  if (!rawB64) return null;
  try {
    var key = await crypto.subtle.importKey('raw', unb64(rawB64), 'AES-GCM', false, ['decrypt']);
    cachedContent = await decryptWithKey(await fetchEnvelope(), key);
    return cachedContent;
  } catch (e) {
    try { sessionStorage.removeItem(KEY_STORE); } catch (e2) {}
    return null;
  }
}
```

- [ ] **Step 1.5: Run tests to verify they pass**

Run: `npm test`
Expected: `# pass 4`, `# fail 0` (PBKDF2 at 310k iterations makes this take a few seconds — normal)

- [ ] **Step 1.6: Commit**

```bash
git add src/shared/fy25-crypto.js scripts/fy25-crypto.test.mjs package.json
git commit -m "feat: AES-256-GCM envelope crypto for FY25 gate (isomorphic, tested)"
```

---

### Task 2: Encrypt CLI, fixture content, .gitignore

**Files:**
- Create: `scripts/fy25-encrypt.mjs`
- Create: `scripts/fy25-sample.json` (committed — FAKE data only)
- Create: `content/fy25.private.json` (gitignored — starts as a copy of the fixture)
- Create: `public/fy25.enc` (committed — ciphertext of fixture, dev password)
- Modify: `.gitignore`

- [ ] **Step 2.1: Add gitignore entry FIRST (before content/ exists)**

Append to `.gitignore`:

```
content/
```

Verify: `git check-ignore content/fy25.private.json` → prints the path (exit 0).

- [ ] **Step 2.2: Create the committed FAKE fixture**

Create `scripts/fy25-sample.json`. This is synthetic stand-in data matching the real content's shape — used by renderer tests and as dev payload. All client names are fictional:

```json
{
  "identity": {
    "name": "Vaibhav Heda",
    "role": "full-stack engineer",
    "company": "SuperProcure",
    "period": { "label": "FY 2025 / 26", "labelShort": "FY 25/26" }
  },
  "tagline": {
    "heroDisplay": "What I",
    "heroDisplayEm": "shipped",
    "heroDisplayTail": "this year.",
    "heroSub": "sixteen achievements · one fiscal year.",
    "closingMain": "A year ·",
    "closingMainEm": "well",
    "closingTail": "shipped.",
    "closingSub": "fiscal year two-five / two-six · fin"
  },
  "breadth": ["Trip Board", "Parking Board", "DV Board", "Docs", "Auth", "Masters", "Tracking", "Notifications"],
  "stats": {
    "total": 313, "critical": 97, "high": 113, "bugs": 86,
    "tasks": 204, "modulesTouched": 15, "clientsImpacted": "30+", "achievements": 16
  },
  "heroStats": [
    { "value": "16", "label": "achievements" },
    { "value": "15", "label": "modules shipped" },
    { "value": "30+", "label": "enterprise clients" },
    { "value": "313", "label": "closed tickets" }
  ],
  "tiers": [
    { "label": "Tier 01", "name": "system-wide impact" },
    { "label": "Tier 02", "name": "major new capabilities" },
    { "label": "Tier 03", "name": "quality & reliability" },
    { "label": "Tier 04", "name": "specialized" }
  ],
  "achievements": [
    { "index": "01", "tier": 1, "order": 1, "title": "Vehicle & Driver Master", "titleEm": "complete rework", "clientShort": "platform-wide", "coverLine": "complete rework · system-wide" },
    { "index": "02", "tier": 1, "order": 2, "title": "Dedicated Vehicle Board", "titleEm": "made usable", "clientShort": "3 enterprise clients", "coverLine": "multi-client · 3 enterprises" },
    { "index": "03", "tier": 1, "order": 3, "title": "Notification Infrastructure", "titleEm": "provider cutover", "clientShort": "platform-wide", "coverLine": "migration + internal dashboards" },
    { "index": "05", "tier": 2, "order": 5, "title": "QR Code Decoder", "titleEm": "built from scratch", "clientShort": "Acme Steel · live", "coverLine": "v1.1 · live" },
    { "index": "07", "tier": 2, "order": 7, "title": "Jest Unit Testing", "titleEm": "fully automated", "clientShort": "engineering", "coverLine": "complete · CI-integrated" },
    { "index": "09", "tier": 3, "order": 9, "title": "Notification Unsubscribe", "titleEm": "deliverability win", "clientShort": "platform-wide", "coverLine": "anti-spam · domain protection" },
    { "index": "11", "tier": 3, "order": 11, "title": "Performance & Stability", "titleEm": "observability fixes", "clientShort": "platform-wide", "coverLine": "15+ fixes · platform-wide" },
    { "index": "14", "tier": 4, "order": 14, "title": "Container Master + Board", "titleEm": "specialized ops", "clientShort": "Acme Chemicals", "coverLine": "outbound container ops" }
  ],
  "future": [
    { "index": "01", "title": "Folio", "titleEm": "internal RAG bot", "status": "Beta", "stack": "Bedrock · pgvector · BM25 · MCP", "shortDesc": "Ask in Slack · cite the source · drop the wiki tab." },
    { "index": "02", "title": "AI Messages", "titleEm": "templates from plain English", "status": "In design", "stack": "LLM · Notifications", "shortDesc": "Draft new notification templates from a one-line requirement." },
    { "index": "03", "title": "BYOP", "titleEm": "bring your own provider", "status": "In flight", "stack": "Notifications · multi-tenant", "shortDesc": "Enterprise clients wire their own SMS / WhatsApp route." }
  ]
}
```

- [ ] **Step 2.3: Write the encrypt CLI**

Create `scripts/fy25-encrypt.mjs`:

```js
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
```

- [ ] **Step 2.4: Create the private dev content and encrypt it**

```bash
mkdir -p content
cp scripts/fy25-sample.json content/fy25.private.json
FY25_PASSWORD='dev-only-pass' npm run fy25:encrypt
```

Expected: `Wrote public/fy25.enc — <n> bytes of ciphertext, safe to commit.`
(`dev-only-pass` is throwaway — Task 9 replaces both content and password.)

- [ ] **Step 2.5: Verify nothing private is staged**

```bash
git status --short
node -e "const e=require('./public/fy25.enc');console.log(Object.keys(e))" 2>/dev/null || node --input-type=module -e "import {readFile} from 'node:fs/promises'; const e=JSON.parse(await readFile('public/fy25.enc','utf8')); console.log(Object.keys(e).join(','))"
```

Expected: `content/` absent from git status; keys print `v,salt,iv,ct`.

- [ ] **Step 2.6: Commit**

```bash
git add .gitignore scripts/fy25-encrypt.mjs scripts/fy25-sample.json public/fy25.enc
git commit -m "feat: FY25 encrypt CLI + fixture payload (ciphertext committed, plaintext gitignored)"
```

---

### Task 3: Slide renderer (TDD)

**Files:**
- Create: `src/shared/fy25-slides.js`
- Test: `scripts/fy25-slides.test.mjs`

- [ ] **Step 3.1: Write the failing tests**

Create `scripts/fy25-slides.test.mjs`:

```js
// The renderer is pure string-building (no DOM), so it tests in Node directly.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { buildSlides } from '../src/shared/fy25-slides.js';

const content = JSON.parse(await readFile(new URL('./fy25-sample.json', import.meta.url), 'utf8'));

test('builds exactly 7 slides in deck order', () => {
  const slides = buildSlides(content);
  assert.deepEqual(slides.map(s => s.id),
    ['title', 'overview', 'numbers', 'shipped-1', 'shipped-2', 'coming', 'closing']);
});

test('title slide carries the hero line and all hero stats', () => {
  const html = buildSlides(content)[0].html;
  assert.match(html, /What I/);
  assert.match(html, /<em>shipped<\/em>/);
  for (const h of content.heroStats) assert.ok(html.includes(h.label), h.label);
});

test('numbers slide marks pure-numeric stats for count-up', () => {
  const html = buildSlides(content)[2].html;
  assert.match(html, /data-count="313"/);
  assert.match(html, /data-count="97"/);
  assert.ok(!html.includes('data-count="30+"'), '30+ is not count-up animatable');
});

test('shipped slides split achievements by tier', () => {
  const slides = buildSlides(content);
  assert.match(slides[3].html, /Vehicle &amp; Driver Master/);
  assert.ok(!slides[3].html.includes('Container Master'), 'tier 4 stays off shipped-1');
  assert.match(slides[4].html, /Container Master/);
});

test('all content is HTML-escaped and no field renders as undefined', () => {
  const evil = JSON.parse(JSON.stringify(content));
  evil.achievements[0].title = '<script>alert(1)</script>';
  const all = buildSlides(evil).map(s => s.html).join('');
  assert.ok(!all.includes('<script>alert'));
  assert.ok(!all.includes('undefined'));
});
```

- [ ] **Step 3.2: Run tests to verify they fail**

Run: `npm test`
Expected: crypto tests pass; slides tests FAIL with `Cannot find module '../src/shared/fy25-slides.js'`

- [ ] **Step 3.3: Implement the renderer**

Create `src/shared/fy25-slides.js`:

```js
// FY25 deck renderer — decrypted content → seven slides as HTML strings.
// Pure string building (no DOM access) so both faces share it and Node can
// test it. Style B (native): portfolio tokens, Inter, system-blue <em> accent.

function esc(s) {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;')
    .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

// Pure-integer values get data-count for the count-up; "30+" renders as-is.
function statHtml(value, label) {
  var n = parseInt(value, 10);
  var counted = String(n) === String(value) ? ' data-count="' + n + '"' : '';
  return '<div class="f-stat"><b' + counted + '>' + esc(value) + '</b><span>' + esc(label) + '</span></div>';
}

function cardHtml(a) {
  return '<div class="f-card">' +
    '<div class="f-card-kicker">' + esc(a.index) + ' · ' + esc(a.clientShort) + '</div>' +
    '<div class="f-card-title">' + esc(a.title) + ' <em>' + esc(a.titleEm) + '</em></div>' +
    '<div class="f-card-line">' + esc(a.coverLine) + '</div>' +
    '</div>';
}

function futureHtml(f) {
  return '<div class="f-card">' +
    '<div class="f-card-kicker">' + esc(f.index) + ' · ' + esc(f.status) + '</div>' +
    '<div class="f-card-title">' + esc(f.title) + ' <em>' + esc(f.titleEm) + '</em></div>' +
    '<div class="f-card-line">' + esc(f.shortDesc) + '</div>' +
    '<div class="f-card-stack">' + esc(f.stack) + '</div>' +
    '</div>';
}

export function buildSlides(c) {
  function tierSlice(lo, hi) {
    return c.achievements
      .filter(function (a) { return a.tier >= lo && a.tier <= hi; })
      .sort(function (x, y) { return x.order - y.order; });
  }
  var t = c.tagline, s = c.stats;
  var kicker = esc(c.identity.period.label) + ' · ' + esc(c.identity.company) + ' · ' + esc(c.identity.role);

  var NUMBERS = [
    [s.total, 'closed tickets'], [s.critical, 'critical'], [s.high, 'high priority'],
    [s.bugs, 'bugs fixed'], [s.tasks, 'tasks'], [s.modulesTouched, 'modules touched'],
    [s.clientsImpacted, 'enterprise clients'], [s.achievements, 'achievements']
  ];

  return [
    { id: 'title', html:
      '<div class="f-slide f-center">' +
        '<div class="f-kicker">' + kicker + '</div>' +
        '<h1>' + esc(t.heroDisplay) + ' <em>' + esc(t.heroDisplayEm) + '</em> ' + esc(t.heroDisplayTail) + '</h1>' +
        '<div class="f-sub">' + esc(t.heroSub) + '</div>' +
        '<div class="f-statrow">' + c.heroStats.map(function (h) { return statHtml(h.value, h.label); }).join('') + '</div>' +
      '</div>' },

    { id: 'overview', html:
      '<div class="f-slide f-center">' +
        '<div class="f-kicker">the shape of the year</div>' +
        '<h1>One year. <em>' + c.breadth.length + ' surfaces.</em></h1>' +
        '<div class="f-chips">' + c.breadth.map(function (b) { return '<span class="f-chip">' + esc(b) + '</span>'; }).join('') + '</div>' +
        '<div class="f-sub">' + c.tiers.map(function (tr) { return esc(tr.label) + ' — ' + esc(tr.name); }).join(' · ') + '</div>' +
      '</div>' },

    { id: 'numbers', html:
      '<div class="f-slide">' +
        '<div class="f-kicker">by the numbers</div>' +
        '<h1>The year, <em>counted.</em></h1>' +
        '<div class="f-numgrid">' + NUMBERS.map(function (p) { return statHtml(p[0], p[1]); }).join('') + '</div>' +
      '</div>' },

    { id: 'shipped-1', html:
      '<div class="f-slide">' +
        '<div class="f-kicker">shipped · tiers 01 — 02</div>' +
        '<h1>Shipped <em>/ system-wide.</em></h1>' +
        '<div class="f-grid">' + tierSlice(1, 2).map(cardHtml).join('') + '</div>' +
      '</div>' },

    { id: 'shipped-2', html:
      '<div class="f-slide">' +
        '<div class="f-kicker">shipped · tiers 03 — 04</div>' +
        '<h1>Shipped <em>/ the long tail.</em></h1>' +
        '<div class="f-grid">' + tierSlice(3, 4).map(cardHtml).join('') + '</div>' +
      '</div>' },

    { id: 'coming', html:
      '<div class="f-slide">' +
        '<div class="f-kicker">where this goes</div>' +
        '<h1>What’s <em>coming.</em></h1>' +
        '<div class="f-grid f-grid-3">' + c.future.map(futureHtml).join('') + '</div>' +
      '</div>' },

    { id: 'closing', html:
      '<div class="f-slide f-center">' +
        '<h1 class="f-big" data-count="' + s.total + '">' + s.total + '.</h1>' +
        '<div class="f-sub-strong">' + esc(t.closingMain) + ' <em>' + esc(t.closingMainEm) + '</em> ' + esc(t.closingTail) + '</div>' +
        '<div class="f-kicker">' + esc(t.closingSub) + '</div>' +
      '</div>' }
  ];
}

// Count-up: animate every [data-count] inside rootEl from 0 to its value.
// reduce=true (prefers-reduced-motion) snaps to the final number instantly.
export function animateCounts(rootEl, reduce) {
  var els = rootEl.querySelectorAll('[data-count]');
  for (var i = 0; i < els.length; i++) {
    (function (el) {
      var target = parseInt(el.getAttribute('data-count'), 10);
      var suffix = el.textContent.indexOf('.') !== -1 ? '.' : '';
      if (reduce) { el.textContent = target + suffix; return; }
      var start = null, DUR = 900;
      function frame(ts) {
        if (start === null) start = ts;
        var p = Math.min(1, (ts - start) / DUR);
        var eased = 1 - Math.pow(1 - p, 3);
        el.textContent = Math.round(target * eased) + suffix;
        if (p < 1) requestAnimationFrame(frame);
      }
      requestAnimationFrame(frame);
    })(els[i]);
  }
}
```

- [ ] **Step 3.4: Run tests to verify they pass**

Run: `npm test`
Expected: `# pass 9`, `# fail 0`

- [ ] **Step 3.5: Commit**

```bash
git add src/shared/fy25-slides.js scripts/fy25-slides.test.mjs
git commit -m "feat: FY25 slide renderer — 7 native-style slides, count-up, tested"
```

---

### Task 4: Registry entry + Finder locked rendering + boot count

**Files:**
- Modify: `src/data/projects.js` (SVG map ~line 18, PROJECTS array ~line 69, STATUS_META ~line 72, ICOCLASS ~line 119)
- Modify: `src/desktop/finder.js` (statusChip ~line 8, rowHref ~line 13, tableLink ~line 18, icon-view badge ~line 75)
- Modify: `src/shared/boot.js:20`

- [ ] **Step 4.1: Add the lock glyph and registry entry**

In `src/data/projects.js`, add to the `SVG` map (after the `resume` entry at line 18, inside the closing brace):

```js
  fy25:      '<svg viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10 20H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h3.9a2 2 0 0 1 1.69.9l.81 1.2a2 2 0 0 0 1.67.9H20a2 2 0 0 1 2 2v2"/><rect width="8" height="5" x="14" y="17" rx="1"/><path d="M20 17v-2a2 2 0 0 0-4 0v2"/></svg>'
```

(Lucide `folder-lock` — matches the existing Lucide set.)

Append to the `PROJECTS` array (after the `quickdeck` entry, before the closing `];`):

```js
  {
    key: 'fy25', name: 'FY25', tag: 'Year in review', year: '2025–26', status: 'locked', locked: true,
    icon: 'fy25', swatch: 'sw-fy25', tile: 'ic-fy25',
    tags: [], stack: [],
    linkLabel: 'unlock',
    sub: 'A password-protected year of client work.',
    body: 'One fiscal year of platform work, locked behind a password. If you have it, the review is yours.'
  }
```

In `STATUS_META` (line 72), add a third entry:

```js
const STATUS_META = {
  live: '<span class="pill"><span class="live-d"></span>Live</span>',
  review: '<span class="pill"><span class="wip-d"></span>In review</span>',
  locked: '<span class="pill"><span class="lock-d"></span>Locked</span>'
};
```

In `ICOCLASS` (line 119), add `fy25: 'ic-fy25'` to the object.

- [ ] **Step 4.2: Teach Finder to render locked entries**

In `src/desktop/finder.js`, replace `statusChip` (lines 8-12):

```js
function statusChip(status) {
  if (status === 'locked')
    return '<span class="status-chip chip-locked"><span class="dot"></span>Locked</span>';
  return status === 'live'
    ? '<span class="status-chip chip-live"><span class="dot"></span>Live</span>'
    : '<span class="status-chip chip-wip"><span class="dot"></span>In review</span>';
}
```

Replace `rowHref` (lines 13-17):

```js
function rowHref(p) {
  if (p.locked) return ' href="#" data-fy25-open';
  if (p.href) return ' href="' + p.href + '" target="_blank" rel="noopener"';
  if (p.download) return ' href="' + p.download + '" download';
  return ' href="#"';
}
```

Replace `tableLink` (lines 18-22):

```js
function tableLink(p) {
  if (p.locked) return '<a href="#" data-fy25-open>Unlock</a>';
  if (p.href) return '<a href="' + p.href + '" target="_blank" rel="noopener">' + p.linkLabel + ' ↗</a>';
  if (p.download) return '<a href="' + p.download + '" download>Download ↓</a>';
  return '<span class="nolink">' + (p.linkLabel || '—') + '</span>';
}
```

In the icon-grid block (lines 74-82), replace the badge/label lines:

```js
    var badge = p.status === 'live' ? 'var(--live)' : p.locked ? 'var(--text-faint)' : 'var(--wip)';
    var label = p.status === 'live' ? 'Live' : p.locked ? 'Locked' : 'In review';
```

- [ ] **Step 4.3: Keep the boot log honest**

In `src/shared/boot.js` line 20, the locked folder is not a "survivor":

```js
  var count = (PROJECTS && PROJECTS.filter(function (p) { return !p.locked; }).length) || 4;
```

- [ ] **Step 4.4: Verify in the browser**

Run: `npm run dev` → open `http://localhost:5173`
Expected: Finder table shows a 6th row "FY25 · Year in review · Locked chip · Unlock link"; icon + list views show it with a Locked label; boot log still says `5 survivors`. Clicking Unlock does nothing yet (handler lands in Task 6) — it must NOT navigate or throw.

- [ ] **Step 4.5: Commit**

```bash
git add src/data/projects.js src/desktop/finder.js src/shared/boot.js
git commit -m "feat: FY25 locked entry in registry + Finder locked rendering"
```

---

### Task 5: Desktop markup + FY25 stylesheet

**Files:**
- Modify: `index.html` (sidebar ~line 108, after résumé window line 207)
- Create: `src/styles/fy25.css`
- Modify: `src/styles/index.css`

- [ ] **Step 5.1: Add the Finder sidebar item**

In `index.html`, inside the "Locations" `sb-group` — directly after the Live row (line 108) — add:

```html
            <div class="sb-item" data-fy25-open><span class="sb-ico"><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="5" y="11" width="14" height="9" rx="2.5"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/></svg></span>FY25</div>
```

(Note: it carries `data-fy25-open`, NOT `data-filter` — the filter wiring in desktop.js:50 selects `[data-filter]` only, so this item never becomes a filter.)

- [ ] **Step 5.2: Add the deck window + unlock dialog**

In `index.html`, after the résumé window's closing `</section>` (line 207), add:

```html
    <!-- FY25 — password-locked year-in-review deck -->
    <section class="window" id="fy25" data-app="fy25" style="z-index:46;display:none">
      <header class="titlebar">
        <div class="traffic">
          <button class="light red" aria-label="Close window"><svg width="6" height="6" viewBox="0 0 8 8" stroke="#4d0000" stroke-width="1.4" stroke-linecap="round"><line x1="2" y1="2" x2="6" y2="6"/><line x1="6" y1="2" x2="2" y2="6"/></svg></button>
          <button class="light yellow" aria-label="Minimize window"><svg width="6" height="6" viewBox="0 0 8 8" stroke="#5a3d00" stroke-width="1.4" stroke-linecap="round"><line x1="2" y1="4" x2="6" y2="4"/></svg></button>
          <button class="light green" aria-label="Zoom window"><svg width="7" height="7" viewBox="0 0 8 8" stroke="#0a3d00" stroke-width="1.3" stroke-linecap="round"><path d="M2 4h4M4 2v4"/></svg></button>
        </div>
        <div class="win-title">FY25 — Year in Review</div>
      </header>
      <div class="fy25-body">
        <div class="fy25-stage"></div>
        <div class="fy25-bar">
          <button type="button" class="fy25-prev" aria-label="Previous slide"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><polyline points="14 6 8 12 14 18"/></svg></button>
          <button type="button" class="fy25-next" aria-label="Next slide"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><polyline points="10 6 16 12 10 18"/></svg></button>
          <div class="fy25-dots" role="tablist" aria-label="Slides"></div>
          <span class="fy25-counter" aria-live="polite">1 / 7</span>
          <button type="button" class="fy25-fs" aria-label="Fullscreen"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M8 3H5a2 2 0 0 0-2 2v3"/><path d="M21 8V5a2 2 0 0 0-2-2h-3"/><path d="M3 16v3a2 2 0 0 0 2 2h3"/><path d="M16 21h3a2 2 0 0 0 2-2v-3"/></svg></button>
        </div>
      </div>
    </section>

    <!-- FY25 unlock dialog (desktop) -->
    <div id="fy25-gate" class="fy25-gate" role="dialog" aria-modal="true" aria-label="Unlock FY25" aria-hidden="true">
      <div class="fy25-card">
        <div class="fy25-foldico"><svg width="44" height="44" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M10 20H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h3.9a2 2 0 0 1 1.69.9l.81 1.2a2 2 0 0 0 1.67.9H20a2 2 0 0 1 2 2v2"/><rect width="8" height="5" x="14" y="17" rx="1"/><path d="M20 17v-2a2 2 0 0 0-4 0v2"/></svg></div>
        <h4>“FY25” is locked</h4>
        <p>A year of client work. Enter the password to view it.</p>
        <input id="fy25-pass" type="password" autocomplete="off" spellcheck="false" aria-label="FY25 password" />
        <div class="fy25-err" aria-live="polite"></div>
        <div class="fy25-actions">
          <button type="button" class="fy25-cancel">Cancel</button>
          <button type="button" class="fy25-unlock">Unlock</button>
        </div>
      </div>
    </div>
```

- [ ] **Step 5.3: Create the stylesheet**

Create `src/styles/fy25.css`:

```css
/* ===== FY25 — locked deck (gate dialog, deck window, phone viewer) ===== */

/* ---- shared: locked status chip + dot ---- */
.status-chip.chip-locked { color: var(--text-dim); background: rgba(20,24,40,0.07); }
.status-chip.chip-locked .dot { background: var(--text-faint); }
.pill .lock-d { display:inline-block; width:7px; height:7px; border-radius:50%; background: var(--text-faint); margin-right:5px; }
.sw-fy25 { background: linear-gradient(160deg, #3c3f4a, #15161c); }
.ic-fy25 { background: linear-gradient(160deg, #3c3f4a, #15161c); }

/* ---- desktop gate dialog ---- */
.fy25-gate {
  position: fixed; inset: 0; z-index: 9000; display: none;
  align-items: center; justify-content: center;
  background: rgba(20,24,40,0.25);
}
.fy25-gate[aria-hidden="false"] { display: flex; }
.fy25-card {
  width: 300px; padding: 22px 20px 16px; text-align: center;
  background: rgba(248,249,252,0.97); border-radius: 14px;
  box-shadow: 0 24px 60px -10px rgba(30,42,80,0.4), 0 0 0 0.5px rgba(20,30,60,0.14);
}
.fy25-card h4 { font-size: 13.5px; font-weight: 700; margin: 10px 0 3px; }
.fy25-card p { font-size: 11.5px; color: var(--text-dim); margin: 0 0 12px; line-height: 1.45; }
.fy25-card input {
  width: 100%; border: 1px solid rgba(20,24,40,0.16); border-radius: 7px;
  padding: 7px 10px; font-size: 16px; background: #fff; font-family: inherit;
}
.fy25-card input:focus-visible { outline: 2px solid var(--accent); outline-offset: 1px; }
.fy25-err { min-height: 16px; font-size: 11px; color: var(--traffic-red); margin-top: 6px; }
.fy25-actions { display: flex; gap: 8px; margin-top: 8px; }
.fy25-actions button {
  flex: 1; font-size: 12.5px; font-weight: 600; padding: 7px 0; border-radius: 7px;
  border: none; cursor: pointer; background: rgba(28,29,34,0.06); color: var(--text); font-family: inherit;
}
.fy25-actions .fy25-unlock { background: var(--accent); color: #fff; }
.fy25-card.busy .fy25-unlock { opacity: 0.6; pointer-events: none; }
@keyframes fy25-shake {
  10%, 90% { transform: translateX(-1px); } 20%, 80% { transform: translateX(4px); }
  30%, 50%, 70% { transform: translateX(-8px); } 40%, 60% { transform: translateX(8px); }
}
.fy25-card.shake { animation: fy25-shake 0.5s cubic-bezier(0.36,0.07,0.19,0.97) both; }
.fy25-card.flash { outline: 2px solid var(--traffic-red); }

/* ---- deck window ---- */
#fy25 { width: min(900px, 84vw); left: 7%; top: 7%; flex-direction: column; }
.fy25-body { display: flex; flex-direction: column; min-height: 0; flex: 1; }
.fy25-stage { position: relative; aspect-ratio: 16 / 9; overflow: hidden;
  background: linear-gradient(165deg, #fdfdfe, #eef2fa); }
#fy25:fullscreen { width: 100%; height: 100%; left: 0; top: 0; border-radius: 0; }
#fy25:fullscreen .fy25-stage { aspect-ratio: auto; flex: 1; }
.f-frame { position: absolute; inset: 0; opacity: 0; pointer-events: none; transition: opacity 0.28s ease; }
.f-frame.on { opacity: 1; pointer-events: auto; }

/* ---- slides (style B — native) ---- */
.f-slide { height: 100%; display: flex; flex-direction: column; justify-content: center; padding: 6% 8%; }
.f-slide.f-center { align-items: flex-start; }
.f-kicker { font-family: 'JetBrains Mono', ui-monospace, monospace; font-size: 10.5px;
  text-transform: uppercase; letter-spacing: 0.16em; color: var(--accent-2); margin-bottom: 14px; }
.f-slide h1 { font-size: clamp(24px, 3.4vw, 44px); font-weight: 700; letter-spacing: -0.03em;
  line-height: 1.06; margin: 0 0 12px; color: var(--text); }
.f-slide h1 em { font-style: normal; color: var(--accent); }
.f-sub { font-size: 12.5px; color: var(--text-dim); font-family: 'JetBrains Mono', ui-monospace, monospace; }
.f-sub-strong { font-size: 17px; color: var(--text-94); margin-bottom: 10px; }
.f-sub-strong em { font-style: italic; color: var(--accent); }
.f-statrow { display: flex; gap: 30px; margin-top: 26px; flex-wrap: wrap; }
.f-stat b { display: block; font-size: 24px; font-weight: 700; color: var(--accent-2); line-height: 1.1; }
.f-stat span { font-size: 9.5px; text-transform: uppercase; letter-spacing: 0.1em; color: var(--text-faint);
  font-family: 'JetBrains Mono', ui-monospace, monospace; }
.f-numgrid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 18px 24px; margin-top: 10px; }
.f-numgrid .f-stat b { font-size: 30px; }
.f-chips { display: flex; flex-wrap: wrap; gap: 7px; margin: 6px 0 16px; }
.f-chip { font-size: 11px; padding: 4px 10px; border-radius: 999px;
  background: rgba(0,122,255,0.09); color: var(--accent-2); font-weight: 600; }
.f-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; margin-top: 8px; }
.f-grid-3 { grid-template-columns: repeat(3, 1fr); }
.f-card { border: 1px solid var(--hairline); border-radius: 10px; padding: 12px 12px 10px;
  background: rgba(255,255,255,0.66); }
.f-card-kicker { font-family: 'JetBrains Mono', ui-monospace, monospace; font-size: 9px;
  text-transform: uppercase; letter-spacing: 0.1em; color: var(--text-faint); margin-bottom: 6px; }
.f-card-title { font-size: 12.5px; font-weight: 700; line-height: 1.25; color: var(--text); }
.f-card-title em { font-style: normal; color: var(--accent); display: block; font-weight: 600; }
.f-card-line { font-size: 10.5px; color: var(--text-dim); margin-top: 5px; }
.f-card-stack { font-family: 'JetBrains Mono', ui-monospace, monospace; font-size: 9px;
  color: var(--text-faint); margin-top: 7px; }
.f-big { font-size: clamp(72px, 12vw, 150px) !important; color: var(--accent) !important; margin-bottom: 4px !important; }

/* ---- deck control bar ---- */
.fy25-bar { display: flex; align-items: center; gap: 10px; padding: 9px 14px;
  border-top: 1px solid var(--hairline); background: rgba(250,250,252,0.9); }
.fy25-bar button { width: 26px; height: 26px; border-radius: 7px; border: none; cursor: pointer;
  background: rgba(28,29,34,0.06); color: var(--text-dim); display: flex; align-items: center; justify-content: center; }
.fy25-bar button:hover { background: rgba(28,29,34,0.12); }
.fy25-dots { display: flex; gap: 6px; margin: 0 auto; }
.fy25-dots button { width: 7px; height: 7px; min-width: 7px; padding: 0; border-radius: 50%;
  background: rgba(20,24,40,0.18); }
.fy25-dots button.on { background: var(--accent); }
.fy25-counter { font-family: 'JetBrains Mono', ui-monospace, monospace; font-size: 11px; color: var(--text-dim); }

/* ---- phone: gate + viewer ---- */
.fy25-pgate, .fy25-pview {
  position: absolute; inset: 0; z-index: 60; display: none; flex-direction: column;
  background: #0e0f13; color: #f0f1f5;
  padding-top: env(safe-area-inset-top); padding-bottom: env(safe-area-inset-bottom);
}
.fy25-pgate[aria-hidden="false"], .fy25-pview[aria-hidden="false"] { display: flex; }
.fy25-pgate { align-items: center; justify-content: flex-start; }
.fy25-pclose { position: absolute; top: calc(14px + env(safe-area-inset-top)); right: 14px; z-index: 2;
  width: 30px; height: 30px; border-radius: 50%; border: none; cursor: pointer;
  background: rgba(255,255,255,0.14); color: #fff; font-size: 14px; line-height: 1; }
.fy25-pcard { width: 100%; max-width: 290px; text-align: center; padding: 0 18px; margin-top: 18vh; }
.fy25-plock { font-size: 0; margin-bottom: 12px; }
.fy25-pcard h3 { font-size: 15px; font-weight: 700; margin: 0 0 4px; }
.fy25-pcard p { font-size: 12px; color: rgba(255,255,255,0.55); margin: 0 0 16px; }
.fy25-pcard input { width: 100%; border: none; border-radius: 9px; padding: 11px 12px;
  font-size: 16px; text-align: center; background: rgba(255,255,255,0.12); color: #fff; font-family: inherit; }
.fy25-perr { min-height: 16px; font-size: 11px; color: #ff6961; margin-top: 8px; }
.fy25-punlock { width: 100%; margin-top: 10px; padding: 11px 0; border: none; border-radius: 9px;
  background: var(--accent); color: #fff; font-size: 13.5px; font-weight: 600; cursor: pointer; font-family: inherit; }
.fy25-pcard.shake { animation: fy25-shake 0.5s cubic-bezier(0.36,0.07,0.19,0.97) both; }
.fy25-pcard.flash { outline: 2px solid #ff6961; border-radius: 12px; }

.fy25-pview { background: linear-gradient(165deg, #fdfdfe, #eef2fa); color: var(--text); }
.fy25-pview .fy25-pclose { background: rgba(20,24,40,0.1); color: var(--text); }
.fy25-ptrack { position: relative; flex: 1; min-height: 0; overflow: hidden; }
.fy25-ptrack .f-frame { position: absolute; inset: 0; }
.fy25-ptrack .f-slide { padding: 64px 22px 18px; justify-content: flex-start; overflow-y: auto; }
.fy25-ptrack .f-slide h1 { font-size: 26px; }
.fy25-ptrack .f-numgrid, .fy25-ptrack .f-grid { grid-template-columns: repeat(2, 1fr); gap: 10px; }
.fy25-ptrack .f-statrow { gap: 18px; }
.fy25-pbar { display: flex; align-items: center; gap: 12px; padding: 10px 16px calc(12px + env(safe-area-inset-bottom)); }
.fy25-pbar button { width: 34px; height: 34px; border-radius: 50%; border: none; cursor: pointer;
  background: rgba(20,24,40,0.08); color: var(--text); font-size: 16px; }
.fy25-pdots { display: flex; gap: 6px; margin: 0 auto; }
.fy25-pdots i { width: 6px; height: 6px; border-radius: 50%; background: rgba(20,24,40,0.18); }
.fy25-pdots i.on { background: var(--accent); }

/* ---- dark theme ---- */
html[data-theme="dark"] .fy25-card { background: rgba(44,46,54,0.97); }
html[data-theme="dark"] .fy25-card h4 { color: #f0f1f5; }
html[data-theme="dark"] .fy25-card input { background: rgba(255,255,255,0.08); color: #f0f1f5;
  border-color: rgba(255,255,255,0.14); }
html[data-theme="dark"] .fy25-actions button { background: rgba(255,255,255,0.1); color: #f0f1f5; }
html[data-theme="dark"] .fy25-actions .fy25-unlock { background: var(--accent); color: #fff; }
html[data-theme="dark"] .fy25-stage,
html[data-theme="dark"] .fy25-pview { background: linear-gradient(165deg, #181a20, #101218); }
html[data-theme="dark"] .f-slide h1, html[data-theme="dark"] .f-card-title { color: #eceef4; }
html[data-theme="dark"] .f-sub-strong { color: rgba(236,238,244,0.92); }
html[data-theme="dark"] .f-card { background: rgba(255,255,255,0.05); border-color: rgba(255,255,255,0.08); }
html[data-theme="dark"] .f-chip { background: rgba(47,147,255,0.16); }
html[data-theme="dark"] .fy25-bar { background: rgba(30,32,38,0.9); border-top-color: rgba(255,255,255,0.08); }
html[data-theme="dark"] .fy25-bar button { background: rgba(255,255,255,0.1); color: rgba(236,238,244,0.8); }
html[data-theme="dark"] .fy25-pview .fy25-pclose,
html[data-theme="dark"] .fy25-pbar button { background: rgba(255,255,255,0.12); color: #eceef4; }
html[data-theme="dark"] .status-chip.chip-locked { background: rgba(255,255,255,0.08); color: rgba(236,238,244,0.7); }

/* ---- reduced motion ---- */
@media (prefers-reduced-motion: reduce) {
  .f-frame { transition: none; }
  .fy25-card.shake, .fy25-pcard.shake { animation: none; }
}
```

- [ ] **Step 5.4: Import the stylesheet**

In `src/styles/index.css`, add the import before theme-dark:

```css
@import './tokens.css';
@import './desktop.css';
@import './phone.css';
@import './motion.css';
@import './spotlight.css';
@import './vee.css';
@import './fy25.css';
@import './theme-dark.css';
```

- [ ] **Step 5.5: Verify**

Run: `npm run dev`
Expected: Finder sidebar shows the FY25 lock item under Locations. No layout breakage on either face. The gate dialog and deck window stay hidden (aria-hidden / display:none).

- [ ] **Step 5.6: Commit**

```bash
git add index.html src/styles/fy25.css src/styles/index.css
git commit -m "feat: FY25 desktop markup (deck window, unlock dialog, sidebar) + stylesheet"
```

---

### Task 6: Desktop behavior — gate, deck, wiring

**Files:**
- Create: `src/desktop/fy25.js`
- Modify: `src/desktop/desktop.js` (import at top, winParam guard line 114-115, init call at end)

- [ ] **Step 6.1: Implement `src/desktop/fy25.js`**

```js
// FY25 on the desktop face — unlock dialog + Keynote-style deck window.
// Launch surfaces: Finder rows / sidebar ([data-fy25-open]), Spotlight
// (document 'fy25:open' event), ?fy25=1. All funnel through requestOpen().
import { DESKTOP_Q, REDUCE } from '../shared/env.js';
import { unlockWithPassword, tryRestore } from '../shared/fy25-crypto.js';
import { buildSlides, animateCounts } from '../shared/fy25-slides.js';

export function initFy25Desktop(showWindow) {
  if (initFy25Desktop.done) return;
  initFy25Desktop.done = true;

  var gate = document.getElementById('fy25-gate');
  var card = gate.querySelector('.fy25-card');
  var input = document.getElementById('fy25-pass');
  var errLine = gate.querySelector('.fy25-err');
  var win = document.getElementById('fy25');
  var stage = win.querySelector('.fy25-stage');
  var dots = win.querySelector('.fy25-dots');
  var counter = win.querySelector('.fy25-counter');
  var slides = null, idx = 0, busy = false, lastFocus = null;

  function gateOpen() {
    lastFocus = document.activeElement;
    errLine.textContent = ''; input.value = '';
    gate.setAttribute('aria-hidden', 'false');
    setTimeout(function () { input.focus(); }, 60);
  }
  function gateClose() {
    gate.setAttribute('aria-hidden', 'true');
    if (lastFocus && lastFocus.focus) { try { lastFocus.focus(); } catch (e) {} }
  }

  function shake(el) {
    if (REDUCE.matches) { el.classList.add('flash'); setTimeout(function () { el.classList.remove('flash'); }, 500); return; }
    el.classList.remove('shake'); void el.offsetWidth; el.classList.add('shake');
  }

  function show(n) {
    idx = Math.max(0, Math.min(slides.length - 1, n));
    var frames = stage.querySelectorAll('.f-frame');
    for (var i = 0; i < frames.length; i++) frames[i].classList.toggle('on', i === idx);
    var dbs = dots.querySelectorAll('button');
    for (var j = 0; j < dbs.length; j++) dbs[j].classList.toggle('on', j === idx);
    counter.textContent = (idx + 1) + ' / ' + slides.length;
    animateCounts(frames[idx], REDUCE.matches);
  }

  function buildDeck(content) {
    if (slides) return;
    slides = buildSlides(content);
    stage.innerHTML = slides.map(function (s, i) {
      return '<div class="f-frame" data-slide="' + i + '">' + s.html + '</div>';
    }).join('');
    dots.innerHTML = slides.map(function (s, i) {
      return '<button type="button" data-go="' + i + '" aria-label="Slide ' + (i + 1) + '"></button>';
    }).join('');
    show(0);
  }

  function openDeck(content) { buildDeck(content); gateClose(); showWindow('fy25'); }

  function requestOpen() {
    tryRestore().then(function (c) { if (c) openDeck(c); else gateOpen(); });
  }

  function submit() {
    if (busy) return;
    busy = true; card.classList.add('busy');
    unlockWithPassword(input.value).then(function (c) {
      busy = false; card.classList.remove('busy');
      openDeck(c);
    }, function () {
      busy = false; card.classList.remove('busy');
      errLine.textContent = 'Wrong password.';
      input.value = ''; input.focus(); shake(card);
    });
  }

  // Gate wiring
  gate.querySelector('.fy25-unlock').addEventListener('click', submit);
  gate.querySelector('.fy25-cancel').addEventListener('click', gateClose);
  input.addEventListener('keydown', function (e) {
    if (e.key === 'Enter') { e.preventDefault(); submit(); }
    else if (e.key === 'Escape') { e.preventDefault(); gateClose(); }
  });
  gate.addEventListener('mousedown', function (e) { if (e.target === gate) gateClose(); });

  // Launch surfaces
  document.addEventListener('click', function (e) {
    var t = e.target.closest('[data-fy25-open]');
    if (t && DESKTOP_Q.matches) { e.preventDefault(); requestOpen(); }
  });
  document.addEventListener('fy25:open', function () { if (DESKTOP_Q.matches) requestOpen(); });

  // Deck controls
  win.querySelector('.fy25-prev').addEventListener('click', function () { show(idx - 1); });
  win.querySelector('.fy25-next').addEventListener('click', function () { show(idx + 1); });
  dots.addEventListener('click', function (e) {
    var b = e.target.closest('[data-go]');
    if (b) show(parseInt(b.getAttribute('data-go'), 10));
  });
  win.querySelector('.fy25-fs').addEventListener('click', function () {
    if (document.fullscreenElement) { if (document.exitFullscreen) document.exitFullscreen(); }
    else if (win.requestFullscreen) win.requestFullscreen();
  });

  // ←/→ when the deck window is open + focused and nothing is being typed
  document.addEventListener('keydown', function (e) {
    if (!slides) return;
    if (win.style.display !== 'flex' || win.classList.contains('inactive')) return;
    var a = document.activeElement;
    if (a && (a.tagName === 'INPUT' || a.tagName === 'TEXTAREA' || a.isContentEditable)) return;
    if (e.key === 'ArrowRight') { e.preventDefault(); show(idx + 1); }
    else if (e.key === 'ArrowLeft') { e.preventDefault(); show(idx - 1); }
  });

  // Dev aid: ?fy25=1 opens the unlock flow on load (mirrors ?win= / ?cc=1).
  if (new URLSearchParams(window.location.search).get('fy25') === '1') {
    setTimeout(requestOpen, 400);
  }
}
```

- [ ] **Step 6.2: Wire into desktop.js**

Three edits in `src/desktop/desktop.js`:

(a) Add to the imports at the top:

```js
import { initFy25Desktop } from './fy25.js';
```

(b) The `?win=` dev aid (lines 114-115) must not open the empty locked window — change to:

```js
  // Dev aid: ?win=<id> opens a window on load (for screenshots). fy25 is
  // excluded — it opens through the unlock flow (?fy25=1) instead.
  var winParam = new URLSearchParams(window.location.search).get('win');
  if (winParam && winParam !== 'fy25') setTimeout(function () { showWindow(winParam); }, 60);
```

(c) At the very end of `initDesktop()` (after the dock magnification block, before the closing brace):

```js
  initFy25Desktop(showWindow);
```

- [ ] **Step 6.3: Verify the whole desktop flow**

Run: `npm run dev` → desktop width, then:

1. Click FY25 in Finder (any view) → dialog appears, input focused.
2. Type `nope` + Enter → head-shake, "Wrong password.", field cleared.
3. Type `dev-only-pass` + Enter → dialog closes, deck window opens on the title slide, count-up runs.
4. ‹ › buttons, dots, ←/→ keys navigate; counter tracks; closing slide counts to 313.
5. Fullscreen button → deck fills screen; Esc exits.
6. Red light closes; reopening via FY25 (no dialog — session restore) reopens deck.
7. Reload page → click FY25 → deck opens WITHOUT password (sessionStorage). New tab → password required again.
8. `http://localhost:5173/?fy25=1` → dialog opens on load. `?win=fy25` → nothing opens.
9. DevTools → Network → fy25.enc is base64 ciphertext; Sources → no client names anywhere (fixture's "Acme Steel" only appears AFTER unlock, in DOM).
10. Dark mode via Control Center → dialog + deck restyle.

- [ ] **Step 6.4: Commit**

```bash
git add src/desktop/fy25.js src/desktop/desktop.js
git commit -m "feat: FY25 desktop unlock dialog + deck window behavior"
```

---

### Task 7: Spotlight integration

**Files:**
- Modify: `src/shared/spotlight.js` (buildIndex project loop line 16-24, openItem line 98-112)

- [ ] **Step 7.1: Carry the locked flag into the index**

In `buildIndex()`, inside the PROJECTS loop (lines 16-24), add `locked: p.locked` to the pushed object:

```js
    items.push({
      kind: 'project', scope: 'work', title: p.name, meta: p.tag,
      svg: SVG[p.icon], swatch: p.swatch, locked: p.locked,
      terms: ([p.name, p.tag, p.sub].concat(p.stack).concat(p.tags || [])).join(' ').toLowerCase(),
      href: p.href
    });
```

- [ ] **Step 7.2: Route locked items to the unlock flow**

In `openItem()` (line 98), after `close();` and before the `kind === 'cmd'` branch, add:

```js
    if (item.locked) { document.dispatchEvent(new CustomEvent('fy25:open')); return; }
```

(Desktop fy25.js and phone fy25-phone.js both listen for `fy25:open` and self-select by face.)

- [ ] **Step 7.3: Verify**

Run: `npm run dev` → ⌘K → type `fy25` → entry "FY25 · Year in review" appears → Enter → unlock dialog (or deck if session-unlocked). Also: typing `review` or `password` finds it via terms.

- [ ] **Step 7.4: Commit**

```bash
git add src/shared/spotlight.js
git commit -m "feat: Spotlight routes locked FY25 entry to unlock flow"
```

---

### Task 8: Phone face — tile, gate sheet, swipeable viewer

**Files:**
- Modify: `index.html` (home grid ~line 309, before `.scrim` ~line 346)
- Create: `src/phone/fy25-phone.js`
- Modify: `src/phone/phone.js` (import, openSheet intercept line 37-38, init call, Esc line 83)

- [ ] **Step 8.1: Add the home-screen tile**

In `index.html`, after the `qrdecode` app button (line 309), add:

```html
            <button class="app" data-app="fy25">
              <div class="ico ic-fy25"><svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="5" y="11" width="14" height="9" rx="2.5"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/></svg></div>
              <span class="lbl">FY25</span>
            </button>
```

- [ ] **Step 8.2: Add gate + viewer overlays**

In `index.html`, just before `<div class="scrim" id="scrim"></div>` (line 346), add:

```html
        <!-- FY25 unlock + viewer (phone) -->
        <div class="fy25-pgate" id="fy25-pgate" aria-hidden="true">
          <button type="button" class="fy25-pclose" aria-label="Close">✕</button>
          <div class="fy25-pcard">
            <div class="fy25-plock"><svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="1.8" stroke-linecap="round"><path d="M7 10V7a5 5 0 0 1 10 0v3"/><rect x="5" y="10" width="14" height="10" rx="3"/></svg></div>
            <h3>FY25 is locked</h3>
            <p>Enter the password to view the year in review.</p>
            <input id="fy25-ppass" type="password" autocomplete="off" spellcheck="false" aria-label="FY25 password" />
            <div class="fy25-perr" aria-live="polite"></div>
            <button type="button" class="fy25-punlock">Unlock</button>
          </div>
        </div>
        <div class="fy25-pview" id="fy25-pview" aria-hidden="true">
          <button type="button" class="fy25-pclose" aria-label="Close">✕</button>
          <div class="fy25-ptrack"></div>
          <div class="fy25-pbar">
            <button type="button" class="fy25-pprev" aria-label="Previous">‹</button>
            <div class="fy25-pdots"></div>
            <button type="button" class="fy25-pnext" aria-label="Next">›</button>
          </div>
        </div>
```

- [ ] **Step 8.3: Implement `src/phone/fy25-phone.js`**

```js
// FY25 on the phone face — full-screen unlock sheet + swipeable slide viewer.
// Entry point is openFy25Phone() (called from phone.js's openSheet intercept,
// which the tile, sheets' data-goto rows and phone search all funnel through)
// plus the 'fy25:open' event from Spotlight.
import { DESKTOP_Q, REDUCE } from '../shared/env.js';
import { unlockWithPassword, tryRestore } from '../shared/fy25-crypto.js';
import { buildSlides, animateCounts } from '../shared/fy25-slides.js';

var refs = null;
var slides = null, idx = 0, busy = false;

export function openFy25Phone() {
  if (!refs) return;
  tryRestore().then(function (c) { if (c) openViewer(c); else openGate(); });
}

function openGate() {
  refs.perr.textContent = ''; refs.input.value = '';
  refs.gate.setAttribute('aria-hidden', 'false');
}
function closeAll() {
  refs.gate.setAttribute('aria-hidden', 'true');
  refs.view.setAttribute('aria-hidden', 'true');
  refs.input.blur();
}

function shake(el) {
  if (REDUCE.matches) { el.classList.add('flash'); setTimeout(function () { el.classList.remove('flash'); }, 500); return; }
  el.classList.remove('shake'); void el.offsetWidth; el.classList.add('shake');
}

function show(n) {
  idx = Math.max(0, Math.min(slides.length - 1, n));
  var frames = refs.track.querySelectorAll('.f-frame');
  for (var i = 0; i < frames.length; i++) frames[i].classList.toggle('on', i === idx);
  var ds = refs.pdots.querySelectorAll('i');
  for (var j = 0; j < ds.length; j++) ds[j].classList.toggle('on', j === idx);
  animateCounts(frames[idx], REDUCE.matches);
}

function openViewer(content) {
  if (!slides) {
    slides = buildSlides(content);
    refs.track.innerHTML = slides.map(function (s, i) {
      return '<div class="f-frame" data-slide="' + i + '">' + s.html + '</div>';
    }).join('');
    refs.pdots.innerHTML = slides.map(function () { return '<i></i>'; }).join('');
    show(0);
  }
  refs.gate.setAttribute('aria-hidden', 'true');
  refs.view.setAttribute('aria-hidden', 'false');
  show(idx);
}

function submit() {
  if (busy) return;
  busy = true;
  unlockWithPassword(refs.input.value).then(function (c) {
    busy = false; openViewer(c);
  }, function () {
    busy = false;
    refs.perr.textContent = 'Wrong password.';
    refs.input.value = ''; refs.input.focus(); shake(refs.card);
  });
}

export function initFy25Phone() {
  if (initFy25Phone.done) return;
  initFy25Phone.done = true;

  refs = {
    gate: document.getElementById('fy25-pgate'),
    card: document.querySelector('#fy25-pgate .fy25-pcard'),
    input: document.getElementById('fy25-ppass'),
    perr: document.querySelector('#fy25-pgate .fy25-perr'),
    view: document.getElementById('fy25-pview'),
    track: document.querySelector('#fy25-pview .fy25-ptrack'),
    pdots: document.querySelector('#fy25-pview .fy25-pdots')
  };

  refs.gate.querySelector('.fy25-punlock').addEventListener('click', submit);
  refs.input.addEventListener('keydown', function (e) {
    if (e.key === 'Enter') { e.preventDefault(); submit(); }
  });
  var closes = document.querySelectorAll('#fy25-pgate .fy25-pclose, #fy25-pview .fy25-pclose');
  for (var i = 0; i < closes.length; i++) closes[i].addEventListener('click', closeAll);

  refs.view.querySelector('.fy25-pprev').addEventListener('click', function () { show(idx - 1); });
  refs.view.querySelector('.fy25-pnext').addEventListener('click', function () { show(idx + 1); });

  // Horizontal swipe — only when clearly horizontal, so vertical card scroll wins.
  var sx = 0, sy = 0;
  refs.track.addEventListener('touchstart', function (e) {
    sx = e.touches[0].clientX; sy = e.touches[0].clientY;
  }, { passive: true });
  refs.track.addEventListener('touchend', function (e) {
    var dx = e.changedTouches[0].clientX - sx, dy = e.changedTouches[0].clientY - sy;
    if (Math.abs(dx) > 44 && Math.abs(dx) > Math.abs(dy) * 1.4) show(dx < 0 ? idx + 1 : idx - 1);
  }, { passive: true });

  // Spotlight (and any future caller) on the phone face
  document.addEventListener('fy25:open', function () { if (!DESKTOP_Q.matches) openFy25Phone(); });

  // Dev aid: ?fy25=1 on the phone face too
  if (!DESKTOP_Q.matches && new URLSearchParams(window.location.search).get('fy25') === '1') {
    setTimeout(openFy25Phone, 400);
  }
}

export function closeFy25Phone() { if (refs) closeAll(); }
```

- [ ] **Step 8.4: Wire into phone.js**

Three edits in `src/phone/phone.js`:

(a) Add to imports (after line 3):

```js
import { initFy25Phone, openFy25Phone, closeFy25Phone } from './fy25-phone.js';
```

(b) Intercept at the top of `openSheet` (line 37-38) — the FY25 key never renders as a sheet:

```js
  function openSheet(key) {
    if (key === 'fy25') { closeSheet(); openFy25Phone(); return; }
    var a = APPS[key];
    if (!a) return;
```

(c) In the Escape handler (line 83), close FY25 overlays too, and call init at the end of `initPhone()` (before the lock-screen timeout):

```js
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape') { closeSheet(); psClose(); closeFy25Phone(); } });
```

```js
  initFy25Phone();
```

- [ ] **Step 8.5: Verify phone flow**

Run: `npm run dev` → DevTools responsive mode, iPhone size (<820px):

1. Boot → home grid shows dark FY25 tile with lock glyph.
2. Tap → dark gate sheet; wrong password → shake + error; `dev-only-pass` → viewer opens, title slide, count-up.
3. Swipe left/right changes slides; ‹ › buttons work; dots track; vertical scroll inside a card-heavy slide does NOT change slides.
4. ✕ closes; reopening tile skips password (session).
5. Phone search → type `fy25` → result opens gate/viewer.
6. Input focus does not zoom the page (16px font); Unlock button visible with keyboard open.
7. Dark mode (`?theme=dark`) restyles viewer.

- [ ] **Step 8.6: Commit**

```bash
git add index.html src/phone/fy25-phone.js src/phone/phone.js
git commit -m "feat: FY25 phone face — locked tile, unlock sheet, swipeable viewer"
```

---

### Task 9: Real content + real password (LOCAL ONLY — no content in repo)

**Files:**
- Modify: `content/fy25.private.json` (gitignored)
- Regenerate: `public/fy25.enc` (committed)

- [ ] **Step 9.1: Copy the real content in**

```bash
cp /Users/vaibhavheda/Documents/Super-procure/FY-2025-26/legacy-fy25/content.json content/fy25.private.json
```

- [ ] **Step 9.2: Concise-copy pass (user-requested)**

Edit `content/fy25.private.json` in place. The renderer consumes ONLY these fields — edit those, leave the rest (extra fields are harmless, they just ride along encrypted):
`identity.{role,company,period.label}`, `tagline.*`, `breadth[]`, `stats.{total,critical,high,bugs,tasks,modulesTouched,clientsImpacted,achievements}`, `heroStats[]`, `tiers[].{label,name}`, `achievements[].{index,tier,order,title,titleEm,clientShort,coverLine}`, `future[].{index,title,titleEm,status,stack,shortDesc}`.

Concision rules (keep the dry editorial voice, cut filler):
- `coverLine` ≤ 5 words, drop redundancy with `titleEm` (e.g. "complete rework · system-wide" stays; anything restating the title goes).
- `titleEm` ≤ 4 words, punchy fragment.
- `clientShort` stays as-is (already terse, real client names are the point).
- `tiers[].name` ≤ 3 words.
- Numbers are never rounded or changed.
- The 8 achievement cards per shipped-slide max: the real file has 16 achievements (8 in tiers 1-2, 8 in tiers 3-4) — exactly fills both grids. Verify counts: `node -e "..."` below.

```bash
node --input-type=module -e "
import { readFile } from 'node:fs/promises';
const c = JSON.parse(await readFile('content/fy25.private.json','utf8'));
const t12 = c.achievements.filter(a=>a.tier<=2).length, t34 = c.achievements.filter(a=>a.tier>=3).length;
console.log('tiers 1-2:', t12, '· tiers 3-4:', t34, '· future:', c.future.length);
"
```

Expected: `tiers 1-2: 8 · tiers 3-4: 8 · future: 3`

- [ ] **Step 9.3: Encrypt with the REAL password**

The user picks the passphrase (3+ words, never written to any file or chat). Run interactively so it's typed hidden:

```bash
npm run fy25:encrypt
```

Expected: `FY25 password: ` (hidden input) → `Wrote public/fy25.enc — <n> bytes of ciphertext, safe to commit.`

- [ ] **Step 9.4: Verify no plaintext leaks**

```bash
git status --short            # content/ must NOT appear
grep -c "Flipkart\|UltraTech\|Haldiram\|Schwing" public/fy25.enc || echo CLEAN
```

Expected: `CLEAN` (grep finds nothing in the ciphertext).

- [ ] **Step 9.5: User reviews the real deck**

Run `npm run dev`, user unlocks with the real password on both faces and reviews the concise copy in the running deck (per spec: copy is reviewed in the deck, not in git). Iterate on `content/fy25.private.json` + re-encrypt until approved.

- [ ] **Step 9.6: Commit (ciphertext only)**

```bash
git add public/fy25.enc
git commit -m "feat: FY25 production payload (encrypted)"
```

---

### Task 10: Build verification + manual checklist

- [ ] **Step 10.1: Tests + build**

```bash
npm test && npm run build
grep -ri "Flipkart\|UltraTech\|Haldiram\|Schwing" dist/ || echo "DIST CLEAN"
grep -ri "dev-only-pass" dist/ src/ scripts/ index.html || echo "NO DEV PASSWORD"
```

Expected: all tests pass, build succeeds, `DIST CLEAN`, `NO DEV PASSWORD`.

- [ ] **Step 10.2: Full manual checklist (from spec)**

Desktop: locked row in 3 Finder views + sidebar → dialog → wrong-pw shake → unlock → deck (7 slides, count-up, dots, keys, fullscreen) → refresh keeps unlock → new tab re-locks → dark mode → `?fy25=1` → reduced-motion (macOS Settings or DevTools emulation) shows instant swaps, no shake, no count-up.

Phone (real iPhone Safari before deploy — same bar as the recent phone-face fixes): tile → gate (no input zoom, button visible over keyboard) → unlock → swipe + buttons → safe areas respected (no gaps at notch/home bar) → session restore → dark mode.

Cross: Spotlight + phone search both route to unlock; `view-source` + DevTools show ciphertext only.

- [ ] **Step 10.3: Finish the branch**

Use superpowers:finishing-a-development-branch — present merge/PR options to the user. Remind the user: deploy is `vite build` → `dist/` → Hostinger upload, and the passphrase brute-force caveat from the spec (ciphertext is public; passphrase strength is the defense).

---

## Self-Review Notes (already applied)

- Spec coverage: locked surfaces (T4/T5/T8), unlock UX + shake + session (T6/T8), crypto + envelope (T1/T2), native deck (T3/T5/T6), phone viewer + mobile compat (T8/T10), Spotlight (T7), copy pass (T9), testing (T1/T3/T10), `.gitignore`-before-content ordering (T2.1).
- Deviation from spec, intentional: phone viewer uses visible ‹ › buttons + swipe instead of invisible edge tap-zones — more discoverable and accessible; spec's intent (two navigation modalities) is preserved.
- Type consistency: `buildSlides(content) → [{id, html}]` and `animateCounts(rootEl, reduce)` used identically in T3/T6/T8; envelope `{v, salt, iv, ct}` identical in T1/T2; `data-fy25-open` attribute identical in T4/T5/T6; `fy25:open` event identical in T6/T7/T8.
