import * as THREE from 'three';
import { initScene, composer, cubeRoot, positionCamera } from './scene.js';
import { buildCube, turnState, startTurn, tickTurn, tickAnimation } from './cube.js';
import { THEMES, getCurrentTheme, initTheme, setTheme, tickThemeTransition } from './theme.js';
import { orbit, hasHover, mouseNDC, setHasHover } from './state.js';

const THEME_ORDER = ['dusk', 'tide', 'moss', 'void'];
const isWorker    = typeof document === 'undefined';

export function init(canvas, { width, height, dpr, n, theme: savedTheme, prefersReducedMotion, hasHover: initHasHover = false }) {
  setHasHover(initHasHover);
  initScene(canvas, width, height, dpr);
  initTheme(savedTheme);

  const t0 = THEMES[getCurrentTheme()];
  buildCube(n, t0.cubeBottom, t0.cubeTop);

  // Auto theme cycle — runs in worker (posts themeChanged) or on main thread (setTheme handles DOM)
  setInterval(() => {
    const next = THEME_ORDER[(THEME_ORDER.indexOf(getCurrentTheme()) + 1) % THEME_ORDER.length];
    setTheme(next);
    if (isWorker) self.postMessage({ type: 'themeChanged', name: next });
  }, 15000);

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

  // Visibility (fallback path only — worker path uses 'visibility' message)
  if (!isWorker) {
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        if (rafId !== null) { cancelAnimationFrame(rafId); rafId = null; }
      } else {
        if (rafId === null) { clock.getDelta(); render(); }
      }
    });
  }

  return {
    stopRender:  () => { if (rafId !== null) { cancelAnimationFrame(rafId); rafId = null; } },
    startRender: () => { if (rafId === null) { clock.getDelta(); render(); } },
  };
}
