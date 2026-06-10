// The renderer is pure string-building (no DOM), so it tests in Node directly.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { buildSlides } from '../src/shared/fy25-slides.js';

const content = JSON.parse(await readFile(new URL('./fy25-sample.json', import.meta.url), 'utf8'));

test('builds exactly 7 slides in deck order', () => {
  const slides = buildSlides(content);
  assert.deepEqual(slides.map(s => s.id),
    ['title', 'overview', 'numbers', 'shipped-1', 'shipped-2', 'coming', 'closing']);
});

test('title slide carries the hero line and all hero stats', () => {
  const html = buildSlides(content)[0].html;
  assert.match(html, /What I/);
  assert.match(html, /<em>shipped<\/em>/);
  for (const h of content.heroStats) assert.ok(html.includes(h.label), h.label);
});

test('numbers slide marks pure-numeric stats for count-up', () => {
  const html = buildSlides(content)[2].html;
  assert.match(html, /data-count="313"/);
  assert.match(html, /data-count="97"/);
  assert.ok(!html.includes('data-count="30+"'), '30+ is not count-up animatable');
});

test('shipped slides split achievements by tier', () => {
  const slides = buildSlides(content);
  assert.match(slides[3].html, /Vehicle &amp; Driver Master/);
  assert.ok(!slides[3].html.includes('Container Master'), 'tier 4 stays off shipped-1');
  assert.match(slides[4].html, /Container Master/);
});

test('all content is HTML-escaped and no field renders as undefined', () => {
  const evil = JSON.parse(JSON.stringify(content));
  evil.achievements[0].title = '<script>alert(1)</script>';
  const all = buildSlides(evil).map(s => s.html).join('');
  assert.ok(!all.includes('<script>alert'));
  assert.ok(!all.includes('undefined'));
});
