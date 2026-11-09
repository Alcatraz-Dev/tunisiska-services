# Template kit: "Look what I made with PandaOS"

A launch video of the app the user built with PandaOS: their prompt, the build,
their app full screen, the PandaOS lockup. This file is a KIT, not a fixed cut.
You keep the fixed intro and outro, then compose the middle from the beat menu
based on what the user actually built. Two runs of this template should not look
identical, and duration is derived, never assumed.

Follow the pandaos-design-motion SKILL.md flow (beat sheet first, cinematic floor,
frame review); this kit adds the template's design system, fixed frames, beat
menu, and judgment rules on top. Where the two disagree, this kit wins for this
template (example: the visual world is the user's app, so skip the palette picker
and ignore SKILL.md's example looks).

## Hard rules

1. **Never screen-record and never screenshot the user's app.** Reconstruct it in
   HTML from the project's codebase and design tokens. That is the entire trick.
2. **The video is designed in the user's app's style, in its active mode.** Every
   color, the font, the corner radius, the borders, the shadows and the surface
   style come from the app (see "Design system"). An orange app makes an orange
   video; a dark app makes a dark video. Only the layout sizes, the motion grammar
   and the PandaOS mark are fixed. Do not run the palette picker or propose visual
   directions: the app already decided them.
3. **One stage, one manifest.** Beats are time ranges on a single timeline,
   separated by camera moves and sprite windows (`end` means disappear).
4. **The PandaOS mark is fixed, and it is supplied below.** Copy the outro SVG
   verbatim. Never redraw the panda, never approximate it with text or generic
   shapes, never swap in another logo file. A wrong mark makes the whole video
   unusable, and it is the one element every viewer recognizes.
5. **No em or en dashes in any visible copy.**
6. **Ask the user nothing.** No intake, no direction picker, no confirmation step, no
   `generative_ui` question: this kit overrides SKILL.md's intake and depth gate
   entirely. Every open choice has a rule below (hero screen, middle beats, prompt
   line), so read the project, decide, and build. Say what you picked in one line
   after the piece is on screen; the user redirects from there if they want.

## Design system: the user's app, never an example

The look of this video is NOT a house style. There is no reference palette, no
reference background and no reference card to copy. Everything the viewer sees
(background, colors, surfaces, type, radius, borders, shadows, icons, density)
is taken from the app the user built, in its active mode, so the whole video reads
as THEIR product with a PandaOS sign-off at the end.

**Ignore every example look**, including the ones in SKILL.md: no dark cinematic
gradient, no glow blobs, no halo, no vignette or grain, no tinted radial corners,
no grid overlay, no frosted glass, unless the user's app itself has that
treatment. SKILL.md's cinematic-floor rules 1 (ambient background elements) and
6 (a glow light source) do not apply to this template; if the tool warns that no
ambient background sprite spans the piece, ignore it. If a frame would look the
same for any app, it is wrong.

### Pick the active mode

When the app has more than one mode or theme (light and dark, or named themes like
`data-theme="sunset"`), the video uses the one that is active right now, resolved
in this order. Stop at the first step that gives an answer:

1. **The running app.** If the dev server is up (`devserver_list`) or the app is
   open in the PandaOS browser, read the live page with `browser_evaluate`:
   `document.documentElement.className`, `document.documentElement.dataset.theme`
   (and `dataset.mode`, `style.colorScheme`), and
   `getComputedStyle(document.body).backgroundColor`. That is the mode the user
   actually sees. This is reading values, not screenshotting, so hard rule 1
   still holds.
2. **A fixed choice in code.** A hardcoded `class="dark"` or `data-theme` on
   `<html>`, `forcedTheme`, or a `defaultTheme` other than `"system"` in the theme
   provider (next-themes, a custom ThemeProvider, a Zustand/Redux theme store's
   initial value).
3. **The app follows the system** (`defaultTheme: "system"`, `enableSystem`, or only
   a `prefers-color-scheme` media query): use the OS's current appearance. macOS:
   `defaults read -g AppleInterfaceStyle` prints `Dark` in dark mode and errors in
   light mode. Windows: `reg query HKCU\Software\Microsoft\Windows\CurrentVersion\Themes\Personalize /v AppsUseLightTheme`
   (`0x0` is dark). Linux: `gsettings get org.gnome.desktop.interface color-scheme`.
4. **Nothing decides it:** the mode the base `:root` block describes.

Then read the token block for THAT mode only (`.dark { ... }`,
`[data-theme="x"] { ... }`, the tailwind `dark:` values, or the
`@media (prefers-color-scheme: dark)` block). Never mix tokens across modes.

### Copy the app's design

Read the app's tokens and its real components (the page shell, a card, a button,
an input, the nav), then declare its values as CSS custom properties at the top of
the stage HTML and build every element off them, never off a literal color:

