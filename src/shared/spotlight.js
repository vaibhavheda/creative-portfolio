// "V's search" — a dark liquid-glass Spotlight. Collapsed = a pill + three
// category circles; on type the bar grows and the goo filter melts the circles
// into it. Indexes PROJECTS + About + contact links; simple substring ranking.
import { SVG, PROJECTS } from '../data/projects.js';
import { DESKTOP_Q, REDUCE } from '../shared/env.js';
import { openVee } from './vee.js';

var CAT_SVG = {
  work: '<svg viewBox="0 0 24 24"><rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/></svg>',
  about: '<svg viewBox="0 0 24 24"><circle cx="12" cy="8" r="4"/><path d="M4 20c0-3.6 3.6-6 8-6s8 2.4 8 6"/></svg>',
  links: '<svg viewBox="0 0 24 24"><path d="M9 17H7a5 5 0 0 1 0-10h2"/><path d="M15 7h2a5 5 0 0 1 0 10h-2"/><line x1="8" y1="12" x2="16" y2="12"/></svg>'
};

function buildIndex() {
  var items = [];
  for (var i = 0; i < PROJECTS.length; i++) {
    var p = PROJECTS[i];
    items.push({
      kind: 'project', scope: 'work', title: p.name, meta: p.tag,
      svg: SVG[p.icon], swatch: p.swatch, locked: p.locked,
      terms: ([p.name, p.tag, p.sub].concat(p.stack).concat(p.tags || [])).join(' ').toLowerCase(),
      href: p.href
    });
  }
  items.push({
    kind: 'about', scope: 'about', title: 'About Vaibhav', meta: 'Full-stack + AI',
    svg: SVG.about, swatch: 'ic-about',
    terms: 'about vaibhav heda profile full-stack ai engineer india'
  });
  var links = [
    { title: 'GitHub', meta: '@vaibhavheda', svg: SVG.github, swatch: 'ic-github', href: 'https://github.com/vaibhavheda', terms: 'github code repos' },
    { title: 'LinkedIn', meta: 'vaibhav-heda', svg: SVG.linkedin, swatch: 'ic-linkedin', href: 'https://www.linkedin.com/in/vaibhav-heda/', terms: 'linkedin connect' },
    { title: 'Email', meta: 'vaibhav.heda799@gmail.com', svg: SVG.mail, swatch: 'ic-mail', href: 'mailto:vaibhav.heda799@gmail.com', terms: 'email mail contact reach' }
  ];
  for (var j = 0; j < links.length; j++) {
    var l = links[j];
    items.push({ kind: 'link', scope: 'links', title: l.title, meta: l.meta, svg: l.svg, swatch: l.swatch, terms: l.terms, href: l.href });
  }
  // Scripted concierge intents — keyword → a dry answer + an action.
  var TOUR_SVG = '<svg viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><polygon points="16.2 7.8 14.1 14.1 7.8 16.2 9.9 9.9"/></svg>';
  var cmds = [
    { cmd: 'vee', title: 'Meet V', meta: 'a quick intro from your guide', svg: TOUR_SVG, terms: 'tour guide help walkthrough lost start show around intro v assistant meet' },
    { cmd: 'email', title: 'Available for work?', meta: 'Open to good problems', svg: SVG.about, terms: 'hire available job work freelance open hiring recruit' },
    { cmd: 'docbot', title: 'The AI work', meta: 'RAG · pgvector · Gemini', svg: SVG.docbot, terms: 'ai rag llm ml model gpt assistant intelligence' },
    { cmd: 'about', title: 'The stack', meta: 'TS · React/Nest · pg·Mongo·Redis', svg: SVG.stack, terms: 'stack tech skills languages tools experience' },
    { cmd: 'email', title: 'Get in touch', meta: 'email is fastest', svg: SVG.mail, terms: 'contact reach email hello message hi' }
  ];
  for (var c = 0; c < cmds.length; c++) {
    var cm = cmds[c];
    items.push({ kind: 'cmd', cmd: cm.cmd, title: cm.title, meta: cm.meta, svg: cm.svg, swatch: 'sw-cmd', terms: cm.terms });
  }
  return items;
}

