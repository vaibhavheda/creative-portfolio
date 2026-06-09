// macOS DESKTOP face — clock, Finder view toggle, window focus/drag, dock.
import { pad, DAYS_S, MON_S } from '../shared/datetime.js';
import { DESKTOP_Q, REDUCE } from '../shared/env.js';
import { renderFinder, setFinderFilter } from './finder.js';
import { openVee } from '../shared/vee.js';

export function initDesktop() {
  if (initDesktop.done) return;
  initDesktop.done = true;

  renderFinder();

  var mbClock = document.getElementById('mb-clock'), mbDate = document.getElementById('mb-date');
  var wcTime = document.getElementById('wc-time'), wcDate = document.getElementById('wc-date');
  var wcArc = document.getElementById('wc-arc'), wcDot = document.getElementById('wc-dot');
  var meWidget = document.getElementById('widget-me');
  if (meWidget) meWidget.addEventListener('click', function () { var a = document.querySelector('#dock .dock-item[data-target="about"]'); if (a) a.click(); });

  function tick() {
    var d = new Date(), h = d.getHours(), ap = h >= 12 ? 'PM' : 'AM', h12 = h % 12; if (h12 === 0) h12 = 12;
    var hm = h12 + ':' + pad(d.getMinutes());
    if (mbClock) mbClock.textContent = hm + ' ' + ap;
    if (mbDate) mbDate.textContent = DAYS_S[d.getDay()] + ' ' + d.getDate() + ' ' + MON_S[d.getMonth()];
    if (wcTime) wcTime.innerHTML = hm + '<span class="wc-sec">' + pad(d.getSeconds()) + '</span>';
    if (wcDate) wcDate.textContent = DAYS_S[d.getDay()] + ', ' + MON_S[d.getMonth()] + ' ' + d.getDate();
    var frac = (h * 3600 + d.getMinutes() * 60 + d.getSeconds()) / 864;
    if (wcArc) wcArc.style.width = frac + '%';
    if (wcDot) wcDot.style.left = frac + '%';
  }
  tick();
  setInterval(tick, 1000);

  // View toggle (Icon | List | Table)
  var segButtons = document.querySelectorAll('.seg button[data-view]');
  var views = { icon: document.getElementById('view-icon'), list: document.getElementById('view-list'), table: document.getElementById('view-table') };
  function setView(name) {
    Object.keys(views).forEach(function (k) { if (views[k]) views[k].classList.toggle('active', k === name); });
    segButtons.forEach(function (b) {
      var on = b.getAttribute('data-view') === name;
      b.classList.toggle('on', on);
      b.setAttribute('aria-selected', on ? 'true' : 'false');
    });
  }
  segButtons.forEach(function (b) {
    b.addEventListener('click', function () { setView(b.getAttribute('data-view')); });
  });

  // Sidebar filters — clicking a .sb-item[data-filter] filters the Finder and
  // moves the .active class. "Selected Work" (all) stays the default.
  var sbItems = document.querySelectorAll('#finder .sidebar .sb-item[data-filter]');
  sbItems.forEach(function (item) {
    item.addEventListener('click', function () {
      sbItems.forEach(function (s) { s.classList.remove('active'); });
      item.classList.add('active');
      setFinderFilter(item.getAttribute('data-filter'));
    });
  });

  // Window focus + drag
  var zTop = 60, windows = Array.prototype.slice.call(document.querySelectorAll('#desktop .window'));
  function focusWindow(win) {
    windows.forEach(function (w) { w.classList.add('inactive'); });
    win.classList.remove('inactive'); win.style.zIndex = (++zTop);
  }
  windows.forEach(function (w) { w.classList.add('inactive'); });
  if (windows[0]) focusWindow(windows[0]);

  windows.forEach(function (win) {
    win.addEventListener('mousedown', function () { focusWindow(win); });
    var bar = win.querySelector('.titlebar'), dragging = false, sx = 0, sy = 0, ox = 0, oy = 0;
    if (bar) bar.addEventListener('mousedown', function (e) {
      if (e.target.closest('.light')) return;
      if (!DESKTOP_Q.matches) return;
      dragging = true; var r = win.getBoundingClientRect();
      win.style.left = r.left + 'px'; win.style.top = r.top + 'px'; win.style.right = 'auto';
      sx = e.clientX; sy = e.clientY; ox = r.left; oy = r.top; focusWindow(win); e.preventDefault();
    });
    document.addEventListener('mousemove', function (e) {
      if (!dragging) return;
      var nx = ox + (e.clientX - sx), ny = Math.max(27, oy + (e.clientY - sy));
      win.style.left = nx + 'px'; win.style.top = ny + 'px';
    });
    document.addEventListener('mouseup', function () { dragging = false; });
    var red = win.querySelector('.light.red'), yellow = win.querySelector('.light.yellow');
    if (red) red.addEventListener('click', function (e) { e.stopPropagation(); win.style.transition = 'opacity .2s, transform .2s'; win.style.opacity = '0'; win.style.transform = 'scale(.96)'; setTimeout(function () { win.style.display = 'none'; }, 200); });
    if (yellow) yellow.addEventListener('click', function (e) { e.stopPropagation(); win.style.transition = 'opacity .2s, transform .2s'; win.style.opacity = '0'; win.style.transform = 'scale(.6) translateY(40vh)'; setTimeout(function () { win.style.display = 'none'; }, 220); });
  });

  function showWindow(id) {
    var win = document.getElementById(id); if (!win) return;
    win.style.display = 'flex';
    focusWindow(win);
    if (REDUCE.matches) { win.style.opacity = '1'; win.style.transform = 'none'; return; }
    win.style.transition = 'none'; win.style.opacity = '0'; win.style.transform = 'scale(.97)';
    requestAnimationFrame(function () {
      win.style.transition = 'opacity .22s ease, transform .24s cubic-bezier(.2,.8,.2,1)';
      win.style.opacity = '1'; win.style.transform = 'none';
    });
  }

  // Dock: buttons (data-target) open windows; anchors navigate natively
  document.querySelectorAll('#dock .dock-item[data-target]').forEach(function (item) {
    item.addEventListener('click', function () {
      var target = item.getAttribute('data-target');
      if (target) showWindow(target);
    });
  });

  // About window → "Résumé" opens the Preview-style PDF window
  var aboutResume = document.getElementById('aboutResume');
  if (aboutResume) aboutResume.addEventListener('click', function () { showWindow('resume'); });

  // Dev aid: ?win=<id> opens a window on load (for screenshots).
  var winParam = new URLSearchParams(window.location.search).get('win');
  if (winParam) setTimeout(function () { showWindow(winParam); }, 60);

  // ---- Control Center: open/close + live Appearance (theme) toggle ----
  var cc = document.getElementById('control-center');
  var ccBtn = document.getElementById('mb-cc');
  var ccSeg = Array.prototype.slice.call(document.querySelectorAll('#control-center .cc-seg-btn'));
  function applyTheme(name) {
    document.documentElement.setAttribute('data-theme', name);
    try { localStorage.setItem('vheda-theme', name); } catch (e) { /* private mode */ }
    ccSeg.forEach(function (b) { b.classList.toggle('on', b.getAttribute('data-theme-set') === name); });
  }
  // Reflect whatever the boot bootstrap resolved (param > saved > clock).
  applyTheme(document.documentElement.getAttribute('data-theme') || 'light');
  ccSeg.forEach(function (b) { b.addEventListener('click', function () { applyTheme(b.getAttribute('data-theme-set')); }); });

  // Connectivity rows + tiles toggle on/off (cosmetic, like real Control Center).
  document.querySelectorAll('#control-center [data-cc-toggle]').forEach(function (item) {
    item.addEventListener('click', function () {
      var on = item.classList.toggle('on');
      var sub = item.querySelector('small');
      if (sub) sub.textContent = on ? (item.getAttribute('data-on') || 'On') : (item.getAttribute('data-off') || 'Off');
    });
  });
  document.querySelectorAll('#control-center [data-cc-tile]').forEach(function (tile) {
    tile.addEventListener('click', function () { tile.classList.toggle('on'); });
  });
  // "Meet V" → close Control Center, open the V guide overlay
  var meetV = document.getElementById('cc-meet-v');
  if (meetV) meetV.addEventListener('click', function () { ccSetOpen(false); openVee(); });
  function ccSetOpen(on) { if (cc) cc.setAttribute('aria-hidden', on ? 'false' : 'true'); }
  if (cc && ccBtn) {
    ccBtn.addEventListener('click', function (e) { e.stopPropagation(); ccSetOpen(cc.getAttribute('aria-hidden') !== 'false'); });
    document.addEventListener('click', function (e) {
      if (cc.getAttribute('aria-hidden') === 'false' && !cc.contains(e.target) && !ccBtn.contains(e.target)) ccSetOpen(false);
    });
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape') ccSetOpen(false); });
    // Dev aid: ?cc=1 opens Control Center on load (for screenshots).
    if (new URLSearchParams(window.location.search).get('cc') === '1') setTimeout(function () { ccSetOpen(true); }, 80);
  }

  // Dock magnification
  var dock = document.getElementById('dock');
  var items = Array.prototype.slice.call(document.querySelectorAll('#dock .dock-item'));
  function resetDock() { items.forEach(function (it) { it.style.transform = 'scale(1) translateY(0)'; }); }
  if (dock) {
    dock.addEventListener('mousemove', function (e) {
      if (!DESKTOP_Q.matches) return;
      items.forEach(function (it) {
        var r = it.getBoundingClientRect(), c = r.left + r.width / 2, dist = Math.abs(e.clientX - c), max = 110;
        if (dist < max) { var f = 1 - dist / max, scale = 1 + 0.26 * f, lift = -9 * f; it.style.transform = 'scale(' + scale.toFixed(3) + ') translateY(' + lift.toFixed(1) + 'px)'; }
        else { it.style.transform = 'scale(1) translateY(0)'; }
      });
    });
    dock.addEventListener('mouseleave', resetDock);
  }
}
