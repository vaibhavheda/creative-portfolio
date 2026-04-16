# Portfolio Page Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build a single-file dark portfolio page with an animated Three.js 5×5×5 cube that explodes and reassembles.

**Architecture:** Single `index.html` with embedded `<style>` and `<script>`. Three.js loaded via importmap CDN. Layout is CSS Grid with three columns. The 3D cube uses InstancedMesh with a 4-state animation loop controlled by a simple state machine.

**Tech Stack:** HTML5, CSS custom properties, Three.js r165 (CDN ESM), Space Grotesk (Google Fonts)

---

### Task 1: HTML Skeleton + CSS Layout

**Files:**
- Create: `index.html`

**Step 1: Create the file with base HTML structure**

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Vaibhav</title>
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
  <link href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@700&family=Space+Mono&display=swap" rel="stylesheet" />
  <style>
    /* paste CSS block in Task 2 */
  </style>
</head>
<body>
  <div class="layout">
    <div class="col-left">
      <div class="logo">VAIBHAV</div>
      <div class="info">
        <div class="local-time-label">LOCAL TIME (UTC+5:30)</div>
        <div class="clock-row">
          <span class="clock" id="clock">00:00</span>
          <span class="ampm-indicator">
            <span class="dot" id="dot-am"></span>
            <span class="dot" id="dot-pm"></span>
          </span>
          <span class="tagline">UI Engineer who<br>dips his toes in Realtime 3D °<br>Interaction ° Perf</span>
        </div>
        <div class="location">INDIA → IN<br>DESIGN ENGINEER</div>
      </div>
    </div>
    <div class="col-canvas">
      <canvas id="three-canvas"></canvas>
    </div>
    <div class="col-right">
      <nav class="social">
        <a href="#">Github</a>
        <a href="#">LinkedIn</a>
        <a href="#">Email</a>
      </nav>
    </div>
  </div>
  <script type="importmap">
    { "imports": { "three": "https://unpkg.com/three@0.165.0/build/three.module.js",
                   "three/addons/": "https://unpkg.com/three@0.165.0/examples/jsm/" } }
  </script>
  <script type="module">
    /* paste JS in Tasks 3–7 */
  </script>
</body>
</html>
```

**Step 2: Verify in browser**

Open `index.html` in a browser. Expected: blank dark page, no console errors.

---

### Task 2: CSS — Variables, Reset, Layout

**Files:**
- Modify: `index.html` — fill in the `<style>` block

**Step 1: Write CSS**

```css
*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

:root {
  --bg: #12130f;
  --fg: rgb(228 223 218);
  --fg-muted: rgb(150 145 140);
  --accent: #f0d8d0;
  --quint-in-out: cubic-bezier(0.85, 0, 0.15, 1);
}

html, body {
  height: 100%; width: 100%;
  background: var(--bg);
  color: var(--fg);
  font-family: 'Space Grotesk', sans-serif;
  -webkit-font-smoothing: antialiased;
  overflow: hidden;
}

.layout {
  display: grid;
  grid-template-columns: 1fr 2fr 160px;
  height: 100vh;
  width: 100vw;
  padding: 2rem;
  position: relative;
}

/* LEFT COLUMN */
.col-left {
  display: flex;
  flex-direction: column;
  justify-content: space-between;
}

.logo {
  font-family: 'Space Grotesk', sans-serif;
  font-weight: 700;
  font-size: clamp(2rem, 5vw, 4rem);
  letter-spacing: -0.02em;
  line-height: 1;
  text-transform: uppercase;
}

.info { display: flex; flex-direction: column; gap: 0.5rem; }

.local-time-label {
  font-family: 'Space Mono', monospace;
  font-size: 0.65rem;
  color: var(--fg-muted);
  letter-spacing: 0.05em;
}

.clock-row { display: flex; align-items: flex-start; gap: 0.75rem; }

.clock {
  font-family: 'Space Mono', monospace;
  font-weight: 700;
  font-size: clamp(2.5rem, 5vw, 4rem);
  letter-spacing: -0.03em;
  line-height: 1;
}

.ampm-indicator {
  display: flex;
  flex-direction: column;
  gap: 4px;
  margin-top: 4px;
}

.dot {
  width: 8px; height: 8px;
  border-radius: 50%;
  border: 1.5px solid var(--fg-muted);
  transition: background 0.3s;
}
.dot.active { background: var(--fg); border-color: var(--fg); }

.tagline {
  font-family: 'Space Grotesk', sans-serif;
  font-size: clamp(0.75rem, 1.2vw, 1rem);
  line-height: 1.4;
  color: var(--fg);
  max-width: 220px;
}

.location {
  font-family: 'Space Mono', monospace;
  font-size: 0.6rem;
  color: var(--fg-muted);
  letter-spacing: 0.04em;
  line-height: 1.6;
}

