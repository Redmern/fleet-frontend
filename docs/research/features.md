# fleet-tui 0.7.17 feature groups

Source: branch `release/0.7.17` of fleet-tui (commit 6d57c5bf), read with `git archive` because the worktree
`/home/red/repos/fleet/fleet-tui/release_0.7.17/` does not exist (only `main/`, stale, and a bare repo).
Refs are `README.md:line` unless stated (line numbers are from release/0.7.17). `RN` = RELEASE_NOTES.md, `HTI` = src/Fleet/Shared/Settings/HarnessToolIds.cs, `DD` = docs/DESIGN.md.

Platform baseline (applies to everything): README is Windows-first. Published binaries are Windows and Linux x64 only (README:178-180); Linux is "built and tested by CI but has not been used in anger" (README:17-19); macOS is source-build only (README:86). DD:20-28 lists Windows native/headless and Linux native/headless as the four targets; macOS is not among them.

## 1. Project window (Claude + dashboard)
- What: opening a project gives one window: Claude on the left, the fleet dashboard on the right. A prefix chord (ctrl+enter, or ctrl+s then space) opens fleet's own menu from any pane.
- Benefit: one screen to talk to the orchestrator and see every agent; nothing to arrange by hand.
- Ref: README:7-10, 215-245.
- Caveats: needs Nerd Font (README:34).

## 2. Built-in multiplexer (fleetd)
- What: fleet ships its own multiplexer: tabs, splits, zoom, floats, copy mode, tmux-style `ctrl+s` prefix with grouped submenus, detach/reattach (`fleet attach`, `fleet attach --ssh`). Panes are restored after a crash or restart; `fleet daemon stop` gives a clean start.
- Benefit: runs in any terminal with no tmux/WezTerm setup, and survives closing the terminal.
- Ref: README:16-18, 25, 180-190, 700-748; DD:510-575 (fleetd, attach).
- Caveats: a tmux driver is "designed but unwritten" (README:18). After `fleet update` fleetd keeps the old binary until restarted (README:184-188).

## 3. Dashboard (Agents, Subs, Repositories, Notifications)
- What: per-project dashboard with four tabs. Agents rows show branch, harness and a live status icon; Subs groups each sub-orchestrator with its agents.
- Benefit: at-a-glance state of all work; hide, stop, remove from one place.
- Ref: README:574-576 (Notifications tab next to Agents, Subs, Repositories), 1001-1004 (Subs tab); stale "Two tabs" text at README:749-751.
- Caveats: README:749 still says two tabs (see corrections).

## 4. Agents: one worktree per repo and branch
- What: an agent is a harness (claude, or nvim with neo-tree + Claude) running in its own git worktree bound to one repo and branch. Change its harness, hide it (agents start hidden), stop it, or remove it with or without its worktree; branches are always kept. Optional auto-close of idle done/failed agents.
- Benefit: several agents work in parallel without clobbering each other; removing one never destroys work (dirty-check on delete).
- Ref: README:767-797, 836-931 (stopping, hiding, auto-close idle at :850); HTI `change_harness`, `new_agent`, `remove_agent`, `delete_worktree`.
- Caveats: only two harnesses exist, claude and nvim (README:767-768).

## 5. fleet's bundled Neovim config
- What: fleet embeds its own nvim config (lazy.nvim, neo-tree, claudecode.nvim) under `NVIM_APPNAME=fleet-nvim`; the main orchestrator and subs run Claude inside nvim. A `user` setting uses your own config instead.
- Benefit: editor and agent side by side with zero config; your own nvim setup is never touched.
- Ref: README:25-33, 798-835.
- Caveats: needs Neovim 0.9+ and yazi installed (README:33).

## 6. Repository management
- What: a project is a folder of bare repos with worktrees as children (multi-repo is the default). Add (create or clone), pull (`fetch --prune` + `merge --ff-only`), change default branch, open in nvim, delete with a safety check.
- Benefit: one project spans many repos; pulls never create merge commits in a shared checkout.
- Ref: README:932-964.

