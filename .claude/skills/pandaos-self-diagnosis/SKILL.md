---
name: pandaos-self-diagnosis
description: "Diagnose a problem in the PandaOS app itself (crashes, freezes, broken panels, updates, engines, sign-in) from its logs and install facts, then decide whether it warrants a bug report. Load before filing a PandaOS bug with feedback_submit. NEVER for errors in the user's own project, code, builds or dev servers."
allowed-tools: Read, Grep, Glob, mcp__pandactions__diagnostics_info
argument-hint: "[what went wrong in PandaOS]"
user-invocable: true
source: pandaos
---

You are diagnosing a problem in **PandaOS itself**: the desktop app the user is running you inside. Your job is a diagnosis first. A bug report is one possible conclusion of that diagnosis, never a step you owe.

## Step 0: Is this PandaOS?

Decide this before anything else, and say which way you decided.

PandaOS problems include: the app crashing, freezing or going blank; a panel, tab, button or setting in PandaOS misbehaving; updates failing; an engine (Claude, Codex, OpenCode) not starting or dropping a turn; sign-in or model lists failing; skills, agents, automations, integrations or MCP tools built into PandaOS not working.

NOT PandaOS: the user's code failing to compile, their tests failing, their dev server crashing, a bug in their web app, a third-party library error, a slow API they are calling. Those are ordinary debugging. If that is what you have, stop using this skill, tell the user in one line that this is a problem in their project rather than in PandaOS, and help them with it directly.

If it is ambiguous (for example a dev server that PandaOS started fails to start), check whether the same thing fails outside PandaOS. Only the part that PandaOS owns belongs here.

## Step 1: Pin down the symptom

You need three things, and should ask for at most one of them if the conversation does not already say:

- **What happened**, in the user's words, and what they expected instead.
- **Roughly when** it happened. Logs are timestamped; a time turns a 5,000 line log into 30 relevant lines.
- **Whether it repeats**, and what they did just before.

Do not interrogate. If the user said "it froze when I switched chats a minute ago", you have all three.

## Step 2: Get this install's facts

Call `diagnostics_info` (it is a PandaOS tool; if it is not loaded, find it with tool search, where Claude sees it as `mcp__pandactions__diagnostics_info`). It returns:

- `app`: version, update channel (stable, nightly or beta), OS, dev or packaged build.
- `gpu`: the saved hardware acceleration flags, and `effectiveAtBoot`, what the app actually did this launch.
- `paths`: the real locations of the logs dir, data dir, update log, timing log, transcripts and crash dumps for this install.
- `recentCrashes` and `recentLogFiles`: the newest crash artifacts and daily logs. Each crash entry carries `fatal`, `bootId` and `thisRun`.
- `app.bootId` and `app.libuv`: this run's random id, and the libuv version in this runtime.
- `warnings`: anything it could not read. A warning means "unknown", not "nothing there".

**These paths always win.** They differ by OS, by dev vs packaged build, and by `PANDAOS_DATA_DIR`. Only if the tool is unavailable, fall back to `references/log-locations.md`, and say that the paths are the defaults rather than confirmed.

## Step 3: Gather wide, read narrow

Read what the symptom points at, around the time the user gave. Search logs with Grep for the timestamp window, error levels and the subsystem tag, rather than reading whole files.

Log lines look like `2026-09-29T08:15:12.345Z [warn] [tag] message`. The timestamp is **UTC**, but the daily file `main-YYYYMMDD.log` is named by the **local** date, so convert the user's "ten minutes ago" before you search, and near midnight check both days' files.

| Symptom | Look first at |
| --- | --- |
| App crashed or closed itself | `recentCrashes`, then that crash file (it embeds the last 200 log lines and the stack) |
| Memory grew, the app got slow, then vanished (often Windows) | `memory-pressure` entries in `recentCrashes`, then `[lifecycle] {"kind":"memory-pressure"` and `[memory-monitor]` lines in the main log |
| Freeze, spinner, UI stuck | main log around the time: `[perf] Main thread blocked`, `[renderer-stall]`, then `[warn]` and `[error]` lines |
| Blank, black or flickering window, graphics glitches | the `gpu` block, then `[gpu-guard]` and `[paint-watchdog]` lines |
| Update failed or will not install | `update.log` and its rotations `update.log.1` to `.3` |
| Engine will not start, turn dropped, tool call vanished | main log lines tagged with the engine (`[sdk`, `[codex`, `[opencode`), then the chat's transcript |
| Slow responses | `timing.log` for the session, then the main log |
| Sign-in, empty model list, credits | main log `[auth` and `[litellm` lines (an empty model list is most often an expired sign-in, not a model problem) |
| A PandaOS feature misbehaves inside a project (skills, rules, agents) | the project's `.pandaos/` config and the synced skill folders, then the main log |

Rules while gathering:

