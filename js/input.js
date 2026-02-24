// Main-thread input handler for the worker path.
// No Three.js imports — pure DOM + postMessage.

const BG_COLORS  = { dusk: '#130d0a', tide: '#090e15', moss: '#090d0a', void: '#0d0d0d' };

function getN(w) {
  if (w >= 900) return 5;
  if (w >= 600) return 4;
  if (w >= 380) return 3;
  return 2;
}

function pinchDist(touches) {
  const dx = touches[0].clientX - touches[1].clientX;
  const dy = touches[0].clientY - touches[1].clientY;
  return Math.sqrt(dx * dx + dy * dy);
}

export function init(worker, canvas) {
  let prevX = 0, prevY = 0;
  let clickStartX = 0, clickStartY = 0;
  let dragging = false, hasDragged = false;
  let isPinching = false, pinchStart = 0;

  // ── DOM theme apply ───────────────────────────────────────────
  function applyThemeDom(name) {
    document.body.classList.remove('theme-dusk', 'theme-tide', 'theme-moss', 'theme-void');
    document.body.classList.add('theme-' + name);
    document.getElementById('theme-color-meta').setAttribute('content', BG_COLORS[name] || '#130d0a');
    localStorage.setItem('vheda-theme', name);
    document.querySelectorAll('.theme-dot').forEach(d =>
      d.classList.toggle('active', d.dataset.theme === name)
    );
  }

  // ── Theme dot clicks ──────────────────────────────────────────
  document.querySelectorAll('.theme-dot').forEach(dot => {
    dot.addEventListener('click', () => {
      applyThemeDom(dot.dataset.theme);
      worker.postMessage({ type: 'theme', name: dot.dataset.theme });
    });
  });

  // ── Receive auto-cycle theme changes from worker ──────────────
  worker.addEventListener('message', e => {
    if (e.data.type === 'themeChanged') applyThemeDom(e.data.name);
  });

  // ── Orbit helpers ─────────────────────────────────────────────
  const onDown = (x, y) => {
    dragging = true;
    prevX = x; prevY = y;
    clickStartX = x; clickStartY = y; hasDragged = false;
    worker.postMessage({ type: 'orbitStart' });
  };

  const onMove = (x, y) => {
    if (!dragging) return;
    if (!hasDragged) {
      if (Math.abs(x - clickStartX) + Math.abs(y - clickStartY) >= 4) hasDragged = true;
    }
    const dTheta = -(x - prevX) * 0.006;
    const dPhi   = -(y - prevY) * 0.006;
    prevX = x; prevY = y;
    worker.postMessage({ type: 'orbitMove', dTheta, dPhi });
  };

  const onUp = (isTouchOnCanvas) => {
    dragging = false;
    if (!hasDragged && isTouchOnCanvas) worker.postMessage({ type: 'tap' });
    worker.postMessage({ type: 'orbitEnd' });
  };

  // ── Mouse ─────────────────────────────────────────────────────
  canvas.addEventListener('mousedown', e => onDown(e.clientX, e.clientY));
  window.addEventListener('mousemove', e => onMove(e.clientX, e.clientY));
  window.addEventListener('mouseup',   () => onUp(false));

  const hasHoverMedia = window.matchMedia('(hover: hover)').matches;
  // Desktop click → cube turn (touch handles tap via onUp to avoid double-firing)
  if (hasHoverMedia) {
    canvas.addEventListener('click', () => {
      if (!hasDragged) worker.postMessage({ type: 'tap' });
    });
    window.addEventListener('mousemove', e => {
      worker.postMessage({ type: 'mouseNDC',
        x:  (e.clientX / innerWidth)  * 2 - 1,
        y: -(e.clientY / innerHeight) * 2 + 1,
      });
    });
    window.addEventListener('mouseleave', () => {
      worker.postMessage({ type: 'mouseleave' });
    });
  }

  // ── Touch ─────────────────────────────────────────────────────
  canvas.addEventListener('touchstart', e => {
    if (e.touches.length === 2) {
      isPinching = true;
      dragging = false;
      pinchStart = pinchDist(e.touches);
      worker.postMessage({ type: 'pinchStart' });
    } else if (!isPinching && e.target === canvas) {
      onDown(e.touches[0].clientX, e.touches[0].clientY);
    }
  }, { passive: true });

  window.addEventListener('touchmove', e => {
    if (isPinching && e.touches.length === 2) {
      const ratio = pinchStart > 0 ? pinchStart / pinchDist(e.touches) : 1;
      worker.postMessage({ type: 'pinchMove', ratio });
    } else if (!isPinching && e.touches.length) {
      onMove(e.touches[0].clientX, e.touches[0].clientY);
    }
  }, { passive: true });

  window.addEventListener('touchend', e => {
    if (e.touches.length < 2) {
      if (isPinching) {
        isPinching = false;
        worker.postMessage({ type: 'pinchEnd' });
      } else {
        onUp(true);
      }
    }
  });

  // ── Resize ────────────────────────────────────────────────────
  window.addEventListener('resize', () => {
    worker.postMessage({
      type: 'resize',
      width:  innerWidth,
      height: innerHeight,
      dpr:    devicePixelRatio,
      n:      getN(innerWidth),
    });
  });

  // ── Visibility ────────────────────────────────────────────────
  document.addEventListener('visibilitychange', () => {
    worker.postMessage({ type: 'visibility', hidden: document.hidden });
  });
}
