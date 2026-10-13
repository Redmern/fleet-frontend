// Renders scenes/index.html frame by frame in headless Chromium and pipes the frames to ffmpeg.
//
//   node render.mjs               out/fleet-promo.mp4 + out/fleet-promo-poster.jpg
//   node render.mjs --stills      one PNG per scene (at 75% of it) in out/stills/, no video
//   node render.mjs --stills --at=12,45.5   PNGs at those seconds instead
//
// Needs ffmpeg on PATH and a Chromium/Chrome binary (CHROME_PATH, or a usual install path).
import { chromium } from "playwright-core";
import { spawn } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, statSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const outDir = join(here, "out");
const mp4 = join(outDir, "fleet-promo.mp4");
const poster = join(outDir, "fleet-promo-poster.jpg");
const castPath = join(here, "..", "src", "FleetMarketing", "wwwroot", "casts", "fleet-demo.cast");

const FPS = 30;
const WIDTH = 1920;
const HEIGHT = 1080;
// Poster: mid "dispatch" scene, the one-prompt moment with terminal footage and caption.
const POSTER_SCENE = "dispatch";

const args = process.argv.slice(2);

function findChrome() {
    const candidates = [
        process.env.CHROME_PATH,
        "/usr/bin/chromium",
        "/usr/bin/chromium-browser",
        "/usr/bin/google-chrome-stable",
        "/usr/bin/google-chrome",
        "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
        "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
    ].filter(Boolean);
    const found = candidates.find(p => existsSync(p));
    if (!found) throw new Error("No Chromium/Chrome found; set CHROME_PATH");
    return found;
}

async function openPage() {
    const browser = await chromium.launch({ executablePath: findChrome() });
    const page = await browser.newPage({ viewport: { width: WIDTH, height: HEIGHT }, deviceScaleFactor: 1 });
    // A script error means wrong frames; stop rather than ship them.
    page.on("pageerror", e => {
        console.error("page error:", e.message);
        process.exit(1);
    });
    await page.goto(pathToFileURL(join(here, "scenes", "index.html")).href);
    await page.evaluate(text => window.promo.init(text), readFileSync(castPath, "utf8"));
    return { browser, page };
}

const { browser, page } = await openPage();
const info = await page.evaluate(() => ({ duration: window.promo.duration, scenes: window.promo.scenes }));
mkdirSync(outDir, { recursive: true });

if (args.includes("--stills")) {
    const dir = join(outDir, "stills");
    mkdirSync(dir, { recursive: true });
    const at = args.find(a => a.startsWith("--at="));
    const shots = at
        ? at.slice(5).split(",").map(Number).sort((a, b) => a - b).map(t => ({ name: `t${t}`, t }))
        : info.scenes.map(s => ({ name: s.id, t: s.start + s.dur * 0.75 }));
    // Terminal clips only play forward, so stills are taken in time order.
    for (const { name, t } of shots) {
        await page.evaluate(t => window.promo.seek(t), t);
        await page.screenshot({ path: join(dir, `${name}.png`) });
        console.log(`still ${name} @ ${t.toFixed(2)} s`);
    }
    await browser.close();
    process.exit();
}

const frames = Math.round(info.duration * FPS);
console.log(`rendering ${frames} frames (${info.duration} s @ ${FPS} fps)`);

const ffmpeg = spawn("ffmpeg", [
    "-v", "error", "-y",
    "-f", "image2pipe", "-framerate", String(FPS), "-c:v", "mjpeg", "-i", "-",
    "-c:v", "libx264", "-preset", "slow", "-crf", "20", "-tune", "animation",
    // JPEG frames are full-range BT.601 (yuvj420p); browsers and the check expect limited-range
    // BT.709 yuv420p, tagged so players do not guess the matrix.
    "-vf", "scale=in_range=full:out_range=limited:in_color_matrix=bt601:out_color_matrix=bt709,format=yuv420p",
    "-color_range", "tv", "-colorspace", "bt709", "-color_primaries", "bt709", "-color_trc", "bt709",
    "-movflags", "+faststart", "-an",
    mp4,
], { stdio: ["pipe", "inherit", "inherit"] });
const ffmpegDone = new Promise((resolve, reject) =>
    ffmpeg.on("close", code => (code === 0 ? resolve() : reject(new Error(`ffmpeg exited ${code}`)))));

const posterScene = info.scenes.find(s => s.id === POSTER_SCENE);
if (!posterScene) throw new Error(`POSTER_SCENE "${POSTER_SCENE}" is not a scene id`);
const posterT = posterScene.start + posterScene.dur * 0.75;
let posterSaved = false;
const started = Date.now();

for (let i = 0; i < frames; i++) {
    const t = i / FPS;
    await page.evaluate(t => window.promo.seek(t), t);
    const jpg = await page.screenshot({ type: "jpeg", quality: 92 });
    if (!ffmpeg.stdin.write(jpg)) await new Promise(r => ffmpeg.stdin.once("drain", r));
    if (!posterSaved && t >= posterT) {
        await page.screenshot({ path: poster, type: "jpeg", quality: 85 });
        posterSaved = true;
    }
    if (i % (FPS * 10) === 0) console.log(`  ${(t).toFixed(0)} s  (${((Date.now() - started) / 1000).toFixed(0)} s elapsed)`);
}

ffmpeg.stdin.end();
await ffmpegDone;
await browser.close();
console.log(`wrote ${mp4} (${(statSync(mp4).size / 1048576).toFixed(1)} MB) and ${poster}`);