- **Read only.** Never edit, delete or move files, change settings, or kill processes while diagnosing. If a fix needs any of those, propose it and let the user decide.
- **Never read credentials.** Do not open `.env` files, key stores, or token files. If the diagnosis seems to need one, it does not; say what you would have checked.
- **Commands are allowed when a hypothesis needs them**, and only read-only ones: process lists, memory and disk free, the OS version. Run one because it answers a question you have, not to fill in a system profile.
- **Project files only when the failure involves the project.** A crash on startup does not need the user's `package.json`.

Memory evidence has traps that make a diagnosis look stronger than it is:

- **A `memory-pressure` file is not a crash.** It is written when main memory first crosses 3 GB or 5 GB, while the app is still running (`fatal: false`, `stillRunning: true`). Handled rejections and clean or deliberate subprocess exits also have `fatal: false`. A subprocess crash is fatal to that process, not necessarily to the app. Missing exit reasons have `fatal: null`; do not count those as confirmed crashes.
- **Match runs by `bootId`, not upload time.** A native out-of-memory death runs no code, so its report is uploaded by the NEXT start. New `[lifecycle]` startup lines, crash files and pressure records carry the `bootId` of the run that wrote them; `thisRun: true` means the current run. Older artifacts have `bootId: null` and `thisRun: null`. Native events preserve the dump header's crash time when available; a dump without its original boot identity is marked unknown.
- **Unknown is not zero.** In a pressure record, `null` means the figure was unavailable, and `childSampling` other than `complete` means child processes were not counted. Windows child ownership is `inferred-ancestry`, never proof that PandaOS started a process. `residualMb` is an estimate, not a measured native total.
- **The record names the workload, not the content.** `workload`, `heavySessions` (ranked by size, no ids) and `renderer` say how much transcript, extraction, watcher and chat state was live. Use them to name a likely cause, with the confidence the numbers allow.

Stop gathering when you can explain the symptom, or when the next file would not change your conclusion.

## Step 4: Say what you found

Tell the user, in plain language and a few lines: what happened, the evidence (quote the one or two log lines that matter, not pages), how confident you are, and what they can do right now if there is a workaround. Replace their home directory with `~` in anything you quote.

## Step 5: The verdict, file or not

Make an explicit decision and state it. The report is a conclusion, not a formality.

**File** when you have evidence that PandaOS did something wrong: a crash, an error PandaOS logged, a behaviour that contradicts what the app says it does, a regression, a failure you reproduced. In most genuine PandaOS bug conversations this will be the answer.

**Do not file** when:

- It is misconfiguration or user error you can fix or explain. Fix or explain it instead.
- It turned out to be the user's project, a third-party service outage, or their network. Say so.
- It is a known, documented limitation. Name it.
- You do not have enough evidence yet. Say what observation would settle it (for example "if it happens again, tell me the time and I will read the log around it").
- The same issue was already filed in this conversation.

When you do not file, say why in one line, and remind the user they can still report it themselves from the feedback dialog, or ask you to file it anyway.

## Step 6: Filing with feedback_submit

Find `feedback_submit` with tool search if it is not loaded. The user sees the complete report on an approval card and must approve it; nothing is sent before that.

Fill it the way a careful engineer would:

- **title**: the symptom plus where, specific enough to deduplicate. "Codex engine drops the turn after a tool call on Windows", not "Bug in PandaOS".
- **severity, steps, expected, actual**: from Step 1 and your reproduction.
- **findings**: your diagnosis. The log lines that matter (a few, quoted), the crash kind and time, the app version and channel, the GPU state only if the bug is graphical, and your hypothesis with its confidence. Home paths as `~`.

**Attach narrow.** Everything you gathered was for the diagnosis. The report carries only what supports the finding:

- `attach_logs`: yes when the logs contain the failure. It bundles recent app, crash, update and timing logs automatically. No when the problem left no trace in them.
- `attach_screenshot`: only when the bug is visual. It captures the PandaOS window at the moment of submission, so make sure the problem is actually on screen (ask the user to bring it up first), otherwise it just shows the chat.
- `attach_chat`: only when the conversation itself is the reproduction (for example an engine misbehaving in this chat).
- `files`: at most 3, and only a specific artifact your diagnosis names, such as the crash file or a malformed config. Never a log you already covered with `attach_logs`, never anything with credentials.

The system info (version, OS, Electron) is attached automatically. Do not repeat specs in the report unless they are part of the cause.

Things that go wrong with filing, so you do not mistake them for new bugs:

- It needs the user signed in to PandaOS, and an interactive chat.
- It refuses a title already filed in this conversation, and allows at most 3 reports per conversation.
- A dev build that was never signed in gets a 401 on submission. That is the dev token, not a PandaOS bug; tell the user.

After it is filed, tell the user in one line that it is in. Do not repeat the report back.


## Reference Files
This skill includes reference documents. Read them when you need supporting context:
- `.claude/skills/pandaos-self-diagnosis/references/log-locations.md`
