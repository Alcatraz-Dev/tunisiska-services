---
name: pandaos-video
description: "Create a real rendered video (MP4) with HyperFrames: an animated intro, logo sting, product reel or kinetic-type piece, a product launch or promo video of the user's app ('a 30 second video of my app'), an explainer, a captioned clip, or any other video deliverable built from the user's repo, a URL, a brief, or footage. Use for any request to make, edit, preview, or render a video file, INCLUDING when the user names a HyperFrames workflow or skill directly (pr-to-video, product-launch-video, faceless-explainer, music-to-video, talking-head-recut, embedded-captions, motion-graphics, general-video): these are installed on demand by this flow, never listed as PandaOS skills, so never report them as unavailable. NOT for a 'Look what I made' video of an app the user built with PandaOS (always pandaos-design-motion's look-what-i-made template, never built here), and NOT for screen recordings (use the product demo flow)."
user-invocable: true
disable-model-invocation: false
source: pandaos
---

# Create a Video (HyperFrames)

You produce a rendered video file with **HyperFrames**, an open-source framework that
renders video from HTML compositions via its CLI (`npx hyperframes ...`). PandaOS does
not bundle HyperFrames; this skill bootstraps it, then hands off to the HyperFrames
skill set, which the CLI installs and keeps fresh on this machine.

## Boundary: which flow owns the request

- A "Look what I made" video of an app the user built with PandaOS: use
  `pandaos-design-motion`, from its template only.
- A screen recording of the user driving their app: use the product demo flow.
- Everything else that moves: a short animated intro, logo sting, product reel or
  kinetic-type piece, and everything that ends in a delivered video file (a promo or
  launch video of their app or site, an explainer, a music-driven piece, captions on
  footage): this skill. The Design home calls this Motion.

## One question in chat, then build: never interview

There is exactly one question in this flow, asked in a normal chat message, and only when
the user has not yet said what the video is about (for example when they clicked Motion
in the Design app, which starts the chat with a directive and no description):

> What kind of video would you like to create?
>
> Tip: for a better result, say what it is about, who it is for, a rough length, the
> format (16:9, vertical or square), voiceover or music, and anything it must show or say.

Send that as plain text and stop; do not run the preflight or any tool before they
answer. Their reply, whatever its length, is the complete brief. When the request
already says what the video is about, skip the question and start.

- **No forms, no option cards, no follow-up questions.** Never render a questionnaire,
  a `generative_ui` form, option cards or a list of choices for type, length, format,
  tone, audio or audience, even though the PandaOS instructions favor forms for
  multi-field input, and never ask a second question.
