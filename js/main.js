import * as THREE from 'https://esm.sh/three@0.165.0';
import { composer, cubeRoot, positionCamera } from './scene.js';
import { buildCube, getN, turnState, startTurn, tickTurn, tickAnimation } from './cube.js';
import { THEMES, getCurrentTheme, initTheme, setTheme, tickThemeTransition } from './theme.js';
import { orbit, hasHover, mouseNDC, init as initInteractions } from './interactions.js';
import { init as initClock } from './clock.js';
import { init as initUi } from './ui.js';

// Apply saved theme (lights/bloom only — cube not built yet)
initTheme();

// Build initial cube with current theme colors
const t0 = THEMES[getCurrentTheme()];
buildCube(getN(), t0.cubeBottom, t0.cubeTop);

// Wire theme dot buttons
document.querySelectorAll('.theme-dot').forEach(dot => {
  dot.addEventListener('click', () => setTheme(dot.dataset.theme));
});

// Auto theme cycle every 15s
const THEME_ORDER = ['dusk', 'tide', 'moss', 'void'];
setInterval(() => {
  const next = THEME_ORDER[(THEME_ORDER.indexOf(getCurrentTheme()) + 1) % THEME_ORDER.length];
  setTheme(next);
}, 15000);

// Init canvas interactions, clock, UI
const canvas = document.getElementById('c');
initInteractions(canvas);
initClock();
initUi();

// ── Render loop ───────────────────────────────────────────────
const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const clock = new THREE.Clock();
let rafId = null;

function render() {
  rafId = requestAnimationFrame(render);
  const dt  = Math.min(clock.getDelta(), 0.05);
  const now = Date.now();

  tickThemeTransition(dt);

  if (!orbit.dragging && (now - orbit.lastDrag) / 1000 > 2.5) orbit.theta += dt * 0.25;
  cubeRoot.position.y = Math.sin(now * 0.0007) * 0.18;
  positionCamera(orbit.theta, orbit.phi);

  if (!prefersReducedMotion) {
    if (turnState.anim) tickTurn(dt);
    else { turnState.waitTimer -= dt; if (turnState.waitTimer <= 0) startTurn(); }
    tickAnimation(now * 0.0011, hasHover, mouseNDC);
  }

  composer.render();
}
render();

document.addEventListener('visibilitychange', () => {
  if (document.hidden) {
    if (rafId !== null) { cancelAnimationFrame(rafId); rafId = null; }
  } else {
    if (rafId === null) { clock.getDelta(); render(); }
  }
});
