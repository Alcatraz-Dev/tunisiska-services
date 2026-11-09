# Where PandaOS keeps its logs

**`diagnostics_info` always wins.** It reports the real paths for this install. Use this table only when that tool is unavailable, and tell the user the paths are the defaults rather than confirmed. Three things move them: the OS, whether this is a dev or packaged build, and the `PANDAOS_DATA_DIR` environment variable, which relocates the whole data dir.

## Logs dir (Electron's `logs` path)

| OS | Packaged app | Dev build |
| --- | --- | --- |
| macOS | `~/Library/Logs/PandaOS/` | `~/Library/Logs/PandaOS_dev/` |
| Windows | `%APPDATA%\PandaOS\logs\` | `%APPDATA%\pandaos-dev\logs\` |
| Linux | `~/.config/PandaOS/logs/` | `~/.config/pandaos-dev/logs/` |

What is in it:

- `main-YYYYMMDD.log`: the main process log, one file per **local** day, kept for 7 days. The bridge server, every engine (Claude, Codex, OpenCode), MCP servers and integrations all write here, each line tagged: `2026-09-29T08:15:12.345Z [warn] [tag] message`, with the timestamp in **UTC**.
- `crash-YYYYMMDDTHHMMSS-<kind>.json`: one file per fatal crash, stamped in UTC, never deleted. Each holds the app version, platform, memory, the stack and the last 200 log lines. Kinds: `uncaughtException` and `unhandledRejection` (main process), `render-process-gone` (a window's renderer died) and `child-process-gone` (a helper process such as the GPU process died).

Native crash dumps (`.dmp`) go to Electron's separate `crashDumps` path. They are binary and rarely useful to read; mention that one exists rather than attaching it.

Renderer (UI) console output is **not** written to disk. The exceptions are renderer freezes, which arrive in the main log as `[renderer-stall]` lines, and `[voice` lines.

## Data dir

`~/.pandaos/` for the packaged app and `~/.pandaos-dev/` for a dev build, on every OS (`%USERPROFILE%\.pandaos\` on Windows). `PANDAOS_DATA_DIR` replaces it entirely.

- `update.log`, rotated to `update.log.1` to `update.log.3`: every update check, download and install attempt. The first place to look for "the update failed".
- `transcripts/<sessionId>.jsonl`: PandaOS's own copy of each chat.
- `settings.json`: user settings. Do not read it for a diagnosis; `diagnostics_info` reports the settings that matter (update channel and GPU flags), and the rest is personal.

## The exception: timing.log

`~/.pandaos/timing.log` holds per-turn latency lines. Its writers hardcode `~/.pandaos`, so a **dev build writes it there too**, not into `~/.pandaos-dev`, and `PANDAOS_DATA_DIR` does not move it.

## Engine session files

These belong to the engines, not to PandaOS, but they are the ground truth when a turn went wrong:

- Claude: `~/.claude/projects/<encoded project path>/<session id>.jsonl`, or under the per-account config dir when the user has several Claude accounts.
- Codex: `~/.codex/sessions/**/rollout-*.jsonl`, or under `$CODEX_HOME`.

They contain the user's full conversation. Read them to diagnose; never attach them to a report.
