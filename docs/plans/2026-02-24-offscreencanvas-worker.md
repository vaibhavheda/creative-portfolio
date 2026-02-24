# OffscreenCanvas + Web Worker Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Move all Three.js work into a dedicated Web Worker using OffscreenCanvas, reducing main-thread TBT from 34,200ms to near zero.

**Architecture:** Three new files (state.js, worker.js, input.js, entry.js) + targeted modifications to 5 existing files. Main thread owns DOM only. Worker owns all Three.js. One-way message protocol (main→worker) plus one worker→main message for auto theme cycle. Graceful fallback to original main-thread path for unsupported browsers.

**Tech Stack:** Three.js 0.165, Vite 5, OffscreenCanvas, Dedicated Web Worker, ES Modules

---

### Task 1: Create js/state.js — shared mutable state

**Files:**
- Create: `js/state.js`

**Why:** `orbit`, `mouseNDC`, `hasHover` are currently declared in `interactions.js` and imported by `main.js`. Moving them to a neutral module breaks the circular-import risk and lets both the worker message handler and the render loop reference the same live objects.

**Step 1: Create the file**

```js
// js/state.js
export const orbit    = { theta: 0.72, phi: 1.12, dragging: false, lastDrag: 0 };
export const mouseNDC = { x: 999, y: 999 };
export let   hasHover = false;
export function setHasHover(v) { hasHover = v; }
```

**Step 2: Verify it exists**

Run: `ls js/state.js`
Expected: file listed.

**Step 3: Commit**

```bash
git add js/state.js
git commit -m "feat: add shared state module for orbit/mouseNDC/hasHover"
```

---

### Task 2: Modify js/scene.js — lazy init via initScene()

**Files:**
- Modify: `js/scene.js`

**Why:** Currently runs all WebGL setup at module-evaluation time using `document.getElementById('c')`, `innerWidth`, `innerHeight`, `devicePixelRatio` — all unavailable in a worker. Convert every `export const` to `export let` (undefined until init), add `export function initScene(canvas, width, height, dpr)` that runs the setup.

**Step 1: Replace entire file**

```js
import * as THREE from 'three';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass }     from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';

export let renderer, scene, camera, cubeRoot, cameraState, composer, bloomPass;
export let keyL, sideL, fillL, ambL;

export function positionCamera(theta, phi) {
  const r = cameraState.r;
  camera.position.set(
    r * Math.sin(phi) * Math.sin(theta),
    r * Math.cos(phi),
    r * Math.sin(phi) * Math.cos(theta)
  );
  camera.lookAt(0, 0, 0);
}

export function initScene(canvas, width, height, dpr) {
  renderer = new THREE.WebGLRenderer({
    canvas, antialias: true, alpha: true,
    powerPreference: 'high-performance',
  });
  renderer.setClearColor(0x000000, 0);
  renderer.setPixelRatio(Math.min(dpr, 2));
  renderer.toneMapping         = THREE.LinearToneMapping;
  renderer.toneMappingExposure = 1.0;
  renderer.outputColorSpace    = THREE.SRGBColorSpace;
  renderer.setSize(width, height, false);

  scene = new THREE.Scene();
  scene.fog = new THREE.FogExp2(0x130d0a, 0.028);

  camera = new THREE.PerspectiveCamera(36, width / height, 0.1, 100);

  cubeRoot = new THREE.Object3D();
  scene.add(cubeRoot);

  cameraState = { r: 12 };

  // Post-processing
  const pDpr = renderer.getPixelRatio();
  const composerTarget = new THREE.WebGLRenderTarget(
    width * pDpr, height * pDpr,
    { minFilter: THREE.LinearFilter, magFilter: THREE.LinearFilter,
      format: THREE.RGBAFormat, colorSpace: THREE.SRGBColorSpace }
  );
  composer = new EffectComposer(renderer, composerTarget);
  composer.addPass(new RenderPass(scene, camera));
  bloomPass = new UnrealBloomPass(
    new THREE.Vector2(width * pDpr, height * pDpr),
    0.45, 0.5, 0.82
  );
  composer.addPass(bloomPass);

  // Environment map
  const pmrem = new THREE.PMREMGenerator(renderer);
  pmrem.compileEquirectangularShader();
  const envScene  = new THREE.Scene();
  const envSphere = new THREE.Mesh(
    new THREE.SphereGeometry(10, 16, 16),
    new THREE.MeshBasicMaterial({ side: THREE.BackSide, vertexColors: true })
  );
  const posAttr = envSphere.geometry.attributes.position;
  const colArr  = new Float32Array(posAttr.count * 3);
  const SX = 0.58, SY = 0.72, SZ = 0.38;
  for (let i = 0; i < posAttr.count; i++) {
    const px = posAttr.getX(i) / 10, py = posAttr.getY(i) / 10, pz = posAttr.getZ(i) / 10;
    const t  = (py + 1) / 2;
    let r = 0.14 + t * 0.36, g = 0.10 + t * 0.20, b = 0.10 + t * 0.16;
    const sun = Math.pow(Math.max(0, px * SX + py * SY + pz * SZ), 3);
    r += sun * 0.9; g += sun * 0.55; b += sun * 0.2;
    colArr[i*3] = Math.min(1,r); colArr[i*3+1] = Math.min(1,g); colArr[i*3+2] = Math.min(1,b);
  }
  envSphere.geometry.setAttribute('color', new THREE.BufferAttribute(colArr, 3));
  envScene.add(envSphere);
  const envMap = pmrem.fromScene(envScene).texture;
  envSphere.geometry.dispose();
  envSphere.material.dispose();
  scene.environment = envMap;
  scene.environmentIntensity = 1.0;
  pmrem.dispose();

  // Lights
  keyL  = new THREE.DirectionalLight(0xffdcc8, 1.6); keyL.position.set(-4,-9,5);  scene.add(keyL);
  sideL = new THREE.DirectionalLight(0xc8d8ff, 1.4); sideL.position.set(9,1,4);   scene.add(sideL);
  fillL = new THREE.PointLight(0xff5040, 40, 24);    fillL.position.set(0,6,2);   scene.add(fillL);
  ambL  = new THREE.AmbientLight(0xffecd8, 0.4);     scene.add(ambL);
}
```