| Variable | Take it from the app (active mode) |
| --- | --- |
| `--paper` | the page background exactly as the app paints it: a flat color, the app's own gradient, or its pattern. A saturated orange page makes an orange ground |
| `--accent` | primary / brand token: the button and link color. An orange app's orange lands here |
| `--accent-2` | a second brand or chart color if the app has one; else a lighter or darker step of `--accent` |
| `--success` | the app's success token; else a green that sits in its palette |
| `--ink`, `--headline` | foreground token, and the heading color when it differs |
| `--body`, `--muted` | body text and muted-foreground tokens |
| `--line` | border token |
| `--surface` | the app's card / panel background |
| `--surface-edge` | the app's card border (or `transparent` if its cards have none) |
| `--radius` | the app's card radius, scaled about 1.5x for 1080p |
| `--radius-control` | the app's button / input radius, same scale |
| `--shadow` | the app's card shadow at the same depth; `none` if its cards are flat |
| `--font`, `--font-heading`, `--font-mono` | the app's body, heading and mono families |

**Every surface in the video is one of the app's own components.** The prompt
pill is styled like the app's input or search field; the PandaOS desktop panels
in I2, the tweak panel and the `pandaos.ai` pill are styled like the app's cards
and buttons (same fill, border, radius, shadow, padding rhythm). Copy the idiom,
not only the hex codes: a brutalist app with hard black borders gets hard black
borders, a soft rounded app gets soft rounded cards, a frosted app gets frosted
glass. Icons come from the app's icon set when it has one.

**The ground is `--paper` and nothing else**: no decorative shape, blob, tint or
grid on top of it that the app does not have. Continuity between beats comes from
the camera and from content carrying across boundaries (the prompt pill becoming
chat message one), not from a backdrop.

**Type.** The app's families (`--font-heading` for display, `--font` for body,
`--font-mono` only inside terminal and code surfaces) with the app's weights and
tracking. Only the SIZES are the video's: Display 120px or larger, H2 about 80px,
Body about 28px, Labels at least 18px at 1080p, so the app's type reads at video
scale. Tabular nums on anything that counts.

**Fonts must load for the MP4.** Use the app's family when it is a system font or
ships as a local font file you can reference as a same-origin or `data:`
`@font-face`; for a Google or `next/font` family, add an `@font-face` pointing at a
CORS-enabled source. If it cannot load, use the closest system family and say so
in the one-line summary.

Rules:

- **No PandaOS color leaks.** No color, surface or effect from any example
  survives: an orange app shows no blue anywhere (caret, labels, shadows,
  wordmark). The fixed mark's ink and chin are the one exception.
- **Contrast holds.** Every text role must stay at 4.5:1 or better on `--paper`
  and on `--surface`. If an app token fails that, adjust that text role, never
  the ground.
- **Fallback.** Only when the repo has no readable styling at all (an API, a CLI,
  unstyled HTML): use a plain neutral system (white or near-black ground matching
  the terminal theme, one accent from the project's logo or README badge if any,
  system sans) and say so in the one-line summary.

The HERO reconstruction uses the same values, so the camera push from the preview
panel into the full-bleed app is one continuous surface instead of a jump cut
between two palettes.

**CAPTURE WARNING:** `backdrop-filter` and heavy blur do not survive the current
MP4 export path (they render correctly in the canvas and in review frames). If the
app uses frosted surfaces, back them with a solid-enough fill so they still read
when the blur drops, and never put load-bearing content in a blur-only effect.

