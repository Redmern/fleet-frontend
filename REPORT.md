# fleet marketing site — build report

## What this is

A single-page marketing/landing site for fleet (github.com/Redmern/fleet-tui), built with
Blazor and exported to plain static HTML. It is served at https://fleet-tui.dev from a VPS
(deployment in Redmern/fleet-deploy); the GitHub Pages workflow below still works as a fallback. No backend, no database, no
client-side state beyond a couple of `localStorage` conveniences.

## Architecture: Blazor static SSR + a custom static-site export step

`src/FleetMarketing` is a .NET 10 Blazor Web App (it started on .NET 8). Its `Program.cs` only calls
`AddRazorComponents()` / `MapRazorComponents<App>()` — no `AddInteractiveServerComponents()`
or `AddInteractiveWebAssemblyComponents()`, and no `.razor` component declares an
`@rendermode`. That means every page renders once, on the server, to plain HTML with no
Blazor JS runtime, no SignalR circuit, and no WASM payload. `App.razor` doesn't even
reference `blazor.web.js` — it wasn't needed for a page with no interactive render mode.

That gets you "static SSR" as a *rendering technique*, but Blazor Web Apps still assume a
live ASP.NET Core process is answering each request — there's no built-in "export to
files" mode in Blazor, and GitHub Pages can only serve files, not run a server. I looked at
the realistic options for closing that gap:

- **Blazor WebAssembly (standalone)** — does produce static files, but ships the whole
  Blazor/WASM runtime to the client and requires JS to render *any* content, including the
  copy and install commands. That directly violates "core content renders as plain HTML
  with no JS required."
- **Host it on a server** (Azure App Service, Fly.io, etc.) — works, but the brief calls
  for GitHub Pages specifically, and running a server for a static marketing page is
  needless cost/ops for an open-source project.
- **Render once, save the HTML, serve those files** — the approach used here.

`src/FleetMarketing.Ssg` is a small console tool that boots the `FleetMarketing` app
in-memory using `WebApplicationFactory<Program>` (the same test-host mechanism ASP.NET Core
integration tests use — no real socket, no separate process), requests each route, and
writes the returned HTML plus the app's `wwwroot` assets into `dist/`. That folder is a
complete static site: open `dist/index.html` directly, or point any static host at it.
Since the app has exactly one route today, this "crawl the routes" step is intentionally
minimal — extending it to more pages later just means adding entries to the `routes` array
in `Program.cs`.

Three notes on `FleetMarketing.Ssg/Program.cs`, since the reasoning isn't obvious from the
code alone:

- It uses an explicit `Main` method instead of top-level statements. Top-level statements
  generate their own type named `Program`, which collides with the `Program` type imported
  from the referenced `FleetMarketing` assembly — `WebApplicationFactory<Program>` needs to
  resolve to *that* one.
- It pins the WebApplicationFactory's content root to `FleetMarketing`'s *source* directory
  (a fixed relative path from this file, resolved via `[CallerFilePath]`), not its build
  output directory. Modern ASP.NET Core (Static Web Assets) doesn't copy `wwwroot` into
  `bin/`, it maps it via a manifest — so pointing at the build output leaves
  `IWebHostEnvironment.WebRootPath` empty. Pointing at the source directory is exactly what
  `dotnet run` does normally, and it's stable across Debug/Release and across machines as
  long as the two projects stay siblings under `src/`.
- The client's `BaseAddress` is set to `https://localhost` up front to avoid a redirect
  round-trip through `UseHttpsRedirection()`.

**Progressive enhancement, kept deliberately non-Blazor:** the interactive bits — the
terminal recordings, copy-to-clipboard, and the Windows/Linux platform toggle — are
hand-written vanilla JS (`wwwroot/js/demo-player.js` around the vendored asciinema-player,
`wwwroot/js/site.js`), not Blazor WASM islands. (The first version animated a scripted
mockup, `terminal-mockup.js`; real recordings replaced it.) Shipping the WASM runtime just to animate
three small widgets would have meant abandoning the "no JS required for core content" goal
to get progressive enhancement for a handful of DOM tweaks. All three degrade gracefully:
the install commands are already correct static HTML (JS only swaps which one is visible),
copy buttons no-op silently if `navigator.clipboard` is unavailable, and the recordings
have a `<noscript>` description and respect `prefers-reduced-motion`.

## Verified locally

- `dotnet build FleetMarketing.sln` (Debug and Release) — 0 warnings, 0 errors.
- `dotnet run --project src/FleetMarketing` — served the page at localhost:5272; checked
  in a real browser: hero, terminal mockup animation, platform toggle, copy buttons, the
  features/requirements/install sections all render and no console errors.
- `dotnet run --project src/FleetMarketing.Ssg -- <dir>` — produces `index.html` +
  `app.css` + `js/*.js` + `og-image.png` + `favicon.svg` in the target directory; opened the
  exported `index.html` directly and it matches the live dev-server render.

## Local development (hot reload)

`dotnet watch --project src/FleetMarketing` serves the site at localhost:5272 and opens
it in the browser, then keeps it in sync as you edit:

- `wwwroot/**/*.css` — swapped into the open page live, no reload.
- `.razor` / `.cs` — hot-reloaded into the running app, and the page refreshes itself.
  Edits hot reload can't apply (e.g. some `Program.cs` changes) prompt for a restart;
  press Ctrl+R in the watch terminal to restart manually.
- `wwwroot/**/*.js` — the page refreshes itself.

Stop any plain `dotnet run` first: it locks `bin/`, and the watch build then fails with
"file is locked by FleetMarketing".

