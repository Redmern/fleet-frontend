# Spec — fleet features → market → site → video (approved)

## Problem
fleet-frontend advertises six basic features and underplays most of what fleet-tui 0.7.17 does (MCP permissions and git gates, Ai-DLC, head orchestrator + voice, todo/Jira, stacks, ISO mode, themes, model routing). There is no market positioning and no shareable video (only an asciinema cast). One claim ("Claude Code and friends") overstates the product.

## Scope
1. Feature summary of fleet-tui 0.7.17 (from discover.md, verified against source/README).
2. Cited web research of the AI coding-agent landscape; list of how each fleet feature contributes to the market (value vs. alternatives).
3. Gap analysis: advertised on fleet-frontend vs. actual + market-relevant.
4. fleet-frontend update: rewrite copy, new sections, named-competitor comparison table (sourced).
5. New rendered mp4 promo of the most valuable features, built in `fleet-frontend/video/`, embedded on the site.

## Non-scope
- No changes to fleet-tui.
- No voiceover/music; captions only.
- No redesign of the design system (Tokyo Night, app.css conventions kept).
- No merging; no pricing section.
- Not replacing the existing live demo cast.

## Decisions (from interview)
- Video: rendered mp4 promo, ~60–90 s, captions only.
- Research: web, cited; report with sources and retrieval date.
- Site: copy + new sections (MCP/permissions, Ai-DLC, head orchestrator/voice, market positioning); fix known defects.
- Comparison: named competitors; unverifiable cells are omitted / "not documented".
- Video source + mp4 live in fleet-frontend (`video/`, mp4 under wwwroot/media).
- fleet-frontend's uncommitted net10 csproj change is included in the site PR.
- Delivery: two PRs (site first as walking skeleton, then video). User merges.

## Acceptance criteria
- AC-1. When research completes, the system shall provide `reports/features.md` listing every fleet-tui 0.7.17 feature group with a README/source reference.
- AC-2. When research completes, `reports/market.md` shall list, per feature group, its contribution to the market, with each external claim linked to a source URL and a retrieval date.
- AC-3. `reports/gap.md` shall compare each feature group with the current site copy (file:line) and classify it as advertised / underplayed / missing.
- AC-4. When the site is built (`dotnet build FleetMarketing.sln -c Release`), it shall succeed with zero warnings introduced.
- AC-5. The home page shall present every "missing" or "underplayed" feature group rated high-value in gap.md, in the Features section or a new section.
- AC-6. The site shall contain a comparison section naming competitors in which every cell is backed by a source recorded in market.md; unverifiable cells shall read "not documented" or be omitted.
- AC-7. The site shall not claim support for harnesses other than claude and nvim, and the "Main-ochestrator" typo shall be fixed.
- AC-8. When the SSG export runs, it shall produce `dist/` containing the new sections and every internal link/asset resolves (no 404 in export).
- AC-9. The site shall render without horizontal scroll at 375 px and keep the existing Tokyo Night tokens.
- AC-10. `fleet-frontend/video/` shall build a 60–90 s 1920×1080 mp4 with one command documented in `video/README.md`.
- AC-11. The video shall feature the top features chosen from gap.md/market.md (≤ 6), each with an on-screen caption, and no audio track dependency for comprehension.
- AC-12. When the page loads, the site shall embed the mp4 in a section with poster image, controls, and no autoplay with sound.
- AC-13. The csproj net10 change shall be committed in the site PR.
- AC-14. Each PR shall include spec.md as `docs/specs/fleet-features-site-video.md` and the PR text from fl-pr.

## Assumptions
- Remotion (or equivalent Node + ffmpeg) is acceptable as a dev-only tool; license of Remotion is acceptable for this use (to be checked in Plan).
- Terminal footage reuses frames from the existing cast or a fresh capture; no new fleet-tui changes needed.
- mp4 size kept under ~15 MB to be Pages-friendly.

## Open questions
- None blocking. Deferred to Plan: video storyboard/feature order, Remotion licence check, exact competitor list (decided by research).