**Step 2: Commit**

```bash
git add js/scene.js
git commit -m "refactor: convert scene.js to lazy initScene(canvas, w, h, dpr)"
```

---

### Task 3: Modify js/cube.js — explicit width param for getN

**Files:**
- Modify: `js/cube.js:30-36`

**Why:** `getN()` reads `innerWidth` which is undefined in a worker. Change it to take an explicit `w` param. All call sites will pass `innerWidth` (main thread) or the width from the init/resize message (worker).

**Step 1: Replace getN**

Find:
```js
export function getN() {
  const w = innerWidth;
  if (w >= 900) return 5;
  if (w >= 600) return 4;
  if (w >= 380) return 3;
  return 2;
}
```

Replace with:
```js
export function getN(w) {
  if (w >= 900) return 5;
  if (w >= 600) return 4;
  if (w >= 380) return 3;
  return 2;
}
```

**Step 2: Commit**

```bash
git add js/cube.js
git commit -m "refactor: getN(w) takes explicit width instead of reading innerWidth"
```

---

### Task 4: Modify js/theme.js — worker-safe guards

**Files:**
- Modify: `js/theme.js`

**Why:** `theme.js` reads `localStorage` at module level and calls `document.*` inside `initTheme`/`setTheme`. Neither `localStorage` nor `document` exist in a worker. Add `isWorker` guard; add `themeName` parameter to `initTheme` so the worker can pass its received theme name instead of reading localStorage.

**Step 1: Add isWorker flag and fix module-level localStorage read**

Find line 1 of theme.js (the `import * as THREE` line). After the imports block, the file has:
```js
let currentTheme = localStorage.getItem('vheda-theme') || 'dusk';
```

Replace the entire file content with:

