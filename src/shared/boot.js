// Boot overlay — a short, dry "boot log" reveal instead of a generic spinner.
// Lines type in one-by-one in JetBrains Mono, then the whole #boot crossfades to
// the desktop. Skippable (any click/keypress dismisses), and reduced-motion shows
// the final state and fades almost instantly. The overlay always ends up removed
// so it never traps the page.
import { PROJECTS } from '../data/projects.js';
import { REDUCE } from './env.js';

export function initBoot() {
  if (initBoot.done) return;
  initBoot.done = true;

  var boot = document.getElementById('boot');
  if (!boot) return;
  var log = boot.querySelector('.boot-log');
  if (!log) { boot.parentNode && boot.parentNode.removeChild(boot); return; }

  // The log. First line is the hostname (head weight); rest are dim status lines.
  // Survivor count comes straight off the catalogue.
  var count = (PROJECTS && PROJECTS.filter(function (p) { return !p.locked; }).length) || 4;
  var LINES = [
    { text: 'vheda.os', head: true },
    { text: 'mounting catalogue … ' + count + ' survivors' },
    { text: 'waking the dock …' },
    { text: 'ready.' }
  ];

  // Render the static block: every line present but hidden (.on toggles visibility),
  // a blinking cursor parked on the last line. Reveal flips one .on per tick.
  var html = '';
  for (var i = 0; i < LINES.length; i++) {
    var cls = 'bl-line' + (LINES[i].head ? ' bl-head' : '');
    var cur = i === LINES.length - 1 ? '<span class="bl-cur"> █</span>' : '';
    html += '<span class="' + cls + '">' + LINES[i].text + cur + '</span>\n';
  }
  log.innerHTML = html;
  var rows = log.querySelectorAll('.bl-line');

  var timers = [];
  var dismissed = false;

  function dismiss() {
    if (dismissed) return;
    dismissed = true;
    for (var t = 0; t < timers.length; t++) clearTimeout(timers[t]);
    document.removeEventListener('keydown', onKey);
    boot.removeEventListener('click', dismiss);
    // Crossfade out, then pull the overlay from the DOM so it can't trap focus.
    boot.classList.add('done');
    var fade = REDUCE.matches ? 180 : 460;
    setTimeout(function () { boot.parentNode && boot.parentNode.removeChild(boot); }, fade);
  }

  function onKey() { dismiss(); }
  document.addEventListener('keydown', onKey);
  boot.addEventListener('click', dismiss);

  // Reduced motion: skip the typing, show the final frame, fade almost at once.
  if (REDUCE.matches) {
    for (var r = 0; r < rows.length; r++) rows[r].classList.add('on');
    timers.push(setTimeout(dismiss, 320));
    return;
  }

  // Reveal lines one-by-one (~quick), hold a beat on "ready.", then crossfade.
  // Total budget ~1.2–1.6s: 4 lines × 240ms + ~360ms hold ≈ 1.3s.
  var STEP = 240;
  for (var k = 0; k < rows.length; k++) {
    (function (row, delay) {
      timers.push(setTimeout(function () { row.classList.add('on'); }, delay));
    })(rows[k], k * STEP);
  }
  timers.push(setTimeout(dismiss, rows.length * STEP + 360));
}