/* CANVAS COLUMN */
.col-canvas {
  position: relative;
}

#three-canvas {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  display: block;
}

/* RIGHT COLUMN */
.col-right {
  display: flex;
  align-items: flex-end;
  justify-content: flex-end;
}

.social {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 0.75rem;
}

.social a {
  font-family: 'Space Mono', monospace;
  font-size: 0.75rem;
  color: var(--fg-muted);
  text-decoration: none;
  letter-spacing: 0.03em;
  transition: color 0.2s;
}

.social a:hover { color: var(--fg); }
```

**Step 2: Verify in browser**

Reload. Expected: dark layout with "VAIBHAV" top-left, three columns visible, no 3D yet.

---

### Task 3: Three.js Scene Setup

**Files:**
- Modify: `index.html` — fill in `<script type="module">`

**Step 1: Write scene bootstrap**

```js
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';

const canvas = document.getElementById('three-canvas');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.shadowMap.enabled = true;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.2;

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 100);
camera.position.set(0, 2, 14);
camera.lookAt(0, 0, 0);

function resize() {
  const w = canvas.parentElement.clientWidth;
  const h = canvas.parentElement.clientHeight;
  renderer.setSize(w, h);
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
}
resize();
window.addEventListener('resize', resize);
```

**Step 2: Verify**

Open browser console. Expected: no errors, canvas fills center column.

---

### Task 4: InstancedMesh Cube Grid

**Files:**
- Modify: `index.html` — append to module script

**Step 1: Write cube grid code**

```js
const GRID = 5;
const GAP = 1.05;
const COUNT = GRID * GRID * GRID;

const geo = new RoundedBoxGeometry(0.85, 0.85, 0.85, 4, 0.12);
const mat = new THREE.MeshStandardMaterial({
  color: 0xf0d8d0,
  metalness: 0.05,
  roughness: 0.25,
});

const mesh = new THREE.InstancedMesh(geo, mat, COUNT);
mesh.castShadow = true;
scene.add(mesh);

// Compute grid positions (assembled state)
const assembled = [];
const half = (GRID - 1) / 2;
for (let x = 0; x < GRID; x++) {
  for (let y = 0; y < GRID; y++) {
    for (let z = 0; z < GRID; z++) {
      assembled.push(new THREE.Vector3(
        (x - half) * GAP,
        (y - half) * GAP,
        (z - half) * GAP
      ));
    }
  }
}

// Set initial positions
const dummy = new THREE.Object3D();
assembled.forEach((pos, i) => {
  dummy.position.copy(pos);
  dummy.rotation.set(0, 0, 0);
  dummy.scale.setScalar(1);
  dummy.updateMatrix();
  mesh.setMatrixAt(i, dummy.matrix);
});
mesh.instanceMatrix.needsUpdate = true;
```

**Step 2: Verify**

Reload. Expected: white 5×5×5 cube visible in center of canvas (no lighting yet so may look flat).

---

### Task 5: Lighting

**Files:**
- Modify: `index.html` — append to module script

**Step 1: Add lights**

```js
// Ambient
const ambient = new THREE.AmbientLight(0xffffff, 0.5);
scene.add(ambient);

// Key light — top front, cool white
const key = new THREE.DirectionalLight(0xfff0f0, 2.5);
key.position.set(3, 6, 5);
scene.add(key);

// Pink-red fill from below (creates the glow effect)
const fill = new THREE.PointLight(0xff4444, 60, 20);
fill.position.set(0, -6, 2);
scene.add(fill);

// Soft rim from back-top
const rim = new THREE.DirectionalLight(0xffeedd, 0.8);
rim.position.set(-4, 4, -3);
scene.add(rim);
```

**Step 2: Verify**

Reload. Expected: cube has pinkish-white top faces, reddish glow from below — matching reference aesthetic.

---

### Task 6: Animation State Machine

**Files:**
- Modify: `index.html` — append to module script

**Step 1: Write scattered positions + easing + state machine**

```js
// Scattered positions (exploded state)
const scattered = assembled.map(() => new THREE.Vector3(
  (Math.random() - 0.5) * 18,
  (Math.random() - 0.5) * 14 + 4,
  (Math.random() - 0.5) * 8
));

// Current animated positions
const current = assembled.map(p => p.clone());
const rotations = assembled.map(() => new THREE.Euler(
  Math.random() * Math.PI * 2,
  Math.random() * Math.PI * 2,
  Math.random() * Math.PI * 2
));

// Easing: quint-in-out approximation
function easeInOut(t) {
  return t < 0.5
    ? 16 * t * t * t * t * t
    : 1 - Math.pow(-2 * t + 2, 5) / 2;
}

