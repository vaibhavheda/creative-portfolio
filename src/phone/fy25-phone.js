// FY25 on the phone face — full-screen unlock sheet + swipeable slide viewer.
// Entry point is openFy25Phone() (phone.js's openSheet intercepts the 'fy25'
// key, so the tile, sheet data-goto rows and phone search all funnel through)
// plus the 'fy25:open' event from Spotlight.
import { DESKTOP_Q, REDUCE } from '../shared/env.js';
import { unlockWithPassword, tryRestore } from '../shared/fy25-crypto.js';
import { buildSlides, animateCounts, framesHtml, shake } from '../shared/fy25-slides.js';

var refs = null;
var slides = null, idx = 0, busy = false;

export function openFy25Phone() {
  if (!refs) return;
  tryRestore().then(function (c) { if (c) openViewer(c); else openGate(); });
}

export function closeFy25Phone() {
  if (!refs) return;
  refs.gate.setAttribute('aria-hidden', 'true');
  refs.view.setAttribute('aria-hidden', 'true');
  refs.input.blur();
}

function openGate() {
  refs.perr.textContent = ''; refs.input.value = '';
  refs.gate.setAttribute('aria-hidden', 'false');
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
    refs.track.innerHTML = framesHtml(slides);
    refs.pdots.innerHTML = slides.map(function () { return '<i></i>'; }).join('');
  }
  refs.gate.setAttribute('aria-hidden', 'true');
  refs.view.setAttribute('aria-hidden', 'false');
  show(idx);
}

function submit() {
  if (busy) return;
  busy = true;
  unlockWithPassword(refs.input.value).then(function (c) {
    busy = false;
    // User may have closed the gate while PBKDF2 was running — a dismissal
    // must not be overridden by the late success.
    if (refs.gate.getAttribute('aria-hidden') === 'true') return;
    openViewer(c);
  }, function () {
    busy = false;
    if (refs.gate.getAttribute('aria-hidden') === 'true') return;
    refs.perr.textContent = 'Wrong password.';
    refs.input.value = ''; refs.input.focus(); shake(refs.card, REDUCE.matches);
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
  for (var i = 0; i < closes.length; i++) closes[i].addEventListener('click', closeFy25Phone);

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