**Motion grammar.** The house ease is `cubic-bezier(.22,1,.36,1)`: a hard fast
decel that arrives with authority and settles. Closest manifest easings: `outQuint`
for arrivals, `outExpo` for dramatic ones, and for hero pops either an effect
(`pop-in`, `overshoot-settle`) tuned through its params, or `spring` with
`springBounce` 0.2 to 0.3 on a sprite WITHOUT an effect. Motion blur is off for this
template (`motionBlur: 0` is applied for you): blur on a
moving surface softens the app's crisp edges and flickers any frosted surface. Leave it off. Content reveals rise 26px over about 0.35s, staggered 0.05s.
Exits accelerate (`inCubic`) over about 0.22s. Banned:
elastic or full bounce (`springBounce` above 0.5), idle wobble, one entrance
pattern reused across beats, decorative background shapes. Keep a beat alive with
its content and the camera, never with ambient backdrop motion.

### Pacing: fast, punchy cuts

This template is a brag reel, so it runs on energy. SKILL.md's hold-time and
"slow is cinematic" guidance does not apply here; these numbers win.

- **A transition is 0.35 to 0.5s, never a whole beat.** The camera lerps
  between keyframes, linearly by default, and its `t` is a fraction of the WHOLE
  piece. One camera keyframe per beat therefore becomes a slow pan that eats the
  entire beat: that is the sluggish feel to avoid. Author every boundary as a
  hold then a snap: a keyframe at the boundary repeating the current pose, and a
  second one 0.4s later (`t = (boundary + 0.4) / duration`) with the new pose
  and `ease: "outExpo"` (or `outQuint` for a softer push). Between snaps the
  camera holds; only HERO gets a drift.
- **Beats overlap, they never queue.** The next beat's first entrance starts
  0.1 to 0.15s before the previous beat's exit finishes. No gap where one beat
  has left and the next has not arrived.
- **Something new lands at least every 0.7s** outside HERO: a row, a panel, a
  line, a recolor. If a beat has less to show than its window, shorten the
  beat. Do not stretch it.
- **Entrances 0.3 to 0.4s, exits 0.2 to 0.25s, crossfades 0.25s at most.** Keep
  one slower move per piece for contrast (the HERO push or the facet settle),
  and nothing else above 0.6s.
- **Staggers stay tight:** 0.04 to 0.06s between items, and a whole sequence
  under 0.4s.
- **Typing runs at about 30 characters per second.** Size the typewriter window
  so `text.length / 30` seconds fall inside `settleAt`, then hold about 0.6s
  once the text is complete, so it can be read before Enter.

## Fixed intro (always present, about 5s total)

### Beat I1: the prompt (about 2.5s, set by the prompt's length)

Empty ground, one prompt field centered, styled as the app's own input. The user's ask types
itself inside it, then Enter compresses the pill and springs.

```html
<div data-eid="prompt-pill" style="/* the app's input: --surface, --surface-edge, --radius-control, centered, padding 28px 44px */">
  <span data-eid="prompt-text" style="font-size:34px;color:var(--headline)"></span>
  <span data-eid="prompt-caret" style="/* 2px x 38px bar, var(--accent) */"></span>
</div>
```

- `prompt-pill`: `pop-in` effect with `params: { overshoot: 1.05 }`, starts 0.15s in.
  Never add `easing: "spring"` to an effect sprite; the effect already carries its settle.
- `prompt-text`: the sprite's `typewriter: { text, caret: false }` field types the
  SLOT text (see slots). Author the span empty; the runtime writes the text.
  `caret: false` is required: the typewriter draws its own caret glyph by default,
  and together with `prompt-caret` that shows two cursors. The template forces it
  off for you, so never set it back to `true`.
- `prompt-caret`: the ONLY cursor, `glow-pulse` for a deterministic blink. Place
  it directly after `prompt-text` with no gap (`margin-left: 3px`, and no flex
  `gap` on the pill), so it sits against the last typed letter.
- At the beat's end, keyframe the pill `scale 1 -> 0.96 -> 1.04` over about 0.2s
  (the Enter press) and carry that velocity into I2. Trim the prompt slot to one
  line (about 60 characters at most) so typing stays under 2s.

The prompt must read as a real, specific, slightly personal ask. Generic reads as
a demo; specific reads as a person.

