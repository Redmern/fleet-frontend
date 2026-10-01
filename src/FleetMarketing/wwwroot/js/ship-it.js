// "How fleet ships": repositories are containers, together they are the project you ship,
// one agent is one ship, and fleet sends a ship per task. The scroll position through the
// pinned section (0..1) decides where everything is, so scrubbing either way is exact and
// smooth; a small requestAnimationFrame loop adds ambient motion (bobbing ships, wakes)
// while the section is on screen. With reduced motion the final scene is drawn once and all
// captions are shown; without JS only the captions are shown (see app.css).
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

    // ---- the scene -----------------------------------------------------------------------

    var W = 80, H = 44;                         // a container
    var DOCK_X = 330, SEA_END_X = 800;          // where ships load and unload (ship centre)
    function dockX(lane) { return DOCK_X + (3 - lane) * 26; }      // a staggered formation,
    function seaEndX(lane) { return SEA_END_X - lane * 22; }      // not a column
    var LANES = [                                // far (top) to near (bottom): waterline and scale
        { y: 392, s: 0.74 }, { y: 456, s: 0.84 }, { y: 524, s: 0.94 }, { y: 600, s: 1.04 }
    ];
    var REPOS = [   // stack slot on the left quay; lane its fleet ship sails in; that agent's branch
        { name: "api",   color: "#7dcfff", slot: { x: 40,  y: 256 }, lane: 2, branch: "add-health" },
        { name: "web",   color: "#bb9af7", slot: { x: 128, y: 256 }, lane: 3, branch: "dark-mode" },
        { name: "infra", color: "#ff9e64", slot: { x: 40,  y: 212 }, lane: 0, branch: "bump-tf" },
        { name: "docs",  color: "#9ece6a", slot: { x: 128, y: 212 }, lane: 1, branch: "readme" }
    ];
    var RIGHT = 896;                             // right-quay slots are the left ones shifted by this
    var DROPS = [[0.02, 0.10], [0.13, 0.185], [0.17, 0.225], [0.21, 0.265]];

    // Sky: moon, stars, a faint horizon.
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

    // Quays, cranes, signs, the lighthouse.
    var quays = layer("quays");
    function quay(x, w) {
        for (var px = x + 14; px < x + w - 4; px += 34) {
            el("rect", { x: px, y: 340, width: 7, height: 34, fill: "#1a1b26", stroke: "#292e42" }, quays);
        }
        el("rect", { x: x, y: 300, width: w, height: 44, rx: 4, fill: "#24283b", stroke: "#3b4261" }, quays);
        el("line", { x1: x + 4, y1: 301.5, x2: x + w - 4, y2: 301.5, stroke: "#565f89" }, quays);
    }
    quay(-10, 262);
    quay(890, 322);
    function crane(postX, tipX) {
        var g = el("g", { stroke: "#3b4261", "stroke-width": 4, "stroke-linecap": "round", fill: "none" }, quays);
        el("line", { x1: postX, y1: 300, x2: postX, y2: 118 }, g);
        el("line", { x1: postX, y1: 124, x2: tipX, y2: 124 }, g);
        el("line", { x1: postX, y1: 170, x2: lerp(postX, tipX, 0.55), y2: 124, "stroke-width": 2 }, g);
        el("line", { x1: postX - 20, y1: 124, x2: postX, y2: 124 }, g);
        el("rect", { x: postX - 34, y: 116, width: 16, height: 16, rx: 2, fill: "#3b4261", stroke: "none" }, quays);
    }
    crane(232, 322);
    crane(908, 818);
    el("text", { x: 120, y: 328, "class": "ship-sign" }, quays, "repositories");
    el("text", { x: 1020, y: 328, "class": "ship-sign" }, quays, "port");

    var lighthouse = el("g", { transform: "translate(1166 300)" }, quays);
    el("path", { d: "M-16,0 L-10,-118 H10 L16,0 Z", fill: "#c0caf5" }, lighthouse);
    el("path", { d: "M-14.4,-30 L-13.4,-52 H13.4 L14.4,-30 Z M-12.4,-74 L-11.6,-94 H11.6 L12.4,-74 Z", fill: "#f7768e" }, lighthouse);
    el("rect", { x: -13, y: -130, width: 26, height: 12, rx: 3, fill: "#24283b", stroke: "#565f89" }, lighthouse);
    var beam = el("g", { transform: "translate(0 -124)" }, lighthouse);
    var sweep = el("g", {}, beam);
    el("path", { d: "M0,0 L-380,-34 L-380,34 Z", fill: "url(#ship-beam)", opacity: "0.7" }, sweep);
    el("animateTransform", {
        attributeName: "transform", type: "rotate", values: "-16;4;-16", dur: "8s",
        repeatCount: "indefinite", calcMode: "spline", keySplines: "0.45 0 0.55 1;0.45 0 0.55 1"
    }, sweep);
    el("circle", { cx: 0, cy: -124, r: 5, fill: "#e0af68", filter: "url(#ship-glow)" }, lighthouse);

    // Brackets that name the cargo: "project: shop" on the left, "shipped" on the right.
    function bracket(x, label, color) {
        var g = el("g", { opacity: 0 }, quays);
        el("rect", { x: x - 12, y: 200, width: 192, height: 108, rx: 12, fill: "none", stroke: color, "stroke-width": 2, "stroke-dasharray": "7 6" }, g);
        var tag = el("g", { transform: "translate(" + (x + 84) + " 186)" }, g);
        var text = el("text", { x: 0, y: 4, "class": "ship-tag-text", fill: "#13141c" }, null, label);
        var width = label.length * 8.4 + 22;
        el("rect", { x: -width / 2, y: -11, width: width, height: 22, rx: 11, fill: color }, tag);
        tag.appendChild(text);
        return g;
    }
    var projectBracket = bracket(40, "project: shop", "#bb9af7");
    var shippedBracket = bracket(40 + RIGHT, "shop · shipped ✓", "#9ece6a");

    // Lanes: ships, then a band of animated water in front of their hulls.
    var lanes = layer("lanes");
    function waves(group, y, dur, opacity) {
        var d = "M-480," + (y + 6);
        for (var x = -480; x <= 1680; x += 60) d += " q15,-5 30,0 t30,0";
        d += " V" + (y + 34) + " H-480 Z";
        var band = el("path", { d: d, fill: "#1a2440", "fill-opacity": opacity }, group);
        el("animateTransform", { attributeName: "transform", type: "translate", from: "0 0", to: "-120 0", dur: dur + "s", repeatCount: "indefinite" }, band);
        el("path", { d: d.split(" V")[0], fill: "none", stroke: "#7aa2f7", "stroke-opacity": "0.28", "stroke-width": 1.4 }, group)
            .appendChild(el("animateTransform", { attributeName: "transform", type: "translate", from: "0 0", to: "-120 0", dur: dur + "s", repeatCount: "indefinite" }));
    }
    function ship(group, flag) {
        var g = el("g", { opacity: 0 }, group);
        var wake = el("g", { opacity: 0 }, g);
        el("path", { d: "M-92,6 C-140,2 -190,12 -260,6", fill: "none", stroke: "#c0caf5", "stroke-opacity": "0.55", "stroke-width": 2.5, "stroke-linecap": "round" }, wake);
        el("path", { d: "M-92,12 C-130,14 -170,22 -220,20", fill: "none", stroke: "#c0caf5", "stroke-opacity": "0.3", "stroke-width": 2, "stroke-linecap": "round" }, wake);
        el("path", { d: "M-86,-14 H74 Q98,-14 90,-1 L80,14 H-78 Q-90,14 -88,0 Z", fill: "#e6e9f8" }, g);
        el("path", { d: "M-88,2 H89 L80,14 H-78 Q-89,14 -88,2 Z", fill: "#f7768e" }, g);
        el("line", { x1: -84, y1: -8, x2: 80, y2: -8, stroke: "#7aa2f7", "stroke-width": 2 }, g);
        el("rect", { x: -82, y: -40, width: 30, height: 26, rx: 3, fill: "#24283b", stroke: "#3b4261" }, g);
        el("rect", { x: -77, y: -34, width: 8, height: 6, rx: 1, fill: "#e0af68", "fill-opacity": "0.85" }, g);
        el("rect", { x: -65, y: -34, width: 8, height: 6, rx: 1, fill: "#e0af68", "fill-opacity": "0.85" }, g);
        el("line", { x1: -60, y1: -40, x2: -60, y2: -62, stroke: "#565f89", "stroke-width": 2 }, g);
        el("path", { d: "M-60,-62 L-42,-56 L-60,-50 Z", fill: flag }, g);
        var light = el("circle", { cx: -74, cy: -45, r: 4, fill: "#565f89" }, g);
        var tag = el("g", { opacity: 0 }, g);
        // The agent's branch, just ahead of the bow, so tags never stack over the next lane.
        el("rect", { x: 98, y: -24, width: 112, height: 22, rx: 11, fill: "#24283b", stroke: "#3b4261" }, tag);
        var tagText = el("text", { x: 154, y: -9, "class": "ship-tag-text", fill: "#c0caf5" }, tag);
        return { g: g, wake: wake, light: light, tag: tag, tagText: tagText, phase: Math.random() * 6 };
    }
    var laneGroups = LANES.map(function (lane, n) {
        var g = el("g", {}, lanes);
        return { ships: el("g", {}, g), water: el("g", {}, g), lane: lane, dur: 5 + n * 0.8 };
    });
    var fleet = REPOS.map(function (repo) {
        var s = ship(laneGroups[repo.lane].ships, "#bb9af7");
        s.tagText.textContent = repo.branch;
        return s;
    });
    var solo = ship(laneGroups[2].ships, "#565f89");
    solo.tagText.textContent = "trip 1 of 4";
    laneGroups.forEach(function (lg, n) { waves(lg.water, lg.lane.y, lg.dur, 0.55 + n * 0.08); });

    // Cargo: the containers, a ghost used while the story rewinds, and crane cables.
    var cargo = layer("cargo");
    var cables = [el("line", { stroke: "#a9b1d6", "stroke-width": 1.5, opacity: 0 }, cargo),
                  el("line", { stroke: "#a9b1d6", "stroke-width": 1.5, opacity: 0 }, cargo)];
    function container(repo) {
        var g = el("g", { opacity: 0 }, cargo);
        el("rect", { width: W, height: H, rx: 3, fill: repo.color }, g);
        el("rect", { width: W, height: 5, rx: 2, fill: "#ffffff", "fill-opacity": "0.25" }, g);
        for (var x = 8; x < W; x += 8) el("line", { x1: x, y1: 7, x2: x, y2: H - 4, stroke: "#13141c", "stroke-opacity": "0.18" }, g);
        el("rect", { width: W, height: H, rx: 3, fill: "none", stroke: "#13141c", "stroke-opacity": "0.35" }, g);
        el("text", { x: W / 2, y: 28, "class": "ship-box-text" }, g, repo.name);
        return g;
    }
    var boxes = REPOS.map(container);
    var ghost = container(REPOS[0]);

    // Sparkles over the port when the project arrives.
    var fx = layer("fx");
    var sparks = [];
    var sparkColors = ["#7dcfff", "#bb9af7", "#ff9e64", "#9ece6a", "#e0af68"];
    for (i = 0; i < 18; i++) {
        sparks.push({
            node: el("circle", { r: 3, fill: sparkColors[i % sparkColors.length], opacity: 0 }, fx),
            angle: (i / 18) * Math.PI * 2 + (i % 2) * 0.2, dist: 70 + (i % 3) * 26
        });
    }

    // ---- placing things for a given p ---------------------------------------------------

    function setBox(node, x, y, s, opacity) {
        node.setAttribute("transform", "translate(" + x.toFixed(1) + " " + y.toFixed(1) + ") scale(" + s.toFixed(3) + ")");
        node.setAttribute("opacity", opacity.toFixed(3));
    }
    function setShip(sh, x, lane, opacity, bob, tilt) {
        sh.g.setAttribute("transform", "translate(" + x.toFixed(1) + " " + (lane.y + bob).toFixed(1) + ") rotate(" + tilt.toFixed(2) + ") scale(" + lane.s + ")");
        sh.g.setAttribute("opacity", opacity.toFixed(3));
    }
    function deck(x, lane, bob) { return { x: x - 42 * lane.s, y: lane.y + bob - 60 * lane.s, s: lane.s }; }
    function arc(from, to, t, lift) {
        var e = inOut(t);
        return { x: lerp(from.x, to.x, e), y: lerp(from.y, to.y, e) - lift * Math.sin(Math.PI * t), s: lerp(from.s, to.s, e) };
    }
    function right(slot) { return { x: slot.x + RIGHT, y: slot.y, s: 1 }; }
    function slot(repo) { return { x: repo.slot.x, y: repo.slot.y, s: 1 }; }

    function render(p, now) {
        var cableUse = 0;
        function cable(fromX, box) {
            if (cableUse >= cables.length) return;
            var c = cables[cableUse++];
            c.setAttribute("x1", fromX); c.setAttribute("y1", 124);
            c.setAttribute("x2", (box.x + (W * box.s) / 2).toFixed(1)); c.setAttribute("y2", box.y.toFixed(1));
            c.setAttribute("opacity", "0.8");
        }
        function bobOf(sh, lane) { return reduceMotion ? 0 : Math.sin(now / 700 + sh.phase) * 2.4 * lane.s; }
        function tiltOf(sh) { return reduceMotion ? 0 : Math.sin(now / 950 + sh.phase) * 1.1; }

        // Step 1-2: containers drop onto the left quay and stack into the project.
        var at = REPOS.map(function (repo, n) {
            var t = seg(p, DROPS[n][0], DROPS[n][1]);
            var y = lerp(-90, repo.slot.y, bounce(t));
            return { x: repo.slot.x, y: y, s: 1, o: t > 0 ? Math.min(1, t * 4) : 0 };
        });
        projectBracket.setAttribute("opacity", (seg(p, 0.24, 0.28) * (1 - seg(p, 0.6, 0.64))).toFixed(3));

        // Step 3: one ship takes one container across. Then the story rewinds for the fleet.
        var soloLane = LANES[2];
        var soloX = lerp(-200, DOCK_X, out(seg(p, 0.28, 0.32)));
        if (p >= 0.36) soloX = lerp(DOCK_X, SEA_END_X, inOut(seg(p, 0.36, 0.47)));
        if (p >= 0.50) soloX = lerp(SEA_END_X, 980, seg(p, 0.50, 0.55));
        var soloOpacity = p < 0.28 ? 0 : 1 - seg(p, 0.50, 0.55);
        var soloBob = bobOf(solo, soloLane);
        setShip(solo, soloX, soloLane, soloOpacity, soloBob, tiltOf(solo));
        solo.wake.setAttribute("opacity", (Math.sin(Math.PI * seg(p, 0.36, 0.47)) * 0.9).toFixed(3));
        solo.tag.setAttribute("opacity", (seg(p, 0.33, 0.36) * (1 - seg(p, 0.48, 0.51))).toFixed(3));
        solo.light.setAttribute("fill", p > 0.36 && p < 0.5 ? "#e0af68" : "#565f89");

        var api = at[0];
        var tLoad = seg(p, 0.32, 0.36), tUnload = seg(p, 0.47, 0.50);
        if (p > 0.32 && p < 0.55) {
            var onDeck = deck(soloX, soloLane, soloBob);
            var b = p < 0.36 ? arc(slot(REPOS[0]), onDeck, tLoad, 70)
                  : p < 0.47 ? onDeck
                  : arc(deck(SEA_END_X, soloLane, soloBob), right(REPOS[0].slot), tUnload, 70);
            if (p < 0.36) cable(322, b);
            if (p >= 0.47 && p < 0.5) cable(818, b);
            if (p >= 0.50) {
                // Rewind: the delivered container fades out at the port and back in on the quay.
                var tBack = seg(p, 0.50, 0.55);
                setBox(ghost, right(REPOS[0].slot).x, REPOS[0].slot.y, 1, 1 - tBack);
                at[0] = { x: api.x, y: api.y, s: 1, o: tBack };
            } else {
                setBox(ghost, 0, 0, 1, 0);
                at[0] = { x: b.x, y: b.y, s: b.s, o: 1 };
            }
        } else {
            setBox(ghost, 0, 0, 1, 0);
        }

        // Step 4-5: a ship per container, all at once; then the project rebuilt at the port.
        REPOS.forEach(function (repo, n) {
            var lane = LANES[repo.lane], sh = fleet[n], k = repo.lane;
            var tEnter = seg(p, 0.55 + k * 0.012, 0.61 + k * 0.012);
            var tLoadF = seg(p, 0.615 + k * 0.015, 0.665 + k * 0.015);
            var tSail = seg(p, 0.68 + k * 0.01, 0.82 + k * 0.01);
            var tDrop = seg(p, 0.83 + k * 0.012, 0.875 + k * 0.012);
            var tExit = seg(p, 0.92 + k * 0.01, 0.995);
            var x = lerp(-220, dockX(k), out(tEnter));
            if (tSail > 0) x = lerp(dockX(k), seaEndX(k), inOut(tSail));
            if (tExit > 0) x = lerp(seaEndX(k), 1420, inOut(tExit));
            var bob = bobOf(sh, lane);
            setShip(sh, x, lane, p < 0.55 ? 0 : 1, bob, tiltOf(sh));
            sh.wake.setAttribute("opacity", (Math.max(Math.sin(Math.PI * tSail), Math.sin(Math.PI * tExit)) * 0.9).toFixed(3));
            sh.tag.setAttribute("opacity", (seg(p, 0.66, 0.69) * (1 - seg(p, 0.84, 0.88))).toFixed(3));
            sh.light.setAttribute("fill", tDrop >= 1 ? "#9ece6a" : tSail > 0 ? "#e0af68" : "#565f89");

            if (tLoadF > 0) {
                var onDeck = deck(tSail > 0 ? x : dockX(k), lane, bob);
                var b = tLoadF < 1 ? arc(slot(repo), onDeck, tLoadF, 80)
                      : tDrop <= 0 ? onDeck
                      : arc(deck(seaEndX(k), lane, bob), right(repo.slot), tDrop, 60);
                if (tLoadF < 1) cable(322, b);
                if (tDrop > 0 && tDrop < 1) cable(818, b);
                at[n] = { x: b.x, y: b.y, s: b.s, o: 1 };
            }
        });
        for (var c = cableUse; c < cables.length; c++) cables[c].setAttribute("opacity", 0);

        at.forEach(function (b, n) { setBox(boxes[n], b.x, b.y, b.s, b.o); });
        shippedBracket.setAttribute("opacity", seg(p, 0.88, 0.92).toFixed(3));

        var tSpark = seg(p, 0.885, 0.97);
        sparks.forEach(function (sp) {
            var r = out(tSpark) * sp.dist;
            sp.node.setAttribute("cx", (40 + RIGHT + 84 + Math.cos(sp.angle) * r).toFixed(1));
            sp.node.setAttribute("cy", (254 + Math.sin(sp.angle) * r * 0.75).toFixed(1));
            sp.node.setAttribute("opacity", (Math.sin(Math.PI * tSpark)).toFixed(3));
        });
    }

    // ---- captions, rail, scroll ---------------------------------------------------------

    var STEP_STARTS = [0, 0.12, 0.28, 0.55, 0.88];
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
        // Keep the delivered project in view; the ships have sailed off.
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