## Deploy target: GitHub Pages

`.github/workflows/deploy.yml` builds the solution in Release, runs the SSG export into
`dist/`, and publishes that via `actions/upload-pages-artifact` +
`actions/deploy-pages` on every push to `main`. This assumes the repo's GitHub Pages source
is set to "GitHub Actions" (Settings → Pages) — that's a one-time manual step I can't do
from here.

**Assumption worth flagging:** the workflow's paths (`FleetMarketing.sln`,
`src/FleetMarketing.Ssg`) assume this `marketing-site` directory *is* the repository root
once merged. If `fleet-frontend` ends up nesting this under a subdirectory alongside other
branches' content, the workflow needs a `defaults.run.working-directory` (or path prefixes)
added.

## Accuracy pass against the real README

The brief's install one-liners and macOS note were written without repo access. I fetched
`github.com/Redmern/fleet-tui`'s README directly and corrected against it:

- **Confirmed as given:** both one-liners, and macOS is source-build-only (no published
  binary) — the brief's placeholder guess was right.
- **Added `--with-deps` / `-WithDeps`:** real flags on both the release installers and the
  local `install.ps1`/`install.sh` scripts, install WezTerm/Neovim/yazi/git via winget or
  the system package manager. The Install section now shows this as its own step.
- **Requirements reframed:** the README lists Neovim (with neo-tree + claudecode.nvim) and
  yazi under "Key Requirements" without marking them optional the way the brief assumed.
  I kept them tagged as "integration" rather than hard-required, since the core
  dispatch/dashboard loop doesn't need them, but this is a judgment call worth a second
  look from someone who actually knows the current onboarding flow.
- **No LICENSE file found** in the README or repo listing at time of writing. The footer
  says "License: see repository" instead of naming one — don't put a real license name
  back in until one actually exists.
- **Source build requirements added:** .NET 10 SDK; Windows also needs VS Build Tools 2022
  (Desktop development with C++); Linux needs `clang` and `zlib1g-dev`. Not in the original
  brief, now in the Install section.

## Other placeholders / TODOs left in the code

- `wwwroot/og-image.png` is a frame of the real recording, rendered by
  `video/terminal/frame.mjs --og` (it replaced a generated SVG placeholder).
- fleet-tui still has no LICENSE file, so the site says "free, source on GitHub" rather than
  naming a licence; the comparison table's "Open source" cell for fleet needs one to be true.

## Visual direction

Dark-by-default, monospace, Tokyo Night palette, per the brief. On top of that base, the
layout borrows a few structural ideas from typesafe.ai (oversized bold display headlines,
a single flat-color full-bleed statement band with a halftone texture and corner crop-marks,
thin-rule kicker-labeled columns, and OS-window-style chrome on the feature cards) — with
fleet's own colors, not theirs.

## Content review, 2026-10-12

Fixed in this pass:

- **The second video is now a terminal recording of fleet 0.7.17.** It is "The tour" in
  Showcase, with the same player and chapters as "See it live". It covers the promo's
  features: permissions, Ai-DLC, dispatch, gates and notifications, detach, and the head. The
  promo mp4 and its poster left the page, and `video/` still renders the mp4 as a shareable
  file. How it was recorded, and what it leaves out, is in `video/terminal/README.md`.
- **Social preview.** `og:image` is a 1200x630 PNG of a real frame. It was a placeholder SVG.
- **Head.** `SiteUrl` defaults to https://fleet-tui.dev/, and there is a canonical link. The
  dangling Google Fonts preconnect is gone.
- **Lead copy.** The title, meta, og and twitter text and the hero lede lead with gated
  orchestration and Ai-DLC.
- **macOS** is marked "source" in the hero eyebrow and "from source" in the OS band.
- **Harness wording.** Requirements say Claude Code, with Neovim as the only alternative. They
  no longer say "bring your agent".
- **MCP tool count.** 30, not 32. This was checked with `tools/list` against the 0.7.17 binary:
  `fleet mcp --project` lists 30 tools, and `--head` lists 17.
- **Navigation** gains Demo, Permissions and Ai-DLC.
- **Ai-DLC** shows the feature profile's stages and human gates, the same list the promo uses.
- **Comparison table on phones.** It no longer needs 980 px; "Not documented" shows as a dash
  (the words stay for screen readers).
- **"Free and open source"** became "free, source on GitHub" (see the licence item below).

Still open:

- **Licence.** fleet-tui has no LICENSE file. GitHub's API reports no licence on 2026-10-12.
  The comparison table still marks fleet "Yes" under "Open source", and that column means "an
  open-source licence". Either publish a licence or change that cell. Changing it would also
  change check-dist's rule that fleet has exactly one "Partly" cell.
- **"See it live"** was recorded with an older fleet, and its dashboard looks different from
  0.7.17. `video/terminal` can record a new one.
- **Mock windows.** The Features and MCP cards are still text in mock windows.
  `video/terminal/frame.mjs` can render real stills from either recording if you want images
  there.
- **The promo mp4** still says 32 MCP tools in the rendered file. The scene source now says
  30, but the mp4 was not re-rendered: there was no ffmpeg or working Chromium on the build
  machine.
- **The nav is hidden below 640 px**, and there is no menu button.
- **fleet issues found while recording** (for fleet-tui, not this site):
  - `add_repository` with a `file://` URL creates a literal `file:` folder tree and reports
    success. With a plain local path it fails.
  - With "Start a new agent" set to ask (both channels), a sub-orchestrator's `new_agent` call
    started the agent without a visible Allow/Deny dialog.