### Beat I2: the desktop assembles (about 2.5s)

The PandaOS window builds itself outward from the pill: sidebar, chat column, file
tree, terminal, preview pane, each panel a plain reconstruction (one of the app's cards with a
Label) arriving on a staggered waterfall (heaviest first, 0.05s stagger, each
panel settling in about 0.35s, `rise-settle` or `overshoot-settle`, springs low),
so the whole window stands within about 0.6s. The typed prompt now sits in
the chat column as message one. Camera snaps back slightly (0.4s, `outExpo`) to
hold the full window, then the next beat takes over. This is the "not a browser tab, a whole desktop" beat, made by motion
instead of a claim.

## Fixed outro (always present, about 3s)

### Beat O1: the lockup

Everything on stage converges inward (exits accelerate toward center), the
PandaOS mark assembles facet by facet, the wordmark fades up beneath it, then
the line "The AI-native desktop", then a `pandaos.ai` pill styled as the app's button (mono, 26px).

**The outro stays in the app's style.** The lockup sits on the same app ground as
every other beat, and the line, the pill and the wordmark use the app's
variables. Only the mark's own polygons are fixed, and they are dark ink, so:

- **Light ground** (`--paper` lightness above about 60%): the mark sits directly
  on the ground.
- **Dark ground:** the mark sits on a `lockup-plate`, a light rounded tile behind
  it (about 380px square, `border-radius: calc(var(--radius) * 1.5)`, fill
  `color-mix(in srgb, var(--ink) 92%, white)` so it takes the app's own light
  foreground, `box-shadow: var(--shadow)`). The plate `pop-in`s just before the
  first facet and is held to the last frame. Never recolor the polygons to make
  them read on dark; the plate is how the mark stays legible.

The final frame is a poster:
mark held clean, camera easing out to stillness, nothing moving in the last
0.5s except a barely-breathing glow.

**The mark is FIXED. Use this SVG verbatim, never redraw it, never substitute
another logo.** It is the geometric panda from the reference lockup: six flat
polygons, ink `#1c1c1c`, light-blue chin `#74b3bd`, on the app ground or the
`lockup-plate` (the mark has no background of its own):

```html
<div data-eid="lockup-mark" style="position:absolute;left:50%;top:24%;transform:translateX(-50%);width:300px">
  <svg viewBox="18 8 292 262" style="width:100%;height:auto">
    <polygon data-eid="mark-ear-l" points="35,59 52,32 84,22 116,45 71,112 37,83" fill="#1c1c1c" style="transform-box:fill-box;transform-origin:center"/>
    <polygon data-eid="mark-ear-r" points="249,20 282,25 293,40 293,88 271,110 266,106 218,45" fill="#1c1c1c" style="transform-box:fill-box;transform-origin:center"/>
    <polygon data-eid="mark-patch-l" points="68,146 112,105 130,106 148,124 149,138 111,207 107,211 69,163" fill="#1c1c1c" style="transform-box:fill-box;transform-origin:center"/>
    <polygon data-eid="mark-patch-r" points="191,124 207,107 227,105 272,146 271,163 231,212 190,138" fill="#1c1c1c" style="transform-box:fill-box;transform-origin:center"/>
    <polygon data-eid="mark-nose" points="144,183 192,183 199,197 176,224 155,220 135,193" fill="#1c1c1c" style="transform-box:fill-box;transform-origin:center"/>
    <polygon data-eid="mark-chin" points="157,238 179,238 171,256 166,259" fill="#74b3bd" style="transform-box:fill-box;transform-origin:center"/>
  </svg>
</div>
```

The wordmark under it is the word `PandaOS` in `var(--font-heading)` at Display size with a gradient
built from the app's colors clipped to text
(`linear-gradient(108deg, var(--headline) 0%, var(--accent) 50%, var(--headline) 100%)`,
`background-clip:text; color:transparent`), then "The AI-native desktop" in
`var(--muted)` at 34px, then the `pandaos.ai` pill in `var(--font-mono)`.

