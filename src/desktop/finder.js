// Renders the Finder's three views (Table / List / Icon) from PROJECTS — one
// source of truth, so stacks and icons live in exactly one place.
import { PROJECTS, SVG } from '../data/projects.js';

function sized(key, n) {
  return SVG[key].replace('<svg ', '<svg width="' + n + '" height="' + n + '" ');
}
function statusChip(status) {
  return status === 'live'
    ? '<span class="status-chip chip-live"><span class="dot"></span>Live</span>'
    : '<span class="status-chip chip-wip"><span class="dot"></span>In review</span>';
}
function rowHref(p) {
  if (p.href) return ' href="' + p.href + '" target="_blank" rel="noopener"';
  if (p.download) return ' href="' + p.download + '" download';
  return ' href="#"';
}
function tableLink(p) {
  if (p.href) return '<a href="' + p.href + '" target="_blank" rel="noopener">' + p.linkLabel + ' ↗</a>';
  if (p.download) return '<a href="' + p.download + '" download>Download ↓</a>';
  return '<span class="nolink">' + (p.linkLabel || '—') + '</span>';
}

// Module-level current filter — defaults to "everything". Each sidebar key maps
// to a predicate via filterFor(); renderFinder() honours whatever is current.
function passAll() { return true; }
var currentFilter = passAll;

// Map a sidebar key ("all" | "shipped" | "live" | "review" | "tag:<Name>") to a predicate.
function filterFor(key) {
  if (key === 'shipped' || key === 'live') return function (p) { return p.status === 'live'; };
  if (key === 'review') return function (p) { return p.status === 'review'; };
  if (key && key.indexOf('tag:') === 0) {
    var want = key.slice(4);
    return function (p) { return (p.tags || []).indexOf(want) !== -1; };
  }
  return passAll;
}

// Re-render all three views + the statusbar through setFinderFilter(key).
export function setFinderFilter(key) {
  currentFilter = filterFor(key);
  renderFinder(currentFilter);
}

export function renderFinder(pred) {
  if (pred) currentFilter = pred;
  var match = currentFilter || passAll;
  var items = PROJECTS.filter(match);

  var tbody = document.querySelector('#view-table table.work tbody');
  if (tbody) tbody.innerHTML = items.map(function (p) {
    return '<tr>' +
      '<td><div class="tb-name"><div class="doc-ico ' + p.swatch + '">' + sized(p.icon, 16) + '</div>' +
      '<div><b>' + p.name + '</b><span class="tb-tag">' + p.tag + '</span></div></div></td>' +
      '<td class="tb-year">' + p.year + '</td>' +
      '<td>' + statusChip(p.status) + '</td>' +
      '<td class="tb-stack">' + p.stack.join(' · ') + '</td>' +
      '<td class="tb-link">' + tableLink(p) + '</td>' +
      '</tr>';
  }).join('');

  var list = document.querySelector('#view-list .file-list');
  if (list) list.innerHTML = items.map(function (p) {
    return '<a class="file-row"' + rowHref(p) + '>' +
      '<div class="file-name"><div class="doc-ico ' + p.swatch + '">' + sized(p.icon, 18) + '</div>' +
      '<div style="min-width:0"><div class="fr-name">' + p.name + '</div><div class="fr-sub">' + p.sub + '</div></div></div>' +
      '<div class="fr-meta">' + p.year + '</div>' +
      '<div>' + statusChip(p.status) + '</div>' +
      '</a>';
  }).join('');

  var grid = document.querySelector('#view-icon .icon-grid');
  if (grid) grid.innerHTML = items.map(function (p) {
    var badge = p.status === 'live' ? 'var(--live)' : 'var(--wip)';
    var label = p.status === 'live' ? 'Live' : 'In review';
    return '<a class="icon-tile"' + rowHref(p) + '>' +
      '<div class="doc-ico ' + p.swatch + '">' + sized(p.icon, 30) + '<span class="badge" style="background:' + badge + '"></span></div>' +
      '<div class="it-name">' + p.name + '</div>' +
      '<div class="it-meta">' + p.year + ' · ' + label + '</div>' +
      '</a>';
  }).join('');

  var bar = document.querySelector('.finder-statusbar');
  if (bar) {
    var n = items.length, total = PROJECTS.length;
    var count = n === total ? total + ' items' : n + ' of ' + total + ' items';
    bar.textContent = count + ' · ' + items.filter(function (p) { return p.status === 'live'; }).length +
      ' live — the catalogue only shows the survivors.';
  }
}
