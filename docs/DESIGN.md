# Tarvus Design System

> Single source of truth for the unified Tarvus landing + Tavus onboarding app.
> When a pattern isn't specified here, refer to [tavus.io](https://www.tavus.io) as the fallback.

---

## Vibe

Retro-futuristic Y2K / Windows 98 revival on a dark canvas. High contrast, layered typography, warm glow effects, chrome bevels, subtle continuous motion (wind, breathing glow). The landing page is a "desktop-in-a-browser" metaphor — the onboarding flow lives inside a beveled window, so it should feel like a program running on that same OS.

---

## 1. Foundations

### Color tokens

| Token | Value | Usage |
|---|---|---|
| `--ink-0` | `#050505` | Page background |
| `--ink-1` | `#08080c` | Input / inset panel background |
| `--ink-2` | `#0c0c0c` | Window body background |
| `--ink-3` | `#12121a` | Reduced-motion fallback poster |
| `--fg-0` | `#f4f4f8` | Primary text (light, never pure white) |
| `--fg-1` | `#e8e8f0` | Secondary text / captions |
| `--fg-2` | `#9ea8ff` | Accent / links / CTA / active state |
| `--fg-3` | `#c4cbff` | Accent hover |
| `--chrome-hi` | `#c0c0c0` | Bevel top/left highlight |
| `--chrome-mid` | `#606060` | Primary border |
| `--chrome-lo` | `#2a2a2a` | Bevel bottom/right shadow |
| `--chrome-inner-hi` | `#dfdfdf` | Inner bevel highlight |
| `--chrome-inner-lo` | `#404040` | Inner bevel shadow |
| `--title-grad` | `linear-gradient(90deg, #000080, #1084d0)` | Title bar gradient |
| `--warn` | `#f00` | Minesweeper mines, error text |

### Warm-glow palette (headline animation)

| Stop | Baseline | Peak (50%) | Hover |
|---|---|---|---|
| White rim | `rgba(255,255,255,0.95)` | `rgba(255,255,255,1)` | `rgba(255,255,255,1)` |
| Amber halo | `rgba(255,238,208,0.7)` | `rgba(255,246,222,0.9)` | `rgba(255,248,228,1)` |
| Peachy halo | `rgba(255,196,148,0.45)` | `rgba(255,208,160,0.58)` | `rgba(255,210,168,0.68)` |
| Depth shadow | `0 4px 14px rgba(0,0,0,0.42)` | same | same |

### Spacing rhythm

Observed from the landing page (not a strict 8px grid): `2 / 3 / 4 / 6 / 8 / 10 / 22 / 24 / 28 px`. Pair values from the same row; don't mix scales.

### Windows 98 bevel recipe

**Raised (buttons, window frame, unrevealed cells)**
```css
border: 2px solid;
border-color: var(--chrome-hi) var(--chrome-lo) var(--chrome-lo) var(--chrome-hi);
box-shadow:
  inset 1px 1px 0 var(--chrome-inner-hi),
  inset -1px -1px 0 var(--chrome-inner-lo),
  0 2px 10px rgba(0, 0, 0, 0.3);
```

**Inset (inputs, revealed cells, pressed button)**
```css
border: 2px solid;
border-color: var(--chrome-lo) var(--chrome-hi) var(--chrome-hi) var(--chrome-lo);
box-shadow:
  inset 1px 1px 0 rgba(0, 0, 0, 0.4),
  inset -1px -1px 0 rgba(255, 255, 255, 0.1);
```

**Window (elevated)**
```css
border: 2px solid;
border-color: var(--chrome-hi) var(--chrome-lo) var(--chrome-lo) var(--chrome-hi);
box-shadow:
  inset 1px 1px 0 rgba(255, 255, 255, 0.1),
  inset -1px -1px 0 rgba(0, 0, 0, 0.4),
  0 20px 60px rgba(0, 0, 0, 0.6);
```

---

## 2. Typography