```js
import * as THREE from 'three';
import { scene, keyL, sideL, fillL, ambL, bloomPass } from './scene.js';
import { getActiveMats, getGrid } from './cube.js';

export const THEMES = {
  dusk: {
    bgColor: '#130d0a',
    cubeBottom: 0xbe7858, cubeTop: 0xf2e2d8,
    keyColor: 0xffdcc8, keyI: 1.6,
    sideColor: 0xc8d8ff, sideI: 1.4,
    fillColor: 0xff5040, fillI: 40,
    ambColor: 0xffecd8,  ambI: 0.4,
  },
  tide: {
    bgColor: '#090e15',
    cubeBottom: 0x3a6888, cubeTop: 0xc8dce8,
    keyColor: 0xc8e0ff, keyI: 1.8,
    sideColor: 0xffd8c0, sideI: 1.2,
    fillColor: 0x2060c0, fillI: 48,
    ambColor: 0xd0e8f8,  ambI: 0.4,
  },
  moss: {
    bgColor: '#090d0a',
    cubeBottom: 0x4a7858, cubeTop: 0xc8e0d0,
    keyColor: 0xd0ffe0, keyI: 1.5,
    sideColor: 0xffd8c0, sideI: 1.2,
    fillColor: 0x30b060, fillI: 38,
    ambColor: 0xd0f8e0,  ambI: 0.4,
  },
  void: {
    bgColor: '#0d0d0d',
    cubeBottom: 0x383838, cubeTop: 0xd8d8d8,
    keyColor: 0xffffff, keyI: 1.5,
    sideColor: 0xdde0ff, sideI: 1.1,
    fillColor: 0x888888, fillI: 35,
    ambColor: 0xffffff,  ambI: 0.35,
  },
};

export const BLOOM_STRENGTH = { dusk: 0.45, tide: 0.55, moss: 0.40, void: 0.30 };

const isWorker = typeof document === 'undefined';

// On worker: initialized by initTheme(name). On main thread: read from localStorage.
let currentTheme = isWorker ? 'dusk' : (localStorage.getItem('vheda-theme') || 'dusk');
export function getCurrentTheme() { return currentTheme; }

const THEME_TRANS_DUR = 1.4;
let themeTransition = null;

function snapshotThreeState() {
  return {
    keyColor:  keyL.color.clone(),  keyI:  keyL.intensity,
    sideColor: sideL.color.clone(), sideI: sideL.intensity,
    fillColor: fillL.color.clone(), fillI: fillL.intensity,
    ambColor:  ambL.color.clone(),  ambI:  ambL.intensity,
    matColors: getActiveMats().map(m => m.color.clone()),
    bloom:     bloomPass.strength,
    fogColor:  scene.fog.color.clone(),
  };
}

export function buildThemeTarget(name) {
  const th   = THEMES[name];
  const b    = new THREE.Color(th.cubeBottom);
  const top  = new THREE.Color(th.cubeTop);
  const grid = getGrid();
  return {
    keyColor:  new THREE.Color(th.keyColor),  keyI:  th.keyI,
    sideColor: new THREE.Color(th.sideColor), sideI: th.sideI,
    fillColor: new THREE.Color(th.fillColor), fillI: th.fillI,
    ambColor:  new THREE.Color(th.ambColor),  ambI:  th.ambI,
    matColors: getActiveMats().map((_, i) => {
      const pct = grid <= 1 ? 0.5 : i / (grid - 1);
      return new THREE.Color().lerpColors(b, top, pct);
    }),
    bloom:    BLOOM_STRENGTH[name] ?? 0.45,
    fogColor: new THREE.Color(th.bgColor),
  };
}

function applyThreeState(s) {
  keyL.color.copy(s.keyColor);   keyL.intensity  = s.keyI;
  sideL.color.copy(s.sideColor); sideL.intensity = s.sideI;
  fillL.color.copy(s.fillColor); fillL.intensity = s.fillI;
  ambL.color.copy(s.ambColor);   ambL.intensity  = s.ambI;
  getActiveMats().forEach((mat, i) => mat.color.copy(s.matColors[i]));
  bloomPass.strength = s.bloom;
  if (s.fogColor) scene.fog.color.copy(s.fogColor);
}

export function tickThemeTransition(dt) {
  if (!themeTransition) return;
  themeTransition.t = Math.min(themeTransition.t + dt / THEME_TRANS_DUR, 1);
  const et = (t => t < 0.5 ? 2*t*t : 1 - Math.pow(-2*t+2,2)/2)(themeTransition.t);
  const { from: f, to } = themeTransition;
  keyL.color.lerpColors(f.keyColor, to.keyColor, et);
  keyL.intensity  = f.keyI  + (to.keyI  - f.keyI)  * et;
  sideL.color.lerpColors(f.sideColor, to.sideColor, et);
  sideL.intensity = f.sideI + (to.sideI - f.sideI) * et;
  fillL.color.lerpColors(f.fillColor, to.fillColor, et);
  fillL.intensity = f.fillI + (to.fillI - f.fillI) * et;
  ambL.color.lerpColors(f.ambColor, to.ambColor, et);
  ambL.intensity  = f.ambI  + (to.ambI  - f.ambI)  * et;
  getActiveMats().forEach((mat, i) => mat.color.lerpColors(f.matColors[i], to.matColors[i], et));
  bloomPass.strength = f.bloom + (to.bloom - f.bloom) * et;
  scene.fog.color.lerpColors(f.fogColor, to.fogColor, et);
  if (themeTransition.t >= 1) themeTransition = null;
}

// themeName: provided by worker (from init message); ignored on main thread (uses localStorage)
export function initTheme(themeName) {
  if (themeName) currentTheme = themeName;
  const th = THEMES[currentTheme];
  keyL.color.set(th.keyColor);   keyL.intensity  = th.keyI;
  sideL.color.set(th.sideColor); sideL.intensity = th.sideI;
  fillL.color.set(th.fillColor); fillL.intensity = th.fillI;
  ambL.color.set(th.ambColor);   ambL.intensity  = th.ambI;
  bloomPass.strength = BLOOM_STRENGTH[currentTheme] ?? 0.45;
  scene.fog.color.set(th.bgColor);
  if (!isWorker) {
    document.body.classList.remove('theme-dusk', 'theme-tide', 'theme-moss', 'theme-void');
    document.body.classList.add('theme-' + currentTheme);
    document.getElementById('theme-color-meta').setAttribute('content', th.bgColor);
    document.querySelectorAll('.theme-dot').forEach(d =>
      d.classList.toggle('active', d.dataset.theme === currentTheme)
    );
  }
}

export function setTheme(name) {
  if (name === currentTheme && !themeTransition) return;
  const from = snapshotThreeState();
  const to   = buildThemeTarget(name);
  themeTransition = { from, to, t: 0 };
  currentTheme = name;
  if (!isWorker) {
    document.body.classList.remove('theme-dusk', 'theme-tide', 'theme-moss', 'theme-void');
    document.body.classList.add('theme-' + name);
    document.getElementById('theme-color-meta').setAttribute('content', THEMES[name].bgColor);
    localStorage.setItem('vheda-theme', name);
    document.querySelectorAll('.theme-dot').forEach(d =>
      d.classList.toggle('active', d.dataset.theme === name)
    );
  }
}
```