## 7. MCP orchestrator
- What: Claude in the main pane drives fleet through a stdio MCP server auto-registered per project (`.mcp.json`, pre-approved and trusted). HTI lists 32 tools: agents, repos, subs, ports/stacks, secrets, todo, log, `sync_to_remote`.
- Benefit: tell Claude "start an agent on repo X" and it does it; no first-run `/mcp` step.
- Ref: README:966-976; HTI:10-43.
- Caveats: none noted.

## 8. Permissions and git gates
- What: per project and per tool, each MCP action is allow, ask or forbid (reads allow, writes ask). An ask shows an Allow/Deny dialog in the dashboard. Three git gates (commit, push, merge PR) are written as Claude permission rules into every orchestrator and agent folder.
- Benefit: delegate with a safety net; agents cannot push or merge unless you allow it.
- Ref: README:977-990.
- Caveats: defaults are commit ask, push ask, merge auto. Rules are best-effort, not a sandbox (README:540-545).

## 9. Sub-orchestrators and dispatch
- What: a prompt starting with `,` spawns a hidden sub-orchestrator working in `.fleet/orchestrations/<slug>/`; it creates repo agents, reports back and shows status icons. The `dispatch` tool with a repository skips the sub and starts a repo agent. `list_subs`/`stop_sub`/`remove_sub` manage them.
- Benefit: hand off a whole task, keep chatting; your main Claude stays free.
- Ref: README:991-1034.
- Caveats: none; defaults to Sonnet at medium effort (README:864-865).

## 10. Auto model routing and per-role models
- What: model and effort set per role (head, main, sub, repo agent); aliases sonnet/opus/haiku/fable, or `auto`, where Haiku picks model and effort per new sub or agent, falling back to the fixed default on timeout. A chosen model survives restore.
- Benefit: cheap models for easy tasks, strong ones for hard tasks, without thinking about it.
- Ref: README:859-868; RN:15 (0.7.16 `auto`).
- Caveats: new in 0.7.16, only in release notes, not in README beyond the alias list.

## 11. Ai-DLC process
- What: a sub-orchestrator can run a staged process per project: mode off/on/manual, profiles express/bugfix/feature/refactor/research, autonomy guided/automatic, switchable gates. State is in `state.json` and `audit.jsonl`; the human is asked to approve at each gate. Five bundled skills: fl-discuss, fl-map, fl-pr, fl-review, fl-tdd.
- Benefit: specs, plans, reviews and PRs with evidence instead of ad-hoc agent output; failures always stop and ask.
- Ref: README:1035-1054; skills/fl-*/SKILL.md (descriptions, line 3 of each).
- Caveats: off by default. The skills are written for .NET repos (fl-tdd says ".NET repo agents"). README:1054 notes `.fleet/config/ai-dlc.md` for your own notes.

## 12. Head orchestrator and voice
- What: one Claude above all projects, shown as a float with `alt+o` from any pane. Tools: list/switch projects, relay a dispatch, tell, show/hide agents, across local and remote machines. Opens in voice mode (hold space).
- Benefit: "go to techweb and dispatch: add a login page" from anywhere, by voice.
- Ref: README:1056-1135, 1143-1159.
- Caveats: voice needs a claude.ai login (README:1068-1075). Cross-session messages need Claude Code 2.1.234+ and are described "on Windows" (README:1126-1128).

## 13. Live status, notifications, notification center
- What: agents report via Claude Code hooks fleet writes into each worktree. Marks: ? question, ! permission, check done, x failed, ... stalled 10 min, arrows conflict/behind. Desktop toast (on), optional bell, notification center with All/per-project/History tabs.
- Benefit: know which agent needs you without watching panes.
- Ref: README:574-617.
- Caveats: falls back to reading the pane when hooks are off or no report yet.