Four fonts, narrower roles than before. Each has one job. Don't mix them outside their role. **Inside the onboarding flow, everything heading-shaped uses the display serif** — no Barlow section labels leaking in.

| Font | Role | Sizes | Weight | Tracking | Notes |
|---|---|---|---|---|---|
| **Perfectlynineties** | Display serif — hero, H1, H2, section titles, card titles | `clamp(48px, 14vw, 140px)` for hero; 48 / 32 for H1/H2 | 400 (italic for emphasis) | `-0.04em` hero, `-0.02em` H1 | Self-hosted woff. **Any prominent heading in the app uses this.** |
| **Barlow Condensed** | Brand wordmark only (e.g., a `TAVUS` logo). **Not used for form labels anymore.** | 16 | 700 | `0.22em` | Always uppercase |
| **Press Start 2P** | Pixel UI — title-bar labels, button text, slider readouts, tiny status pills | `6 / 7 / 8 / 9 / 10 / 11 / 12` only | 400 | default | **Never for paragraphs or inputs.** Readability cliffs above 14px. |
| **Geist Sans** | Body text, inputs, long-form, placeholder copy | 13 / 14 / 15 / 16 | 400 / 500 | default | The "neutral reading voice." Quiet modern ballast against the louder retro fonts. |

### Hierarchy

```
Hero     Perfectlynineties  clamp(56, 14vw, 140) / 0.95 / -0.04em
H1       Perfectlynineties  clamp(40, 8vw, 72)  / 1.0  / -0.02em
H2       Perfectlynineties  32                  / 1.1  / -0.01em
Body     Geist Sans         15 / 1.5
Small    Geist Sans         13 / 1.5
Caption  Press Start 2P     9
Pixel-   Press Start 2P     7
tiny
```

> **No H3/Label row on purpose.** Form labels are a non-goal — see Labeling philosophy below.

### Labeling philosophy

Prefer well-written placeholder copy and a strong H1 over visible field labels. Forms on single-purpose screens do not need chrome-style labels above every input. When accessibility requires a label, use `sr-only` and tie it with `htmlFor`.

Step counters (`STEP 01 / 03`) and decorative subheadings are cut unless they carry information the user can't infer from the form. If the user can see the form, they know what step they're on.

### Custom font loading

```css
@font-face {
  font-family: 'Perfectlynineties';
  src: url('/fonts/perfectlynineties.woff') format('woff');
  font-weight: 400;
  font-style: normal;
  font-display: swap;
}
```

---

## 3. Motion

### Universal easing
```css
--ease: cubic-bezier(0.22, 1, 0.36, 1);
```
Snappy, natural ease-out. Used for all state toggles, drags, hovers, window animations.

### Duration scale
- `150ms` — hover color changes
- `250ms` — button press, small transitions
- `350ms` — card flip, window close
- `500ms` — window state change (default ↔ fullscreen ↔ minimized)

### Headline glow (`lifeGlow`)
```css
@keyframes lifeGlow {
  0%, 100% { /* baseline stops — see warm-glow palette */ }
  50% { /* peak stops */ }
}
/* 4.2s ease-in-out infinite, paused on :hover with peak stops + scale(1.03) */
```

### Landing background — FaultyTerminal

The landing page background is a **`FaultyTerminal`** WebGL preset (ported from reactbits.dev), rendered behind everything at `z-0`. Key tuning goals: **calm, color-tinted, bottom-concentrated, no mouse reaction.**

```tsx
<FaultyTerminal
  scale={1.9}
  digitSize={3.1}
  timeScale={0.018}
  scanlineIntensity={0.1}
  glitchAmount={0}
  flickerAmount={0.15}       /* subtle, not distracting */
  noiseAmp={0.15}
  chromaticAberration={0.004}
  dither={0.22}
  curvature={0.15}           /* CRT warp */
  tint="#c4cbff"             /* accent-tinted for colour presence */
  mouseReact={false}
  mouseStrength={0}
  brightness={1}
  lifeMotion={0}             /* no baseline motion — flicker alone */
  iconGateStrength={0.62}    /* push shape harder to bottom corners */
  iconGatePow={2.1}          /* sharper top fade-out */
/>
```

