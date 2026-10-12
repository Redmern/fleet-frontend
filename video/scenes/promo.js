// The promo as a pure function of time. render.mjs loads the cast with promo.init(),
// then calls promo.seek(t) for every frame and screenshots the page. Nothing here may
// animate on its own (no CSS transitions, no timers), or frames stop being reproducible.
(() => {
    const COLS = 120;
    const ROWS = 34;
    const FADE = 0.45;

    // Terminal clips cut from wwwroot/casts/fleet-demo.cast. Each segment plays [from, to] cast
    // seconds at a speed; startAt is the scene-local second playback starts (it holds the first frame before).
    const clips = {
        gates: { startAt: 5.8, segments: [[19.5, 25.0, 1]] },
        dispatch: { startAt: 0.6, segments: [[1.2, 21.0, 1.8]] },
        // Real time while the notification center is open, then fast through approve and the dashboard.
        status: { startAt: 0.6, segments: [[28.5, 31.8, 1], [31.8, 47.0, 2.2]] },
        // The recorder only redraws changed lines, so the detached shell keeps the old screen
        // around it; clear it so the frame shows what a real terminal shows.
        mux: { startAt: 0.6, segments: [[93.9, 101.4, 1.4]], clearAt: 94.415 },
    };

    function castTime(clip, lt) {
        let left = Math.max(0, lt - clip.startAt);
        let t = clip.segments[0][0];
        for (const [from, to, speed] of clip.segments) {
            const span = (to - from) / speed;
            if (left <= span) return from + left * speed;
            left -= span;
            t = to;
        }
        return t;
    }

    const scenes = [
        { id: "hook", dur: 5 },
        { id: "gates", dur: 12 },
        { id: "aidlc", dur: 11.5, update: updateAidlc },
        { id: "dispatch", dur: 12.5 },
        { id: "status", dur: 12 },
        { id: "mux", dur: 12, update: updateMux },
        { id: "head", dur: 10.5, update: updateHead },
        { id: "outro", dur: 7.5, update: updateOutro },
    ];

    let start = 0;
    for (const s of scenes) {
        s.start = start;
        s.el = document.getElementById(s.id);
        s.reveals = [...s.el.querySelectorAll("[data-in]")];
        s.typers = [...s.el.querySelectorAll("[data-type]")];
        for (const el of s.typers) el.dataset.full = el.textContent;
        start += s.dur;
    }
    const duration = start;

    const clamp = (v, lo = 0, hi = 1) => Math.min(hi, Math.max(lo, v));
    const ease = x => {
        x = clamp(x);
        return x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2;
    };

    function applyReveals(scene, lt) {
        for (const el of scene.reveals) {
            const tin = parseFloat(el.dataset.in);
            const tout = el.dataset.out === undefined ? Infinity : parseFloat(el.dataset.out);
            const a = ease((lt - tin) / FADE) * (1 - ease((lt - tout) / FADE));
            el.style.opacity = a.toFixed(3);
            el.style.transform = `translateY(${((1 - ease((lt - tin) / FADE)) * 24).toFixed(1)}px)`;
            el.style.visibility = a === 0 ? "hidden" : "visible";
        }
        for (const el of scene.typers) {
            const t0 = parseFloat(el.dataset.type);
            const cps = parseFloat(el.dataset.cps || "20");
            const n = Math.floor(clamp((lt - t0) * cps, 0, el.dataset.full.length));
            el.textContent = el.dataset.full.slice(0, n);
        }
    }

    // ---- Ai-DLC: the feature profile's stages and human gates, as in a real state.json.
    const dlcStages = [
        { name: "intake" },
        { name: "discover" },
        { name: "specify", skill: "fl-discuss", gate: true },
        { name: "plan", gate: true },
        { name: "build", skill: "fl-tdd", gate: true },
        { name: "verify" },
        { name: "review", skill: "fl-review" },
        { name: "deliver", skill: "fl-pr", gate: true },
        { name: "learn" },
    ];
    // Scene-local schedule: each stage runs, then waits at its gate until "you" approve.
    const RUN = 0.55;
    const WAIT = 0.75;
    const dlcSchedule = (() => {
        let t = 1.3;
        return dlcStages.map(s => {
            const slot = { run: t, wait: t + RUN, done: t + RUN + (s.gate ? WAIT : 0) };
            t = slot.done;
            return slot;
        });
    })();

    function initAidlc() {
        const list = document.querySelector("#aidlc .stages");
        list.innerHTML = dlcStages.map(s => `
            <li><span class="st"></span><span class="name">${s.name}</span>
            <code>${s.skill ?? ""}</code>${s.gate ? '<span class="diamond"></span>' : ""}</li>`).join("");
    }

    function updateAidlc(lt) {
        const items = document.querySelectorAll("#aidlc .stages li");
        const card = document.querySelector("#aidlc .gate-card");
        let gateStage = null;
        let gateState = "";
        items.forEach((li, i) => {
            const slot = dlcSchedule[i];
            const s = dlcStages[i];
            let state = "pending";
            if (lt >= slot.done) state = "done";
            else if (lt >= slot.wait && s.gate) state = "wait";
            else if (lt >= slot.run) state = "active";
            li.className = state === "pending" ? "" : state;
            li.querySelector(".st").textContent = { pending: "·", active: "▸", wait: "◆", done: "✓" }[state];
            const d = li.querySelector(".diamond");
            if (d) d.classList.toggle("passed", state === "done");
            if (s.gate && lt >= slot.wait) {
                gateStage = s.name;
                gateState = state === "wait" ? "wait" : "ok";
            }
        });
        card.className = "gate-card" + (gateState ? " " + gateState : "");
        card.querySelector(".gate-stage").textContent = gateStage ?? "none yet";
        card.querySelector(".gate-state").textContent =
            gateState === "wait" ? "waiting for you to approve…" : gateState === "ok" ? "✓ approved by you" : "";
    }

    // ---- Multiplexer: label what the footage is doing.
    function updateMux(lt) {
        const c = clips.mux;
        const castT = castTime(c, lt);
        const label = document.querySelector("#mux .mux-state");
        if (castT >= 97.842) {
            label.className = "mux-state attached";
            label.textContent = "fleet attach · every pane restored";
        } else if (castT >= c.clearAt) {
            label.className = "mux-state detached";
            label.textContent = "detached · agents still running";
        } else {
            label.className = "mux-state";
            label.textContent = "";
        }
    }

    // ---- Head orchestrator: mic, waveform, project switch.
    function initHead() {
        document.querySelector("#head .wave").innerHTML = "<i></i>".repeat(28);
    }

    function updateHead(lt) {
        const listening = lt >= 1.6 && lt < 4.6;
        document.querySelector("#head .mic").classList.toggle("live", listening);
        document.querySelector("#head .mic-label").textContent = listening ? "listening" : "hold space";
        document.querySelectorAll("#head .wave i").forEach((bar, i) => {
            const h = listening ? 8 + 36 * Math.abs(Math.sin(lt * 7.1 + i * 0.9) * Math.sin(lt * 2.3 + i * 0.37)) : 6;
            bar.style.height = h.toFixed(1) + "px";
        });
        const current = lt >= 5.0 ? "techweb" : "shop";
        document.querySelectorAll("#head .projects [data-project]").forEach(li =>
            li.classList.toggle("current", li.dataset.project === current));
    }

    // ---- Outro: the fleet mark sails in, like the site's animated logo.
    function updateOutro(lt) {
        document.querySelectorAll("#outro .ship").forEach((p, i) => {
            const k = ease((lt - 0.1 - i * 0.12) / 0.7);
            p.style.transformBox = "fill-box";
            p.style.transformOrigin = "left center";
            p.style.transform = `scaleX(${k.toFixed(3)})`;
        });
    }

    // ---- Terminal clips.
    let events = [];
    const terms = {};

    function makeTerm(name) {
        const host = document.querySelector(`[data-clip="${name}"]`);
        const term = new Terminal({
            cols: COLS,
            rows: ROWS,
            fontFamily: '"JetBrains Mono", "Fleet Symbols", monospace',
            fontSize: 16,
            lineHeight: 1.0,
            cursorBlink: false,
            disableStdin: true,
            scrollback: 0,
            allowProposedApi: true,
            theme: {
                background: "#16161e",
                foreground: "#c0caf5",
                cursor: "#16161e",
            },
        });
        term.open(host);
        return { term, clip: clips[name], idx: 0, castT: -1 };
    }

    function feed(t, upTo) {
        let out = "";
        while (t.idx < events.length && events[t.idx][0] <= upTo) {
            const [at, kind, data] = events[t.idx];
            if (kind === "o") {
                if (t.clip.clearAt !== undefined && at === t.clip.clearAt) out += "\x1b[2J\x1b[H";
                out += data;
            }
            t.idx++;
        }
        t.castT = upTo;
        return out ? new Promise(r => t.term.write(out, r)) : Promise.resolve();
    }

    async function init(castText) {
        const lines = castText.trim().split("\n");
        events = lines.slice(1).map(l => JSON.parse(l));
        initAidlc();
        initHead();
        // xterm measures its cell size when it opens; inside a display:none scene it measures
        // nothing and pads glyphs with odd letter-spacing. Open every terminal with its scene laid out.
        await document.fonts.ready;
        for (const s of scenes) {
            s.el.style.opacity = "0";
            s.el.classList.add("active");
        }
        for (const name of Object.keys(clips)) {
            terms[name] = makeTerm(name);
            await feed(terms[name], clips[name].segments[0][0]);
        }
        await nextFrame();
        for (const s of scenes) s.el.classList.remove("active");
    }

    const nextFrame = () => new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)));

    async function seek(t) {
        const writes = [];
        for (const s of scenes) {
            const lt = t - s.start;
            const on = lt >= 0 && lt < s.dur;
            s.el.classList.toggle("active", on);
            if (!on) continue;
            const fadeIn = s.start === 0 ? 1 : ease(lt / FADE);
            const fadeOut = s.start + s.dur >= duration ? 1 : ease((s.dur - lt) / FADE);
            s.el.style.opacity = Math.min(fadeIn, fadeOut).toFixed(3);
            applyReveals(s, lt);
            s.update?.(lt);
            const clip = s.el.querySelector("[data-clip]");
            if (clip) {
                const tm = terms[clip.dataset.clip];
                const castT = castTime(tm.clip, lt);
                if (castT > tm.castT) writes.push(feed(tm, castT));
            }
        }
        await Promise.all(writes);
        await nextFrame();
    }

    window.promo = { init, seek, duration, scenes: scenes.map(s => ({ id: s.id, start: s.start, dur: s.dur })) };
})();
