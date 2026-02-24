import { renderer, camera, composer, bloomPass, cameraState } from './scene.js';
import { buildCube, getN, getGrid, turnState, STEP, resetProximityMults } from './cube.js';
import { THEMES, getCurrentTheme } from './theme.js';
import { orbit, mouseNDC, setHasHover } from './state.js';

const hasHover = window.matchMedia('(hover: hover)').matches;

let prevX = 0, prevY = 0;
let clickStartX = 0, clickStartY = 0, hasDragged = false;
let isPinching = false, pinchStart = 0, pinchCamR = 0;

function triggerTurn() {
  if (!turnState.anim) turnState.waitTimer = 0;
}

function pinchDist(touches) {
  const dx = touches[0].clientX - touches[1].clientX;
  const dy = touches[0].clientY - touches[1].clientY;
  return Math.sqrt(dx * dx + dy * dy);
}

const onDown = (x, y) => {
  orbit.dragging = true;
  prevX = x; prevY = y;
  clickStartX = x; clickStartY = y; hasDragged = false;
};
const onMove = (x, y) => {
  if (!orbit.dragging) return;
  if (!hasDragged) {
    const dx = Math.abs(x - clickStartX), dy = Math.abs(y - clickStartY);
    if (dx + dy >= 4) hasDragged = true;
  }
  orbit.theta -= (x - prevX) * 0.006;
  orbit.phi    = Math.max(0.22, Math.min(Math.PI - 0.22, orbit.phi - (y - prevY) * 0.006));
  prevX = x; prevY = y;
  orbit.lastDrag = Date.now();
};
const onUp = (isTouchOnCanvas) => {
  if (orbit.dragging && !hasDragged && isTouchOnCanvas) triggerTurn();
  orbit.dragging = false;
};

export function init(canvas) {
  setHasHover(hasHover);
  canvas.addEventListener('mousedown',  e => onDown(e.clientX, e.clientY));
  window.addEventListener('mousemove',  e => onMove(e.clientX, e.clientY));
  window.addEventListener('mouseup',    () => onUp(false));

  if (hasHover) {
    window.addEventListener('mousemove', e => {
      mouseNDC.x =  (e.clientX / innerWidth)  * 2 - 1;
      mouseNDC.y = -(e.clientY / innerHeight) * 2 + 1;
    });
    window.addEventListener('mouseleave', () => {
      mouseNDC.x = 999; mouseNDC.y = 999;
    });
  }

  canvas.addEventListener('click', () => { if (!hasDragged) triggerTurn(); });

  canvas.addEventListener('touchstart', e => {
    if (e.touches.length === 2) {
      isPinching = true;
      orbit.dragging = false;
      pinchStart = pinchDist(e.touches);
      pinchCamR  = cameraState.r;
    } else if (!isPinching && e.target === canvas) {
      onDown(e.touches[0].clientX, e.touches[0].clientY);
    }
  }, { passive: true });

  window.addEventListener('touchmove', e => {
    if (isPinching && e.touches.length === 2) {
      const newDist = pinchDist(e.touches);
      const ratio   = pinchStart > 0 ? pinchStart / newDist : 1;
      const grid    = getGrid();
      const minR = grid * STEP * 1.8;
      const maxR = grid * STEP * 6;
      cameraState.r = Math.max(minR, Math.min(maxR, pinchCamR * ratio));
    } else if (!isPinching && e.touches.length) {
      onMove(e.touches[0].clientX, e.touches[0].clientY);
    }
  }, { passive: true });

  window.addEventListener('touchend', e => {
    if (e.touches.length < 2) {
      if (isPinching) {
        isPinching = false;
      } else {
        onUp(true);
      }
    }
  });

  window.addEventListener('resize', () => {
    renderer.setSize(innerWidth, innerHeight);
    const dpr = renderer.getPixelRatio();
    composer.setSize(innerWidth * dpr, innerHeight * dpr);
    bloomPass.resolution.set(innerWidth * dpr, innerHeight * dpr);
    camera.aspect = innerWidth / innerHeight;
    camera.updateProjectionMatrix();
    const newN = getN(innerWidth);
    const th   = THEMES[getCurrentTheme()];
    if (newN !== getGrid()) {
      buildCube(newN, th.cubeBottom, th.cubeTop);
    } else {
      resetProximityMults();
    }
    const projBtn = document.getElementById('proj-btn');
    if (projBtn && !projBtn.classList.contains('open')) {
      projBtn.textContent = innerWidth > 800 ? 'PROJECTS \u2192' : 'PROJECTS \u2191';
    }
  });
}
