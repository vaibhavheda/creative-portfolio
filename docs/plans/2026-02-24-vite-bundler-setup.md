# Vite Bundler Setup Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Replace esm.sh CDN imports with a local Vite bundle to eliminate 32,710ms TBT.

**Architecture:** Add Vite as a build tool. All `https://esm.sh/three@0.165.0` imports become bare specifiers (`three`, `three/examples/jsm/...`). Vite bundles everything into `dist/` — deploy that folder. Source files (`js/`, `styles.css`, `index.html`) stay at the repo root exactly as today; no restructuring needed.

**Tech Stack:** Vite 5, Three.js 0.165.0, Node.js

---

### Task 1: Create package.json

**Files:**
- Create: `package.json`

**Step 1: Write package.json**

```json
{
  "name": "creative-portfolio",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "preview": "vite preview"
  },
  "dependencies": {
    "three": "^0.165.0"
  },
  "devDependencies": {
    "vite": "^5.4.0"
  }
}
```

**Step 2: Install dependencies**

Run: `bun install`
Expected: `node_modules/` created, `bun.lockb` written, no errors.

**Step 3: Commit**

```bash
git add package.json bun.lockb
git commit -m "chore: add vite + three.js as local dependencies"
```

---

### Task 2: Create vite.config.js

**Files:**
- Create: `vite.config.js`

**Step 1: Write config**

```js
import { defineConfig } from 'vite';

export default defineConfig({
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
    rollupOptions: {
      output: {
        manualChunks: {
          three: ['three'],
        },
      },
    },
  },
});
```

The `manualChunks` keeps Three.js in its own chunk so the browser can cache it separately from app logic.

**Step 2: Verify dev server starts**

Run: `bun run dev`
Expected: Terminal prints `Local: http://localhost:5173/`, no errors.
Stop with Ctrl+C.

**Step 3: Commit**

```bash
git add vite.config.js
git commit -m "chore: add vite config with three.js chunk splitting"
```

---

### Task 3: Replace esm.sh imports in scene.js

**Files:**
- Modify: `js/scene.js:1-4`

**Step 1: Change imports**

Replace:
```js
import * as THREE from 'https://esm.sh/three@0.165.0';
import { EffectComposer } from 'https://esm.sh/three@0.165.0/examples/jsm/postprocessing/EffectComposer';
import { RenderPass }     from 'https://esm.sh/three@0.165.0/examples/jsm/postprocessing/RenderPass';
import { UnrealBloomPass } from 'https://esm.sh/three@0.165.0/examples/jsm/postprocessing/UnrealBloomPass';
```

With:
```js
import * as THREE from 'three';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass }     from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
```

Note: The `.js` extension is required for Three.js addon imports when using a bundler.

**Step 2: Verify dev server still works**

Run: `bun run dev`
Expected: Cube renders in browser, no console errors.
Stop with Ctrl+C.

---

### Task 4: Replace esm.sh imports in cube.js

**Files:**
- Modify: `js/cube.js:1-2`

**Step 1: Change imports**

Replace:
```js
import * as THREE from 'https://esm.sh/three@0.165.0';
import { RoundedBoxGeometry } from 'https://esm.sh/three@0.165.0/examples/jsm/geometries/RoundedBoxGeometry';
```

With:
```js
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
```

---

### Task 5: Replace esm.sh imports in main.js and theme.js

**Files:**
- Modify: `js/main.js:1`
- Modify: `js/theme.js:1`

**Step 1: Change main.js line 1**

Replace:
```js
import * as THREE from 'https://esm.sh/three@0.165.0';
```
With:
```js
import * as THREE from 'three';
```

**Step 2: Change theme.js line 1**

Replace:
```js
import * as THREE from 'https://esm.sh/three@0.165.0';
```
With:
```js
import * as THREE from 'three';
```

**Step 3: Verify dev server works end-to-end**

Run: `bun run dev`
Expected: Full scene renders — cube animates, themes switch, clock ticks, projects panel opens.
Stop with Ctrl+C.

**Step 4: Commit all import changes**

```bash
git add js/scene.js js/cube.js js/main.js js/theme.js
git commit -m "refactor: replace esm.sh CDN imports with local bare specifiers"
```

---

### Task 6: Update CSP in index.html

**Files:**
- Modify: `index.html:21`

The Content-Security-Policy currently allows `https://esm.sh` in `script-src` and `connect-src`. Remove those now that nothing fetches from esm.sh.

**Step 1: Update the meta CSP tag**

Replace:
```html
<meta http-equiv="Content-Security-Policy" content="default-src 'self'; script-src 'self' https://esm.sh; style-src 'self' https://fonts.googleapis.com; font-src https://fonts.gstatic.com; img-src 'self' data:; connect-src 'self' https://esm.sh;" />
```

With:
```html
<meta http-equiv="Content-Security-Policy" content="default-src 'self'; script-src 'self'; style-src 'self' https://fonts.googleapis.com; font-src https://fonts.gstatic.com; img-src 'self' data:; connect-src 'self';" />
```

**Step 2: Commit**

```bash
git add index.html
git commit -m "security: tighten CSP now that esm.sh is no longer used"
```

---

### Task 7: Verify production build

**Step 1: Build**

Run: `bun run build`
Expected: `dist/` folder created containing `index.html`, `assets/` with hashed JS and CSS files, no build errors.

**Step 2: Preview the production build**

Run: `bun run preview`
Expected: Terminal prints `Local: http://localhost:4173/`, cube renders correctly, no console errors.
Stop with Ctrl+C.

**Step 3: Check bundle sizes**

Run: `ls -lh dist/assets/`
Expected: A `three-[hash].js` chunk (~450-500KB minified), an app chunk (<50KB).

**Step 4: Commit build artifacts if deploying from dist/, otherwise update .gitignore**

If deploying dist/ via CI: skip adding dist to git.
If deploying dist/ manually (e.g. drag-drop to Netlify/Vercel): `git add dist && git commit -m "build: production bundle"`.

For CI/CD deployment, add to `.gitignore`:
```
dist/
```

---

### Task 8: Update .gitignore

**Files:**
- Modify or create: `.gitignore`

**Step 1: Add node_modules and dist**

```
node_modules/
dist/
```

**Step 2: Commit**

```bash
git add .gitignore
git commit -m "chore: ignore node_modules and dist"
```

---

## Expected Lighthouse Impact

| Metric | Before | After (expected) |
|--------|--------|-----------------|
| TBT | 32,710 ms | < 100 ms |
| Speed Index | 12.0 s | < 2 s |
| FCP | 2.4 s | < 1.0 s |
| LCP | 2.4 s | < 1.0 s |

The Three.js chunk will be ~450KB minified (~130KB gzip), served from your own domain with proper caching headers — far better than multiple roundtrips to esm.sh with runtime transpilation.