Shape is biased to the **bottom-left and bottom-right corners** via `iconGateStrength` / `iconGatePow` — the top of the viewport fades to empty ink. A top-down vignette overlay (`linear-gradient(180deg, #050505 0%, transparent 60%)`) reinforces that emptiness above the fold. Container bg is `#050505`, not navy.

### Landing headline — ASCII LIFE

The word `LIFE` in the hero is rendered as **animated ASCII art** via the `ASCIIText` component (reactbits port). Baseline render is a plane textured with a canvas-drawn word, re-asciified every frame.

- `asciiFontSize = 9`
- **Animated colour cycle**: time-based interpolation through `['#c4cbff', '#ffb6c1', '#9ea8ff', '#fff4a3']` on a ~10s cycle
- **Subtle breathing**: `scale = 1 + 0.015 * sin(t/1600)` — imperceptibly alive
- **No mouse reaction.** No hover tilt, no cursor-tracking warp. Click still launches the window (click is a deliberate CTA, not a hover effect).
- `mix-blend-mode: difference` is **removed** — colours read literally against the dark background
- Reduced-motion fallback: static `LIFE` text in Perfectlynineties with a soft accent glow; colour cycle disabled

### Landscape canvas (legacy, if used elsewhere)

Wind driven by `requestAnimationFrame`. Frequencies:
- Main wind: `sin(t * 0.78) * 8.8`
- Ripple: `sin(t * 0.55) * 2.1`
- Cloud drift: `sin(t * 0.055) * 5.2 + sin(t * 0.028) * 2.1`

Sampled on a 24px grid, bilinear interpolation. Respects `prefers-reduced-motion` by serving a static poster frame.

### Reduced motion

Every animated surface MUST define a `@media (prefers-reduced-motion: reduce)` fallback:
- Headline glow → static baseline stops, no hover scale
- Canvas breeze → still image
- Window state transitions → instant (no easing)
- Thumbnail CTA pulse → static glow

---

## 4. Components

### Window

The primary UI metaphor. Everything onboarding-related lives inside a window.

**States:**
- `default` — 640×300px, centered, middle of the page
- `is-fullscreen` — `calc(100vw - 48px) × calc(100vh - 48px)`, 24px margin
- `is-minimized` — `min(360px, 92vw) × 212px`, docked bottom
- `is-closed` — `scale(0.3) opacity(0) pointer-events:none`

**Anatomy:**
- `title-bar` — 28px tall, `--title-grad` bg, Press Start 2P 9px white label, three chrome control buttons (_, ◻, ✕) right-aligned
- `window-body` — `--ink-2` bg, flex column
- `resize-handle` — 18×18 bottom-right corner, chrome grip

### Button

Two levels. That's it.

**`.chrome-btn` — secondary (Win98 beige).** Title-bar controls, close/min/max, BACK buttons, sandbox tabs, anything that isn't the primary action on screen.
```
bg:            #c0c0c0 (beige chrome)
border:        raised 2-tone bevel
font:          Press Start 2P 9px
color:         #000
:hover         brightness(1.08)
:active        inset bevel (pressed)
:disabled      opacity 0.5
```

**`.chrome-btn-accent` — primary CTA (vibrant gradient).** Every NEXT / CREATE / BUILD YOURS / USE KEY / APPLY & RECONNECT button. Retro grounding via the 2-tone bezel, but punched up with a saturated indigo→periwinkle gradient and a subtle hover halo.
```css
background: linear-gradient(180deg, #8d9cff 0%, #5b6bff 55%, #4554e8 100%);
border-color: #b6c0ff #2a2f6b #2a2f6b #b6c0ff;  /* inverse 2-tone for retro */
color: #ffffff;
text-shadow: 0 1px 0 rgba(0, 0, 0, 0.35);
box-shadow:
  inset 1px 1px 0 rgba(255, 255, 255, 0.25),
  inset -1px -1px 0 rgba(0, 0, 0, 0.35),
  0 0 0 1px rgba(0, 0, 0, 0.4);

/* :hover */
filter: brightness(1.1) saturate(1.1);
box-shadow: ..., 0 0 18px rgba(139, 156, 255, 0.55);

/* :active — invert bevel, dim gradient */
border-color: #2a2f6b #b6c0ff #b6c0ff #2a2f6b;
filter: brightness(0.92);
```