**Facet assembly (the reference choreography, translated to the manifest):**
each polygon flies in from its own offset and settles with a slight overshoot,
staggered about 0.05s apart, patches first, then ears, nose, chin, starting as
the converge exits finish (about 0.3s into O1). Per facet:
keyframes from `{opacity:0, x:dx, y:dy, scale:0.1}` to a `scale:1.08` overshoot
at `t:0.7` and `scale:1` at `t:1`, ease `outCubic`, settling over about 0.45s. The
facet's sprite window still runs to the last frame (a sprite past its `end` is
hidden), so put the settle in the keyframe times, not in a short window. Offsets
(x, y in px, scaled to the 300px mark): patch-l `(56,20)`, patch-r `(-67,20)`,
ear-l `(89,112)`, ear-r `(-91,113)`, nose `(-4,-25)`, chin `(-4,-70)`. The
`transform-box:fill-box` on each polygon is REQUIRED, without it SVG children
scale around the canvas origin and the facets fly wrong. After assembly the
whole `lockup-mark` gets one `breathing-float`; wordmark `rise-settle` at
assembly end, line 0.15s later, pill `pop-in` 0.15s after that. The full lockup
stands about 1.8s into O1; the remaining time is the poster hold.

## Middle beat menu (compose per build)

Mandatory: **HERO**. Everything else is optional. Pick 1 to 4 optional beats for
a typical build; more only when the app genuinely has that much to show.

| Beat | Duration | Use when | Skip when |
| --- | --- | --- | --- |
| BUILD (files tick in) | 2-2.5s | The repo has recognizable structure worth flashing | Tiny single-file builds |
| RUN (dev server boots) | 1.5-2s | A dev server is part of the story | Static or non-web builds |
| PAINT (preview resolves) | 1.5-2s | You want a breath before the hero | The hero lands harder cold |
| HERO (app full-bleed) | 3.5-5s | ALWAYS | never |
| TWEAK (recolor live) | 2.5-3.5s | The app has a clear accent token to swap | No obvious visual variable |
| MORE (their other surfaces) | 1.1s each | The user built several screens or surfaces | Only one screen exists |

- **BUILD:** camera snaps into the file-tree panel from I2. Real paths from the
  user's repo stack in, each ticking (`mask-wipe` per row, 0.05s stagger, a
  `var(--success)` check per landed row). Read one or two real tool calls into the
  chat column. Nothing is explained; the viewer infers "it is actually writing
  the thing".
- **RUN:** the terminal panel takes the frame. The project's real dev command
  types in `var(--font-mono)` (typewriter, else mask-wipe), two or three compile lines
  appear staggered, the localhost line lands and holds in `var(--accent)`.
  Connective tissue, keep it short.
- **PAINT:** the preview panel wipes in over the terminal and the reconstruction
  paints: first grey wireframe blocks (`rgba(17,24,39,.055)` fills), then real
  content cross-fading in. Builds the want that carries the cut to HERO.
- **HERO, the swap point:** the camera pushes through the preview panel and the
  user's app becomes the whole frame in about 0.5s (`outExpo`), the one push
  allowed to feel heavy. No PandaOS chrome. Reconstruct the app's
  hero screen in HTML using the app's OWN tokens (see procedure), slightly larger
  than the frame, with a Ken-Burns drift (scale 1.0 to 1.05, `inOutSine`)
  so it breathes. Longest hold in the piece, but still a beat, not a pause: land
  its key content (headline, primary card, CTA) in a quick 0.05s stagger right
  after the push, then hold about 2 to 3s.
