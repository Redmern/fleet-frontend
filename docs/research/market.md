# Market research: multi-agent coding tools (retrieved 2026-10-12)

Scope: tools for running or orchestrating several AI coding agents. Facts about fleet come from the task brief and were not independently verified. Everything about competitors comes from the sources in section 5, fetched on 2026-10-12 unless marked "search snippet".

Cell rule: yes / no / nd (not documented in the pages I read). "nd" means I did not find it. It does not mean the feature is absent. A short qualifier after the verdict is a fact from the same source.

## 1. Market trends and buyer pains

1. **Adoption is real but delegation is partial.** In the Stack Overflow 2025 survey, 14.1% of developers use AI agents daily at work and 9% weekly. 37.9% have no plans to adopt them [S1]. Among agent users, 70% say agents reduce time on specific tasks and 69% report higher productivity. Only 17% say agents improved team collaboration [S1]. Read this as many individual users and little team-level orchestration.
2. **Trust is the dominant pain.** 87% are concerned about agent accuracy and 81% about security and privacy. 66% name "almost right, but not quite" as their top frustration, and 45.2% say debugging AI-generated code takes longer [S1]. This favours products with approval gates, review steps and permission rules.
3. **Parallel agents on isolated git worktrees are now the default pattern.** Claude Code does it natively: background sessions move into `.claude/worktrees/` before editing [S2]. Cursor documents `/worktree` and `/best-of-n` [S9]. Conductor, Claude Squad, Nimbalyst, Superset, Vibe Kanban and workmux are all built on it [S5, S6, S7, S8, S10, S12]. Worktree isolation is table-stakes.
4. **Platform vendors are absorbing the orchestration layer.** Claude Code ships agent view (`claude agents`, background sessions across projects), experimental agent teams with a shared task list and tmux/iTerm2 split panes, Remote Control from phone or browser, voice dictation, routines and hooks [S2, S3, S4, S13, S14]. Cursor ships cloud agents that work across several repositories [S11]. Wrapper tools therefore need something the first-party tool lacks.
5. **Wrapper-tool economics are hard.** Vibe Kanban's company shut down on 2026-04-10. It said most users were free and it found no workable business model. The project continues as community-maintained open source, without the remote services [S15]. Crystal was deprecated in February 2026 and replaced by Nimbalyst, which is now MIT-licensed (search snippet [S16]; license confirmed on the Nimbalyst site [S7]). Conductor monetises through cloud workspaces: Free $0, Pro $50/mo, Teams $60/user/mo [S5a].
6. **Direction of travel is cloud and mobile.** Conductor Pro adds cloud workspaces and a mobile app [S5a]. Superset has an iPhone/iPad app and remote machines [S8]. Nimbalyst has an iOS app [S7]. Cursor and Copilot agents run in vendor VMs [S11, S17]. Local-first terminal tools are the minority.
7. **Multi-agent harness support is expected.** Conductor lists Claude Code, Codex, Cursor and OpenCode [S5b]. Claude Squad lists Claude Code, Codex, Gemini, Aider and OpenCode [S6]. Vibe Kanban lists 10+ agents [S15b]. Superset is "any coding agent" [S8].
8. **Weak signal, not relied on below.** Blog posts say most developers run two or three agents concurrently and that orchestration is the 2026 challenge. I could not trace them to a primary source.

## 2. Competitors

Categories: A = first-party agent platform; B = IDE agent; C = desktop parallel-agent app; D = terminal parallel-agent tool; E = cloud background agent.

### 2.1 Claude Code (native: agent view, agent teams, Remote Control) - A
Anthropic's agent. Runs in terminal, IDE, desktop and web [S2]. `claude agents` manages background sessions across projects, with worktree isolation, notifications and per-dispatch permission modes [S3]. Agent teams (experimental) let a lead coordinate teammates with a shared task list and split panes in tmux or iTerm2 [S4]. This is the closest overlap with fleet, because fleet drives Claude Code.

### 2.2 Cursor (IDE + cloud agents) - B/E
IDE with local worktree agents and cloud agents in isolated VMs. Cloud agents work across multiple repos and open PRs [S11, S9].

### 2.3 Conductor (Melty Labs) - C
Mac app for parallel Claude Code, Codex, Cursor and OpenCode agents, each in an isolated workspace with its own branch, terminal and diff [S5b, S5c]. It has a cloud tier [S5a].

