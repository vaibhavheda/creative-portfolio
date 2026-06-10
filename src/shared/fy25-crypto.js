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

async function deriveKey(password, salt, extractable) {
  var material = await crypto.subtle.importKey(
    'raw', new TextEncoder().encode(password), 'PBKDF2', false, ['deriveKey']);
  return crypto.subtle.deriveKey(
    { name: 'PBKDF2', hash: 'SHA-256', salt: salt, iterations: ITERATIONS },
    material, { name: 'AES-GCM', length: 256 }, extractable === true, ['encrypt', 'decrypt']);
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
  var key = await deriveKey(password, unb64(envelope.salt), true);
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