function rank(item, q) {
  if (!q) return 0;
  var n = item.title.toLowerCase();
  if (n.indexOf(q) === 0) return 100;
  if (n.indexOf(q) > -1) return 60;
  if (item.terms.indexOf(q) > -1) return 30;
  return 0;
}
function sized(svg, n) { return svg.replace('<svg ', '<svg width="' + n + '" height="' + n + '" '); }

export function initSpotlight() {
  if (initSpotlight.done) return;
  initSpotlight.done = true;

  var INDEX = buildIndex();
  var lastFocus = null, results = [], active = -1, scope = null;

  var overlay = document.createElement('div');
  overlay.id = 'spotlight';
  overlay.setAttribute('aria-hidden', 'true');
  overlay.innerHTML =
    '<div class="sp-scrim"></div>' +
    '<div class="sp-stage">' +
      '<div class="sp-panel" role="dialog" aria-modal="true" aria-label="V’s search">' +
        '<div class="sp-bar">' +
          '<svg class="sp-mag" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="11" cy="11" r="7"/><line x1="21" y1="21" x2="16.2" y2="16.2"/></svg>' +
          '<input id="sp-input" type="text" autocomplete="off" autocapitalize="off" autocorrect="off" spellcheck="false" placeholder="V’s search" aria-label="V’s search">' +
          '<span class="sp-openhint" id="sp-openhint"></span>' +
        '</div>' +
        '<div class="sp-results" role="listbox" aria-label="Results"></div>' +
      '</div>' +
      '<button class="sp-cat c1" data-scope="work" title="Work" aria-label="Work">' + CAT_SVG.work + '</button>' +
      '<button class="sp-cat c2" data-scope="about" title="About" aria-label="About">' + CAT_SVG.about + '</button>' +
      '<button class="sp-cat c3" data-scope="links" title="Links" aria-label="Links">' + CAT_SVG.links + '</button>' +
    '</div>';
  document.body.appendChild(overlay);

  var stage = overlay.querySelector('.sp-stage');
  var scrim = overlay.querySelector('.sp-scrim');
  var input = overlay.querySelector('#sp-input');
  var list = overlay.querySelector('.sp-results');
  var openhint = overlay.querySelector('#sp-openhint');

  function openItem(item) {
    if (!item) return;
    close();
    // Locked entries (FY25) route to the unlock flow on whichever face is live.
    if (item.locked) { document.dispatchEvent(new CustomEvent('fy25:open')); return; }
    if (item.kind === 'cmd') {
      if (item.cmd === 'vee') openVee();
      else if (item.cmd === 'email') window.open('mailto:vaibhav.heda799@gmail.com');
      else if (item.cmd === 'docbot') window.open('https://folio.vheda.in', '_blank', 'noopener');
      else if (item.cmd === 'about') { var da = document.querySelector('#dock .dock-item[data-target="about"]'); if (da) da.click(); }
      return;
    }
    if (item.kind === 'link' || item.kind === 'project') { if (item.href) window.open(item.href, '_blank', 'noopener'); return; }
    // About — reach the handler that already works on this face.
    if (DESKTOP_Q.matches) { var d = document.querySelector('#dock .dock-item[data-target="about"]'); if (d) d.click(); }
    else { var t = document.querySelector('#phone-stage [data-app="about"]'); if (t) t.click(); }
  }

  function render() {
    if (!results.length) {
      list.innerHTML = (input.value.trim() || scope) ? '<div class="sp-empty">No results</div>' : '';
      return;
    }
    list.innerHTML = results.map(function (it, idx) {
      var on = idx === active ? ' active' : '';
      return '<button type="button" class="sp-row' + on + '" role="option" data-idx="' + idx + '" aria-selected="' + (idx === active) + '">' +
        '<span class="doc-ico ' + it.swatch + '">' + sized(it.svg, 17) + '</span>' +
        '<span class="sp-name">' + it.title + '</span>' +
        '<span class="sp-meta">' + it.meta + '</span>' +
        '<span class="sp-kbd">↵</span></button>';
    }).join('');
  }

  function setActive(n) {
    if (!results.length) { active = -1; return; }
    active = (n + results.length) % results.length;
    var rows = list.querySelectorAll('.sp-row');
    for (var i = 0; i < rows.length; i++) {
      var on = i === active;
      rows[i].classList.toggle('active', on);
      rows[i].setAttribute('aria-selected', on ? 'true' : 'false');
      if (on && rows[i].scrollIntoView) rows[i].scrollIntoView({ block: 'nearest' });
    }
  }

  function update() {
    var q = input.value.trim().toLowerCase();
    if (q) {
      scope = null;
      results = INDEX.map(function (it, i) { return { it: it, s: rank(it, q), i: i }; })
        .filter(function (x) { return x.s > 0; })
        .sort(function (a, b) { return b.s - a.s || a.i - b.i; })
        .map(function (x) { return x.it; });
    } else if (scope) {
      results = INDEX.filter(function (it) { return it.scope === scope; });
    } else {
      results = [];
    }
    active = results.length ? 0 : -1;
    var expanded = !!(q || scope);
    stage.classList.toggle('open', expanded);
    openhint.textContent = expanded && results.length ? '— Open' : '';
    render();
  }

  function open() {
    if (overlay.classList.contains('show')) { input.focus(); input.select(); return; }
    lastFocus = document.activeElement;
    input.value = ''; scope = null;
    update();                       // collapsed: pill + circles, no results
    overlay.classList.add('show');
    overlay.setAttribute('aria-hidden', 'false');
    if (REDUCE.matches) input.focus();
    else requestAnimationFrame(function () { input.focus(); });
  }
  function close() {
    if (!overlay.classList.contains('show')) return;
    overlay.classList.remove('show');
    stage.classList.remove('open');
    overlay.setAttribute('aria-hidden', 'true');
    scope = null;
    if (lastFocus && lastFocus.focus) { try { lastFocus.focus(); } catch (e) {} }
    lastFocus = null;
  }

  input.addEventListener('input', update);
  list.addEventListener('click', function (e) { var r = e.target.closest('.sp-row'); if (r) openItem(results[parseInt(r.getAttribute('data-idx'), 10)]); });
  list.addEventListener('mousemove', function (e) { var r = e.target.closest('.sp-row'); if (r) setActive(parseInt(r.getAttribute('data-idx'), 10)); });
  scrim.addEventListener('click', close);
  overlay.querySelectorAll('.sp-cat').forEach(function (c) {
    c.addEventListener('click', function () { scope = c.getAttribute('data-scope'); input.value = ''; update(); input.focus(); });
  });

  overlay.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') { e.preventDefault(); if (input.value || scope) { input.value = ''; scope = null; update(); } else close(); return; }
    if (e.key === 'ArrowDown') { e.preventDefault(); setActive(active + 1); return; }
    if (e.key === 'ArrowUp') { e.preventDefault(); setActive(active - 1); return; }
    if (e.key === 'Enter') { e.preventDefault(); openItem(results[active]); return; }
  });

  // Global triggers (one document-level keydown).
  function isTyping(el) { if (!el) return false; var t = el.tagName; return t === 'INPUT' || t === 'TEXTAREA' || t === 'SELECT' || el.isContentEditable; }
  document.addEventListener('keydown', function (e) {
    // ⌘K toggles — press again to hide.
    if (e.metaKey && (e.key === 'k' || e.key === 'K')) {
      e.preventDefault();
      if (overlay.classList.contains('show')) close(); else open();
      return;
    }
    if (overlay.classList.contains('show')) return;
    if (e.key === '/' && !isTyping(document.activeElement)) { e.preventDefault(); open(); return; }
  });

  var mb = document.getElementById('mb-spotlight');
  if (!mb) {
    var icos = document.querySelectorAll('#menubar .mb-ico');
    for (var k = 0; k < icos.length; k++) { if (icos[k].getAttribute('title') === 'Spotlight') { mb = icos[k]; mb.id = 'mb-spotlight'; break; } }
  }
  if (mb) mb.addEventListener('click', open);

  // (The phone face has its own iOS-native search in phone.js — the mac pill is
  // desktop-only, so we do NOT wire #phone-stage .searchpill to this overlay.)

  // Dev aid: ?spotlight=1 / =open opens collapsed; ?spotlight=<word> opens expanded.
  var sp = new URLSearchParams(window.location.search).get('spotlight');
  if (sp) { open(); if (sp !== '1' && sp !== 'open') { input.value = sp; update(); } }
}
