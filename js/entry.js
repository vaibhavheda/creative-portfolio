import { init as initClock } from './clock.js';
import { init as initUi }    from './ui.js';

initClock();
initUi();

// ── Apply saved theme to DOM immediately (prevents flash) ─────
const BG_COLORS = { dusk: '#130d0a', tide: '#090e15', moss: '#090d0a', void: '#0d0d0d' };
const savedTheme = localStorage.getItem('vheda-theme') || 'dusk';
document.body.classList.remove('theme-dusk', 'theme-tide', 'theme-moss', 'theme-void');
document.body.classList.add('theme-' + savedTheme);
document.getElementById('theme-color-meta').setAttribute('content', BG_COLORS[savedTheme] || '#130d0a');
document.querySelectorAll('.theme-dot').forEach(d =>
  d.classList.toggle('active', d.dataset.theme === savedTheme)
);

function getN(w) {
  if (w >= 900) return 5;
  if (w >= 600) return 4;
  if (w >= 380) return 3;
  return 2;
}

const canvas    = document.getElementById('c');
const supported = typeof OffscreenCanvas !== 'undefined'
  && typeof canvas.transferControlToOffscreen === 'function';

const opts = {
  width:  innerWidth,
  height: innerHeight,
  dpr:    devicePixelRatio,
  n:      getN(innerWidth),
  theme:  savedTheme,
  prefersReducedMotion: window.matchMedia('(prefers-reduced-motion: reduce)').matches,
  hasHover:             window.matchMedia('(hover: hover)').matches,
};

if (supported) {
  // ── Worker path ───────────────────────────────────────────────
  const offscreen = canvas.transferControlToOffscreen();
  const worker = new Worker(new URL('./worker.js', import.meta.url), { type: 'module' });
  worker.postMessage({ type: 'init', canvas: offscreen, ...opts }, [offscreen]);
  import('./input.js').then(m => m.init(worker, canvas));

} else {
  // ── Fallback: main-thread Three.js ────────────────────────────
  Promise.all([
    import('./main.js'),
    import('./interactions.js'),
    import('./theme.js'),
  ]).then(([{ init }, { init: initInteractions }, { setTheme }]) => {
    init(canvas, opts);
    initInteractions(canvas);
    document.querySelectorAll('.theme-dot').forEach(dot => {
      dot.addEventListener('click', () => setTheme(dot.dataset.theme));
    });
  });
}