### 2.4 Claude Squad - D
Terminal TUI on tmux and git worktrees for Claude Code, Codex, Gemini, Aider and OpenCode. It has an auto-accept mode [S6]. Closest in form to fleet.

### 2.5 Nimbalyst (successor to Crystal) - C
Free, MIT-licensed desktop workspace (macOS, Windows, Linux) with an iOS app. It has a session kanban, visual editors for markdown, mockups and diagrams, and optional one-click worktrees [S7].

### 2.6 Superset - C
Workspace app for many parallel agents on worktrees, with remote machines, automations and a mobile app. Source-available under ELv2. Also ships a CLI, SDK and MCP server [S8].

### 2.7 Vibe Kanban (community-maintained since April 2026) - C
Kanban board where each card gets a worktree and an agent. Apache-2.0, 10+ agents, PR creation and merge from the UI, SSH config for opening projects in VS Code [S15].

### 2.8 Sculptor (Imbue) - C
Desktop app (Mac Apple Silicon, Linux) that runs agents in isolated workspaces. Its container docs describe a Docker container per agent. MIT, free, "experimental research preview" [S18, S19].

### 2.9 workmux - D
Pairs each git worktree with a tmux, kitty, WezTerm or Zellij window. Has a dashboard and shows agent status in window names [S10].

### 2.10 GitHub Copilot cloud agent - E
Background agent in an ephemeral cloud environment. Single-repo per task, with a 59-minute session cap. You review changes before the PR [S17].

Also seen, not in the matrix: Codex CLI (Apache-2.0, terminal, subagents, desktop app and Codex Web) [S20]; Gemini CLI (Apache-2.0, free tier of 60 requests per minute and 1,000 per day on a personal Google login) [S21]; Google Jules (async cloud agent with 3 / 15 / 60 concurrent tasks by tier, search snippet [S22]). Windsurf and Devin were not researched.

### 2.11 Capability matrix

Columns: MR = multi-repo orchestration; WT = git worktree isolation; TN = terminal-native; RS = remote/ssh; PG = permission gates/approvals; SP = staged process/human gates; VO = voice; NS = notifications/status; OF = offline/air-gapped; OS$ = open source / price.

| Tool | MR | WT | TN | RS | PG | SP | VO | NS | OF | OS$ |
|---|---|---|---|---|---|---|---|---|---|---|
| Claude Code | yes [S3] | yes [S3] | yes [S2] | yes: Remote Control to phone/browser, session stays local [S23]. SSH multiplexing nd | yes: rules, modes [S24] | nd (plan mode and plan approval exist [S4]; no staged process documented) | yes: needs claude.ai login and local mic, not over SSH [S25] | yes [S3] | nd | OSS nd. Needs paid subscription or Console account for most surfaces [S2] |
| Cursor | yes: cloud agents [S11] | yes [S9] | nd (IDE) | yes: cloud VMs, not SSH [S11] | nd (admin repo access, outbound domain limits [S11]) | nd | nd | yes: Slack updates [S11] | nd | OSS nd. Hobby free, Individual $20/mo, Teams $40/user/mo [S26] |
| Conductor | nd | yes [S5c] | no: Mac app [S5b] | yes: cloud workspaces on Pro [S5a] | nd | nd | nd | nd | nd: local workspaces on Free, BYO keys [S5a] | OSS nd. Free, Pro $50/mo, Teams $60/user/mo [S5a] |
| Claude Squad | nd | yes [S6] | yes [S6] | nd | nd (auto-accept mode [S6]) | nd | nd | nd | nd | yes, AGPL-3.0; free [S6] |
| Nimbalyst | nd | yes: optional [S7] | no: desktop app [S7] | yes: iOS app for sessions [S7] | nd | nd | nd | nd | nd | yes, MIT; free for individuals, teams free in beta [S7] |
| Superset | nd | yes [S8] | no: desktop app; CLI also exists [S8] | yes [S8] | nd | nd | nd | yes: mobile monitoring [S8] | nd: code local by default [S8] | source-available (ELv2, not OSI); free tier [S8] |
| Vibe Kanban | nd | yes [S15] | no: web or Tauri app [search snippet, S15c] | yes: SSH config for VS Code [S15] | nd (diff review, PR review [S15]) | nd | nd | nd | yes: fully local since the cloud shutdown [S15d] | yes, Apache-2.0; free; project sunsetting [S15, S15d] |
| Sculptor | nd | no: uses Docker containers [S19] | no: desktop app [S18] | nd | nd | nd | nd | nd | nd | yes, MIT; free; research preview [S18] |
| workmux | nd | yes [S10] | yes [S10] | nd | nd | nd | nd | yes: status in window names, dashboard [S10] | nd | license and price nd |
| Copilot cloud agent | no: single repo per task [S17] | nd: ephemeral cloud env | no: cloud [S17] | yes: cloud-hosted [S17] | yes: review before PR [S17] | nd | nd | nd | nd | OSS nd. Depends on plan [S17] |