**Step 2: Commit**

```bash
git add js/theme.js
git commit -m "refactor: theme.js isWorker guards — skip DOM/localStorage in worker context"
```

---

### Task 5: Modify js/interactions.js — import state from state.js

**Files:**
- Modify: `js/interactions.js`

**Why:** `interactions.js` currently declares and exports `orbit`, `hasHover`, `mouseNDC`. These are now in `state.js`. Remove the declarations and re-export, import from `state.js` instead. Also update the `getN()` call to pass `innerWidth` explicitly.

**Step 1: Replace the top of the file (imports + declarations)**

Find:
```js
import { renderer, camera, composer, bloomPass, cameraState } from './scene.js';
import { buildCube, getN, getGrid, turnState, STEP, resetProximityMults } from './cube.js';
import { THEMES, getCurrentTheme } from './theme.js';

export const hasHover = window.matchMedia('(hover: hover)').matches;
export const mouseNDC = { x: 999, y: 999 };
export const orbit    = { theta: 0.72, phi: 1.12, dragging: false, lastDrag: 0 };
```

Replace with:
```js
import { renderer, camera, composer, bloomPass, cameraState } from './scene.js';
import { buildCube, getN, getGrid, turnState, STEP, resetProximityMults } from './cube.js';
import { THEMES, getCurrentTheme } from './theme.js';
import { orbit, mouseNDC, setHasHover } from './state.js';

const hasHover = window.matchMedia('(hover: hover)').matches;
```

**Step 2: Update the `init` function — add setHasHover call**

Find (inside `export function init(canvas) {`):
```js
export function init(canvas) {
  canvas.addEventListener('mousedown',  e => onDown(e.clientX, e.clientY));
```

Replace with:
```js
export function init(canvas) {
  setHasHover(hasHover);
  canvas.addEventListener('mousedown',  e => onDown(e.clientX, e.clientY));
```

**Step 3: Update getN() call in resize handler**

Find:
```js
    const newN = getN();
```

Replace with:
```js
    const newN = getN(innerWidth);
```

**Step 4: Commit**

```bash
git add js/interactions.js
git commit -m "refactor: interactions.js imports state from state.js, getN(innerWidth)"
```

---

### Task 6: Modify js/main.js — export init(), import from state.js

**Files:**
- Modify: `js/main.js`

**Why:** Currently auto-executes everything at module level with DOM access. Convert to `export function init(canvas, opts)`. Remove DOM wiring (theme dots, interactions, clock, ui) — those move to entry.js. The auto theme cycle stays here (runs in both worker and fallback; notifies main thread via postMessage in worker context). Import orbit/hasHover/mouseNDC from state.js.