`.chrome-btn-lg` is a size modifier that composes with either variant (32px height, 14px padding, 10px font).

The landing thumbnail CTA (`.thumb-cta`) uses the same gradient recipe so the primary-action colour reads as one continuous motif from landing → onboarding.

### Input / textarea

```
bg:          --ink-1
border:      inset bevel
padding:     8px 10px
font:        Geist Sans 15px
color:       --fg-0
caret:       --fg-2
:focus       inner glow: inset 0 0 0 1px var(--fg-2)
placeholder: --fg-1 at 0.4 opacity
```

**No visible label.** The placeholder carries the meaning. If a11y requires a label, render it `sr-only` and reference via `htmlFor`.

### Slider (auto-trait)

Horizontal range input:
- Track: 6px tall, inset bevel on `--ink-1`
- Fill (left of thumb): `--fg-2` at 0.3 opacity
- Thumb: 14×14 raised-bevel chrome square (not round)
- Value readout to the right: Press Start 2P 8px `--fg-2`
- Left/right edge labels: Barlow Condensed 10/0.22em uppercase `--fg-1`

### Card (replica, document, thumbnail)

Each card is a miniature window:
- Tiny title bar (20px tall) with Press Start 2P 8px label
- Raised bevel frame
- `--ink-2` body bg
- Selected state: `--fg-2` inner glow ring (not a color change)

### Tab bar (sandbox)

- Tabs laid out horizontally, Press Start 2P 10px labels
- Active tab: `--fg-2` 2px underline + brighter label color
- Inactive: `--fg-1` at 0.6 opacity
- Hover: brightness increase, no underline

### Error dialog (QuotaRecoveryPanel)

Full retro error-dialog treatment:
- Modal window frame
- Title bar: red-ish gradient (`linear-gradient(90deg, #800000, #c04040)`), Press Start 2P label "SYSTEM ERROR"
- Body: Press Start 2P 10px error text
- Beveled chrome "OK / RETRY" buttons at the bottom
- Optional input for API key override, same inset-bevel input style

### Thumbnail hero (default window body)

- Full-bleed character video (autoplay muted loop, 8-second rotation across 5 PALs)
- Top-left: 6×6 pulsing `--fg-2` dot + Press Start 2P 8px "LIVE" label
- Bottom-left: current PAL caption in Press Start 2P 8px `--fg-1`
- Bottom-center (persistent, glowing): beveled chrome CTA button "BUILD YOURS →", Press Start 2P 10px, pulsing `--fg-2` glow on the 4.2s cycle
- Whole surface is clickable → toggles window to fullscreen

---

## 5. Voice & microcopy

- Lowercase. Playful. Short.
- Good: `build your own`, `meet your AI human`, `pick a face`, `what's on your mind?`
- Bad: `Get Started`, `Build Your AI Human.`, `Please select an option`
- CTAs can be all-caps IF they're Press Start 2P and short enough: `BUILD YOURS →`, `LAUNCH →`, `APPLY`.
- Error text should feel winking, not apologetic: `quota's fried. paste a key →`

---

## 6. Gaps & fallbacks

If a pattern isn't in this document:
1. Look at the landing page's existing bevel / typography recipes and extrapolate.
2. If still unclear, reference [tavus.io](https://www.tavus.io) and translate their pattern into this palette + font stack.
3. Never introduce a new font, new color outside the token set, or new easing curve.
