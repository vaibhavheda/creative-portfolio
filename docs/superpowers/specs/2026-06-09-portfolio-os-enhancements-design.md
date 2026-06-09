# Portfolio OS — Enhancement Design Spec

**Date:** 2026-06-09
**Status:** Draft for review
**Repo:** `creative-portfolio` (the OS-style portfolio at vheda.in)
**Author of record:** Vaibhav Heda — full-stack + AI engineer

This spec merges four enhancement directions into one buildable plan, with all
taste decisions resolved and an adversarial critique's fixes folded in.

---

## 1. Overview & design principles

The portfolio **is** a modern OS: a macOS desktop on wide screens (`≥820px`), an
iOS home screen on narrow ones. This release does three things at once:

1. Ships **QuickDeck** — the first *downloadable, non-web* project — plus a real **résumé**.
2. Makes the OS conceit *behave* — live Spotlight, real menus, a Control Center, deep-links.
3. Adds a credible **dark "Clean" mode** with a clock-based auto theme and switchable wallpapers.

Everything extends existing selectors (`.window`, `.tile`, `.seg`, `.sheet`,
`#finder`, the `APPS{}` registry) rather than inventing new component families.

**The taste bar (non-negotiable).** Chrome stays NEUTRAL frosted white/grey — and
in dark, neutral graphite — never tinted with the wallpaper hue (tinting all
surfaces one hue goes muddy). Colour lives only in the soft pastel wallpaper, the
single system-blue accent (`#007aff` light / `#0a84ff` dark), and the *varied
per-app icon gradients*. Ink is near-black `#1c1d22`, never pure black. Fonts stay
Inter + JetBrains Mono. It must read as art-directed by one specific, dry, low-ego
engineer. **Banned on sight:** decorative glassmorphism *content* cards (frosted
glass is legitimate ONLY as OS chrome — windows/dock/sheets/menus); conic blobs;
rainbow gradient-clipped text; sparkle/emoji eyebrows; the "Available for work +
pulsing green dot" cliché; vanity stat counters; tracked-caps eyebrows over centred
heroes; Fraunces+Space Grotesk; purple SaaS gradients + neon glow; symmetric
three-identical-card heroes. Restraint is the whole product.

**Resolved decisions (from review):**

| Decision | Choice |
|---|---|
| Architecture | **Modular `src/` from the start** (Vite ES modules + data file + split CSS) |
| QuickDeck status | **"In review"** amber chip + **"landing soon"** download until the R2 `.dmg` is live |
| PWA | **Dropped entirely** — no manifest, no service worker, no install affordance |
| Favicon | Keep the current mark for now (redraw is an optional later task); **OG image is still redone** |
| AVAILABLE / live dots | **Tone down** — keep truthful status, drop the pulse/blink + shouty caps |
| Downloads host | **Cloudflare R2** via `r2.dev` public URL (two swap constants) |
| QuickDeck requirement | **macOS 26.5 (Tahoe), Apple Silicon** (verified from `project.yml`) |
| Auto-theme source | Clock-based — dark when local hour ≥19 or <7 |
| First-visit appearance | **Auto** |
| Spotlight matching | Simple case-insensitive substring/startsWith rank (≈4–6 items; no fuzzy lib) |
| UI sound | Out for this release |
| Analytics | Cloudflare Web Analytics beacon (token supplied later, never hardcoded) |

---

## 2. File architecture — modular `src/`

The current single `index.html` is 1065 lines (already over the 300-line rule) and
the headline "one shared registry" goal requires hoisting the project data out of
the phone-only `initPhone()` anyway. So we modularise **first** (Phase 0), to a
known-good parity build, then add features on a clean base.