- **TWEAK:** pull back just enough for a slim tweak panel (one of the app's cards) at the
  right. A swatch row appears; on the "click" (pop-in on the chosen swatch) the
  reconstruction's accent recolors via a keyframed `color`/background change on
  its accent elements. Proves it is a tool, not a magic trick.
- **MORE:** rapid hits of the user's OTHER screens or surfaces, each about 1.1s,
  each entering on a different vector (fan, wipe, count-up, snap-to-grid) and
  exiting with carried velocity. Every hit must have its own entrance grammar;
  a repeated pattern here is the template tell.

## Slots (fill from the project, never invent)

| Slot | Source |
| --- | --- |
| Prompt text | The chat's first real user prompt for this project, lightly trimmed; else write one plausible line from what the app is ("Build me a habit tracker with streaks"). Never ask |
| App name | package.json name, the repo's README title, or the visible app header |
| File paths (BUILD) | Real paths, pick 4 to 7 recognizable ones (pages, components, styles) |
| Dev command + port (RUN) | The registered dev server (devserver_list); never guess |
| Hero screen + tokens | The reconstruction procedure below |
| Active mode + design tokens | Resolved per "Pick the active mode", mapped per "Map the app's tokens" |
| Accent color (TWEAK) | The app's real accent token |
| Extra screens (MORE) | Other routes/surfaces the repo actually contains |

## Reconstruction procedure (the codebase IS the footage)

Time-boxed, roughly 6 file reads, no installs, no dev server required:

1. `design_system_import({ source: { kind: "codebase" } })` first; pass the
   returned pack to your own reading, not to design_create (the pack styles the
   reconstruction and the whole video's look; only the video type sizes, the
   motion grammar and the PandaOS mark stay fixed).
2. Read the app's tokens (tailwind config, globals/index css, `:root` blocks) and
   one or two real UI files carrying the chrome: the page shell, a card, the nav.
   Resolve the active mode first ("Pick the active mode"), then fill the `:root` block from that mode's tokens per "Map the app's tokens" before building.
3. **Pick the hero screen yourself:** the screen a first-time user lands on (the
   root or index route, or the app's main view after sign-in when the root is only a
   login). If that screen is thin (a redirect, a splash, an empty state), take the
   route with the richest real UI instead. Other qualifying screens go to MORE.
   Rebuild ONE hero screen as static HTML inside the stage: same palette, same
   radius, same border weight, same shadow depth, same density. Copy the idiom,
   not only the hex codes. Real copy from the app, never lorem.
4. Stamp `data-eid` on every element of the reconstruction that will move
   (hero-root, hero-nav, hero-h1, hero-cta, accent elements for TWEAK).
5. If the repo yields nothing readable (no UI, an API), the hero becomes the
   next-best artifact: rendered README, an endpoint table, the terminal output.
   Say so in one line before building.

## Composing the piece

1. Inventory the build (repo read above). List which optional beats qualify, then
   take every qualifying beat in menu order, up to four. That is the decision; do
   not offer the list to the user.
2. Duration = 5s intro + sum of chosen beats + 3s outro. A one-page build lands
   near 13 to 16s; a multi-surface app with MORE can pass 25s. Never pad a small
   build to feel bigger; never cram a big one into 15s. When in doubt, cut: a
   shorter reel that moves beats a longer one that waits.
3. Write the beat sheet (SKILL.md format) with the chosen beats, one camera
   snap per boundary (hold keyframe, then the new pose 0.4s later, per
   "Pacing"). Annotate each boundary with its transition length; any over 0.5s
   (other than the HERO push) is a defect to fix on paper.
4. Build the stage HTML (all beats' DOM present from the start, visibility owned
   by sprite windows), then `design_animate` with `templateId: "look-what-i-made"`
   inside `motion`. The tool result then reports any fixed frame that is missing
   or misplaced (`Template check: …`): the prompt pill and typed ask, a `hero-*`
   reconstruction, and the six
   `mark-*` facets plus `lockup-mark` held to the final frame.
5. Judge the review frames against the standard cinematic floor PLUS: the hero
   frame must be readable as the user's actual app; the ground in every beat
   before the outro reads as the same product as the hero (same mode, same
   background, same accent), so the HERO push shows no palette jump; no two beats
   share an entrance pattern; no review frame catches the camera mid-pan in a
   long lerp or two beats waiting on each other (use `design_screenshot` at a
   boundary +0.3s to confirm the snap has landed); the prompt text is fully
   readable before Enter; the
   lockup frame stands alone as a poster and the mark reads clearly (on its plate for a dark ground); no decorative shape
   behind the content in any beat.

## Engine notes (version one)

Built for what the runtime executes today: named effects, keyframes, camera
keyframes, counters, typewriter. No scene cuts, no rack-focus, no zoom-through
(approximate with a camera push plus a crossfade on sprite windows). When scene
beats and element-targeted cameras land, this kit's beat boundaries upgrade to
real transitions; the beat structure above is written so that swap changes the
manifest, not the storyboard.
