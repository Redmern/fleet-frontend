// Renders one moment of an asciicast as an SVG, cell by cell, from a headless xterm.js: a still
// of exactly what the recording shows. Used to check an edit and to make the site's og-image.
//
//   node frame.mjs <cast> <time> <out.svg> [--og]
//
// --og lays the frame out as a 1200x630 social card with the site's tagline.
// Turn the SVG into a PNG with:  rsvg-convert out.svg -o out.png
// It needs a monospace font with Nerd Font glyphs installed (JetBrainsMono Nerd Font Mono).
import { readFileSync, writeFileSync } from "node:fs";
import xtermHeadless from "@xterm/headless";

const { Terminal } = xtermHeadless;
const [castPath, timeArg, outPath, ...flags] = process.argv.slice(2);
const og = flags.includes("--og");

const lines = readFileSync(castPath, "utf8").trim().split("\n");
const header = JSON.parse(lines[0]);
const term = new Terminal({ cols: header.width, rows: header.height, allowProposedApi: true, scrollback: 0 });
const time = Number(timeArg);
let data = "";
for (const line of lines.slice(1)) {
    const e = JSON.parse(line);
    if (e[0] > time) break;
    if (e[1] === "o") data += e[2];
}
await new Promise(resolve => term.write(data, resolve));

// The site player's "fleet" theme (Tokyo Night), app.css .asciinema-player-theme-fleet.
const FG = "#c0caf5", BG = "#1a1b26";
const ANSI = ["#15161e", "#f7768e", "#9ece6a", "#e0af68", "#7aa2f7", "#bb9af7", "#7dcfff", "#a9b1d6",
    "#414868", "#f7768e", "#9ece6a", "#e0af68", "#7aa2f7", "#bb9af7", "#7dcfff", "#c0caf5"];
const hex = n => "#" + n.toString(16).padStart(6, "0");
function palette(i) {
    if (i < 16) return ANSI[i];
    if (i < 232) {
        const v = [0, 95, 135, 175, 215, 255];
        const c = i - 16;
        return hex((v[Math.floor(c / 36)] << 16) | (v[Math.floor(c / 6) % 6] << 8) | v[c % 6]);
    }
    const g = 8 + (i - 232) * 10;
    return hex((g << 16) | (g << 8) | g);
}
const color = (rgb, pal, def, value, fallback) => (def ? fallback : rgb ? hex(value) : pal ? palette(value) : fallback);
const esc = s => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

const CW = 9.6, CH = 20; // cell size at a 16px font
const W = header.width * CW, H = header.height * CH;
const rects = [], texts = [];
const buf = term.buffer.active;
for (let y = 0; y < header.height; y++) {
    const line = buf.getLine(buf.viewportY + y);
    if (!line) continue;
    for (let x = 0; x < header.width; x++) {
        const cell = line.getCell(x);
        if (!cell || cell.getWidth() === 0) continue;
        let fg = color(cell.isFgRGB(), cell.isFgPalette(), cell.isFgDefault(), cell.getFgColor(), FG);
        let bg = color(cell.isBgRGB(), cell.isBgPalette(), cell.isBgDefault(), cell.getBgColor(), BG);
        if (cell.isInverse()) [fg, bg] = [bg, fg];
        const w = cell.getWidth();
        if (bg !== BG) rects.push(`<rect x="${(x * CW).toFixed(1)}" y="${y * CH}" width="${(w * CW + 0.6).toFixed(1)}" height="${CH + 0.6}" fill="${bg}"/>`);
        const ch = cell.getChars();
        if (ch && ch !== " ") {
            const attrs = `${cell.isBold() ? ' font-weight="700"' : ""}${cell.isDim() ? ' opacity="0.6"' : ""}${cell.isItalic() ? ' font-style="italic"' : ""}`;
            texts.push(`<text x="${(x * CW).toFixed(1)}" y="${y * CH + 15}" fill="${fg}"${attrs}>${esc(ch)}</text>`);
        }
    }
}

const screen = `<g font-family="JetBrainsMono Nerd Font Mono, JetBrains Mono, monospace" font-size="16"><rect width="${W}" height="${H}" fill="${BG}"/>${rects.join("")}${texts.join("")}</g>`;

let svg;
if (og) {
    // 1200x630: tagline on top, the frame below it at full width, its bottom cropped by the card.
    const scale = 1104 / W;
    const visible = (630 - 134 - 24) / scale;
    svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630">
<defs><clipPath id="screen"><rect x="0" y="0" width="${W}" height="${visible.toFixed(1)}" rx="8"/></clipPath></defs>
<rect width="1200" height="630" fill="#13141c"/>
<text x="48" y="70" font-family="JetBrainsMono Nerd Font Mono, monospace" font-size="38" font-weight="800" fill="#c0caf5">fleet <tspan font-size="28" font-weight="400" fill="#7dcfff">gated orchestration for Claude Code agents</tspan></text>
<text x="48" y="108" font-family="JetBrainsMono Nerd Font Mono, monospace" font-size="19" fill="#9aa5ce">Permissions and git gates you set. A staged process that stops for your approval.</text>
<g transform="translate(48 134) scale(${scale.toFixed(4)})"><g clip-path="url(#screen)">${screen}</g><rect x="0" y="0" width="${W}" height="${visible.toFixed(1)}" rx="8" fill="none" stroke="#3b4261" stroke-width="2"/></g>
</svg>`;
} else {
    svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">${screen}</svg>`;
}
writeFileSync(outPath, svg);
console.log(`wrote ${outPath} (t=${time})`);