// State machine
// States: 'assembled' | 'exploding' | 'floating' | 'reassembling'
let state = 'assembled';
let stateTime = 0;
const DURATIONS = {
  assembled: 8,
  exploding: 1.6,
  floating: 2.5,
  reassembling: 1.6,
};

// Group rotation for assembled/reassembling state
let groupRotY = 0;

// Capture positions at moment of transition
let fromPositions = assembled.map(p => p.clone());
let toPositions = assembled.map(p => p.clone());

function startTransition(from, to) {
  fromPositions = current.map(p => p.clone());
  toPositions = to;
}

// Render loop
const clock = new THREE.Clock();

function animate() {
  requestAnimationFrame(animate);
  const delta = clock.getDelta();
  stateTime += delta;

  const dur = DURATIONS[state];
  const t = Math.min(stateTime / dur, 1);

  if (state === 'assembled') {
    groupRotY += delta * 0.25;
    const cosR = Math.cos(groupRotY), sinR = Math.sin(groupRotY);
    assembled.forEach((pos, i) => {
      const rx = pos.x * cosR - pos.z * sinR;
      const rz = pos.x * sinR + pos.z * cosR;
      current[i].set(rx, pos.y, rz);
    });
    if (t >= 1) {
      state = 'exploding';
      stateTime = 0;
      startTransition(current, scattered);
    }
  } else if (state === 'exploding') {
    const et = easeInOut(t);
    current.forEach((pos, i) => {
      pos.lerpVectors(fromPositions[i], toPositions[i], et);
    });
    if (t >= 1) { state = 'floating'; stateTime = 0; }
  } else if (state === 'floating') {
    current.forEach((pos, i) => {
      pos.y = scattered[i].y + Math.sin(Date.now() * 0.001 + i) * 0.15;
    });
    if (t >= 1) {
      state = 'reassembling';
      stateTime = 0;
      groupRotY = 0;
      startTransition(current, assembled);
    }
  } else if (state === 'reassembling') {
    const et = easeInOut(t);
    current.forEach((pos, i) => {
      pos.lerpVectors(fromPositions[i], toPositions[i], et);
    });
    if (t >= 1) { state = 'assembled'; stateTime = 0; }
  }

  // Write instance matrices
  current.forEach((pos, i) => {
    dummy.position.copy(pos);
    if (state === 'exploding' || state === 'floating') {
      dummy.rotation.copy(rotations[i]);
    } else {
      dummy.rotation.set(0, 0, 0);
    }
    dummy.scale.setScalar(1);
    dummy.updateMatrix();
    mesh.setMatrixAt(i, dummy.matrix);
  });
  mesh.instanceMatrix.needsUpdate = true;

  renderer.render(scene, camera);
}
animate();
```

**Step 2: Verify**

Reload. Expected: cube assembles, rotates ~8s, then cubes scatter outward, float gently, then reassemble. Loop repeats.

---

### Task 7: Live Clock

**Files:**
- Modify: `index.html` — append to module script (outside animate loop)

**Step 1: Write clock updater**

```js
const clockEl = document.getElementById('clock');
const dotAm = document.getElementById('dot-am');
const dotPm = document.getElementById('dot-pm');

function updateClock() {
  const now = new Date();
  const h = now.getHours();
  const m = now.getMinutes();
  const isAm = h < 12;
  const h12 = h % 12 || 12;
  clockEl.textContent = `${String(h12).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
  dotAm.classList.toggle('active', isAm);
  dotPm.classList.toggle('active', !isAm);
}

updateClock();
setInterval(updateClock, 1000);
```

**Step 2: Verify**

Reload. Expected: clock shows current local time and updates each second. AM dot filled in morning, PM dot in afternoon.

---

### Task 8: Final Polish Pass

**Files:**
- Modify: `index.html`

**Step 1: Offset cube to center-right of canvas**

In the camera setup, shift position slightly right:
```js
camera.position.set(1.5, 2, 14);
camera.lookAt(1.5, 0, 0);
```

**Step 2: Add subtle background gradient hint**

In CSS body/html:
```css
background: radial-gradient(ellipse at 60% 50%, #1a1915 0%, #12130f 70%);
```

**Step 3: Verify full page**

Open in browser. Check:
- [ ] "VAIBHAV" logo visible top-left
- [ ] Clock ticking, AM/PM dots correct
- [ ] Tagline text readable
- [ ] Cube animates: assemble → rotate → explode → float → reassemble
- [ ] Pink-red glow visible on cube underside
- [ ] Github / LinkedIn / Email links bottom-right
- [ ] No console errors

---

## Execution Options

Plan complete and saved to `docs/plans/2026-02-23-portfolio-page.md`.

**Two execution options:**

**1. Subagent-Driven (this session)** — dispatch fresh subagent per task, review between tasks

**2. Parallel Session (separate)** — open new session with executing-plans, batch with checkpoints

Which approach?