```
/index.html                     ← markup only + <link rel=stylesheet> + <script type=module>
/src/
  main.js                       ← entry: matchMedia activate() → initDesktop()/initPhone(); ~40 lines
  data/
    projects.js                 ← SINGLE SOURCE OF TRUTH: PROJECTS[] (incl. QuickDeck), résumé meta,
                                    DOWNLOAD_URL / RESUME_URL constants, QUICKDECK fact block
    commands.js                 ← COMMANDS[] for Spotlight + menus (theme, downloads, deep-links)
  shared/
    clock.js                    ← one tick() (desktop + phone read it)
    theme.js                    ← data-theme/data-wall/data-resolved, resolveTheme(), localStorage
    spotlight.js                ← one overlay, substring rank, keyboard nav (both faces)
    router.js                   ← #slug / ?app= deep-links + history push/pop
    keys.js                     ← ONE module-scope keydown (Cmd-K, /, Esc) shared by both faces
  desktop/
    desktop.js                  ← initDesktop orchestrator
    windows.js                  ← drag, focus, green-zoom + snap, traffic lights
    dock.js                     ← magnification + wiring
    menubar.js                  ← live File/View/Window/Edit/Go/Help menus + Control Center popover
    finder.js                   ← setView() + renders Finder rows from PROJECTS[]
    contextmenu.js              ← desktop/dock right-click menus
  phone/
    phone.js                    ← initPhone orchestrator
    sheet.js                    ← openSheet/closeSheet + renderer (download branch)
    home.js                     ← grid render from PROJECTS[], page 1/2, pagedots
    controlcenter.js            ← phone CC sheet (theme + wallpaper)
  styles/
    index.css                   ← @imports the rest
    tokens.css                  ← :root vars + [data-resolved="dark"] overrides + wallpaper tokens
    desktop.css                 ← #desktop, .window, .seg, dock, menus
    phone.css                   ← #phone-stage, .tile, .sheet, .app
    shared.css                  ← doc-ico swatches, status-chip, spotlight, context-menu
/public/                        ← Vite static root
  quickdeck-icon.png            ← VENDORED copy (see Phase 0); source is a SEPARATE repo
  og-image.png                  ← re-shot 1200×630 screenshot of the desktop face
  favicon.svg                   ← moved from root, unchanged for now
```

**Parity rule for Phase 0:** the modular build must render pixel-identical to today
before any feature lands. `npm run dev` and `npm run build` both verified by eye +
screenshot diff against the current site.

**Deploy flow change:** output is `vite build` → `dist/`, uploaded to Hostinger
(replacing the single-file upload). Same host, one extra build step.

---

## 3. Per-area design

### 3.1 Real artifacts — QuickDeck + résumé

**Shared data (`src/data/projects.js`), the only swap points:**

```js
export const DOWNLOAD_URL = 'https://pub-REPLACE.r2.dev/quickdeck/QuickDeck-1.0.0.dmg'; // R2 r2.dev — swap once
export const RESUME_URL   = 'https://pub-REPLACE.r2.dev/resume/Resume-Vaibhav-Heda.pdf';
export const QUICKDECK = {
  version: '1.0.0', size: '~9 MB', req: 'macOS 26.5 (Tahoe) · Apple Silicon',
  released: false,                 // false → "landing soon" state; flip true when the .dmg is live
};
export const RESUME_UPDATED = 'Jun 2026';
```

**The one rule that sets QuickDeck apart:** its single affordance is **download,
not open**. While `released` is `false`, the control is a disabled-looking
"macOS build — landing soon" button with no fabricated version/size shown as a hard
promise. When `released` flips `true`, the same control becomes a real
`<a href=DOWNLOAD_URL download>Download ↓</a>` with a **↓** glyph. The three web
projects keep `target="_blank" rel="noopener"` and the **↗** glyph.

**Icon.** Vendor-copy the real 1024px product icon into `/public/quickdeck-icon.png`
(it's a dark rounded-square panel holding a 2×2 grid of colourful glass tiles —
genuine product artwork, so the multi-colour is intentional, not a rainbow tell).
New classes `.sw-qd` / `.ic-quickdeck` / `.di-quickdeck` = dark panel
`linear-gradient(160deg,#3a3d46,#23252c)` with the PNG layered via
`background-image`. **Inline-SVG fallback** if the PNG 404s: a 2×2 rounded-`rect`
grid in the four real product colours (periwinkle `#8ea2f2`, mint `#5fe3c8`, pink
`#f29ad0`, amber `#f6b65a`) on the dark panel — mirrors the existing `.di-finder`
2×2 idiom. The fallback must stay product-accurate (no neon/glow).

