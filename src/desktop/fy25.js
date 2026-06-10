// FY25 on the desktop face — unlock dialog + Keynote-style deck window.
// Launch surfaces: Finder rows / sidebar ([data-fy25-open]), Spotlight
// (document 'fy25:open' event), ?fy25=1. All funnel through requestOpen().
import { DESKTOP_Q, REDUCE } from '../shared/env.js';
import { unlockWithPassword, tryRestore } from '../shared/fy25-crypto.js';
import { buildSlides, animateCounts, framesHtml, shake } from '../shared/fy25-slides.js';

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
    stage.innerHTML = framesHtml(slides);
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
      // User may have cancelled (Esc/Cancel/backdrop) while PBKDF2 was running —
      // an explicit dismissal must not be overridden by the late success.
      if (gate.getAttribute('aria-hidden') === 'true') return;
      openDeck(c);
    }, function () {
      busy = false; card.classList.remove('busy');
      if (gate.getAttribute('aria-hidden') === 'true') return;
      errLine.textContent = 'Wrong password.';
      input.value = ''; input.focus(); shake(card, REDUCE.matches);
    });
  }

  // Gate wiring
  gate.querySelector('.fy25-unlock').addEventListener('click', submit);
  gate.querySelector('.fy25-cancel').addEventListener('click', gateClose);
  input.addEventListener('keydown', function (e) {
    if (e.key === 'Enter') { e.preventDefault(); submit(); }
  });
  // Gate-level so Esc works from any focused child (input, Cancel, Unlock).
  gate.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') { e.preventDefault(); gateClose(); }
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
