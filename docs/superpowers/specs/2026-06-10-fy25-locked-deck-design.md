# FY25 Locked Deck — Design

**Date:** 2026-06-10
**Status:** Approved direction (brainstorm + visual mockups), pending spec review
**Mockups:** `.superpowers/brainstorm/33219-1781063892/content/fy25-flow.html` (user selected style B — Native)

## Overview

Add a password-protected "FY25" section to the OS portfolio (vheda.in). Publicly, FY25 appears as a visibly locked folder in Finder (desktop face) and a locked home-screen tile (phone face). Entering the correct password decrypts the FY25 year-in-review content in the browser and opens a Keynote-style deck window (desktop) or a full-screen swipeable slide viewer (phone).

The FY25 content — sourced from `Super-procure/FY-2025-26/legacy-fy25/content.json` — contains real enterprise client names (HUL, JSW, ITC, Flipkart, ~41 total) and internal work data. The GitHub repo (`vaibhavheda/creative-portfolio`) is **public** and the site is statically hosted on Hostinger, so privacy must come from real encryption, not a JavaScript password check: the content ships only as an AES-256-GCM ciphertext that is undecipherable without the password.

## Goals

1. FY25 visible-but-locked on both faces; unlockable live during a showcase by typing a password.
2. Content genuinely unreadable without the password — in the served bundle, in DevTools, and in the public git repo.
3. Unlocked experience: native (style B) Keynote-style deck of the 7 legacy slides, fully consistent with portfolio system styling, light + dark.
4. First-class mobile compatibility: the unlock flow and the slide viewer must work cleanly on iOS Safari (the phone face's primary target).
5. Copy pass: tighten the legacy deck's language — more concise, same editorial voice (see Content Pipeline).

## Non-Goals

- Server-side auth, rate limiting, or any backend/Worker infrastructure.
- Multiple passwords or per-viewer access.
- Locking any other portfolio content.
- Changes to V's script (agreed separately: discuss before extending V).
- Autoplay/auto-advance in the deck.

## UX Flows

### Desktop (≥820px)

1. **Locked state.** Finder sidebar gains a "Private" section with a "FY25 🔒" item; FY25 also appears in all three Finder views (table/list/icon) as a folder item with a lock badge. A Spotlight entry "FY25 — Year in Review" (scope: work) is added.
2. **Unlock dialog.** Clicking any FY25 entry opens a macOS-style modal dialog: folder icon with lock badge, title "“FY25” is locked", explanatory line, password field (`type="password"`), Cancel / Unlock buttons. Enter submits; Esc cancels. Wrong password → classic macOS head-shake animation on the dialog, field clears, focus retained. No attempt limit (offline brute force is the real threat model, not the UI).
3. **Deck window.** On success, a new window (`id="fy25"`, title "FY25 — Year in Review") opens via the existing `showWindow()` path, inheriting drag/focus/close/minimize from `desktop.js`'s generic wiring. Contents: a 16:9 slide canvas plus a bottom control bar with ‹ / › buttons, 7 clickable dots, a "n / 7" counter, and a fullscreen toggle (Fullscreen API on the window element). ← / → navigate while the window is focused. Slides crossfade; `prefers-reduced-motion` swaps instantly and disables count-up animations.

### Phone (<820px)

1. **Locked state.** Home grid gains an "FY25" tile (dark gradient, lock badge).
2. **Unlock sheet.** Tap → full-screen dark unlock sheet: lock glyph, "FY25 is locked", password field, Unlock button. Same shake-on-fail behavior. Uses `100dvh` and safe-area insets (consistent with the recent phone-face fixes).
3. **Slide viewer.** On success, a full-screen viewer: one slide per screen, horizontal swipe (touch) plus tap-zones on the left/right edges, dot indicators, close button. Same shared renderer as desktop with phone-specific CSS.

### Both faces

- **Session persistence.** The derived AES key (raw bytes, base64) is cached in `sessionStorage` (`vheda-fy25-key`). On page load, if present, decryption is attempted silently so a mid-demo refresh does not re-prompt. Closing the tab discards it. No `localStorage`.
- **Dev param.** `?fy25=1` opens the unlock flow on load (consistent with existing `?win=`, `?cc=1`, `?vee=1` aids).

## Architecture

New modules (all ES modules, each under 300 lines):

| File | Responsibility |
|---|---|
| `scripts/fy25-encrypt.mjs` | Build-time: plaintext JSON → encrypted envelope `public/fy25.enc` |
| `src/shared/fy25-crypto.js` | Runtime: fetch envelope, PBKDF2 key derivation, AES-GCM decrypt, sessionStorage key cache |
| `src/shared/fy25-slides.js` | Pure renderer: decrypted JSON → slide DOM (shared by both faces); count-up stat animation |
| `src/desktop/fy25.js` | Desktop wiring: unlock dialog, deck window controls, keyboard, fullscreen |
| `src/styles/fy25.css` | All FY25 styles (dialog, deck, phone viewer), plus `html[data-theme="dark"]` overrides appended to `theme-dark.css` |

Modified files:

- `index.html` — FY25 window section (after the Résumé window, ~line 207), Finder sidebar "Private" item, phone tile button, and two unlock surfaces: a desktop dialog inside `#desktop` and a phone sheet inside `#phone-stage`. They are separate markup (different idioms) sharing the same submit/decrypt/shake logic from `fy25-crypto.js`.
- `src/data/projects.js` — one new registry entry `{ key: 'fy25', locked: true, … }` so Finder views, phone grid metadata, and Spotlight all pick it up from the single source of truth.
- `src/desktop/finder.js` — render lock badge for `locked` entries; clicking a locked row/icon triggers the unlock flow instead of a link.
- `src/shared/spotlight.js` — FY25 entry launches unlock flow (or focuses the open deck if already unlocked).
- `src/phone/phone.js` — locked tile routes to unlock sheet; unlocked tile opens viewer.
- `src/styles/index.css` — import `fy25.css` in the cascade before `theme-dark.css`.
- `.gitignore` — add `content/fy25.private.json`.

Data flow:

```
content/fy25.private.json (gitignored, concise copy)
        │  scripts/fy25-encrypt.mjs + FY25_PASSWORD
        ▼
public/fy25.enc  {v, salt, iv, ct}        (committed; ciphertext only)
        │  vite build → dist/fy25.enc → Hostinger
        ▼
fy25-crypto.js: fetch + PBKDF2(password) → AES-GCM decrypt → JSON
        ▼
fy25-slides.js → slide DOM → desktop window / phone viewer
```

## Security Model

- **Cipher:** AES-256-GCM via WebCrypto (`crypto.subtle`), random 12-byte IV per encryption run.
- **KDF:** PBKDF2-SHA256, 310,000 iterations, random 16-byte salt stored in the envelope.
- **Envelope:** JSON `{ "v": 1, "salt": "<b64>", "iv": "<b64>", "ct": "<b64>" }` written to `public/fy25.enc`. Safe to commit and serve publicly.
- **Verification:** no stored password hash anywhere; the only success signal is the GCM auth tag validating on decrypt. Wrong password → `OperationError` → shake UI.
- **Build script input:** password from `FY25_PASSWORD` env var, else interactive TTY prompt. Never written to disk, never committed, never logged.
- **Threat model:** the ciphertext is public, so offline brute force is possible. The 310k-iteration KDF slows it; the real defense is passphrase strength. Recommendation recorded here: use a 3+ word passphrase, not "fy25" or similar.
- **Residual exposure (accepted):** once unlocked on a machine, content is in DOM/memory and the key is in that tab's sessionStorage — anyone at that unlocked machine can read it. Acceptable for showcase use.
- **Repo hygiene:** plaintext lives only in `content/fy25.private.json` (gitignored). The encrypted blob and all UI code are public. Pre-commit caution: never stage the private file; spec reviewer should verify `.gitignore` lands in the same commit that introduces the `content/` directory.

## Content Pipeline

1. Copy `legacy-fy25/content.json` → `content/fy25.private.json`.
2. **Copy pass (user-requested):** tighten language for concision while keeping the editorial voice — shorter slide bodies, punchier achievement lines; structure (7 slides: title, overview, by-the-numbers, shipped 01, shipped 02, what's coming, closing "313.") unchanged. Done as part of implementation; user reviews the rewritten copy in the unlocked deck, not in git.
3. Run `node scripts/fy25-encrypt.mjs` with the chosen password → `public/fy25.enc`.
4. Re-run only when content or password changes.

## Slide Set (style B — Native)

Portfolio system styling: Inter, system blue accent (`--accent`), frosted-white surfaces, existing tokens; JetBrains-mono-style kickers via `ui-monospace` stack. Dark mode via `html[data-theme="dark"]` token overrides — no separate dark layout.

1. **Title** — "What I shipped this year." + four hero stats (16 / 15 / 30+ / 313).
2. **Overview** — six-chapter breadth grid (Trip Board, Parking Board, DV Board, Docs, Auth, Masters, Tracking, Notifications).
3. **By the numbers** — stat grid with count-up animation (313 closed, 97 critical, 113 high, 86 bugs, 204 tasks, 15 modules, 30+ clients).
4. **Shipped 01** — tiers 1–2 achievement cards.
5. **Shipped 02** — tiers 3–4 achievement cards.
6. **What's coming** — FY27 bets (Folio RAG bot, AI Messages, …).
7. **Closing** — "313." full-bleed.

## Mobile Compatibility (explicit requirement)

- Unlock sheet and viewer sized with `100dvh` + `env(safe-area-inset-*)`; no fixed 16:9 on phone — slides reflow vertically within one screen each.
- Touch: horizontal swipe with threshold; edge tap-zones as fallback; no hover-dependent affordances.
- iOS Safari specifics (lessons from recent commits): avoid `backdrop-filter` on animated elements and complex animated `border-radius`; test the unlock input does not trigger unwanted zoom (font-size ≥16px on inputs).
- Password managers/autofill: field gets `autocomplete="off"`; visual viewport shift from the iOS keyboard must not hide the Unlock button (align content to top when keyboard opens, or rely on `interactive-widget` behavior — verify on device).
- Verify on real iPhone Safari before deploy (same bar as the recent phone-face fixes).

## Accessibility

- Dialog: `role="dialog"`, `aria-modal`, labelled by its title; focus trapped while open; Esc closes; focus returns to invoker.
- Deck: controls are real `<button>`s; counter updates via `aria-live="polite"`; slides keyboard-navigable.
- `prefers-reduced-motion`: no count-up, no crossfade (instant swap), no shake (border flash instead).

## Testing

- **Crypto round-trip:** `node --test` test file for `fy25-encrypt.mjs`'s core (encrypt → decrypt with WebCrypto, wrong-password rejection). No new dependencies.
- **Manual checklist:** wrong-password shake (both faces); unlock opens deck; refresh keeps unlock (sessionStorage); new tab re-prompts; dark mode deck; phone swipe + tap-zones; reduced-motion; `?fy25=1`; view-source and dist grep show no client names; `git status` never shows the private file.
- Existing Playwright-style harness exists only in the FY26 repo, not here — manual checklist is the accepted bar, consistent with the rest of the portfolio.

## Build & Deploy

Unchanged: `vite build` → `dist/`, manual Hostinger upload. `public/fy25.enc` flows through automatically. The encrypt script is a manual, occasional step.

## Open Items

- Password value: chosen by Vaibhav at encrypt time (never shared in chat or committed).
- Final concise copy: drafted during implementation, reviewed by Vaibhav in the running deck.