**Desktop touchpoints:** 4th Finder entry in all three views (rendered from
`PROJECTS[]` after Phase 0). Table Link cell shows the landing-soon/Download state;
status chip = amber "In review"; Stack = `Swift 6 · SwiftUI · Liquid Glass`. Finder
statusbar → `"4 items · 3 live · 1 in review — the catalogue only shows the
survivors."` About window: spec rows gain QuickDeck + a "Résumé — Updated Jun 2026"
row; `.about-actions` splits into two rows (Email primary; then Résumé ↓ +
QuickDeck) since 398px is tight. File menu routes to the résumé / download (§3.2).

**Phone touchpoints:** new `.app` tile `data-app="quickdeck"` (amber `.dot-status`);
`openSheet()` gains a download branch — `.s-open` becomes a download button labelled
"Download for macOS" with a ↓ tray-arrow when `a.download` is set; `.s-list` spec
rows = Version / Size / Requires; Gatekeeper note in the italic `.s-foot`. Résumé is
a quiet row in the About sheet **and** present on page 2.

**Dry microcopy (his voice):**
- QuickDeck sheet body: *"Click the menu-bar icon, a glass panel drops down — a grid of one-click actions you actually use. Shell commands, app launches, a dark-mode toggle, a keyboard-wipe lock. Config is JSON, hot-reloaded."*
- Landing-soon button: *"macOS build — landing soon"*
- Gatekeeper `.s-foot` (shown once released): *"Unsigned, so the first open is a right-click → Open. macOS asks once; after that it's yours."*
- Not-on-App-Store (if space): *"Not on the App Store — it runs shell and launches apps, which the sandbox won't allow. That's the point."*

**Build the artifact (parallel side-task, separate repo `DockManagement`):**
`xcodegen generate` → `xcodebuild -scheme QuickDeck -configuration Release` → export
the `.app` → wrap in a `.dmg`. Unsigned/un-notarised (no Developer ID) — that's why
the Gatekeeper note exists. Upload to R2 per `README-downloads.md`, then set
`QUICKDECK.released = true` and paste the real `pub-…r2.dev` URL.

### 3.2 OS realism

**Shared registry.** `PROJECTS[]` + `COMMANDS[]` in `src/data`. Desktop maps
`finder`/`about` → real `#id` windows; projects → web-open or QuickDeck-download.

