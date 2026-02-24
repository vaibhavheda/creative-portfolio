# OffscreenCanvas + Web Worker Design

**Goal:** Move all Three.js work off the main thread using OffscreenCanvas, eliminating the 34,200ms TBT caused by WebGL shader compilation blocking the main thread.

**Architecture:** Thin main thread handles DOM events only. A dedicated Web Worker owns the entire Three.js scene (scene, cube, theme, render loop). Messages flow one-way: main → worker. Fallback to original main-thread rendering for unsupported browsers.

---

## File Structure

### New files
- `js/entry.js` — new HTML entry point; feature-detects OffscreenCanvas, chooses worker or fallback path
- `js/worker.js` — worker entry point; receives init message, runs Three.js render loop
- `js/input.js` — main-thread input handler; wires DOM events and forwards messages to worker

### Modified files
- `js/scene.js` — remove `document.getElementById('c')`; accept canvas + dimensions as parameters
- `js/cube.js` — `getN(width)` takes explicit width instead of reading `innerWidth`
- `js/main.js` — convert to `export function init(canvas, opts)` instead of auto-running

### Unchanged files
- `js/theme.js` — no DOM access, works in worker as-is
- `js/interactions.js` — kept intact for fallback path only
- `js/clock.js` — DOM only, always runs on main thread
- `js/ui.js` — DOM only, always runs on main thread

---

## Message Protocol (main → worker, one-way)

### Init (once, with canvas transfer)
```js
{ type: 'init', canvas, width, height, dpr, n, theme, prefersReducedMotion, hasHover }
```
`dpr`, `prefersReducedMotion`, `hasHover` are evaluated on the main thread (unavailable in workers) and sent once.

### Input events
```js
{ type: 'orbitStart',  x, y }
{ type: 'orbitMove',   dTheta, dPhi }
{ type: 'orbitEnd',    tapped: bool }   // tapped=true triggers a cube face turn
{ type: 'mouseNDC',    x, y }           // hover proximity effect
{ type: 'mouseleave' }
{ type: 'pinchStart' }                  // worker saves cameraState.r
{ type: 'pinchMove',   ratio }          // worker applies clamp(savedR * ratio, min, max)
{ type: 'pinchEnd' }
```

### Lifecycle
```js
{ type: 'resize',     width, height, dpr, n }
{ type: 'theme',      name }
{ type: 'visibility', hidden: bool }
```

---

## Fallback Strategy

```js
const supported = typeof OffscreenCanvas !== 'undefined'
  && !!canvas.transferControlToOffscreen;
```

- **Supported:** transfer canvas to worker, run `input.js`
- **Not supported:** `import('./main.js')` — original code runs unchanged on main thread

---

## Worker Internals

The worker's `requestAnimationFrame` loop (available in dedicated workers since Chrome 69) drives:
- Auto-rotation (when not dragging)
- Theme lerp transitions (1.4s smooth)
- Breathe + proximity animation
- Camera positioning from orbit state

All Three.js state (orbit, theme, cameraState, turnState) lives exclusively in the worker.