## 14. Todo board (+ experimental Jira)
- What: `+idea` in the main pane, `fleet todo "idea"` or `todo_add` files a ticket in `.fleet/todos`. Board (`t`) shows effort and status, opens tickets in nvim and launches one as a sub-orchestrator; `a` toggles all projects.
- Benefit: capture ideas without a model turn and launch them later as tasks.
- Ref: README:281-298 (board), 299-325 (Jira); RN:9-10, 18-19; HTI:43.
- Caveats: Jira pull is **experimental**: Jira Cloud only, read-only, "not yet tested against a real Jira instance" (README:299). Board is new in 0.7.16 and fixed in 0.7.17 (RN:9).

## 15. Remote machines over ssh
- What: link another machine running fleet (`ssh host fleet bridge`); remote projects appear in your window, with keys, mouse, splits, floats, copy mode, menu and notifications working on the remote. Saved sessions restore remote windows. `fleet attach --ssh` for a headless box.
- Benefit: drive agents on a beefy or headless box as if local, without a second login.
- Ref: README:326-366, 562-573.
- Caveats: remote needs fleet on PATH. Viewer may be Linux/macOS/Windows (README:370) but Windows/macOS remote behaviours are fake-tested only (README:394-396).

## 16. Clipboard, image paste, voice on a remote
- What: ctrl+v in a remote Claude fetches an image from your local clipboard (with consent notice, size and rate limits); Windows remote uses `prefix i`; bracketed paste and copy via wl-copy/xclip/pbcopy when OSC 52 is dropped.
- Benefit: paste screenshots into a remote Claude.
- Ref: README:368-396; RN:7-13.
- Caveats: voice-forward (`FLEET_VOICE_FORWARD=1`) is **experimental and untested end to end**; Windows/macOS readers are fake-tested only (README:389-396).

## 17. Port forwarding, Open port and stacks
- What: remote listening ports are forwarded to localhost over the same ssh link; per-project config (`forwardPorts`, `runCommand`, `readyPort`, `healthPath`). `start_stack`/`stop_stack` run the dev command on the remote, wait for the port and health URL, then forward. **Open port** (`ctrl+s s o`) opens a port of this machine in the browser of the machine you are viewing from. CLI: `fleet forward ...`.
- Benefit: see the web app an agent started on a remote in your own browser.
- Ref: README:398-483; HTI:35-41; RN:7, 29-31 (0.7.14-0.7.17).
- Caveats: without ssh control sockets (Windows) falls back to per-port tunnels, no auto-forward of `forwardPorts` (README:431-440). Open port has had several fixes in 0.7.14-0.7.17, so recent.

## 18. Secrets distribution
- What: untracked files such as `.env` live in a mirror under the project root and are copied into every new worktree; `distribute_secrets` and the repository `m` > secrets view copy them to all worktrees on demand. fleet never reads their contents.
- Benefit: new agent worktrees start with working local config.
- Ref: DD:2102-2122; HTI:30. Not documented in the README.
- Caveats: Jira token file is separate (`secrets/jira-<project>`, chmod 600; README:301).

## 19. ISO mode
- What: for a machine holding data that must not leave it: others see only codes and states (`sub1.agent2: waiting for input`), no outbound ssh, update checks or port forwards, and agents are denied `git push`, `gh pr create`, `gh pr merge`.
- Benefit: steer a sensitive box from elsewhere with minimal leakage.
- Ref: README:485-560; RN:48-50.
- Caveats: "enforcement in fleet, not a sandbox" (README:535-546); model API traffic still leaves; includes an egress firewall example.

## 20. Themes and Omarchy sync
- What: 15 themes (default catppuccin-mocha); `fleet theme set` restyles fleetd chrome, dashboards, fleet's nvim, Claude Code (custom theme) and yazi live. `fleet theme install omarchy` follows every Omarchy theme switch; custom TOML themes.
- Benefit: the whole stack matches your terminal.
- Ref: README:1188-1294.
- Caveats: yazi picks up the theme only on next start; Omarchy is a Linux distro feature.

