import { init } from './main.js';
import { orbit, mouseNDC } from './state.js';
import { buildCube, getN, getGrid, turnState, STEP } from './cube.js';
import { THEMES, getCurrentTheme, setTheme } from './theme.js';
import { cameraState, renderer, camera, composer, bloomPass } from './scene.js';

let stopRender  = () => {};
let startRender = () => {};
let pinchCamR   = 12;

// ── Wait for init message ─────────────────────────────────────
self.addEventListener('message', function handler(e) {
  if (e.data.type !== 'init') return;
  self.removeEventListener('message', handler);

  const { canvas, width, height, dpr, n, theme, prefersReducedMotion, hasHover } = e.data;
  const result = init(canvas, { width, height, dpr, n, theme, prefersReducedMotion, hasHover });
  stopRender  = result.stopRender;
  startRender = result.startRender;

  self.addEventListener('message', onMessage);
});

// ── Ongoing message handler ───────────────────────────────────
function onMessage(e) {
  const d = e.data;
  switch (d.type) {

    case 'orbitStart':
      orbit.dragging = true;
      break;

    case 'orbitMove':
      if (!orbit.dragging) break;
      orbit.theta += d.dTheta;
      orbit.phi    = Math.max(0.22, Math.min(Math.PI - 0.22, orbit.phi + d.dPhi));
      orbit.lastDrag = Date.now();
      break;

    case 'orbitEnd':
      orbit.dragging = false;
      break;

    case 'tap':
      if (!turnState.anim) turnState.waitTimer = 0;
      break;

    case 'mouseNDC':
      mouseNDC.x = d.x;
      mouseNDC.y = d.y;
      break;

    case 'mouseleave':
      mouseNDC.x = 999;
      mouseNDC.y = 999;
      break;

    case 'pinchStart':
      pinchCamR = cameraState.r;
      break;

    case 'pinchMove': {
      const grid = getGrid();
      const minR = grid * STEP * 1.8;
      const maxR = grid * STEP * 6;
      cameraState.r = Math.max(minR, Math.min(maxR, pinchCamR * d.ratio));
      break;
    }

    case 'pinchEnd':
      break;

    case 'resize': {
      const { width, height, dpr: newDpr, n } = d;
      renderer.setPixelRatio(Math.min(newDpr, 2));
      renderer.setSize(width, height, false);
      const pDpr = renderer.getPixelRatio();
      composer.setSize(width * pDpr, height * pDpr);
      bloomPass.resolution.set(width * pDpr, height * pDpr);
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      const th = THEMES[getCurrentTheme()];
      if (n !== getGrid()) {
        buildCube(n, th.cubeBottom, th.cubeTop);
      }
      break;
    }

    case 'theme':
      setTheme(d.name);
      break;

    case 'visibility':
      if (d.hidden) stopRender();
      else startRender();
      break;
  }
}
