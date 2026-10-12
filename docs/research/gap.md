# Gap: product vs. site vs. market (2026-10-12)

Inputs: features.md (22 groups), market.md (10 competitors, retrieved 2026-10-12), discover.md site inventory.
Site refs: `file:line` in `src/FleetMarketing/Components/Sections/` (App.razor in `Components/`) on `main` at bd13dc7, before this branch.
Class: A = advertised, U = underplayed, M = missing. Value = market value from market.md.

| Feature group | Site today | Class | Market value | Plan |
|---|---|---|---|---|
| Multi-repo orchestration (one project = many repos) | BigIdea.razor:5-16, ShipIt.razor:1 | A | Differentiator (narrowing: Claude Code agent view) | Keep, sharpen |
| Worktree per agent | BigIdea.razor:19 "Worktrees, not chaos" | A | Table-stakes | Keep, don't oversell |
| Own multiplexer (detach/reattach, crash restore, floats) | Multiplexer.razor:1-100 | A | Niche/differentiator for terminal users | Keep |
| Remote machines over ssh | Machines.razor:1-77 | A | Differentiator | Keep |
| Hook-based live status + notifications | Features.razor:21 "Knows when an agent needs you" | A | Table-stakes | Keep |
| MCP orchestrator tools (32) + allow/ask/forbid permissions | none (no match in `Sections/*.razor`) | M | **Top differentiator** (trust: 87% worry about accuracy) | New section (skeleton) |
| Git commit/push/merge gates | none (no match in `Sections/*.razor`) | M | **Top differentiator** | In MCP section |
| Ai-DLC staged process, profiles, human gates, 5 skills | none (no match in `Sections/*.razor`) | M | **Top differentiator** (no competitor documents it) | New section |
| Sub-orchestrators (`,` prefix) | HowItWorks.razor:22, LiveDemo.razor:6 (partly) | U | Differentiator | Explain explicitly |
| Head orchestrator + voice across projects | none (no match in `Sections/*.razor`) | M | Medium (Claude Code has dictation) | Short section/card |
| ISO (offline) mode | none (no match in `Sections/*.razor`) | M | Differentiator, enterprise (caveat: not a sandbox) | Card with caveat |
| Auto model routing | none (no match in `Sections/*.razor`) | M | Differentiator | Card |
| Todo board + Jira pull | none (no match in `Sections/*.razor`) | M | Niche; Jira experimental | Card, flag experimental |
| Ports + stacks | none (no match in `Sections/*.razor`) | M | Niche | Card |
| Secrets distribution | none (no match in `Sections/*.razor`) | M | Niche, README doesn't document | Card (low) |
| Themes (15, Omarchy sync) | none (no match in `Sections/*.razor`) | M | Niche | Card (low) |
| nvim harness | Requirements.razor:28 (as an integration only) | U | Niche | Mention under harnesses |
| Rebindable keys, self-update | Features.razor:55 "Rebindable keys", Features.razor:67 "Self-update" | A | Table-stakes | Demote |
| Free / open source | Footer.razor:10 "License: see repository" | U | Strong given paid rivals (Conductor $50/mo) | State plainly if licence confirmed |
| Platform honesty (Linux untested "in anger", macOS source) | Hero.razor:12-15 (Windows/Linux/macOS icons side by side), App.razor:10, 15, 21 | U | Trust | Align copy |

## Site defects to fix
- "Main-ochestrator" typo (HowItWorks.razor:18).
- "Claude Code and friends" (App.razor:10): harnesses are claude and nvim only.
- Hero eyebrow (Hero.razor:12-15) lists macOS as supported equally; Requirements/README say source-build only.
- REPORT.md says .NET 8; csproj net10.

## Candidate video features (top 6, by value)
1. Permissioned MCP orchestration + git gates
2. Ai-DLC staged process with human gates
3. One prompt → sub-orchestrator → agents across repos (`,` dispatch)
4. Live status / notifications (needs-you marks)
5. Terminal multiplexer: detach/reattach + remote ssh
6. Voice head orchestrator across projects

## Honest weaknesses to reflect (not hide)
Only claude+nvim harnesses; Claude Code ships overlapping native features; terminal-only, no visual diff; Linux/macOS maturity; process heavy for auto-accept users; Jira/voice-forwarding experimental.

## Needs user decision before the comparison table
- Licence of fleet (site says "see repository"): confirm "free and open source" is safe to state.
- Include a "where fleet is weaker" note on site? (Recommend yes, short.)