## 21. Rebindable keys, one keybind model
- What: one model (`keybinds.default.json`) drives fleet UI, multiplexer, nvim and Claude Code keybindings; an in-app editor refuses conflicts; `fleet apply-keybinds`, `fleet doctor` checks drift. Optional hidden-keys mode (hold `/` or `?` to reveal).
- Benefit: same ctrl+hjkl everywhere; customise once.
- Ref: README:619-748, 247-267.

## 22. Install, update and health
- What: install scripts (`get-fleet.sh/ps1`), `--with-deps`, `fleet setup`, `fleet doctor`, `fleet update` (downloads release, verifies `.sha256`), in-app update and What's new, `fleet version`, Windows Start Menu launcher.
- Benefit: working setup from one command.
- Ref: README:44-147, 149-213.
- Caveats: only Windows and Linux x64 have published binaries (README:178-180).

## Suggested ~18 marketing groupings
Merge for the site: 3 into 1 (Project window + Dashboard); 5 into 4; 6 into 4 or 7; 8 into 7; 10 into 9; 16 into 15; 18 into 17 or 7. That yields ~15; keep 7/8, 17, 18 separate if aiming for 18.

## Corrections to discover.md
1. Path: `/home/red/repos/fleet/fleet-tui/release_0.7.17/` does not exist. fleet-tui is a bare repo with only a stale `main/` worktree (README there is at the same 70 KB scale; its RELEASE_NOTES top entry is 0.7.15). Read the branch via `git archive release/0.7.17`.
2. "~30 tools": HTI has 32 ids, including `delete_worktree`, `remove_repository` and `sync_to_remote` (HTI:22, 24, 42). The tool-id file is lines 10-43, not 10-40.
   Checked 2026-10-12 with an MCP `tools/list` against the installed 0.7.17 binary: `fleet mcp --project` exposes 30 tools (no `delete_worktree`, no `sync_to_remote`); `fleet mcp --head` exposes 17. The site now says 30.
3. "Linux ... macOS source-build only": correct, but the README's actual primary platform is Windows (Visual Studio Build Tools, PowerShell first, winget); Linux and Windows x64 are the only published binaries (README:178-180). Lead with that when stating platform support.
4. "Dashboard tabs: Agents, Subs, Repositories, Notifications (749)": README:749-751 still says "Two tabs, Agents and Repositories" (stale). Notifications tab is at README:574-576, Subs at README:1001-1004. Cite those, not 749.
5. "Secrets distribution (distribute_secrets, DESIGN.md:2102)": correct, but README never mentions it; only DESIGN and HTI:30.
6. Stacks `(398-483)`: the stack tools are only in README:420-428 (one paragraph); the rest is port forwarding.
7. Jira: README:299 says "Experimental ... not yet tested against a real Jira instance"; discover.md's "experimental" is right but add "Jira Cloud only, pull only".
8. Todo board: "T all-projects" was removed in 0.7.17 (RN:9); the single board toggles with `a` (README:293). 0.7.16 notes still say `T`.
9. "Auto model routing: Haiku picks model+effort (0.7.16)": correct (RN:15, README:859-868), but README has only the alias list and no `auto` text in that block; RN is the source.
10. Missing from discover.md: auto-close idle agents (README:850), saved Sessions (README:562), per-role models (README:859), Claude profile/account setting `C` (README:732), `sync_to_remote` host sync (RN:50, ISO README:528), hide-keys mode (README:247), Open port (README:451), clipboard/image paste (README:368), `fleet doctor` hook check.
11. Ai-DLC skills: they are .NET-oriented (fl-tdd). If the site claims language-agnostic, that overclaims.
12. Harnesses: confirmed only claude and nvim (README:767-768), so "Claude Code and friends" is wrong.
13. "Head orchestrator ... cross-project relay/tell/switch (1056)": correct; add that the cross-session `SendMessage` path is documented only for Windows with Claude Code 2.1.234+ (README:1126-1128).
