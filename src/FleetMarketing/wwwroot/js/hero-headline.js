// Hero headline: "Use fleet. Ship faster.", acted out in a gentle loop of short plays that
// each start and end on that sentence:
//   more   "faster." whooshes away, "more." takes its place and small "more" panes fan out
//          around it: one becomes two, two become four, the way one agent becomes a fleet.
//   it     a vim cursor walks to "faster", cw, types "it"; a "merged to main" toast pops out.
//   sleep  the sentence scrambles into "You sleep. Fleet ships." while z's drift off "sleep".
//   repos  "One prompt. Four repos.": four repo panes fan out, working, then done.
//   reel   the last word spins like a slot machine and lands back on "faster.".
// The real <h1> keeps its text, so screen readers, search engines, no-JS and reduced motion
// all get "Use fleet. Ship faster.". What moves is an aria-hidden copy laid exactly over it
// (the stage) plus a layer behind the copy; both are absolutely positioned, so the layout
// never moves. A play only runs if every sentence in it fits in the heading's own box.
(function () {
    "use strict";

    var heading = document.querySelector("[data-hero-headline]");
    if (!heading) return;
    if (window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    var hero = heading.closest(".hero");
    var copy = heading.parentElement;
    if (!hero || !copy) return;

    var CANON = ["Use fleet.", "Ship faster."];
    var FIRST_AFTER = 1800;  // ms on screen before the first play
    var REST = 2600;         // ms on the plain sentence between plays
    var HOLD = 3600;         // ms a play holds its punchline
    var GENERATION = 0.34;   // s between generations of panes
    var GAP = 14;            // px kept free around the copy
    var PANE_GAP = 20;       // px kept free between panes
    var STEP = 8;            // px between candidate positions
    // Per generation: font size and resting opacity. Further out is smaller and fainter.
    var SIZES = ["1.05rem", "0.92rem", "0.8rem", "0.72rem"];
    var OPACITY = [0.95, 0.85, 0.72, 0.6];
    var DOTS = ["var(--green)", "var(--orange)", "var(--cyan)", "var(--green)", "var(--magenta)"];
    var NOISE = "#%&*+<>/=_-$@01";

    var stage, partA, partB, probe, layer;
    var active = null;       // the panes on screen and the element they came out of
    var onScreen = false, waiters = [];

    // --- helpers -------------------------------------------------------------------------

    function el(tag, cls, text) {
        var e = document.createElement(tag);
        if (cls) e.className = cls;
        if (text != null) e.textContent = text;
        return e;
    }

    function wait(ms) {
        return new Promise(function (resolve) { setTimeout(resolve, ms); });
    }

    // Resolves once the hero is on screen; plays only start where someone can see them.
    function visible() {
        if (onScreen) return Promise.resolve();
        return new Promise(function (resolve) { waiters.push(resolve); });
    }

    function fill(part, nodes) {
        part.textContent = "";
        nodes.forEach(function (n) { part.appendChild(typeof n === "string" ? document.createTextNode(n) : n); });
    }

    function plain() {
        fill(partA, [CANON[0]]);
        fill(partB, [CANON[1]]);
    }

    function relative(r, base) {
        return { left: r.left - base.left, top: r.top - base.top, right: r.right - base.left, bottom: r.bottom - base.top };
    }

    function centre(box) {
        return { x: (box.left + box.right) / 2, y: (box.top + box.bottom) / 2 };
    }

    function boxOf(node) {
        return relative(node.getBoundingClientRect(), hero.getBoundingClientRect());
    }

    // Keep the stage exactly over the heading, same width, so it wraps the same way.
    function syncStage() {
        var h = heading.getBoundingClientRect(), c = copy.getBoundingClientRect();
        stage.style.left = probe.style.left = (h.left - c.left) + "px";
        stage.style.top = probe.style.top = (h.top - c.top) + "px";
        stage.style.width = probe.style.width = h.width + "px";
        // js/hero-orbs.js repaints the stage every frame; until then, take the heading's paint.
        stage.style.backgroundImage = heading.style.backgroundImage;
    }

    // Does "a b" fit in the heading's box at the current width?
    function fits(a, b) {
        probe.textContent = a + " " + b;
        return probe.offsetHeight <= heading.offsetHeight + 1;
    }

    function textWidth(text) {
        probe.textContent = "";
        var s = el("span", null, text);
        probe.appendChild(s);
        return s.offsetWidth;
    }

    // Terminal-style decode: the new text is revealed left to right through a run of noise.
    // Noise keeps the target's spaces, so the line breaks settle at once instead of jumping.
    function scramble(part, from, to, ms) {
        var steps = Math.max(to.length, 1), k = 0;
        return new Promise(function (resolve) {
            (function tick() {
                var len = Math.max(k, Math.round(from.length + (to.length - from.length) * k / steps));
                var noise = "";
                for (var i = k; i < len; i++) noise += to.charAt(i) === " " ? " " : NOISE.charAt(Math.random() * NOISE.length | 0);
                fill(part, noise ? [to.slice(0, k), el("span", "hs-noise", noise)] : [to.slice(0, k)]);
                if (k++ >= to.length) { resolve(); return; }
                setTimeout(tick, ms / steps);
            })();
        });
    }

    function rewrite(a, b, ms) {
        var fromA = partA.textContent, fromB = partB.textContent;
        return Promise.all([scramble(partA, fromA, a, ms), scramble(partB, fromB, b, ms + 100)]);
    }

    // --- panes ---------------------------------------------------------------------------

    // The boxes the panes must stay clear of: each line of the eyebrow and the stage (so the
    // free space beside a short line counts), everything below the heading as one block (no
    // panes squeezed between the lede and the buttons), plus the logo.
    function obstacles(base) {
        var boxes = [], below = null, seenHeading = false;
        function lines(node) {
            var range = document.createRange();
            range.selectNodeContents(node);
            Array.prototype.forEach.call(range.getClientRects(), function (r) {
                if (r.width > 0 && r.height > 0) boxes.push(relative(r, base));
            });
        }
        Array.prototype.forEach.call(copy.children, function (child) {
            if (child === stage || child === probe) return;
            if (seenHeading) {
                var r = relative(child.getBoundingClientRect(), base);
                below = below ? { left: Math.min(below.left, r.left), top: Math.min(below.top, r.top), right: Math.max(below.right, r.right), bottom: Math.max(below.bottom, r.bottom) } : r;
            } else if (child === heading) {
                seenHeading = true;
                lines(stage);
            } else {
                lines(child);
            }
        });
        if (below) boxes.push(below);
        hero.querySelectorAll(".hero-logo, .corner").forEach(function (node) {
            boxes.push(relative(node.getBoundingClientRect(), base));
        });
        return boxes;
    }

    function hits(box, list, gap) {
        for (var i = 0; i < list.length; i++) {
            var o = list[i];
            if (box.left < o.right + gap && box.right > o.left - gap &&
                box.top < o.bottom + gap && box.bottom > o.top - gap) return true;
        }
        return false;
    }

    // Greedy placement: each pane takes the free spot nearest to the word it came out of, so
    // the group grows outward from it. Panes without room (phones) are hidden.
    function place(panes, origin) {
        var base = hero.getBoundingClientRect();
        var word = boxOf(origin);
        var cx = word.left + (word.right - word.left) * 0.35, cy = (word.top + word.bottom) / 2;
        var blocked = obstacles(base);
        var placed = [], w = base.width, h = base.height;
        panes.forEach(function (p) { p.el.style.display = ""; });

        panes.forEach(function (pane) {
            var pw = pane.el.offsetWidth, ph = pane.el.offsetHeight;
            var best = null, bestScore = Infinity;
            for (var y = 8; y + ph <= h - 8; y += STEP) {
                for (var x = 8; x + pw <= w - 8; x += STEP) {
                    var box = { left: x, top: y, right: x + pw, bottom: y + ph };
                    var dx = x + pw / 2 - cx, dy = (y + ph / 2 - cy) * 1.6;
                    var score = dx * dx + dy * dy;
                    if (score >= bestScore) continue;
                    if (hits(box, blocked, GAP) || hits(box, placed, PANE_GAP)) continue;
                    best = box; bestScore = score;
                }
            }
            pane.box = best;
            pane.el.style.display = best ? "" : "none";
            if (!best) return;
            placed.push(best);
            pane.el.style.left = best.left + "px";
            pane.el.style.top = best.top + "px";
        });
    }

    function pane(text, gen, opts) {
        opts = opts || {};
        var node = el("span", "hero-pane" + (opts.cls ? " " + opts.cls : ""), text);
        node.style.setProperty("--pane-size", SIZES[gen]);
        node.style.setProperty("--rest-opacity", OPACITY[gen]);
        if (opts.dot) node.style.setProperty("--dot", opts.dot);
        layer.appendChild(node);
        return { el: node, gen: gen, delay: opts.delay || 0 };
    }

    // Each pane flies out of the nearest pane of the generation before it (the word itself
    // for the first generation), so the group visibly multiplies.
    function launch(panes, origin) {
        place(panes, origin);
        active = { panes: panes, origin: origin };
        var o = centre(boxOf(origin));
        panes.forEach(function (p) {
            if (!p.box) return;
            var c = centre(p.box), from = o, bestD = Infinity;
            panes.forEach(function (q) {
                if (!q.box || q.gen !== p.gen - 1) return;
                var qc = centre(q.box), d = (qc.x - c.x) * (qc.x - c.x) + (qc.y - c.y) * (qc.y - c.y);
                if (d < bestD) { bestD = d; from = qc; }
            });
            p.el.style.setProperty("--from-x", (from.x - c.x).toFixed(0) + "px");
            p.el.style.setProperty("--from-y", (from.y - c.y).toFixed(0) + "px");
            p.el.style.setProperty("--delay", p.delay.toFixed(2) + "s");
        });
    }

    // Everything flies back into the word it came from, outermost first.
    function recall() {
        if (!active) return Promise.resolve();
        var panes = active.panes, o = centre(boxOf(active.origin));
        var maxGen = panes.reduce(function (m, p) { return Math.max(m, p.gen); }, 0);
        active = null;
        panes.forEach(function (p) {
            if (!p.box) return;
            var c = centre(p.box);
            p.el.style.setProperty("--from-x", (o.x - c.x).toFixed(0) + "px");
            p.el.style.setProperty("--from-y", (o.y - c.y).toFixed(0) + "px");
            p.el.style.animation = "hero-pane-recall 0.42s cubic-bezier(0.5, 0, 0.8, 0.4) " + ((maxGen - p.gen) * 0.08).toFixed(2) + "s forwards";
        });
        return wait(420 + maxGen * 80 + 60).then(function () {
            panes.forEach(function (p) { p.el.remove(); });
        });
    }

    function onResize() {
        syncStage();
        if (active) place(active.panes, active.origin);
    }

    // --- plays ---------------------------------------------------------------------------

    // "faster." whooshes out, "more." comes in, and the fleet multiplies: 1, 2, 4, 8.
    function playMore() {
        var slot = el("span", "hs-slot");
        var more = el("span", "hs-in hs-accent", "more.");
        slot.appendChild(el("span", "hs-out", "faster."));
        slot.appendChild(more);
        fill(partB, ["Ship ", slot]);

        return wait(30).then(function () {
            slot.classList.add("is-swapping");
            return wait(380);
        }).then(function () {
            slot.classList.add("is-swapped");
            return wait(450);
        }).then(function () {
            var panes = [];
            for (var i = 0; i < 15; i++) {
                var gen = Math.min(Math.floor(Math.log2(i + 1)), SIZES.length - 1);
                panes.push(pane("more", gen, { dot: DOTS[i % DOTS.length], delay: gen * GENERATION + (i % 3) * 0.05 }));
            }
            launch(panes, more);
            return wait(2000 + HOLD);
        }).then(recall).then(function () {
            slot.classList.add("is-returning");
            return wait(480);
        }).then(plain);
    }

    // vim: the cursor walks back to "faster", cw, types "it", Esc. A toast says it merged.
    // Then u (undo) brings "faster." back, with vim's brief undo highlight.
    function playIt() {
        var word = "faster.", cursor = word.length - 1, mode = "block";

        function render(extraCls) {
            var edit = el("span", "hs-edit" + (extraCls ? " " + extraCls : ""));
            for (var i = 0; i <= word.length; i++) {
                if (i === cursor && mode === "bar") edit.appendChild(el("span", "hs-bar"));
                if (i === word.length) break;
                var ch = word.charAt(i);
                edit.appendChild(i === cursor && mode === "block" ? el("span", "hs-cur", ch) : document.createTextNode(ch));
            }
            fill(partB, ["Ship ", edit]);
            return edit;
        }

        function steps(count, ms, fn) {
            var chain = Promise.resolve();
            for (var i = 0; i < count; i++) chain = chain.then(function () { fn(); render(); return wait(ms); });
            return chain;
        }

        render();
        return wait(1100).then(function () {
            stage.classList.add("is-moving");                                          // no blink while it moves
            return steps(cursor, 85, function () { cursor--; });                       // b
        }).then(function () {
            mode = "bar";
            return steps(6, 45, function () { word = word.slice(1); });                // cw: "faster" goes
        }).then(function () {
            return steps(2, 130, function () { word = (word.length === 1 ? "i" : "it") + "."; cursor++; });
        }).then(function () {
            stage.classList.remove("is-moving");
            mode = "block"; cursor = 1;                                                // Esc
            render();
            return wait(500);
        }).then(function () {
            mode = null;
            var edit = render();
            launch([pane("merged to main ✓", 0, { cls: "hero-pane--ok", dot: "var(--green)" })], edit);
            return wait(HOLD);
        }).then(recall).then(function () {
            word = "faster."; mode = "block"; cursor = 0;                             // u
            render("hs-undo");
            return wait(900);
        }).then(plain);
    }

    // "You sleep. Fleet ships.": the work goes on overnight.
    function playSleep() {
        var a = "You sleep.", b = "Fleet ships.", zs = [];
        return rewrite(a, b, 700).then(function () {
            var sleep = el("span", "hs-dim", "sleep.");
            fill(partA, ["You ", sleep]);
            fill(partB, ["Fleet ", el("span", "hs-accent", "ships.")]);
            var box = boxOf(sleep);
            var em = parseFloat(getComputedStyle(stage).fontSize);
            [0.22, 0.3, 0.38].forEach(function (size, i) {
                var z = el("span", "hero-z", "z");
                z.style.left = (box.right - em * 0.1 + i * em * 0.16) + "px";
                z.style.top = (box.top - i * em * 0.1) + "px";
                z.style.setProperty("--z-size", (size * em).toFixed(0) + "px");
                z.style.setProperty("--delay", (i * 0.8) + "s");
                layer.appendChild(z);
                zs.push(z);
            });
            return wait(HOLD + 800);
        }).then(function () {
            zs.forEach(function (z) { z.classList.add("is-leaving"); });
            return rewrite(CANON[0], CANON[1], 650);
        }).then(function () {
            zs.forEach(function (z) { z.remove(); });
            plain();
        });
    }

    // "One prompt. Four repos.": one pane per repo, working, then done one after another.
    function playRepos() {
        var repos = ["web", "api", "payments", "infra"], panes;
        return rewrite("One prompt.", "Four repos.", 700).then(function () {
            var word = el("span", "hs-accent", "repos.");
            fill(partB, ["Four ", word]);
            panes = repos.map(function (name, i) {
                return pane(name, 1, { cls: "is-working", dot: "var(--orange)", delay: i * 0.14 });
            });
            launch(panes, word);
            return wait(1300);
        }).then(function () {
            var chain = Promise.resolve();
            [2, 0, 3, 1].forEach(function (i) {
                chain = chain.then(function () {
                    var p = panes[i];
                    p.el.textContent = repos[i] + " ✓";
                    p.el.classList.remove("is-working");
                    p.el.classList.add("is-done");
                    p.el.style.setProperty("--dot", "var(--green)");
                    return wait(420);
                });
            });
            return chain;
        }).then(function () {
            return wait(HOLD - 800);
        }).then(recall).then(function () {
            return rewrite(CANON[0], CANON[1], 650);
        }).then(plain);
    }

    // A slot-machine reel on the last word: more, together, overnight... and back to faster.
    function playReel() {
        var words = ["more.", "together.", "overnight."].filter(function (w) { return fits(CANON[0], "Ship " + w); });
        if (words.length < 2) return null;
        words = ["faster."].concat(words, ["faster."]);

        var reel = el("span", "hs-reel"), track = el("span", "hs-reel-track");
        words.forEach(function (w, i) {
            track.appendChild(el("span", i === 0 || i === words.length - 1 ? null : "hs-accent", w));
        });
        reel.appendChild(track);
        var widths = words.map(textWidth);
        reel.style.width = widths[0] + "px";
        fill(partB, ["Ship ", reel]);

        var chain = wait(60);
        words.forEach(function (_, i) {
            if (i === 0) return;
            chain = chain.then(function () {
                track.style.transform = "translateY(" + (-1.4 * i) + "em)";
                reel.style.width = widths[i] + "px";
                return wait(i === words.length - 1 ? 700 : 1250);
            });
        });
        return chain.then(plain);
    }

    var plays = [playMore, playIt, playSleep, playRepos, playReel];
    // ?hero-play=sleep (more, it, sleep, repos, reel) loops just that play, for previewing.
    var only = /[?&]hero-play=(\w+)/.exec(window.location.search);
    if (only) {
        plays = plays.filter(function (p) { return p.name.toLowerCase() === "play" + only[1].toLowerCase(); });
        if (plays.length === 0) return;
    }

    // Every sentence a play shows must fit in the heading's box, or it is skipped this round.
    var lines = {
        playMore: [["Use fleet.", "Ship more."]],
        playIt: [["Use fleet.", "Ship it."]],
        playSleep: [["You sleep.", "Fleet ships."]],
        playRepos: [["One prompt.", "Four repos."]],
        playReel: []
    };

    function playable(play) {
        return (lines[play.name] || []).every(function (l) { return fits(l[0], l[1]); });
    }

    // --- loop ----------------------------------------------------------------------------

    function setUp() {
        stage = el("div", "hero-stage");
        stage.setAttribute("aria-hidden", "true");
        partA = el("span");
        partB = el("span");
        stage.appendChild(partA);
        stage.appendChild(document.createTextNode(" "));
        stage.appendChild(partB);
        probe = el("div", "hero-stage is-probe");
        probe.setAttribute("aria-hidden", "true");
        copy.appendChild(stage);
        copy.appendChild(probe);
        // js/hero-orbs.js tints the heading; the stage takes over that tint (see app.css).
        if (heading.classList.contains("orb-tint")) stage.classList.add("orb-tint");
        plain();
        syncStage();
        heading.classList.add("is-staged");

        layer = el("div", "hero-fleet");
        layer.setAttribute("aria-hidden", "true");
        var orbs = hero.querySelector(".hero-orbs");
        hero.insertBefore(layer, orbs ? orbs.nextSibling : hero.firstChild);

        var pending = 0;
        window.addEventListener("resize", function () {
            clearTimeout(pending);
            pending = setTimeout(onResize, 150);
        });
    }

    function loop(n, delay) {
        return visible().then(function () {
            return wait(delay);
        }).then(visible).then(function () {
            syncStage();
            var play = plays[n];
            var run = playable(play) ? play() : null;
            return run && run.catch(function () {
                // A play went wrong: put the plain sentence back and carry on with the next.
                if (layer) layer.textContent = "";
                active = null;
                plain();
            });
        }).then(function () {
            return loop((n + 1) % plays.length, REST);
        });
    }

    function start() {
        var ready = document.fonts && document.fonts.ready ? document.fonts.ready : Promise.resolve();
        ready.then(function () {
            setUp();
            loop(0, FIRST_AFTER);
        });
    }

    if ("IntersectionObserver" in window) {
        var started = false;
        new IntersectionObserver(function (entries) {
            onScreen = entries[0].isIntersecting;
            if (onScreen) {
                var queued = waiters;
                waiters = [];
                queued.forEach(function (resolve) { resolve(); });
            }
            if (onScreen && !started) { started = true; start(); }
        }).observe(hero);
    } else {
        onScreen = true;
        start();
    }
})();
