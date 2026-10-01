// "How fleet ships", told in seven scroll steps: a repository is a container; a project is all
// of them, headed for production; a prompt hits the dock ("add Apple Pay to checkout") and the
// repo agents make their changes; the changed containers ship together on the project's ship;
// with fleet, four projects cross at once; they land in production; and a microservices
// project is still just one (well-loaded) ship.
//
// Agents are small bots: one in each container (a repo agent in its own worktree), a captain
// on each ship (the project's orchestrator) and a dockmaster on the quay (fleet's main
// orchestrator). The scroll position through the pinned section (0..1) decides where
// everything is, so scrubbing either way is exact and smooth; a requestAnimationFrame loop
// adds ambient motion (bobbing, wakes, glowing lights) while the section is on screen. With
// reduced motion the final scene is drawn once and all captions are shown; without JS only
// the captions are shown (see app.css).
(function () {
    "use strict";

    var section = document.querySelector("[data-ship-it]");
    if (!section) return;
    var svg = section.querySelector("[data-ship-svg]");
    var NS = "http://www.w3.org/2000/svg";
    var reduceMotion = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    // ---- helpers -------------------------------------------------------------------------

    function el(tag, attrs, parent, text) {
        var node = document.createElementNS(NS, tag);
        for (var k in attrs) node.setAttribute(k, attrs[k]);
        if (text != null) node.textContent = text;
        if (parent) parent.appendChild(node);
        return node;
    }
    function clamp(v, a, b) { return Math.min(b, Math.max(a, v)); }
    function seg(p, a, b) { return clamp((p - a) / (b - a), 0, 1); }
    function lerp(a, b, t) { return a + (b - a) * t; }
    function inOut(t) { return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2; }
    function out(t) { return 1 - Math.pow(1 - t, 3); }
    function back(t) { var c = 1.7; return 1 + (c + 1) * Math.pow(t - 1, 3) + c * Math.pow(t - 1, 2); }
    function bounce(t) {
        var n = 7.5625, d = 2.75;
        if (t < 1 / d) return n * t * t;
        if (t < 2 / d) return n * (t -= 1.5 / d) * t + 0.75;
        if (t < 2.5 / d) return n * (t -= 2.25 / d) * t + 0.9375;
        return n * (t -= 2.625 / d) * t + 0.984375;
    }
    function random(seed) {  // mulberry32: the same sky on every load
        return function () {
            seed |= 0; seed = (seed + 0x6d2b79f5) | 0;
            var t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
            t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
            return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
        };
    }
    function layer(name) { return svg.querySelector('[data-layer="' + name + '"]'); }
    function chip(parent, x, y, label, fill, color) {
        var g = el("g", { opacity: 0, transform: "translate(" + x + " " + y + ")" }, parent);
        var width = label.length * 7.6 + 22;
        el("rect", { x: -width / 2, y: -11, width: width, height: 22, rx: 11, fill: fill, stroke: color === "#13141c" ? "none" : "#3b4261" }, g);
        el("text", { x: 0, y: 4, "class": "ship-tag-text", fill: color }, g, label);
        return g;
    }
    function fade(node, value) { node.setAttribute("opacity", clamp(value, 0, 1).toFixed(3)); }

    // ---- the cast ------------------------------------------------------------------------

    var W = 80, H = 44;                          // a container
    var LIGHT = { off: "#565f89", idle: "#7dcfff", work: "#e0af68", done: "#9ece6a" };
    var LANES = [{ y: 392, s: 0.52 }, { y: 452, s: 0.62 }, { y: 516, s: 0.74 }, { y: 592, s: 0.88 }];   // far to near

    // The steps, as scroll fractions.
    var T = {
        drops: [[0.02, 0.08], [0.10, 0.14], [0.13, 0.17], [0.16, 0.20]],
        project: [0.18, 0.21],
        prompt: [0.22, 0.24], typing: [0.24, 0.30], hit: [0.30, 0.32], work: [0.32, 0.36], ready: [0.36, 0.38],
        shopIn: [0.38, 0.42], load: [0.42, 0.49], board: [0.48, 0.50],
        othersIn: [0.52, 0.58], signal: [0.58, 0.62], cross: [0.62, 0.72],
        land: 0.73, offRight: [0.82, 0.86],
        bigIn: [0.84, 0.88], bigLoad: [0.87, 0.96], bigWork: 0.965
    };

    // Projects. shop's four containers start on the dock; the other ships arrive loaded.
    var SHIPS = [
        { name: "shop",   lane: 3, cols: 4, flag: "#bb9af7", dock: 420, end: 720 },
        { name: "mobile", lane: 2, cols: 3, flag: "#7dcfff", dock: 455, end: 750, prompt: ", add offline mode" },
        { name: "blog",   lane: 1, cols: 2, flag: "#ff9e64", dock: 490, end: 780, prompt: ", add dark mode" },
        { name: "admin",  lane: 0, cols: 2, flag: "#9ece6a", dock: 525, end: 805, prompt: ", add CSV export" },
        { name: "platform", lane: 3, cols: 4, tiers: 3, flag: "#f7768e", dock: 470, end: 470, big: true }
    ];
    var CONTAINERS = [
        { name: "web",      color: "#bb9af7", ship: 0, quay: { x: 40, y: 256 } },
        { name: "api",      color: "#7dcfff", ship: 0, quay: { x: 128, y: 256 } },
        { name: "payments", color: "#9ece6a", ship: 0, quay: { x: 40, y: 212 } },
        { name: "infra",    color: "#ff9e64", ship: 0, quay: { x: 128, y: 212 } },
        { name: "ios",      color: "#7aa2f7", ship: 1 }, { name: "android", color: "#9ece6a", ship: 1 }, { name: "push", color: "#e0af68", ship: 1 },
        { name: "site",     color: "#73daca", ship: 2 }, { name: "cms",     color: "#f7768e", ship: 2 },
        { name: "dash",     color: "#bb9af7", ship: 3 }, { name: "reports", color: "#7dcfff", ship: 3 }
    ];
    ["auth", "users", "cart", "catalog", "search", "orders", "payments", "inventory", "shipping", "emails", "reviews", "gateway"]
        .forEach(function (name, k) {
            var colors = ["#7dcfff", "#bb9af7", "#9ece6a", "#ff9e64", "#73daca", "#7aa2f7", "#f7768e", "#e0af68"];
            CONTAINERS.push({ name: name, color: colors[k % colors.length], ship: 4, order: k });
        });
    CONTAINERS.forEach(function (c) {
        var ship = SHIPS[c.ship];
        var mates = CONTAINERS.filter(function (o) { return o.ship === c.ship; });
        var k = mates.indexOf(c), cols = ship.cols, deckW = cols * 86 - 6;
        c.deckX = -deckW / 2 + (k % cols) * 86;
        c.deckY = -60 - Math.floor(k / cols) * 46;
    });
    var CRANE_TIP = { x: 336, y: 124 };
    var DOCKMASTER = { x: 236, y: 287 };

    // ---- the set: sky, quays, cranes, lighthouse ------------------------------------------

    var sky = layer("sky");
    el("circle", { cx: 640, cy: 86, r: 110, fill: "url(#ship-moon)" }, sky);
    el("circle", { cx: 640, cy: 86, r: 24, fill: "#c0caf5", opacity: "0.92" }, sky);
    var rnd = random(7);
    for (var i = 0; i < 46; i++) {
        el("circle", {
            cx: (rnd() * 1200).toFixed(1), cy: (rnd() * 280).toFixed(1), r: (0.6 + rnd() * 1.3).toFixed(2),
            fill: "#c0caf5", "class": "ship-star", style: "animation-delay:" + (rnd() * 4).toFixed(2) + "s"
        }, sky);
    }
    el("line", { x1: 0, y1: 331, x2: 1200, y2: 331, stroke: "#7aa2f7", "stroke-opacity": "0.35" }, sky);

    var quays = layer("quays");
    function quay(x, w) {
        for (var px = x + 14; px < x + w - 4; px += 34) {
            el("rect", { x: px, y: 340, width: 7, height: 34, fill: "#1a1b26", stroke: "#292e42" }, quays);
        }
        el("rect", { x: x, y: 300, width: w, height: 44, rx: 4, fill: "#24283b", stroke: "#3b4261" }, quays);
        el("line", { x1: x + 4, y1: 301.5, x2: x + w - 4, y2: 301.5, stroke: "#565f89" }, quays);
    }
    quay(-10, 290);
    quay(890, 322);
    function crane(postX, tipX) {
        var g = el("g", { stroke: "#3b4261", "stroke-width": 4, "stroke-linecap": "round", fill: "none" }, quays);
        el("line", { x1: postX, y1: 300, x2: postX, y2: 118 }, g);
        el("line", { x1: postX, y1: 124, x2: tipX, y2: 124 }, g);
        el("line", { x1: postX, y1: 170, x2: lerp(postX, tipX, 0.55), y2: 124, "stroke-width": 2 }, g);
        el("line", { x1: postX - 20, y1: 124, x2: postX, y2: 124 }, g);
        el("rect", { x: postX - 34, y: 116, width: 16, height: 16, rx: 2, fill: "#3b4261", stroke: "none" }, quays);
    }
    crane(262, CRANE_TIP.x);
    crane(908, 818);
    el("text", { x: 120, y: 328, "class": "ship-sign" }, quays, "dock");
    var productionSign = el("text", { x: 1030, y: 328, "class": "ship-sign" }, quays, "production");
    var productionGlow = el("rect", { x: 896, y: 300, width: 310, height: 44, rx: 4, fill: "none", stroke: LIGHT.done, "stroke-width": 2, opacity: 0, filter: "url(#ship-glow)" }, quays);

    var lighthouse = el("g", { transform: "translate(1166 300)" }, quays);
    el("path", { d: "M-16,0 L-10,-118 H10 L16,0 Z", fill: "#c0caf5" }, lighthouse);
    el("path", { d: "M-14.4,-30 L-13.4,-52 H13.4 L14.4,-30 Z M-12.4,-74 L-11.6,-94 H11.6 L12.4,-74 Z", fill: "#f7768e" }, lighthouse);
    el("rect", { x: -13, y: -130, width: 26, height: 12, rx: 3, fill: "#24283b", stroke: "#565f89" }, lighthouse);
    var sweep = el("g", {}, el("g", { transform: "translate(0 -124)" }, lighthouse));
    el("path", { d: "M0,0 L-380,-34 L-380,34 Z", fill: "url(#ship-beam)", opacity: "0.7" }, sweep);
    el("animateTransform", {
        attributeName: "transform", type: "rotate", values: "-16;4;-16", dur: "8s",
        repeatCount: "indefinite", calcMode: "spline", keySplines: "0.45 0 0.55 1;0.45 0 0.55 1"
    }, sweep);
    el("circle", { cx: 0, cy: -124, r: 5, fill: "#e0af68", filter: "url(#ship-glow)" }, lighthouse);

    // ---- agents: small bots with a status light on their antenna ----------------------------

    function bot(parent, x, y, r) {
        var g = el("g", { transform: "translate(" + x + " " + y + ")" }, parent);
        var halo = el("circle", { cx: 0, cy: -r * 1.9, r: r * 1.1, fill: LIGHT.work, opacity: 0, filter: "url(#ship-glow)" }, g);
        el("line", { x1: 0, y1: -r * 0.8, x2: 0, y2: -r * 1.7, stroke: "#a9b1d6", "stroke-width": Math.max(1, r * 0.2) }, g);
        var light = el("circle", { cx: 0, cy: -r * 1.9, r: r * 0.42, fill: LIGHT.off }, g);
        el("rect", { x: -r, y: -r * 0.85, width: 2 * r, height: r * 1.7, rx: r * 0.6, fill: "#24283b", stroke: "#a9b1d6", "stroke-width": Math.max(0.8, r * 0.14) }, g);
        var eyes = el("g", { fill: LIGHT.idle }, g);
        el("circle", { cx: -r * 0.38, cy: -r * 0.05, r: r * 0.2 }, eyes);
        el("circle", { cx: r * 0.38, cy: -r * 0.05, r: r * 0.2 }, eyes);
        return { g: g, light: light, halo: halo, eyes: eyes };
    }
    function setBot(b, state, now) {
        b.light.setAttribute("fill", LIGHT[state]);
        b.eyes.setAttribute("fill", state === "off" ? "#3b4261" : state === "done" ? LIGHT.done : LIGHT.idle);
        var glow = state === "work" ? 0.35 + 0.25 * Math.sin(now / 160) : state === "done" ? 0.22 : 0;
        b.halo.setAttribute("fill", state === "done" ? LIGHT.done : LIGHT.work);
        b.halo.setAttribute("opacity", Math.max(0, glow).toFixed(3));
    }

    // The dockmaster (fleet's main orchestrator), its signal rings, and the prompt it receives.
    var signal = [0, 1].map(function () {
        return el("circle", { cx: DOCKMASTER.x, cy: DOCKMASTER.y - 17, r: 0, fill: "none", stroke: LIGHT.work, "stroke-width": 2, opacity: 0 }, quays);
    });
    var dockmaster = bot(quays, DOCKMASTER.x, DOCKMASTER.y, 11);
    var dockChip = chip(quays, 300, 196, "main orchestrator", "#24283b", "#c0caf5");   // clear of the stack

    var cargo = layer("cargo");
    var PROMPT = "› , add Apple Pay to checkout";
    var prompt = el("g", { opacity: 0, transform: "translate(24 150)" }, cargo);
    el("rect", { width: 330, height: 36, rx: 9, fill: "#13141c", stroke: "#7aa2f7", "stroke-width": 1.5, filter: "url(#ship-glow)" }, prompt);
    var promptText = el("text", { x: 14, y: 23, "class": "ship-prompt-text" }, prompt, "");
    var promptCaret = el("rect", { x: 14, y: 11, width: 8, height: 15, rx: 1, fill: "#c0caf5" }, prompt);
    var promptPulse = el("circle", { r: 5, fill: "#7aa2f7", opacity: 0, filter: "url(#ship-glow)" }, cargo);
    var dispatch = [0, 1, 2, 3].map(function () {
        return el("line", { stroke: LIGHT.work, "stroke-width": 1.5, "stroke-dasharray": "4 4", opacity: 0 }, cargo);
    });
    var projectBracket = el("g", { opacity: 0 }, cargo);
    el("rect", { x: 28, y: 200, width: 192, height: 108, rx: 12, fill: "none", stroke: "#bb9af7", "stroke-width": 2, "stroke-dasharray": "7 6" }, projectBracket);
    chip(projectBracket, 124, 192, "project · shop", "#bb9af7", "#13141c").setAttribute("opacity", 1);

    // ---- ships ---------------------------------------------------------------------------

    var lanes = layer("lanes");
    function waves(group, y, dur, opacity) {
        var d = "M-480," + (y + 6);
        for (var x = -480; x <= 1680; x += 60) d += " q15,-5 30,0 t30,0";
        var band = el("path", { d: d + " V" + (y + 34) + " H-480 Z", fill: "#1a2440", "fill-opacity": opacity }, group);
        var crest = el("path", { d: d, fill: "none", stroke: "#7aa2f7", "stroke-opacity": "0.28", "stroke-width": 1.4 }, group);
        [band, crest].forEach(function (node) {
            el("animateTransform", { attributeName: "transform", type: "translate", from: "0 0", to: "-120 0", dur: dur + "s", repeatCount: "indefinite" }, node);
        });
    }
    var laneGroups = LANES.map(function (lane, n) {
        var g = el("g", {}, lanes);
        return { ships: el("g", {}, g), water: el("g", {}, g), lane: lane, dur: 5 + n * 0.7 };
    });
    var ships = SHIPS.map(function (s, n) {
        var half = (s.cols * 86 - 6) / 2, S = -half - 62, B = half + 10;   // stern and start of the bow
        var g = el("g", { opacity: 0 }, laneGroups[s.lane].ships);
        var wake = el("g", { opacity: 0 }, g);
        el("path", { d: "M" + (S - 4) + ",6 C" + (S - 60) + ",2 " + (S - 120) + ",12 " + (S - 210) + ",6", fill: "none", stroke: "#c0caf5", "stroke-opacity": "0.55", "stroke-width": 3, "stroke-linecap": "round" }, wake);
        el("path", { d: "M" + (S - 4) + ",12 C" + (S - 50) + ",14 " + (S - 100) + ",24 " + (S - 160) + ",20", fill: "none", stroke: "#c0caf5", "stroke-opacity": "0.3", "stroke-width": 2.4, "stroke-linecap": "round" }, wake);
        el("path", { d: "M" + S + ",-16 H" + B + " Q" + (B + 38) + ",-16 " + (B + 28) + ",-2 L" + (B + 16) + ",16 H" + (S + 10) + " Q" + (S - 4) + ",16 " + (S - 2) + ",0 Z", fill: "#e6e9f8" }, g);
        el("path", { d: "M" + (S - 2) + ",3 H" + (B + 27) + " L" + (B + 16) + ",16 H" + (S + 10) + " Q" + (S - 3) + ",16 " + (S - 2) + ",3 Z", fill: "#f7768e" }, g);
        el("line", { x1: S + 4, y1: -9, x2: B + 20, y2: -9, stroke: s.flag, "stroke-width": 3 }, g);
        el("text", { x: 0, y: -0.5, "class": "ship-hull-text" }, g, s.name);
        var cabinX = -half - 56;
        el("rect", { x: cabinX, y: -52, width: 44, height: 36, rx: 4, fill: "#24283b", stroke: "#3b4261" }, g);
        el("rect", { x: cabinX + 6, y: -44, width: 12, height: 8, rx: 1.5, fill: "#e0af68", "fill-opacity": "0.85" }, g);
        el("rect", { x: cabinX + 24, y: -44, width: 12, height: 8, rx: 1.5, fill: "#e0af68", "fill-opacity": "0.85" }, g);
        el("line", { x1: cabinX + 40, y1: -52, x2: cabinX + 40, y2: -86, stroke: "#565f89", "stroke-width": 2.5 }, g);
        el("path", { d: "M" + (cabinX + 40) + ",-86 L" + (cabinX + 64) + ",-78 L" + (cabinX + 40) + ",-70 Z", fill: s.flag }, g);
        var captainSeat = el("g", {}, g);
        var captain = bot(captainSeat, cabinX + 18, -61, 8);
        var promptChip = s.prompt ? chip(g, B + 150, -24, "› " + s.prompt, "#13141c", "#c0caf5") : null;   // ahead of the bow
        return {
            spec: s, n: n, lane: LANES[s.lane], g: g, wake: wake, captainSeat: captainSeat, captain: captain,
            phase: n * 1.7, promptChip: promptChip,
            landed: chip(g, B + 120, -24, "production ✓", LIGHT.done, "#13141c"),
            big: s.big ? chip(g, 0, -214, "12 microservices · one ship", "#f7768e", "#13141c") : null
        };
    });
    laneGroups.forEach(function (lg, n) { waves(lg.water, lg.lane.y, lg.dur, 0.5 + n * 0.08); });

    // ---- containers ----------------------------------------------------------------------

    var cable = el("line", { stroke: "#a9b1d6", "stroke-width": 1.5, opacity: 0 }, cargo);
    var boxes = CONTAINERS.map(function (c) {
        var g = el("g", { opacity: 0 }, cargo);
        el("rect", { width: W, height: H, rx: 3, fill: c.color }, g);
        el("rect", { width: W, height: 5, rx: 2, fill: "#ffffff", "fill-opacity": "0.25" }, g);
        for (var x = 8; x < W; x += 8) el("line", { x1: x, y1: 7, x2: x, y2: H - 4, stroke: "#13141c", "stroke-opacity": "0.16" }, g);
        el("rect", { x: 50, y: 7, width: 26, height: 33, rx: 3, fill: "#13141c", "fill-opacity": "0.22" }, g);   // the door
        el("rect", { width: W, height: H, rx: 3, fill: "none", stroke: "#13141c", "stroke-opacity": "0.35" }, g);
        el("text", { x: 26, y: 28, "class": c.name.length > 6 ? "ship-box-text small" : "ship-box-text" }, g, c.name);
        var badge = el("g", { opacity: 0, transform: "translate(" + (W - 2) + " 2)" }, g);   // "this repo changed"
        el("circle", { r: 8, fill: LIGHT.done, stroke: "#13141c", "stroke-width": 1.5 }, badge);
        el("path", { d: "M-4,0 H4 M0,-4 V4", stroke: "#13141c", "stroke-width": 2.2, "stroke-linecap": "round" }, badge);
        return { spec: c, g: g, bot: bot(g, 63, 28, 7), badge: badge };
    });

    var fx = layer("fx");
    var sparkColors = ["#7dcfff", "#bb9af7", "#ff9e64", "#9ece6a", "#e0af68"];
    var sparks = ships.slice(0, 4).map(function () {
        var list = [];
        for (var k = 0; k < 10; k++) {
            list.push({ node: el("circle", { r: 2.6, fill: sparkColors[k % sparkColors.length], opacity: 0 }, fx), angle: (k / 10) * Math.PI * 2, dist: 60 + (k % 3) * 22 });
        }
        return list;
    });

    // ---- placing everything for a given p ------------------------------------------------

    function setBox(node, x, y, s, opacity) {
        node.setAttribute("transform", "translate(" + x.toFixed(1) + " " + y.toFixed(1) + ") scale(" + s.toFixed(3) + ")");
        fade(node, opacity);
    }
    function arc(from, to, t, lift) {
        var e = inOut(t);
        return { x: lerp(from.x, to.x, e), y: lerp(from.y, to.y, e) - lift * Math.sin(Math.PI * t), s: lerp(from.s, to.s, e) };
    }
    function landedAt(n) { return T.land + n * 0.015; }   // when each ship's lights go green

    function render(p, now) {
        var amb = reduceMotion ? 0 : 1;

        // Ships ------------------------------------------------------------------------------
        var shipState = ships.map(function (sh) {
            var n = sh.n, s = sh.spec, lane = sh.lane, x, enter, sail = 0, off = 0;
            if (s.big) {
                enter = seg(p, T.bigIn[0], T.bigIn[1]);
                x = lerp(-360, s.dock, out(enter));
            } else {
                enter = n === 0 ? seg(p, T.shopIn[0], T.shopIn[1]) : seg(p, T.othersIn[0] + (n - 1) * 0.012, T.othersIn[1] - 0.024 + (n - 1) * 0.012);
                sail = seg(p, T.cross[0] + n * 0.006, T.cross[1] + n * 0.004);
                off = seg(p, T.offRight[0] + n * 0.005, T.offRight[1]);
                x = lerp(-320, s.dock, out(enter));
                if (sail > 0) x = lerp(s.dock, s.end, inOut(sail));
                if (off > 0) x = lerp(s.end, 1500, inOut(off));
            }
            var heavy = s.big ? 0.6 : 1;   // the big ship bobs slower and less
            var bob = amb * Math.sin(now / (760 / heavy) + sh.phase) * 2.6 * lane.s * heavy;
            var tilt = amb * Math.sin(now / (1000 / heavy) + sh.phase) * 0.9 * heavy;
            var opacity = enter > 0 ? Math.min(1, enter * 3) * (1 - off) : 0;
            sh.g.setAttribute("transform", "translate(" + x.toFixed(1) + " " + (lane.y + bob).toFixed(1) + ") rotate(" + tilt.toFixed(2) + ") scale(" + lane.s + ")");
            fade(sh.g, opacity);
            fade(sh.wake, Math.max(Math.sin(Math.PI * sail), Math.sin(Math.PI * enter) * 0.6, Math.sin(Math.PI * off)));

            // The captain: boards shop in step 4; the others sail in with theirs.
            var board = n === 0 ? seg(p, T.board[0], T.board[1]) : 1;
            sh.captainSeat.setAttribute("transform", "translate(0 " + ((1 - back(board)) * -40).toFixed(1) + ")");
            fade(sh.captainSeat, board);
            var cap = s.big ? (p >= T.bigWork ? "work" : "idle")
                    : p >= landedAt(n) ? "done" : p >= T.signal[0] ? "work" : n === 0 ? (board > 0 ? "idle" : "off") : "idle";
            setBot(sh.captain, cap, now);

            if (sh.promptChip) fade(sh.promptChip, seg(p, T.othersIn[0] + 0.02, T.othersIn[1]) * (1 - seg(p, T.cross[0], T.cross[0] + 0.03)));
            fade(sh.landed, s.big ? 0 : seg(p, landedAt(n) + 0.005, landedAt(n) + 0.03) * (1 - off));
            if (sh.big) fade(sh.big, seg(p, 0.96, 0.98));
            return { x: x, y: lane.y + bob, s: lane.s, opacity: opacity };
        });

        // The prompt: appears, types, and hits the dockmaster ----------------------------------
        fade(prompt, seg(p, T.prompt[0], T.prompt[1]) * (1 - seg(p, T.shopIn[0], T.shopIn[1])));
        var typed = Math.round(PROMPT.length * seg(p, T.typing[0], T.typing[1]));
        promptText.textContent = PROMPT.slice(0, typed);
        promptCaret.setAttribute("x", (14 + typed * 8.4).toFixed(1));
        fade(promptCaret, p < T.hit[1] ? (amb ? 0.4 + 0.6 * (Math.sin(now / 180) > 0 ? 1 : 0) : 1) : 0);
        var hitT = seg(p, T.hit[0], T.hit[1]);
        promptPulse.setAttribute("cx", lerp(190, DOCKMASTER.x, inOut(hitT)).toFixed(1));
        promptPulse.setAttribute("cy", (lerp(186, DOCKMASTER.y - 20, inOut(hitT)) - 30 * Math.sin(Math.PI * hitT)).toFixed(1));
        fade(promptPulse, Math.sin(Math.PI * hitT));
        fade(projectBracket, seg(p, T.project[0], T.project[1]) * (1 - seg(p, T.prompt[0], T.prompt[1])));
        var prodOn = seg(p, T.project[0], T.project[1]);
        fade(productionGlow, 0.25 + 0.35 * prodOn * (amb ? 0.7 + 0.3 * Math.sin(now / 500) : 1) + (p >= T.land ? 0.3 : 0));
        if (prodOn <= 0) fade(productionGlow, 0);
        productionSign.setAttribute("fill", prodOn > 0 ? LIGHT.done : "#565f89");

        // Containers -------------------------------------------------------------------------
        var cableOn = false;
        boxes.forEach(function (b, k) {
            var c = b.spec, sh = shipState[c.ship], ship = SHIPS[c.ship];
            var deck = { x: sh.x + c.deckX * sh.s, y: sh.y + c.deckY * sh.s, s: sh.s };
            var pos = deck, opacity = sh.opacity, state = "idle", changed = false;

            if (c.quay) {                                       // shop: dock, prompt, crane, crossing
                var drop = T.drops[k], tDrop = seg(p, drop[0], drop[1]);
                var tLoad = seg(p, T.load[0] + k * 0.017, T.load[0] + k * 0.017 + 0.022);
                if (tLoad <= 0) {
                    pos = { x: c.quay.x, y: lerp(-90, c.quay.y, bounce(tDrop)), s: 1 };
                    opacity = tDrop > 0 ? Math.min(1, tDrop * 4) : 0;
                } else if (tLoad < 1) {
                    pos = arc({ x: c.quay.x, y: c.quay.y, s: 1 }, deck, tLoad, 60);
                    opacity = 1;
                    cableOn = true;
                    cable.setAttribute("x1", CRANE_TIP.x); cable.setAttribute("y1", CRANE_TIP.y);
                    cable.setAttribute("x2", (pos.x + (W * pos.s) / 2).toFixed(1)); cable.setAttribute("y2", pos.y.toFixed(1));
                } else opacity = sh.opacity;
                var w0 = T.work[0] + k * 0.006, w1 = T.ready[0] + k * 0.005;
                state = tDrop < 1 ? "off" : p < w0 ? "idle" : p < w1 ? "work" : "done";
                changed = p >= w1;

                // The main orchestrator hands the prompt to each repo agent.
                var line = dispatch[k], dT = seg(p, T.hit[1] - 0.005 + k * 0.004, T.work[1]);
                line.setAttribute("x1", DOCKMASTER.x); line.setAttribute("y1", DOCKMASTER.y - 8);
                line.setAttribute("x2", (c.quay.x + W - 17).toFixed(1)); line.setAttribute("y2", (c.quay.y + 14).toFixed(1));
                fade(line, Math.sin(Math.PI * dT) * 0.9);
            } else if (ship.big) {                              // the microservices ship gets stacked high
                var tB = seg(p, T.bigLoad[0] + c.order * 0.0065, T.bigLoad[0] + c.order * 0.0065 + 0.018);
                pos = { x: deck.x, y: lerp(deck.y - 260, deck.y, bounce(tB)), s: deck.s };
                opacity = tB > 0 ? Math.min(1, tB * 5) * sh.opacity : 0;
                state = tB <= 0 ? "off" : p >= T.bigWork ? "work" : "idle";
            } else {                                            // other projects: changes ready aboard
                state = "done";
                changed = true;
            }
            if (!ship.big && p >= landedAt(c.ship)) state = "done";
            setBox(b.g, pos.x, pos.y, pos.s, opacity);
            setBot(b.bot, state, now);
            fade(b.badge, changed ? 1 : 0);
        });
        fade(cable, cableOn ? 0.8 : 0);

        // The dockmaster: takes the prompt, dispatches, signals the fleet out --------------------
        var signalT = seg(p, T.signal[0], T.signal[1]);
        var dmWorking = (p >= T.hit[1] - 0.01 && p < T.ready[1]) || (signalT > 0 && signalT < 1) || p >= T.bigWork;
        setBot(dockmaster, dmWorking ? "work" : p >= T.land ? "done" : "idle", now);
        fade(dockChip, seg(p, T.hit[0], T.hit[1]) * (1 - seg(p, T.shopIn[0], T.shopIn[1])) + seg(p, T.signal[0], T.signal[0] + 0.02) * (1 - seg(p, T.cross[0] + 0.03, T.cross[0] + 0.06)));
        signal.forEach(function (ring, k) {
            var t = clamp(signalT * 1.6 - k * 0.6, 0, 1);
            ring.setAttribute("r", (t * 130).toFixed(1));
            fade(ring, Math.sin(Math.PI * t) * 0.8);
        });

        // Sparkles over each ship as it lands in production.
        sparks.forEach(function (list, n) {
            var t = seg(p, landedAt(n), landedAt(n) + 0.06), sh = shipState[n];
            list.forEach(function (sp) {
                var r = out(t) * sp.dist * sh.s * 1.5;
                sp.node.setAttribute("cx", (sh.x + Math.cos(sp.angle) * r).toFixed(1));
                sp.node.setAttribute("cy", (sh.y - 60 * sh.s + Math.sin(sp.angle) * r * 0.6).toFixed(1));
                fade(sp.node, Math.sin(Math.PI * t));
            });
        });
    }

    // ---- captions, rail, scroll ---------------------------------------------------------

    var STEP_STARTS = [0, 0.10, 0.22, 0.38, 0.52, 0.72, 0.82];
    var captions = section.querySelectorAll(".ship-caption");
    var railButtons = section.querySelectorAll("[data-goto]");
    var currentStep = -1;
    function setStep(step) {
        if (step === currentStep) return;
        currentStep = step;
        captions.forEach(function (c, n) { c.classList.toggle("active", n === step); });
        railButtons.forEach(function (b, n) {
            b.classList.toggle("active", n === step);
            b.classList.toggle("done", n < step);
        });
    }
    function stepOf(p) {
        for (var s = STEP_STARTS.length - 1; s >= 0; s--) if (p >= STEP_STARTS[s]) return s;
        return 0;
    }
    function progress() {
        var rect = section.getBoundingClientRect();
        var total = section.offsetHeight - window.innerHeight;
        return total > 0 ? clamp(-rect.top / total, 0, 1) : 1;
    }

    if (reduceMotion) {
        section.classList.add("ship-static");
        if (svg.pauseAnimations) svg.pauseAnimations();
        render(T.land + 0.07, 0);   // the four projects, landed in production
        return;
    }

    section.classList.add("ship-live");
    var p = progress(), visible = false, frame = 0;
    function tick(now) {
        render(p, now);
        setStep(stepOf(p));
        frame = visible ? requestAnimationFrame(tick) : 0;
    }
    window.addEventListener("scroll", function () { p = progress(); }, { passive: true });
    window.addEventListener("resize", function () { p = progress(); });
    new IntersectionObserver(function (entries) {
        visible = entries[0].isIntersecting;
        if (visible && !frame) frame = requestAnimationFrame(tick);
    }).observe(section);
    render(p, 0);
    setStep(stepOf(p));

    railButtons.forEach(function (button, n) {
        button.addEventListener("click", function () {
            var total = section.offsetHeight - window.innerHeight;
            var top = section.getBoundingClientRect().top + window.scrollY;
            var targets = [0.07, 0.19, 0.33, 0.50, 0.66, 0.79, 0.985];
            window.scrollTo({ top: top + targets[n] * total, behavior: "smooth" });
        });
    });
})();
