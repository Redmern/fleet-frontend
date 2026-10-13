# The tour: a terminal recording of fleet 0.7.17

`src/FleetMarketing/wwwroot/casts/fleet-tour.cast` is the second recording on the site (the
Showcase section, "The tour"). It covers the promo video's features in the style of the first
recording: a raw asciicast, 120x34, with chapter markers, played by `js/demo-player.js`.
It runs 126 s.

## What is real

All of it is one real session. fleet 0.7.17 and Claude Code ran on a throwaway two-repo
project (`setup-demo.sh`) on 2026-10-12. The keys were typed into a pty by `drive.py`, and every
frame is output fleet or Claude printed. The edit only does two things:

- **Cuts and speed-ups.** It drops waiting and speeds up the parts where Claude works.
- **A repaint at every cut.** At each cut it draws the real screen from that moment (see
  `cut.mjs`).

Two things are replaced, keeping each line's width: the local user name in paths (it
reads `/home/you/`), and the Claude plan name.

| Chapter | What happens |
|---|---|
| Open a project | `fleet`, the picker, the project's dashboard |
| Permissions you set | `ctrl+s g c p`: the project's MCP policy screen; "Start a new agent" set to ask |
| Ai-DLC | `ctrl+s g c A`: Ai-DLC mode turned on for the project |
| Dispatch | a `,` prompt dispatches a hidden sub-orchestrator (Ai-DLC bugfix profile) |
| Spec gate | the sub-orchestrator stops at the Specify gate; the spec is approved |
| Commit gate | the agent's `git commit` asks (a fleet git gate); it is approved from the notification center |
| Deliver | there is no GitHub remote, so the sub asks how to deliver; the pushed branch is accepted |
| Detach & reattach | `ctrl+s d`, then `fleet attach` |
| Head orchestrator | `alt+o` opens the head; it reports on every project (here, the one) |

## What is not shown

- **Voice.** The head was typed to. Voice needs a microphone and a claude.ai login, and this
  machine has neither.
- **ssh remotes.** `fleet attach --ssh` needs a second machine. The only one available runs
  real projects, so it is left out.
- **The MCP Allow/Deny dialog in the dashboard.** "Start a new agent" was set to ask (on both
  channels), but the sub-orchestrator's `new_agent` call went through without a dialog
  appearing on screen. The policy screen is shown, the dialog is not. (In an earlier
  exploratory run the dialog did appear for `add_repository`. That run was not used.)
- **Retries.** Some answered Claude Code prompts were cut: a one-off "read outside the working
  directory" prompt, four more commit gates, and keys typed by mistake.
- **"Failed" labels.** The sub-orchestrator and the agent report "failed" at the deliver step,
  because the demo's origin is a local bare repo and no PR can be opened. The recording keeps
  that, along with the head's explanation of it.

## Re-cutting

The scrubbed raw take is `takes/take1.jsonl.gz`. `edit.json` says which parts of it to keep,
at what speed, and how long to hold the last frame. To re-cut:

```sh
cd video && npm ci && npm run tour
```

To check a moment of the result, render a still as SVG and convert it to PNG. This needs
`rsvg-convert` and a JetBrainsMono Nerd Font:

```sh
node terminal/frame.mjs ../src/FleetMarketing/wwwroot/casts/fleet-tour.cast 52 /tmp/t52.svg && rsvg-convert /tmp/t52.svg -o /tmp/t52.png
```

`og-image.png` is made the same way, with `--og` at 16.5 s.

## Recording a new take

This needs Python 3 with `pyte`, fleet, and Claude Code logged in.

```sh
bash setup-demo.sh /tmp/fleet-demo                    # throwaway project, own fleet config
PYTHON=/path/to/python-with-pyte bash env.sh /tmp/fleet-demo /tmp/fleet-demo/rec &
```

`env.sh` gives fleet its own config (`FLEET_CONFIG_HOME`) and its own fleetd socket
(`XDG_RUNTIME_DIR`). It unsets the `FLEET_*` variables a fleet pane sets. Together these keep a
fleet you already run untouched. Drive the session by writing JSON commands to
`/tmp/fleet-demo/rec/cmd` (see `drive.py`). The recorder answers fleet's terminal queries
(cursor position, size, colours) the way a terminal would.

When you are done, stop the demo daemon from the same isolated environment:

```sh
env -u FLEET_ENDPOINT FLEET_CONFIG_HOME=/tmp/fleet-demo/config XDG_RUNTIME_DIR=/tmp/fleet-demo/run fleet daemon stop
```

Before you commit a take, scrub it, because the recorder writes it as is:
`node terminal/cut.mjs raw.jsonl --scrub take.jsonl`, then `gzip -9 -n take.jsonl`.