## 3. How each fleet feature group contributes

Fleet claims are from the brief. Assessment is mine, from the matrix.

| Fleet feature group | Role | Why |
|---|---|---|
| One git worktree per agent | **Table-stakes** | Claude Code, Cursor, Conductor, Claude Squad, Nimbalyst, Superset, Vibe Kanban and workmux all have it [S3, S9, S5c, S6, S7, S8, S15, S10]. |
| Multiple repos in one project | **Differentiator, narrow** | Of the tools with a documented verdict, only Claude Code agent view [S3] and Cursor cloud agents [S11] document multi-repo. Copilot documents the opposite [S17]. Most wrapper tools are nd. |
| Terminal-native TUI + own multiplexer, detach/reattach, ssh remotes | **Differentiator vs GUI apps; niche overall** | Only Claude Squad and workmux are documented terminal tools [S6, S10]. Both lean on tmux (workmux also supports Zellij and others). GUI competitors are Mac apps. Detach/reattach with ssh matches the trend to remote work [S8]. But terminal users are a subset of the market. |
| Claude driving fleet through ~30 MCP tools with allow/ask/forbid per project and git commit/push/merge gates | **Differentiator** | No competitor in my sources documents agent-managing-agents with a per-project permission policy on git actions. Claude Code has general permission rules [S24] and agent teams [S4], but not gates scoped to orchestration actions. It answers the trust pain: 87% accuracy and 81% security concern [S1]. |
| Sub-orchestrators (`,` prefix) | **Differentiator, overlapping** | Claude Code agent teams are an experimental analogue with limits: one team per session, no nested teams [S4]. Fleet's value is that it is explicit and integrated with the rest. |
| Ai-DLC staged process with human gates | **Differentiator, niche** | No competitor documents staged specify/plan/build gates. Vibe Kanban and Nimbalyst offer kanban or task tracking, which is not gated process [S15, S7]. It targets teams that want governance. Others may read it as overhead. |
| Voice-driven head orchestrator across projects | **Differentiator, but first-party voice exists** | Claude Code has dictation into prompts and into agent view [S25]. It needs a claude.ai account and a local mic, and does not work over SSH [S25]. No wrapper tool documents voice. Fleet's cross-project orchestration by voice is not matched in my sources. |
| Hook-based status notifications | **Table-stakes** | Claude Code has notifications [S3]; Superset and workmux have status or mobile monitoring [S8, S10]. |
| Todo board with Jira pull | **Niche / table-stakes-lite** | Boards are common: Vibe Kanban and Nimbalyst have kanban [S15, S7]. Jira integration specifically is not documented by any of them. |
| Port forwarding / stacks, secrets distribution | **Niche, useful for multi-repo** | Not documented by any competitor in my sources. Sculptor's containers cover environment reproducibility another way [S19]. |
| ISO (offline) mode | **Niche differentiator** | Only Vibe Kanban (by default after the cloud shutdown) is documented as fully local [S15d]. Claude Code has a local-mode HIPAA page that I did not read. Matters for regulated or air-gapped buyers. |
| 15 themes | **Table-stakes polish** | Not a buying reason. |
| Auto model routing | **Differentiator, weak evidence** | Claude Code lets you pick subagent and teammate models [S4]. I found no competitor documenting automatic routing. |
| Free / open source | **Table-stakes in this niche** | Claude Squad (AGPL), Nimbalyst (MIT), Vibe Kanban (Apache), Sculptor (MIT), Conductor Free tier [S6, S7, S15, S18, S5a]. It is a hygiene factor, and the Vibe Kanban shutdown shows free alone does not sustain a company [S15d]. |

## 4. Honest weaknesses of fleet versus the field