- **The HyperFrames intent layer runs autonomously.** The entry skill's intent
  interview (`references/intent-interview.md`) treats "just build it" / "don't ask" as a
  signal that locks `flow: automation` and `storyboard: no`. The user's brief carries
  that signal: skip the triage question, run the pitch round internally (pick one
  concept, don't present five), answer every must-have yourself, and skip the
  nice-to-have offer. Each field you decide becomes a default with a receipt.
- **Defaults when the brief is silent:** 16:9 at 1920x1080; about 30 seconds for a
  promo or launch video, 45 to 90 seconds for an explainer; voiceover for explainers and
  tutorials, music with on-screen text for promos and launches; a confident, modern tone;
  the user's own product, brand colors and fonts from their repo when the video is about
  their app. Vertical (1080x1920) only when they mention vertical, Reels, TikTok or
  Shorts; square only when asked.
- **Say what you chose, once.** Before building, post one short line naming the
  defaults you filled in ("Going with 16:9, about 30s, music and on-screen text, no
  voiceover."), then build. Write them into `BRIEF.md` under the inferred group so the
  workflow never asks again. The user corrects anything afterwards from the editor.

## Step 1: Preflight (before promising anything)

Run both checks in one Bash call:

```bash
node -v; ffmpeg -version 2>/dev/null | head -1 || echo FFMPEG_MISSING
```

- Node must be version 22 or newer. If older or missing, tell the user HyperFrames
  needs Node 22+ and stop; do not attempt workarounds.
- If FFmpeg is missing, tell the user rendering needs it and give the one-line install
  for their platform (macOS: `brew install ffmpeg`). Authoring and preview can proceed;
  the final render cannot.

## Step 2: Ensure the HyperFrames skills are installed and fresh

```bash
npx hyperframes skills check || npx hyperframes skills update product-launch-video
```

- `skills update <workflow>` refreshes the core set (`hyperframes`, `hyperframes-*`,
  `media-use`) and installs the named workflow. Substitute the workflow that matches
  the request if it is not a product launch video (the entry skill's routing table
  names them; `general-video` is the fallback).
- Offline or rate-limited checks degrade gracefully upstream; a hard failure here is a
  visible tool failure, so report it instead of continuing from memory.

## Step 3: Read the entry point and follow it

The freshly installed skills are NOT in this session's skill listing. Read them from
disk and follow them exactly as if they were loaded:

```bash
cat ~/.Codex/skills/hyperframes/SKILL.md
```

That file is the mandatory entry point: it routes to the owning workflow (a request to
market or showcase the user's app or site routes to `product-launch-video`), runs the
intent interview when needed (in PandaOS, in its autonomous mode: see "Build from the
user's description" above, so no question reaches the user), and names the domain
skills to read next. Workflow skills that open by checking for a brief read the
`BRIEF.md` you wrote and must not re-ask. Read each
referenced skill or reference file from `~/.Codex/skills/<name>/` the same way. If
this session's Skill tool DOES already list `hyperframes`, invoke it instead of
reading the file.

## PandaOS conventions (apply on top of the upstream workflow)

- **Scaffold location:** create the video project at `<project>/videos/<slug>/` inside
  the user's project, one directory per video. Run all HyperFrames commands from that
  directory. The scaffold pins `hyperframes@<version>` in its package.json; leave the
  pin alone except through `npx hyperframes@latest upgrade --project .` as the entry
  skill describes.
- **Capturing the user's app:** if the workflow captures or references the running
  app, use the registered dev server (query `devserver_list`, start it on its
  configured port if needed) rather than guessing a URL.
- **Preview in the PandaOS video editor, never HyperFrames Studio.** As soon as the
  project folder has an `index.html`, call
  `design_open({ type: "video", projectDir: "<absolute path to videos/<slug>>" })`. It
  opens the video in the Design app's video editor: preview with sound, the Studio-style
  timeline and scene list, click-to-select, lint findings on their clips, timeline
  edits and MP4 render. Do NOT run `npx hyperframes preview`, and do not open a Studio
  URL in the browser; the upstream workflow's "preview in Studio" steps map to this
  call. Call it once; the editor reloads by itself every time you change a file, so
  keep editing files rather than re-opening.
- **Requests from the editor:** the user can select an element or clip and describe a
  change. It arrives in chat as an "Edit video" Design Action naming the design id, the
  video folder, the playhead, and the selected element (`data-hf-id`, its file) or
  clip. "Fix video findings" lists lint or check findings to fix. Edit the named file,
  keep existing `data-hf-id` attributes, and run `npx hyperframes check` afterwards.
  The user may also have moved, trimmed or deleted clips on the timeline: those edits
  are already in `index.html`, so read the file before changing timing.
- **Render and deliver:** the user can render from the editor's Export button. When
  you render yourself, use `npx hyperframes render --quality delivery --output
  renders/<slug>.mp4` (`--quality draft` for iteration), then give the absolute path.
- **Git hygiene:** the scaffold contains its own `node_modules/` and render output. If
  the user's project is a git repo and `videos/` is not ignored, add
  `videos/*/node_modules/` and `videos/*/*.mp4` to `.gitignore` (create it if absent)
  before the first install, and say so.
