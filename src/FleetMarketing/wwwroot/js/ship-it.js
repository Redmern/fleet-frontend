// "How fleet ships": a repository is a container, a project is a ship carrying its containers,
// and fleet sends the whole fleet out at once. Agents are small bots: one in each container
// (a repo agent in its own worktree), a captain on each ship (the project's orchestrator) and a
// dockmaster on the quay (fleet's main orchestrator). The scroll position through the pinned
// section (0..1) decides where everything is, so scrubbing either way is exact and smooth; a
// requestAnimationFrame loop adds ambient motion (bobbing, wakes, blinking) while the section
// is on screen. With reduced motion the final scene is drawn once and all captions are shown;
// without JS only the captions are shown (see app.css).
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

    // ---- the cast ------------------------------------------------------------------------

    var W = 80, H = 44;                          // a container
    var LIGHT = { off: "#565f89", idle: "#7dcfff", work: "#e0af68", done: "#9ece6a" };
    var LANES = [{ y: 404, s: 0.6 }, { y: 488, s: 0.74 }, { y: 586, s: 0.88 }];   // far to near
    var SHIPS = [
        { name: "shop",    lane: 2, flag: "#bb9af7", dock: 400, end: 760 },
        { name: "blog",    lane: 1, flag: "#7dcfff", dock: 440, end: 790 },
        { name: "homelab", lane: 0, flag: "#ff9e64", dock: 480, end: 820 }
    ];
    var CONTAINERS = [
        // shop's containers start on the quay; the others arrive already aboard their ships.
        { name: "api",   color: "#7dcfff", ship: 0, quay: { x: 40, y: 256 },  drop: [0.02, 0.10], load: [0.215, 0.245], work: [0.35, 0.40] },
        { name: "web",   color: "#bb9af7", ship: 0, quay: { x: 128, y: 256 }, drop: [0.13, 0.18], load: [0.23, 0.26],   work: [0.40, 0.45] },
        { name: "infra", color: "#ff9e64", ship: 0, quay: { x: 84, y: 212 },  drop: [0.17, 0.22], load: [0.245, 0.275], work: [0.45, 0.50] },
        { name: "site",  color: "#7aa2f7", ship: 1 },
        { name: "cms",   color: "#f7768e", ship: 1 },
        { name: "tf",    color: "#9ece6a", ship: 2 },
        { name: "k8s",   color: "#73daca", ship: 2 },
        { name: "ci",    color: "#bb9af7", ship: 2 }
    ];
    CONTAINERS.forEach(function (c) {
        var mates = CONTAINERS.filter(function (o) { return o.ship === c.ship; });
        c.slot = mates.indexOf(c);
        c.deckX = -112 + (3 - mates.length) * 43 + c.slot * 86;   // centred on the deck
    });
    var CRANE_TIP = { x: 336, y: 124 };

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
    el("text", { x: 1020, y: 328, "class": "ship-sign" }, quays, "shipped");

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

    // The dockmaster: fleet's main orchestrator, on the quay; it sends the ships out.
    var signal = [el("circle", { cx: 236, cy: 270, r: 0, fill: "none", stroke: LIGHT.work, "stroke-width": 2, opacity: 0 }, quays),
                  el("circle", { cx: 236, cy: 270, r: 0, fill: "none", stroke: LIGHT.work, "stroke-width": 2, opacity: 0 }, quays)];
    var dockmaster = bot(quays, 236, 287, 11);
    var dockChip = chip(quays, 236, 236, "main orchestrator", "#24283b", "#c0caf5");

    // ---- ships and containers ------------------------------------------------------------

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
        return { ships: el("g", {}, g), water: el("g", {}, g), lane: lane, dur: 5 + n * 0.8 };
    });
    var ships = SHIPS.map(function (s, n) {
        var g = el("g", { opacity: 0 }, laneGroups[s.lane].ships);
        var wake = el("g", { opacity: 0 }, g);
        el("path", { d: "M-176,6 C-230,2 -290,12 -380,6", fill: "none", stroke: "#c0caf5", "stroke-opacity": "0.55", "stroke-width": 3, "stroke-linecap": "round" }, wake);
        el("path", { d: "M-176,12 C-220,14 -270,24 -330,20", fill: "none", stroke: "#c0caf5", "stroke-opacity": "0.3", "stroke-width": 2.4, "stroke-linecap": "round" }, wake);
        el("path", { d: "M-172,-16 H150 Q188,-16 178,-2 L166,16 H-162 Q-176,16 -174,0 Z", fill: "#e6e9f8" }, g);
        el("path", { d: "M-174,3 H177 L166,16 H-162 Q-175,16 -174,3 Z", fill: "#f7768e" }, g);
        el("line", { x1: -168, y1: -9, x2: 170, y2: -9, stroke: s.flag, "stroke-width": 3 }, g);
        el("text", { x: 20, y: -0.5, "class": "ship-hull-text" }, g, s.name);
        el("rect", { x: -168, y: -52, width: 44, height: 36, rx: 4, fill: "#24283b", stroke: "#3b4261" }, g);
        el("rect", { x: -162, y: -44, width: 12, height: 8, rx: 1.5, fill: "#e0af68", "fill-opacity": "0.85" }, g);
        el("rect", { x: -144, y: -44, width: 12, height: 8, rx: 1.5, fill: "#e0af68", "fill-opacity": "0.85" }, g);
        el("line", { x1: -128, y1: -52, x2: -128, y2: -86, stroke: "#565f89", "stroke-width": 2.5 }, g);
        el("path", { d: "M-128,-86 L-104,-78 L-128,-70 Z", fill: s.flag }, g);
        var captainSeat = el("g", {}, g);
        var captain = bot(captainSeat, -150, -61, 8);
        return {
            spec: s, n: n, lane: LANES[s.lane], g: g, wake: wake, captainSeat: captainSeat, captain: captain,
            phase: n * 1.7,
            label: chip(g, 14, -96, s.name === "shop" ? "project · shop" : s.name, "#24283b", "#c0caf5"),
            shipped: chip(g, 280, -24, s.name + " · shipped ✓", LIGHT.done, "#13141c")   // ahead of the bow
        };
    });
    laneGroups.forEach(function (lg, n) { waves(lg.water, lg.lane.y, lg.dur, 0.55 + n * 0.1); });

    var cargo = layer("cargo");
    var cable = el("line", { stroke: "#a9b1d6", "stroke-width": 1.5, opacity: 0 }, cargo);
    var focus = el("g", { opacity: 0 }, cargo);
    el("rect", { x: -6, y: -6, width: W + 12, height: H + 12, rx: 8, fill: "none", stroke: "#e0af68", "stroke-width": 2.5, "stroke-dasharray": "6 5", filter: "url(#ship-glow)" }, focus);
    chip(focus, W / 2, -24, "one at a time", "#e0af68", "#13141c").setAttribute("opacity", 1);

    var boxes = CONTAINERS.map(function (c) {
        var g = el("g", { opacity: 0 }, cargo);
        el("rect", { width: W, height: H, rx: 3, fill: c.color }, g);
        el("rect", { width: W, height: 5, rx: 2, fill: "#ffffff", "fill-opacity": "0.25" }, g);
        for (var x = 8; x < W; x += 8) el("line", { x1: x, y1: 7, x2: x, y2: H - 4, stroke: "#13141c", "stroke-opacity": "0.16" }, g);
        el("rect", { x: 50, y: 7, width: 26, height: 33, rx: 3, fill: "#13141c", "fill-opacity": "0.22" }, g);   // the door
        el("rect", { width: W, height: H, rx: 3, fill: "none", stroke: "#13141c", "stroke-opacity": "0.35" }, g);
        el("text", { x: 26, y: 28, "class": "ship-box-text" }, g, c.name);
        return { spec: c, g: g, bot: bot(g, 63, 28, 7) };
    });

    var fx = layer("fx");
    var sparkColors = ["#7dcfff", "#bb9af7", "#ff9e64", "#9ece6a", "#e0af68"];
    var sparks = ships.map(function () {
        var list = [];
        for (var k = 0; k < 10; k++) {
            list.push({ node: el("circle", { r: 2.6, fill: sparkColors[k % sparkColors.length], opacity: 0 }, fx), angle: (k / 10) * Math.PI * 2, dist: 60 + (k % 3) * 22 });
        }
        return list;
    });

    // ---- placing everything for a given p ------------------------------------------------

    function setBox(node, x, y, s, opacity) {
        node.setAttribute("transform", "translate(" + x.toFixed(1) + " " + y.toFixed(1) + ") scale(" + s.toFixed(3) + ")");
        node.setAttribute("opacity", opacity.toFixed(3));
    }
    function arc(from, to, t, lift) {
        var e = inOut(t);
        return { x: lerp(from.x, to.x, e), y: lerp(from.y, to.y, e) - lift * Math.sin(Math.PI * t), s: lerp(from.s, to.s, e) };
    }

    // When each ship's crew finishes: green, one ship after another.
    function doneAt(n) { return 0.845 + n * 0.02; }

    function render(p, now) {
        var amb = reduceMotion ? 0 : 1;

        // Ships: shop docks in beat 2; blog and homelab come in loaded in beat 3; all sail in beat 4.
        var shipState = ships.map(function (sh) {
            var n = sh.n, s = sh.spec, lane = sh.lane;
            var enter = n === 0 ? seg(p, 0.175, 0.225) : seg(p, 0.29 + n * 0.012, 0.345 + n * 0.012);
            var sail = seg(p, 0.62 + n * 0.012, 0.83 + n * 0.006);
            var x = lerp(-300, s.dock, out(enter));
            if (sail > 0) x = lerp(s.dock, s.end, inOut(sail));
            var bob = amb * Math.sin(now / 760 + sh.phase) * 2.6 * lane.s;
            var tilt = amb * Math.sin(now / 1000 + sh.phase) * 0.9;
            sh.g.setAttribute("transform", "translate(" + x.toFixed(1) + " " + (lane.y + bob).toFixed(1) + ") rotate(" + tilt.toFixed(2) + ") scale(" + lane.s + ")");
            sh.g.setAttribute("opacity", enter > 0 ? Math.min(1, enter * 3).toFixed(3) : 0);
            sh.wake.setAttribute("opacity", Math.max(Math.sin(Math.PI * sail), Math.sin(Math.PI * enter) * 0.6).toFixed(3));

            // The captain (the project's orchestrator) boards shop in beat 2; the others are aboard.
            var board = n === 0 ? seg(p, 0.262, 0.28) : 1;
            sh.captainSeat.setAttribute("transform", "translate(0 " + ((1 - back(board)) * -40).toFixed(1) + ")");
            sh.captainSeat.setAttribute("opacity", board.toFixed(3));
            var cap = p >= doneAt(n) ? "done" : p >= 0.6 ? "work" : n === 0 ? (board > 0 ? "idle" : "off") : "off";
            setBot(sh.captain, cap, now);

            sh.label.setAttribute("opacity", (n === 0 ? seg(p, 0.25, 0.28) * (1 - seg(p, 0.33, 0.36)) : 0).toFixed(3));
            sh.shipped.setAttribute("opacity", seg(p, doneAt(n) + 0.01, doneAt(n) + 0.04).toFixed(3));
            return { x: x, y: lane.y + bob, s: lane.s, opacity: enter > 0 ? Math.min(1, enter * 3) : 0 };
        });

        // Containers: shop's drop onto the quay and are craned aboard; the rest ride their ship.
        var cableOn = false, active = null;
        boxes.forEach(function (b) {
            var c = b.spec, sh = shipState[c.ship];
            var deck = { x: sh.x + c.deckX * sh.s, y: sh.y - 60 * sh.s, s: sh.s };
            var pos, opacity = 1;
            if (c.quay) {
                var tDrop = seg(p, c.drop[0], c.drop[1]);
                var tLoad = seg(p, c.load[0], c.load[1]);
                if (tLoad <= 0) {
                    pos = { x: c.quay.x, y: lerp(-90, c.quay.y, bounce(tDrop)), s: 1 };
                    opacity = tDrop > 0 ? Math.min(1, tDrop * 4) : 0;
                } else if (tLoad < 1) {
                    pos = arc({ x: c.quay.x, y: c.quay.y, s: 1 }, deck, tLoad, 60);
                    cableOn = true;
                    cable.setAttribute("x1", CRANE_TIP.x); cable.setAttribute("y1", CRANE_TIP.y);
                    cable.setAttribute("x2", (pos.x + (W * pos.s) / 2).toFixed(1)); cable.setAttribute("y2", pos.y.toFixed(1));
                } else {
                    pos = deck;
                }
            } else {
                pos = deck;
                opacity = sh.opacity;
            }
            setBox(b.g, pos.x, pos.y, pos.s, opacity);

            // Its agent: awake once landed; in beat 3 shop's containers are worked on one at a
            // time while everyone else waits; from beat 4 every agent works, then finishes.
            var state;
            if (opacity <= 0) state = "off";
            else if (p >= doneAt(c.ship)) state = "done";
            else if (p >= 0.6) state = "work";
            else if (c.work) {
                if (p < c.drop[1]) state = "off";
                else if (p < c.work[0]) state = "idle";
                else if (p < c.work[1]) { state = "work"; active = pos; }
                else state = "done";
            } else state = "off";
            setBot(b.bot, state, now);
        });
        cable.setAttribute("opacity", cableOn ? 0.8 : 0);

        // Beat 3's focus: the one container being worked on.
        if (active) {
            focus.setAttribute("transform", "translate(" + active.x.toFixed(1) + " " + active.y.toFixed(1) + ") scale(" + active.s.toFixed(3) + ")");
            focus.setAttribute("opacity", "1");
        } else focus.setAttribute("opacity", "0");

        // The dockmaster: awake from the start, signals the fleet out in beat 4, done at the end.
        var signalT = seg(p, 0.55, 0.62);
        setBot(dockmaster, p >= 0.9 ? "done" : signalT > 0 ? "work" : "idle", now);
        dockChip.setAttribute("opacity", (seg(p, 0.55, 0.57) * (1 - seg(p, 0.7, 0.74))).toFixed(3));
        signal.forEach(function (ring, k) {
            var t = clamp(signalT * 1.6 - k * 0.6, 0, 1);
            ring.setAttribute("r", (t * 120).toFixed(1));
            ring.setAttribute("opacity", (Math.sin(Math.PI * t) * 0.8).toFixed(3));
        });

        // Sparkles over each ship as its crew finishes.
        sparks.forEach(function (list, n) {
            var t = seg(p, doneAt(n), doneAt(n) + 0.07), sh = shipState[n];
            list.forEach(function (sp) {
                var r = out(t) * sp.dist * sh.s * 1.4;
                sp.node.setAttribute("cx", (sh.x + Math.cos(sp.angle) * r).toFixed(1));
                sp.node.setAttribute("cy", (sh.y - 60 * sh.s + Math.sin(sp.angle) * r * 0.6).toFixed(1));
                sp.node.setAttribute("opacity", Math.sin(Math.PI * t).toFixed(3));
            });
        });
    }

    // ---- captions, rail, scroll ---------------------------------------------------------

    var STEP_STARTS = [0, 0.12, 0.29, 0.55, 0.86];
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
        render(1, 0);
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
            var target = n === STEP_STARTS.length - 1 ? 0.97 : STEP_STARTS[n] + 0.04;
            window.scrollTo({ top: top + target * total, behavior: "smooth" });
        });
    });
})();
