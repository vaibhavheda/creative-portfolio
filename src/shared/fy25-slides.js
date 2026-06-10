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
        '<div class="f-grid ' + (c.future.length === 2 ? 'f-grid-2' : 'f-grid-3') + '">' + c.future.map(futureHtml).join('') + '</div>' +
      '</div>' },

    { id: 'closing', html:
      '<div class="f-slide f-center">' +
        '<h1 class="f-big"' + (String(parseInt(s.total, 10)) === String(s.total) ? ' data-count="' + s.total + '"' : '') + '>' + esc(s.total) + '.</h1>' +
        '<div class="f-sub-strong">' + esc(t.closingMain) + ' <em>' + esc(t.closingMainEm) + '</em> ' + esc(t.closingTail) + '</div>' +
        '<div class="f-kicker">' + esc(t.closingSub) + '</div>' +
      '</div>' }
  ];
}

// Slides → stacked .f-frame markup (shared by the desktop stage and phone track).
export function framesHtml(slides) {
  return slides.map(function (s, i) {
    return '<div class="f-frame" data-slide="' + i + '">' + s.html + '</div>';
  }).join('');
}

// Wrong-password feedback: head-shake, or an outline flash under reduced motion.
export function shake(el, reduce) {
  if (reduce) { el.classList.add('flash'); setTimeout(function () { el.classList.remove('flash'); }, 500); return; }
  el.classList.remove('shake'); void el.offsetWidth; el.classList.add('shake');
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
