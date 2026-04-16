# Component Split Design — 2026-02-24

## Goal

Break the monolithic `index.html` (~1210 lines) into maintainable, focused files with no build tooling — pure static files served directly.

## Constraints

- No build step (no Vite, no bundler)
- Must keep Three.js imports from `esm.sh` working via `type="module"`
- No lazy loading (Option B chosen over Option C)
- Same visual output, zero regressions

## File Structure

```
creative-portfolio/
├── index.html          ← HTML skeleton only
├── styles.css          ← all CSS extracted from <style> block
└── js/
    ├── main.js         ← entry point: imports all modules, runs render loop
    ├── scene.js        ← renderer, camera, EffectComposer/bloom, env map, lights
    ├── cube.js         ← geometry, buildCube(), face-turn animation, proximity distortion
    ├── theme.js        ← THEMES config, setTheme(), Three.js color interpolation, auto-cycle
    ├── interactions.js ← drag-to-orbit, pinch-to-zoom, click-to-turn, resize handler
    ├── clock.js        ← IST clock digits, AM/PM dots, setInterval
    └── ui.js           ← projects drawer, email obfuscation, drag hint fade
```

## Module Contracts

### scene.js
Exports: `renderer, scene, camera, composer, bloomPass, cubeRoot, keyL, sideL, fillL, ambL`
- Sets up WebGLRenderer on `#c` canvas
- Creates PerspectiveCamera, FogExp2
- Sets up EffectComposer with RenderPass + UnrealBloomPass
- Builds PMREMGenerator env map
- Adds all 4 lights

### cube.js
Exports: `buildCube, tickTurn, startTurn, getCubeState`
Imports from: `scene.js`, `theme.js`
- Shared RoundedBoxGeometry
- `buildCube(N)` — creates N×N×N cubelets with gradient materials
- Face-turn animation: `startTurn()`, `tickTurn(dt)`
- Proximity distortion with raycaster

### theme.js
Exports: `THEMES, BLOOM_STRENGTH, setTheme, tickThemeTransition, buildThemeTarget, applyThreeState`
Imports from: `scene.js`, `cube.js`
- All theme color definitions
- `setTheme(name)` — updates CSS classes, meta tag, localStorage, kicks off Three.js transition
- `tickThemeTransition(dt)` — called each frame in render loop

### interactions.js
Exports: `init(canvas), getOrbitState`
Imports from: `scene.js`, `cube.js`
- Mouse drag, touch drag, pinch-to-zoom
- Click-to-turn shortcut
- Resize handler (rebuilds cube if breakpoint changes)
- Mouse proximity NDC tracking

### clock.js
Exports: `init()`
- Reads DOM elements `#d0`–`#d3`, `#dot-am`, `#dot-pm`
- `setDigit()` animated roller
- `updateClock()` with IST timezone
- `setInterval` every 1000ms

### ui.js
Exports: `init()`
- Projects drawer open/close (`#proj-btn`, `.projects`)
- `getProjArrow()` responsive label
- Email obfuscation (`#email-btn`)
- Drag hint auto-fade (`#drag-hint`)

### main.js
- Imports all modules
- Applies saved theme, calls `buildCube(getN())`
- Wires `theme-dot` click handlers
- Calls `interactions.init(canvas)`, `clock.init()`, `ui.init()`
- Runs `render()` loop: calls `tickThemeTransition`, orbit auto-rotate, cube bob, proximity, `tickTurn`/`startTurn`, `composer.render()`
- Tab visibility pause via `visibilitychange`

## index.html Changes

- Remove entire `<style>` block → replace with `<link rel="stylesheet" href="styles.css">`
- Remove `<script type="module">` block → replace with `<script type="module" src="js/main.js">`
- HTML body markup unchanged

## CSP Update

Remove `'unsafe-inline'` from `script-src` since no inline scripts remain.
`style-src` can also drop `'unsafe-inline'` if no inline styles remain.