1. **Two harnesses only (claude, nvim).** Conductor, Claude Squad, Superset, Vibe Kanban and Nimbalyst support Codex and others [S5b, S6, S8, S15, S7]. Buyers who use Codex, Gemini or Cursor cannot use fleet for those agents.
2. **Dependence on Claude Code, which is absorbing the same space.** Agent view, agent teams, worktrees, Remote Control, voice and notifications already ship in Claude Code [S3, S4, S23, S25]. Fleet must keep justifying itself over first-party features. Fleet's own orchestration also needs Claude Code's MCP and hook interfaces to stay stable.
3. **No cloud execution and no mobile app that I know of.** Competitors add cloud workspaces and phone apps [S5a, S8, S7]. Fleet's remote story is ssh into a TUI. That suits power users only.
4. **Terminal-only.** No GUI for diff review, no visual editors. Nimbalyst and Conductor offer visual diffs and review [S7, S5b]. Many buyers prefer that.
5. **Small ecosystem.** Competitors cite community scale: Claude Squad 8.6k stars [S6], Codex CLI 128.8k [S20]. I did not research fleet's adoption. Assume it is far smaller.
6. **Heavy process by design.** The Ai-DLC gates and permission gates add friction. The same trust data [S1] supports gates, but many individual developers want auto-accept (Claude Squad has it [S6]).
7. **Voice is limited by Claude Code's constraints if it relies on it.** Claude Code's own dictation needs a claude.ai login and a local mic [S25]. If fleet's voice uses a different path, document it. I could not verify fleet's mechanism.
8. **Some claimed differentiators are unproven.** ISO mode, auto model routing and Jira pull have no external validation. Sales claims should be backed by the demo.
9. **Monetisation precedent is poor.** Vibe Kanban's company shut down [S15d]. Free and open source is good for adoption, but fleet needs a sustainability story.
10. **Platform coverage unknown.** Competitors state their platforms (Conductor is Mac-only, Sculptor Mac and Linux [S5b, S18]). I did not verify fleet's.

## 5. Sources (all retrieved 2026-10-12)

- S1 https://survey.stackoverflow.co/2025/ai
- S2 https://code.claude.com/docs/en/overview
- S3 https://code.claude.com/docs/en/agent-view
- S4 https://code.claude.com/docs/en/agent-teams.md
- S5a https://www.conductor.build/pricing
- S5b https://www.conductor.build (homepage)
- S5c https://www.conductor.build/docs/ and https://www.conductor.build/workflows/run-parallel-claude-codes (search snippet: "each workspace is backed by a git worktree")
- S6 https://github.com/smtg-ai/claude-squad
- S7 https://nimbalyst.com
- S8 https://superset.sh
- S9 https://cursor.com/docs/configuration/worktrees
- S10 https://workmux.raine.dev/guide/
- S11 https://cursor.com/docs/cloud-agent
- S12 Claude Squad and workmux use tmux plus worktrees (see S6, S10)
- S13 https://code.claude.com/docs/llms.txt (index of hooks, sandbox, worktrees and permissions pages)
- S14 https://code.claude.com/docs/en/overview ("Routines", hooks)
- S15 https://github.com/BloopAI/vibe-kanban; S15b same page (agent list); S15c search snippet from https://virtuslab.com/blog/ai/vibe-kanban/ (stack: Tauri/web); S15d https://vibekanban.com/blog/shutdown (search snippet: shutdown 2026-04-10, fully local afterwards)
- S16 https://rywalker.com/research/nimbalyst (search snippet: Crystal deprecated February 2026)
- S17 https://docs.github.com/en/copilot/concepts/agents/coding-agent/about-coding-agent
- S18 https://github.com/imbue-ai/sculptor
- S19 https://docs.imbue.com/features/containers (search snippet)
- S20 https://github.com/openai/codex and https://learn.chatgpt.com/docs/codex/cli
- S21 https://github.com/google-gemini/gemini-cli
- S22 https://www.tomsguide.com/ai/googles-powerful-ai-coding-agent-jules-is-now-available-to-everyone-heres-why-its-not-just-for-developers (search snippet)
- S23 https://code.claude.com/docs/en/remote-control.md
- S24 https://code.claude.com/docs/en/permissions.md
- S25 https://code.claude.com/docs/en/voice-dictation.md
- S26 https://cursor.com/pricing

Caveats: several pages were read through a summarising fetch tool, so exact wording may differ. Items marked "search snippet" were not read on the primary page. Conductor's homepage did not state worktrees or pricing, so those come from the pricing and workflow pages. Cursor's terminal-native status is nd because I did not fetch a page about it.
