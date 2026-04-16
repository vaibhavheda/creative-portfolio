# Portfolio Page Design — 2026-02-23

## Overview
Single-page personal portfolio inspired by yinger.dev. Dark, minimal aesthetic with an animated 3D cube as the hero element.

## Stack
- Plain HTML + embedded CSS + JS (no build step)
- Three.js via CDN (importmap, ESM)
- Google Fonts: Space Grotesk (logo), monospace for metadata

## Layout
Full-viewport, 3-column structure:
- **Left**: "VAIBHAV" bold logo (top-left), live clock + tagline + location (bottom-left)
- **Center**: Three.js canvas filling viewport, cube positioned center-right
- **Right**: Github / LinkedIn / Email links stacked vertically (bottom-right)

## Colors
- Background: `#12130F`
- Text: `rgb(228 223 218)`
- Cube material: pinkish-white `#f0d8d0`
- Point light: pinkish-red glow from below

## 3D Cube
- 5×5×5 grid = 125 cubes via `InstancedMesh`
- `RoundedBoxGeometry` (0.85 size, 0.12 radius, 4 segments)
- `MeshStandardMaterial` — metalness 0.1, roughness 0.3
- Lights: AmbientLight (0.4) + PointLight warm pink below + DirectionalLight top

## Animation States (auto-cycling loop)
1. **Assembled** (~8s) — slow Y-axis rotation
2. **Explode** (~1.6s) — cubes fly to random scattered positions, quint-in-out easing
3. **Float** (~2s) — gentle drift
4. **Reassemble** (~1.6s) — cubes snap back to grid, quint-in-out easing

## Content
- Name: VAIBHAV
- Tagline: "UI Engineer who dips his toes in Realtime 3D ° Interaction ° Perf"
- Location: placeholder
- Links: Github (#), LinkedIn (#), Email (#)
- Live clock with AM/PM indicator

## Files
- `index.html` — single file, all CSS and JS embedded
