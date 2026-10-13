# fleet promo video

An 83 s, 1920×1080, silent h264 mp4 of fleet's six most valuable features (from
`docs/research/gap.md`). It is a shareable file for social posts and the like. Since October 2026 the
site no longer embeds it: the Showcase section plays a terminal recording of the same features
instead, in the style of the "See it live" demo. That recording is built in `terminal/`
(see `terminal/README.md`).

## Build

One command, from this folder:

```sh
npm ci && npm run render
```

It writes `out/fleet-promo.mp4` and `out/fleet-promo-poster.jpg`. Check the result with:

```sh
bash check-video.sh out/fleet-promo.mp4   # 60–90 s, 1920×1080, h264 yuv420p, +faststart, < 15 MB
```

Requirements: Node 20+, `ffmpeg`/`ffprobe` on PATH, and a Chromium or Chrome binary.
The render looks in the usual install paths; set `CHROME_PATH` to use another.
A full render takes about two minutes.

Other scripts:

- `npm run preview` writes one PNG per scene to `out/stills/`.
- `node render.mjs --stills --at=12,45.5` writes stills at the given seconds.

## How it works

- `scenes/index.html`, `promo.css` and `promo.js` hold every scene as HTML/CSS in the
  site's Tokyo Night tokens. `promo.js` is a pure function of time: `promo.seek(t)` lays out
  the frame at `t`. Nothing animates on its own.
- Terminal footage is cut from the site's real recording,
  `src/FleetMarketing/wwwroot/casts/fleet-demo.cast`. It is replayed into xterm.js up to the
  frame's cast time. The cuts and speeds are in `clips` at the top of `promo.js`.
- `render.mjs` opens the page in headless Chromium (playwright-core), seeks each frame at
  30 fps, screenshots it and pipes the JPEGs to ffmpeg (`libx264`, `yuv420p`,
  `+faststart`, no audio track).

## Storyboard

| Time | Scene | Source |
|---|---|---|
| 0–5 s | Hook: "Your agents write the code. Who decides what ships?" | text |
| 5–17 s | 01 Permissioned MCP orchestration + git gates | illustration, then cast 19.5–25 s (commit gate prompt) |
| 17–28.5 s | 02 Ai-DLC staged process with human gates | illustration of a `feature` profile's real stage list |
| 28.5–41 s | 03 One `,` prompt → sub-orchestrator → agents | cast 1.2–21 s |
| 41–53 s | 04 Live status and notifications | cast 28.5–47 s |
| 53–65 s | 05 Multiplexer detach/reattach + ssh remotes | cast 93.9–101.4 s, then ssh commands |
| 65–75.5 s | 06 Voice head orchestrator across projects | illustration |
| 75.5–83 s | fleet logo, tagline, install line | text |

Every feature scene has an on-screen kicker, headline and explanation, so nothing depends
on sound. Panels that are not real footage are tagged "illustration". The claims follow
`docs/research/features.md`. Voice forwarding to remotes is experimental, so the video
does not show it. Its caveat that voice needs a claude.ai login is on screen.

## Why not Remotion

Remotion was the first choice in the design. Its licence
(https://github.com/remotion-dev/remotion/blob/main/LICENSE.md, read 2026-10-12) is free
only for individuals, for-profit organisations with up to 3 employees, non-profits, and
evaluation. fleet's maintainer qualifies, but anyone at a larger company who wanted to
re-render this video would need a paid company licence. This uses the fallback the design
allowed instead: HTML/CSS scenes captured frame by frame with a headless browser and
encoded with ffmpeg. Its dependencies use permissive open-source licences:
playwright-core (Apache-2.0), @xterm/xterm (MIT) and JetBrains Mono (OFL-1.1).