**Spotlight (one component, three triggers).** `src/shared/spotlight.js` builds one
`#spotlight` overlay from `.window` frosting + `.search-pill`/`.file-row` styling so
it matches Finder exactly and auto-themes in dark. Substring/startsWith rank over
registry labels+tags (no library). Triggers: menu-bar magnifier `.mb-ico` (primary,
guaranteed); `Cmd-K` and `/` via the shared `keys.js`; phone `.searchpill`
(repointed to open the same overlay as a top-down sheet). Arrow keys move an
`.active` highlight; Enter routes via `showWindow()`/`openSheet()`/`window.open`/
download; Esc closes. `Cmd-K` guarded so it doesn't fire while a text input
(Spotlight's own) is focused.
- Placeholder: *"Search work, links, the résumé…"* · Empty: *"Nothing here. Try a project name."* · Footer: *"↑↓ to move · ↵ to open · esc to close"*

**Live menu-bar dropdowns.** The six dead `.mb-item` buttons get a shared `.mb-menu`
dropdown (same frosted recipe as `.window`, `--hairline` dividers), wired to
existing functions:
- **File** → Download Résumé · Open Résumé in Preview · ─ · Download QuickDeck…
- **View** → as Icons / List / Table (`setView()`) · Toggle Theme
- **Window** → Selected Work / About This Engineer (`showWindow()`/`focusWindow()`)
- **Edit** → Find… (opens Spotlight) · **Go** → jump to each window · **Help** → Keyboard Shortcuts (small panel reusing `.about-body`/`.spec-row`)
- Click opens; hovering a sibling while open switches menus (mac behaviour); outside-click/Esc closes. **Only one transient overlay open at a time** (menu / popover / spotlight / context menu mutually exclusive — no glass pile-up).

**Preview-style résumé window.** A third `.window` `#preview` cloned from `#about`
structure: traffic lights, title "Résumé — Vaibhav Heda.pdf", body
`<iframe src=RESUME_URL>`, toolbar with one Download ↓ button. Zero new JS — the
existing window loop already wires drag/focus/close for any `#desktop .window`.

**Green-button zoom + snap.** `.light.green` currently has no handler. Click (or
titlebar double-click) toggles authored geometry ↔ near-fullscreen; drag-release
past a screen edge animates to a half-width frame. Pure `left/top/width/height`
transitions, gated by `prefers-reduced-motion`. **Dropped:** edge-resize handles,
Mission Control (gimmick at 3–4 windows).

**Context menus.** Reuse `.mb-menu` at cursor. Right-click empty `#desktop` → Change
Wallpaper ▸ (wash/dusk/grid) · Appearance ▸. Right-click a `.dock-item` → Open /
live link / (QuickDeck) Download. Attach on `contextmenu` + `preventDefault` ONLY
inside `#desktop` empty space + dock icons. **Pre-existing bug to fix here:** the
titlebar drag handler doesn't guard `e.button`, so a right-click can currently start
a drag — guard for primary button only.

**Phone page 2.** Wrap `.grid` in a 2-page `translateX` track driven by the existing
`.pagedots`. Page 2: QuickDeck app, a "Now"-style note tile (reuse `.w-now`), the
contact widget mirrored. **Keep the deliberate asymmetry** (2×2 widgets interrupting
app rows) — do not tidy four projects into a symmetric grid. **Dropped:**
app-switcher gesture.

### 3.3 Vibe — dark mode, auto theme, wallpapers, motion

**State layer.** Promote every `:root` literal to semantic tokens; add a
`[data-resolved="dark"]` override block. New tokens `--wall-desktop` / `--wall-phone`
hold the gradient stacks currently inline on `#desktop` and `.screen`. JS sets, on
`<html>`: `data-theme` (auto/light/dark), `data-wall` (wash/dusk/grid), and computed
`data-resolved` (light/dark). Default attributes on `<html>` keep first paint correct
(no FOUC). JS updates `<meta name=color-scheme>` and a **neutral graphite**
`theme-color` on resolve (never a tinted dusk-indigo — that would re-introduce the
"muddy when tinted" problem). **Structural CSS untouched — layout never moves.**

**Dark "Clean" palette** (`[data-resolved="dark"]`): `--text #e8e9ee`, `--text-dim
#9a9da8`; `.window` → `rgba(30,32,40,0.66)`; menubar/dock/sheet → `rgba(28,30,38,
~0.6)`; `--glass-stroke rgba(255,255,255,0.08)`, `--hairline rgba(255,255,255,0.10)`;
deepened `--window-shadow`; accent → `#0a84ff`; lower `saturate()` so frosted chrome
over a dark wallpaper stays neutral. **Vivid kept:** traffic lights, status chips,
`.seg.on`, about avatar, all per-app icon gradients.

**Enumerated dark glyph swaps (NOT a vague "audit"):**
- *Keep `#fff`* — glyphs sitting on a coloured icon gradient (dock icons, app-tile icons): the gradient stays, white stays correct.
- *MUST tokenise* — phone `.statusbar` SVGs (`fill #1c1d22` → `var(--text)`; these are dark ink and would vanish on a dark wallpaper); `.lock`/`.lk-lock` (`#2a3142` strokes → token; `#fff` is fine on dark); `#boot .blogo` (`#2a3142` → token); menubar already uses `currentColor` (fine).
- Route `.lock`/`#boot`/`.screen` gradient literals through the wallpaper tokens so the boot screen crossfades to the resolved wallpaper (no white flash for dark visitors — resolve theme *before* boot fade).

**Control Center.** *Desktop:* wire the existing CC `.mb-ico` to a `.cc-popover`
(reuses `.window` frosting): an Appearance segmented control (`.seg` — Light | Auto |
Dark) + three wallpaper swatch chips. *Phone:* `controlcenter.js` renders the same
`.seg` + swatches as a sheet; trigger via the status-bar right cluster.

**Wallpapers (3).** `[data-wall=wash|dusk|grid]`. **wash** = current pastel
(unchanged). **dusk** = same geometry retoned to deep indigo/charcoal/slate (the dark
default). **grid** = near-flat paper + a very-low-alpha `repeating-linear-gradient`
hairline grid, with `#desktop::before` drift and `.screen::after` bloom disabled so
it reads as paper, not a pattern. If by sight it reads as a busy pattern rather than
paper — **cut it**; three wallpapers is nice-to-have, not load-bearing. Wallpaper
persists in localStorage independent of theme; dark defaults to dusk.

**Auto theme.** `resolveTheme()`: if `data-theme==='auto'`, dark when local hour ≥19
or <7 (matches the visible clock widget). Recompute on the existing desktop 1s / phone
15s tick. Manual Light/Dark writes localStorage and wins. `prefers-color-scheme`
seeds first paint only.
- Auto caption: *"Auto follows the clock — light by day, dark after seven. Same as the rest of us."*

**Tone-down the live/AVAILABLE widgets.** The `.w-now .wn-top` "AVAILABLE" caps + the
`.w-ship .live` blinking dot skirt the banned "Available + pulsing dot" tell, and dark
mode makes a glowing green dot read more SaaS-y. Drop the pulse/blink animation and
the shouty caps; keep a quiet static dot + plain-case label. Same for the desktop
widget pulse.

**Motion.** Add `--spring cubic-bezier(.2,.9,.25,1.08)`; reuse `--sheet-ease`.
`showWindow()` uses `--spring` with a small settle; dock magnify keeps its math. All
new motion under the extended `prefers-reduced-motion` block (which also disables the
spring overshoot + popover/CC transitions).

### 3.4 Tech & reach (no PWA)

**Deep-links + history.** `router.js` reads a slug from `location.hash` (`#quickdeck`)
or `?app=`. Maps to existing handlers: phone → `openSheet(slug)`; desktop →
`showWindow('finder')` + flash the matching row, or `showWindow('about')`.
`openSheet()`/`showWindow()` call `history.pushState`; close pushes back to base. One
`popstate` listener re-reads the slug (guarded against push-inside-pop loops). Unknown
slug silently falls back to the default face. Valid slugs = `PROJECTS[]` keys +
`finder`/`about`.

**OG image.** The current `og-image.svg` is raster-unfriendly *and* stylistically
stale (dark/brown, Space Grotesk — contradicts the Clean-Light build). Re-shoot: load
the site at exactly 1200×630 in headless Chromium (Playwright, build-time only),
remove `#boot`, freeze the clock, screenshot `#desktop` → `/public/og-image.png`.
Update the four `og:image`/`twitter:image` metas to `.png` + add
`og:image:width/height/type`. Delete `og-image.svg`.

**Accessibility / keyboard.** `#menubar` → `role=menubar`, items → buttons with roving
`tabindex` + arrow nav. Spotlight results → `role=listbox`/`option`. Sheets/windows as
dialogs: focus first control on open, restore to launcher on close; the shared Esc
handler closes top-most overlay first (menu → sheet → window). `aria-expanded` on
launchers. Existing `.seg` `role=tablist`/`aria-selected` kept. New download/menu
controls reachable via the existing `:focus-visible` blue ring.

**Perf.** Stay self-contained / inline-SVG (no below-fold images). Self-host or
`preload` only the two Inter/JetBrains weights actually used, to kill the
render-blocking Google Fonts round-trip. Ship only referenced PNG sizes. New runtime
JS = router + Spotlight + theme (tiny). No new runtime deps (Playwright is build-time
only).

**Analytics.** Cloudflare Web Analytics beacon (`<script defer src=…beacon.min.js
data-cf-beacon='{token}'>`) before `</body>` — cookieless, no consent banner. **Token
not hardcoded** — supplied from the dashboard at the end.

---

## 4. Build sequence

Each phase is independently shippable and reviewable. Modular scaffold (Phase 0)
comes first so the rest build on a clean base.

| Phase | Title | Depends | Scope |
|---|---|---|---|
| **0** | Modular scaffold | — | Extract `index.html` → `src/` tree; Finder rendered from `PROJECTS[]`; **pixel-parity with today** (no visible change). Vendor-copy QuickDeck icon to `/public`. Remove orphan "Mani d'oro" tokens (`.sw-md`, `.ic-mani`, `SVG.mani`, `ICOCLASS.mani`). |
| **1** | QuickDeck the artifact | 0 | Add QuickDeck to `PROJECTS[]` (one place → all Finder views + phone); download branch in renderers; "In review" chip + landing-soon button; About spec rows; `.sw-qd`/`.ic-quickdeck`/`.di-quickdeck` + SVG fallback; Gatekeeper copy. |
| **2** | Résumé plumbing | 0 | About two-row actions (Résumé ↓ / QuickDeck); About-sheet résumé row; page-2 résumé row. (Preview window in Phase 5.) |
| **3** | Dark mode + auto + wallpapers | 0 | Tokenise `:root`; `[data-resolved=dark]`; `data-theme`/`data-wall`; `resolveTheme()`; 3 wallpapers; enumerated glyph swaps; boot crossfade; tone-down live dots; motion re-time. |
| **4** | Live menus + Control Center | 3 | `.mb-menu` for all six menus; CC popover (desktop) + sheet (phone) driving theme/wallpaper; green-button zoom + snap; context menus (+ fix right-click-drag bug); one-overlay-at-a-time. |
| **5** | Spotlight + Preview + page 2 | 4 | One Spotlight overlay (3 triggers, substring rank, shared `keys.js`); Preview résumé window; phone page 2. |
| **6** | Reach | 1,3 | `router.js` deep-links; re-shot OG PNG; a11y/keyboard pass; self-host fonts; Cloudflare beacon. |
| **S** | Build QuickDeck `.dmg` *(parallel, separate repo)* | — | xcodegen → xcodebuild Release → `.dmg`; upload to R2; flip `QUICKDECK.released=true` + paste real URL. Gated only on you having time to upload; portfolio uses landing-soon until then. |

Dock QuickDeck tile = optional sub-task of Phase 1.

---

## 5. Render checkpoints (you sign off by sight before each big build)

- **Before Phase 1:** Finder Table (4 rows — QuickDeck icon + amber "In review" + landing-soon vs the 3 "↗" links); Finder Icon view (4-tile row); SVG fallback beside the real PNG; phone QuickDeck sheet (specs + Gatekeeper foot).
- **Before Phase 2:** About window two-row actions + résumé spec row (confirm 398px isn't cramped).
- **Before Phase 3 (make-or-break):** Desktop Light/wash baseline; Desktop Dark/dusk; Desktop Light/grid (reads as paper?); Phone Dark/dusk home; a dark contrast detail (chips/pills/mono on graphite).
- **Before Phase 4:** File menu open; Control Center popover (dark); right-click wallpaper menu; a window mid-zoom.
- **Before Phase 5:** Desktop Spotlight over wallpaper (query "fuel" → FuelFlow ranked); phone Spotlight sheet + page 2; Preview résumé window.
- **Before Phase 6:** the final 1200×630 `og-image.png`; focus-visible ring set (menubar item, active seg, download control, focus-trapped sheet).

---

## 6. Remaining open items (non-blocking)

1. **Favicon** — kept as-is for now; redraw in the Clean-Light idiom is an optional follow-up if the tab/mark bothers you.
2. **R2 URLs** — `pub-…r2.dev` placeholders until you create the bucket + upload (see `~/Documents/Clourflare health watch/README-downloads.md`).
3. **Analytics token** — paste from the Cloudflare dashboard at the end.
4. **QuickDeck `.dmg` size** — `~9 MB` is an estimate; corrected to the real size after the build.

---

*No git commits will be made without explicit approval. All work is verified locally
and shown before any integration.*
