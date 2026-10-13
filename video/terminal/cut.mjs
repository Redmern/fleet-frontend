// Cuts a raw recording (drive.py's raw.jsonl) into the site's asciicast.
//
//   node cut.mjs <raw.jsonl[.gz]> <edit.json> <out.cast>     write the edited cast
//   node cut.mjs <raw.jsonl> --peek 12.5,40             print the screen at those raw times
//   node cut.mjs <raw.jsonl> --scrub <out.jsonl>          write a scrubbed copy of the take, to commit
//
// edit.json lists the parts of the raw recording to keep, in order:
//   { "maxGap": 1.2, "chapters": [ { "label": "Open a project",
//       "parts": [ { "from": 2.5, "to": 24, "speed": 1 }, ... ] } ] }
// Each part plays raw [from, to] at `speed`, with pauses longer than maxGap (after the speed-up)
// shortened to maxGap, then holds its last frame for `hold` seconds (time to read it). Each
// chapter becomes an asciicast marker at its first part.
//
// A cut drops output, so the player's screen would not match the real one after it. Every part
// therefore starts by resetting the player's terminal and redrawing the real screen at `from`:
// the raw output up to `from` is replayed into a headless xterm.js and serialized. Nothing is
// drawn that fleet did not draw.
//
// Scrubbing: the local user name (in paths) and the Claude plan name are replaced, keeping each
// line's width, so nothing personal ends up on the site.
import { readFileSync, writeFileSync } from "node:fs";
import { gunzipSync } from "node:zlib";
import { userInfo } from "node:os";
import xtermHeadless from "@xterm/headless";
import serializeAddon from "@xterm/addon-serialize";

const { Terminal } = xtermHeadless;
const { SerializeAddon } = serializeAddon;

const [rawPath, second, third] = process.argv.slice(2);
const raw = readFileSync(rawPath);
const lines = (rawPath.endsWith(".gz") ? gunzipSync(raw) : raw).toString("utf8").trim().split("\n");
const header = JSON.parse(lines[0]);
const events = lines.slice(1).map(l => JSON.parse(l)).filter(e => e[1] === "o");

// --scrub (on a raw take, before it is committed) also swaps the recording user's name for a
// placeholder of the same length wherever it is a path segment: fleet redraws lines in pieces,
// so "/home/" is not always in the same write. SCRUB_USER names that user if it isn't you.
// Cutting a committed take does not use this rule, so the result doesn't depend on who cuts.
const user = process.env.SCRUB_USER || userInfo().username;
const placeholder = (user.length === 3 ? "you" : "user").padEnd(user.length, "_").slice(0, user.length);
const userSegment = new RegExp(`/${user.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}(?=[/'"\\s]|$)`, "g");
const planName = [/ · Claude (Max|Pro|Team|Enterprise)/g, m => " ".repeat(m.length)];
const scrub = text => text.replace(...planName);
const scrubTake = text => scrub(text).replace(userSegment, "/" + placeholder);

function terminal() {
    const term = new Terminal({ cols: header.width, rows: header.height, allowProposedApi: true, scrollback: 0 });
    const ser = new SerializeAddon();
    term.loadAddon(ser);
    return { term, ser, idx: 0 };
}

// Feed raw output up to raw time t (exclusive of later events).
function feedTo(state, t) {
    let chunk = "";
    while (state.idx < events.length && events[state.idx][0] <= t) chunk += events[state.idx++][2];
    return new Promise(resolve => (chunk ? state.term.write(chunk, resolve) : resolve()));
}

function screenText(term) {
    const buf = term.buffer.active;
    const out = [];
    for (let y = 0; y < term.rows; y++) out.push(buf.getLine(buf.viewportY + y)?.translateToString(true) ?? "");
    return out.join("\n");
}

if (second === "--scrub") {
    const scrubbed = lines.slice(1).map(l => JSON.parse(l)).map(e => (e[1] === "o" ? [e[0], e[1], scrubTake(e[2])] : e));
    writeFileSync(third, [lines[0], ...scrubbed.map(e => JSON.stringify(e))].join("\n") + "\n");
    process.exit(0);
}

if (second === "--peek") {
    const state = terminal();
    for (const t of third.split(",").map(Number).sort((a, b) => a - b)) {
        await feedTo(state, t);
        console.log(`---- t=${t}`);
        console.log(screenText(state.term));
    }
    process.exit(0);
}

const edit = JSON.parse(readFileSync(second, "utf8"));
const maxGap = edit.maxGap ?? 1.2;
const out = [JSON.stringify({ version: 2, width: header.width, height: header.height, env: header.env })];
const state = terminal();
let clock = 0;

for (const chapter of edit.chapters) {
    chapter.parts.forEach((part, i) => {
        part.chapter = i === 0 ? chapter.label : null;
    });
}

for (const part of edit.chapters.flatMap(c => c.parts)) {
    // Bring the emulator to the cut point and redraw that screen in the player.
    await feedTo(state, part.from);
    clock += 0.001;
    if (part.chapter) out.push(JSON.stringify([round(clock), "m", part.chapter]));
    const screen = state.ser.serialize({ scrollback: 0 });
    out.push(JSON.stringify([round(clock), "o", scrub("\x1bc" + screen)]));

    let last = part.from;
    const speed = part.speed ?? 1;
    while (state.idx < events.length && events[state.idx][0] <= part.to) {
        const [t, , data] = events[state.idx];
        clock += Math.min((t - last) / speed, maxGap);
        last = t;
        out.push(JSON.stringify([round(clock), "o", scrub(data)]));
        await new Promise(resolve => state.term.write(data, resolve));
        state.idx++;
    }
    clock += Math.min((part.to - last) / speed, maxGap) + (part.hold ?? 0);
}

// The player stops at the last event, so the final hold needs an event of its own.
out.push(JSON.stringify([round(clock), "o", ""]));
writeFileSync(third, out.join("\n") + "\n");
console.log(`wrote ${third}: ${round(clock)} s, ${out.length - 1} events`);

function round(t) {
    return Math.round(t * 1000) / 1000;
}
