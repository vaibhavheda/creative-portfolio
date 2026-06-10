// iOS HOME face — clock, app launchers, slide-up detail sheet.
import { pad, DAYS_L, MON_L } from '../shared/datetime.js';
import { SVG, APPS, ICOCLASS, PROJECTS } from '../data/projects.js';
import { initFy25Phone, openFy25Phone, closeFy25Phone } from './fy25-phone.js';

export function initPhone() {
  if (initPhone.done) return;
  initPhone.done = true;

  function tick() {
    var d = new Date(), h = d.getHours(), m = pad(d.getMinutes()), hh = h % 12; if (hh === 0) hh = 12;
    var t = hh + ':' + m;
    var time = document.getElementById('time'), lk = document.getElementById('lkTime'), lkd = document.getElementById('lkDate');
    if (time) time.textContent = t;
    if (lk) lk.textContent = t;
    if (lkd) lkd.textContent = DAYS_L[d.getDay()] + ', ' + MON_L[d.getMonth()] + ' ' + d.getDate();
  }
  tick();
  setInterval(tick, 15000);

  var scrim = document.getElementById('scrim');
  var sheet = document.getElementById('sheet');
  var body = document.getElementById('sheetBody');

  function rowHtml(r) {
    var icoClass = ICOCLASS[r.key] || 'ic-about';
    var icoSvg = SVG[r.key] || SVG.about;
    var inner =
      '<span class="r-ic ' + icoClass + '">' + icoSvg.replace('<svg ', '<svg width="16" height="16" ') + '</span>' +
      '<span>' + r.l + '</span>' +
      '<span class="r-val">' + r.v + '</span>';
    if (r.app) return '<button type="button" class="row" data-goto="' + r.app + '">' + inner + '</button>';
    var target = r.href || '#';
    var ext = (target.indexOf('http') === 0) ? ' target="_blank" rel="noopener"' : '';
    return '<a class="row" href="' + target + '"' + ext + '>' + inner + '</a>';
  }

  function openSheet(key) {
    if (key === 'fy25') { closeSheet(); openFy25Phone(); return; }
    var a = APPS[key];
    if (!a) return;
    var html =
      '<div class="s-icon ' + a.icon + '">' + a.svg.replace('<svg ', '<svg width="30" height="30" ') + '</div>' +
      '<h2>' + a.title + '</h2>' +
      '<div class="s-meta">' + a.meta.join('') + '</div>' +
      '<p class="body">' + a.body + '</p>';
    if (a.stack && a.stack.length) {
      html += '<div class="s-stack">';
      for (var s = 0; s < a.stack.length; s++) html += '<span class="t">' + a.stack[s] + '</span>';
      html += '</div>';
    }
    if (a.open) {
      html += '<a class="s-open" href="' + a.open + '" target="_blank" rel="noopener">Open ' +
        '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M7 17 17 7"/><path d="M8 7h9v9"/></svg></a>';
    }
    if (a.links && a.links.length) {
      html += '<div class="s-list">';
      for (var i = 0; i < a.links.length; i++) html += rowHtml(a.links[i]);
      html += '</div>';
    }
    if (a.foot) html += '<div class="s-foot">' + a.foot + '</div>';
    body.innerHTML = html;
    scrim.classList.add('open');
    sheet.classList.add('open');
    sheet.scrollTop = 0;

    var gotos = body.querySelectorAll('[data-goto]');
    for (var j = 0; j < gotos.length; j++) {
      gotos[j].addEventListener('click', function (e) {
        e.preventDefault();
        openSheet(this.getAttribute('data-goto'));
      });
    }
  }
  function closeSheet() { scrim.classList.remove('open'); sheet.classList.remove('open'); }

  var launchers = document.querySelectorAll('#phone-stage [data-app]:not(.searchpill)');
  for (var i = 0; i < launchers.length; i++) {
    launchers[i].addEventListener('click', function (e) {
      e.preventDefault();
      openSheet(this.getAttribute('data-app'));
    });
  }
  scrim.addEventListener('click', closeSheet);
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape') { closeSheet(); psClose(); closeFy25Phone(); } });

  // ---- iOS-native Spotlight search (scoped to the phone .screen) ----
  var SCREEN = document.querySelector('#phone-stage .screen');
  var SX = [];
  for (var pi = 0; pi < PROJECTS.length; pi++) {
    var pp = PROJECTS[pi];
    SX.push({ key: pp.key, title: pp.name, meta: pp.tag, tile: pp.tile, svg: SVG[pp.icon],
      terms: (pp.name + ' ' + pp.tag + ' ' + (pp.sub || '') + ' ' + pp.stack.join(' ') + ' ' + (pp.tags || []).join(' ')).toLowerCase(), app: pp.key });
  }
  SX.push({ key: 'about', title: 'About Vaibhav', meta: 'Full-stack + AI', tile: 'ic-about', svg: SVG.about, terms: 'about vaibhav heda profile engineer full-stack ai india', app: 'about' });
  SX.push({ key: 'github', title: 'GitHub', meta: '@vaibhavheda', tile: 'ic-github', svg: SVG.github, terms: 'github code repos', href: 'https://github.com/vaibhavheda' });
  SX.push({ key: 'linkedin', title: 'LinkedIn', meta: 'vaibhav-heda', tile: 'ic-linkedin', svg: SVG.linkedin, terms: 'linkedin connect', href: 'https://www.linkedin.com/in/vaibhav-heda/' });
  SX.push({ key: 'mail', title: 'Email', meta: 'vaibhav.heda799', tile: 'ic-mail', svg: SVG.mail, terms: 'email mail contact reach', href: 'mailto:vaibhav.heda799@gmail.com' });

  var psearch = document.createElement('div');
  psearch.className = 'psearch';
  psearch.innerHTML =
    '<div class="ps-field">' +
      '<div class="ps-box"><svg class="ps-mag" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><circle cx="11" cy="11" r="7"/><line x1="21" y1="21" x2="16.5" y2="16.5"/></svg>' +
      '<input id="ps-input" type="text" placeholder="Search" autocomplete="off" autocapitalize="off" autocorrect="off" spellcheck="false" aria-label="Search"></div>' +
      '<button type="button" class="ps-cancel">Cancel</button>' +
    '</div>' +
    '<div class="ps-results"></div>';
  if (SCREEN) SCREEN.appendChild(psearch);
  var psInput = psearch.querySelector('#ps-input');
  var psResults = psearch.querySelector('.ps-results');

  function psRender() {
    var q = psInput.value.trim().toLowerCase();
    if (!q) { psResults.innerHTML = ''; return; }
    var m = SX.filter(function (it) { return it.title.toLowerCase().indexOf(q) > -1 || it.terms.indexOf(q) > -1; });
    psResults.innerHTML = m.length ? m.map(function (it) {
      return '<button type="button" class="ps-row" data-key="' + it.key + '">' +
        '<span class="ps-ico ' + it.tile + '">' + it.svg.replace('<svg ', '<svg width="20" height="20" ') + '</span>' +
        '<span class="ps-name">' + it.title + '</span><span class="ps-meta">' + it.meta + '</span></button>';
    }).join('') : '<div class="ps-empty">No results</div>';
  }
  function psOpen() { psearch.classList.add('open'); psInput.value = ''; psRender(); setTimeout(function () { psInput.focus(); }, 80); }
  function psClose() { psearch.classList.remove('open'); if (psInput) psInput.blur(); }
  psInput.addEventListener('input', psRender);
  psearch.querySelector('.ps-cancel').addEventListener('click', psClose);
  psResults.addEventListener('click', function (e) {
    var row = e.target.closest('.ps-row'); if (!row) return;
    var key = row.getAttribute('data-key'), it = null;
    for (var z = 0; z < SX.length; z++) if (SX[z].key === key) { it = SX[z]; break; }
    psClose();
    if (it && it.href) window.open(it.href, '_blank', 'noopener');
    else if (it && it.app) openSheet(it.app);
  });
  var spill = document.querySelector('#phone-stage .searchpill');
  if (spill) spill.addEventListener('click', function (e) { e.preventDefault(); psOpen(); });
  // Dev aid: ?psearch=<word> opens the phone search pre-filled (for screenshots).
  var psParam = new URLSearchParams(window.location.search).get('psearch');
  if (psParam) { psOpen(); if (psParam !== '1') { psInput.value = psParam; psRender(); } }

  // The guide is V (the full-screen overlay) — auto-shown on first visit and
  // re-openable from search. Dev aid: ?vee=1 force-opens it (handled in vee.js).

  initFy25Phone();

  var lock = document.getElementById('lock');
  if (lock) setTimeout(function () { if (lock && lock.parentNode) lock.parentNode.removeChild(lock); }, 1600);
}
