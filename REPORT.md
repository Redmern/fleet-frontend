# fleet marketing site — build report

## What this is

A single-page marketing/landing site for fleet (github.com/Redmern/fleet-tui), built with
Blazor and exported to plain static HTML for GitHub Pages. No backend, no database, no
client-side state beyond a couple of `localStorage` conveniences.

## Architecture: Blazor static SSR + a custom static-site export step

`src/FleetMarketing` is a .NET 8 Blazor Web App. Its `Program.cs` only calls
`AddRazorComponents()` / `MapRazorComponents<App>()` — no `AddInteractiveServerComponents()`
or `AddInteractiveWebAssemblyComponents()`, and no `.razor` component declares an
`@rendermode`. That means every page renders once, on the server, to plain HTML with no
Blazor JS runtime, no SignalR circuit, and no WASM payload. `App.razor` doesn't even
reference `blazor.web.js` — it wasn't needed for a page with no interactive render mode.

That gets you "static SSR" as a *rendering technique*, but Blazor Web Apps still assume a
live ASP.NET Core process is answering each request — there's no built-in "export to
files" mode in .NET 8, and GitHub Pages can only serve files, not run a server. I looked at
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

**Progressive enhancement, kept deliberately non-Blazor:** the three interactive bits
called out in the brief — the animated terminal mockup, copy-to-clipboard, and the
Windows/Linux platform toggle — are hand-written vanilla JS (`wwwroot/js/terminal-mockup.js`,
`wwwroot/js/site.js`), not Blazor WASM islands. Shipping the WASM runtime just to animate
three small widgets would have meant abandoning the "no JS required for core content" goal
to get progressive enhancement for a handful of DOM tweaks. All three degrade gracefully:
the install commands are already correct static HTML (JS only swaps which one is visible),
copy buttons no-op silently if `navigator.clipboard` is unavailable, and the terminal mockup
has a static `<noscript>` fallback and respects `prefers-reduced-motion`.

## Verified locally

- `dotnet build FleetMarketing.sln` (Debug and Release) — 0 warnings, 0 errors.
- `dotnet run --project src/FleetMarketing` — served the page at localhost:5272; checked
  in a real browser: hero, terminal mockup animation, platform toggle, copy buttons, the
  features/requirements/install sections all render and no console errors.
- `dotnet run --project src/FleetMarketing.Ssg -- <dir>` — produces `index.html` +
  `app.css` + `js/*.js` + `og-image.svg` + `favicon.svg` in the target directory; opened the
  exported `index.html` directly and it matches the live dev-server render.

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

- `wwwroot/og-image.svg` — a generated terminal-styled graphic, not a real screenshot (none
  exists yet, per the brief). Flagged with an HTML comment in `App.razor`: some crawlers
  (Twitter/Facebook) prefer PNG/JPG over SVG for `og:image`, so this should become a
  rendered PNG once a real terminal recording exists.
- The animated hero mockup is deliberately generic about *which* fleet UI details it shows
  — it sticks to the mechanics described in the brief (project picker → dashboard → dispatch
  → activity dot going from working to done) rather than inventing exact TUI chrome I
  haven't seen.

## Visual direction

Dark-by-default, monospace, Tokyo Night palette, per the brief. On top of that base, the
layout borrows a few structural ideas from typesafe.ai (oversized bold display headlines,
a single flat-color full-bleed statement band with a halftone texture and corner crop-marks,
thin-rule kicker-labeled columns, and OS-window-style chrome on the feature cards) — with
fleet's own colors, not theirs.
