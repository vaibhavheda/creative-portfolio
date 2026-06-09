// V — a scripted, full-screen Siri-style guide. NO model: just three lines V
// types out (intro → who Vaibhav is → the ⌘K shortcut), then "go explore".
// Auto-shows once on the first visit; re-openable from Control Center.
import { DESKTOP_Q, REDUCE } from './env.js';

var SEEN_KEY = 'vheda-met-v';
var opener = null;

export function initVee() {
  if (initVee.done) return;
  var vee = document.getElementById('vee');
  if (!vee) return;
  initVee.done = true;

  var msg = document.getElementById('vee-msg');
  var hint = document.getElementById('vee-hint');
  var skipBtn = document.getElementById('vee-skip');
  if (!msg || !hint || !skipBtn) return;
  var step = 0, steps = [], typeTimer = null;

  function buildSteps() {
    var shortcut = DESKTOP_Q.matches ? 'Press ⌘K' : 'Tap Search';
    steps = [
      'Well, hello. I’m V — resident guide and full-time hype machine.',
      'The engineer who lives here tames backends, herds pixels, and ships logistics tools that hold up under real load.',
      'Everything on this screen is his own doing — Toolkitly, FuelFlow, Doc bot. Real apps, real users, zero vaporware.',
      shortcut + ' to dig through his work. Go on — poke around, he doesn’t bite.'
    ];
  }

  function isOpen() { return vee.getAttribute('aria-hidden') === 'false'; }
  function stopTyping() { if (typeTimer) { clearInterval(typeTimer); typeTimer = null; } }

  function type(text) {
    stopTyping();
    if (REDUCE.matches) { msg.textContent = text; return; }
    msg.textContent = '';
    var i = 0;
    typeTimer = setInterval(function () {
      i++; msg.textContent = text.slice(0, i);
      if (i >= text.length) stopTyping();
    }, 20);
  }

  function render() {
    type(steps[step]);
    var last = step >= steps.length - 1;
    var tap = DESKTOP_Q.matches ? 'Press any key' : 'Tap';
    hint.textContent = tap + (last ? ' to explore' : ' to continue');
  }

  function open() {
    buildSteps(); step = 0;
    vee.setAttribute('aria-hidden', 'false');
    render();
  }

  function close() {
    stopTyping();
    vee.setAttribute('aria-hidden', 'true');
    try { localStorage.setItem(SEEN_KEY, '1'); } catch (e) { /* private mode */ }
  }
  opener = open;

  // Any key or tap advances; if a line is still typing, reveal it in full first.
  function advance() {
    if (!isOpen()) return;
    if (typeTimer) { stopTyping(); msg.textContent = steps[step]; return; }
    if (step >= steps.length - 1) close();
    else { step++; render(); }
  }

  skipBtn.addEventListener('click', function (e) { e.stopPropagation(); close(); });
  vee.addEventListener('click', advance);
  document.addEventListener('keydown', function (e) {
    if (!isOpen()) return;
    if (e.key === 'Escape') { close(); return; }
    if (e.metaKey || e.ctrlKey) return; // let shortcuts (⌘K etc.) reach their own handlers
    if (e.key === 'Tab') return; // let focus move
    if (['Shift', 'Control', 'Alt', 'Meta'].indexOf(e.key) !== -1) return; // ignore bare modifiers
    advance();
  });

  // First visit only: introduce V once the boot splash has cleared.
  // Dev aid: ?vee=1 force-opens it regardless of the seen flag.
  var force = /[?&]vee=1\b/.test(window.location.search);
  var seen = false;
  try { seen = !!localStorage.getItem(SEEN_KEY); } catch (e) { /* private mode */ }
  if (force || !seen) setTimeout(open, force ? 200 : 2200);
}

export function openVee() { if (opener) opener(); }