**Step 1: Replace entire file**

```js
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
```

**Step 2: Commit**

```bash
git add js/main.js
git commit -m "refactor: main.js export init(canvas, opts), remove module-level DOM auto-exec"
```

---

### Task 7: Create js/worker.js — worker entry point

**Files:**
- Create: `js/worker.js`

**Why:** This is the worker's top-level script. It waits for the `init` message, calls `init()` from main.js with the transferred OffscreenCanvas, then handles all ongoing input messages by writing into `state.js` objects and calling Three.js APIs.

**Step 1: Create the file**

```js
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
```

**Step 2: Commit**

```bash
git add js/worker.js
git commit -m "feat: add worker.js — Three.js worker entry point with message handler"
```

---

### Task 8: Create js/input.js — main-thread event handler

**Files:**
- Create: `js/input.js`

**Why:** Replaces `interactions.js` for the worker path. Handles all DOM events, computes deltas, posts messages to worker. Also handles DOM-side theme changes (body class, meta, localStorage) for both user clicks and auto-cycle (themeChanged from worker).

**Step 1: Create the file**

```js
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

  // Desktop click → cube turn
  canvas.addEventListener('click', () => {
    if (!hasDragged) worker.postMessage({ type: 'tap' });
  });

  const hasHoverMedia = window.matchMedia('(hover: hover)').matches;
  if (hasHoverMedia) {
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
```

**Step 2: Commit**

```bash
git add js/input.js
git commit -m "feat: add input.js — main-thread event handler for worker path"
```

---

### Task 9: Create js/entry.js — feature detect + bootstrap

**Files:**
- Create: `js/entry.js`

**Why:** This becomes the `<script type="module">` tag in `index.html`. It initialises clock/ui (always on main thread), applies saved theme to the DOM immediately (prevents flash), then either (a) creates the worker and hands off OffscreenCanvas, or (b) dynamically imports the original main-thread Three.js path as a fallback.

**Step 1: Create the file**

```js
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
```

**Step 2: Commit**

```bash
git add js/entry.js
git commit -m "feat: add entry.js — feature detect, worker path, fallback path"
```

---

### Task 10: Update index.html and vite.config.js

**Files:**
- Modify: `index.html`
- Modify: `vite.config.js`

**Step 1: Update script tag in index.html**

Find:
```html
  <script type="module" src="js/main.js"></script>
```

Replace with:
```html
  <script type="module" src="js/entry.js"></script>
```

**Step 2: Simplify vite.config.js — remove manualChunks**

Three.js is now in the worker bundle (not the main bundle), so `manualChunks: { three: [...] }` no longer applies. Replace entire file:

```js
import { defineConfig } from 'vite';

export default defineConfig({
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
  },
});
```

**Step 3: Commit**

```bash
git add index.html vite.config.js
git commit -m "feat: wire entry.js as HTML entry point, simplify vite config"
```

---

### Task 11: Build, smoke-test, deploy

**Step 1: Run dev server and manually verify in browser**

Run: `bun run dev`
Open: `http://localhost:5173`

Check in browser DevTools:
- Console: no errors
- Network tab: worker file loads (named `worker-[hash].js` in assets)
- Performance: main thread shows near-zero blocking after initial paint
- Canvas renders the 3D cube
- Dragging rotates the cube
- Theme dots change colors (smooth 1.4s transition)
- Auto-theme cycle fires after 15s

Stop dev server with Ctrl+C.

**Step 2: Production build**

Run: `bun run build`
Expected output:
```
✓ N modules transformed.
dist/index.html
dist/assets/index-[hash].js    (small — no Three.js)
dist/assets/worker-[hash].js   (large — Three.js lives here)
dist/assets/index-[hash].css
✓ built in Xms
```

Key signal: `index-[hash].js` should be significantly smaller than before (~30KB → ~5KB or less since Three.js is gone from the main bundle).

**Step 3: Preview production build**

Run: `bun run preview`
Open: `http://localhost:4173`
Verify same checks as Step 1.
Stop with Ctrl+C.

**Step 4: Commit dist if needed, deploy**

```bash
bun run build
rsync -avz --delete dist/ vaibhav@vheda.in:/home/vaibhav/apps/creative-portfolio/dist/
```

Or on the server:
```bash
cd /home/vaibhav/apps/creative-portfolio && git pull && bun install && bun run build
```

**Step 5: Final Lighthouse check**

Run Lighthouse on https://vheda.in after deploy.
Expected: TBT < 200ms, Speed Index < 3s, FCP < 1s.
