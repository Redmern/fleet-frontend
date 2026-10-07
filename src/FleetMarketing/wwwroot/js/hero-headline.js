// Hero headline: "Use fleet. Ship faster." After a moment "faster." whooshes away, "more."
// takes its place, and small "more" panes fan out around it: one becomes two, two become
// four, the way one agent becomes a fleet. Then it settles. The static heading is the real
// text, so screen readers, search engines, no-JS and reduced motion all get "Use fleet.
// Ship faster."; what is added here is generated content or aria-hidden, and absolutely
// positioned, so the layout never moves.
(function () {
    "use strict";

    var slot = document.querySelector("[data-hero-swap]");
    if (!slot) return;
    if (window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    var hero = slot.closest(".hero");
    var copy = slot.closest("h1").parentElement;
    if (!hero || !copy) return;

    var SWAP_AFTER = 1800;   // ms on screen before "faster." goes
    var OUT_TIME = 380;      // ms until "more." starts coming in
    var SPAWN_AFTER = 450;   // ms after "more." arrives before the first pane
    var GENERATION = 0.34;   // s between generations of panes
    var MAX_PANES = 15;      // 1 + 2 + 4 + 8
    var GAP = 14;            // px kept free around the copy
    var PANE_GAP = 20;       // px kept free between panes
    var STEP = 8;            // px between candidate positions
    // Per generation: font size and resting opacity. Further out is smaller and fainter.
    var SIZES = ["1.05rem", "0.92rem", "0.8rem", "0.72rem"];
    var OPACITY = [0.95, 0.85, 0.72, 0.6];
    var DOTS = ["var(--green)", "var(--orange)", "var(--cyan)", "var(--green)", "var(--magenta)"];

    var layer = null, panes = [];

    function generationOf(i) {
        return Math.min(Math.floor(Math.log2(i + 1)), SIZES.length - 1);
    }

    function relative(r, base) {
        return { left: r.left - base.left, top: r.top - base.top, right: r.right - base.left, bottom: r.bottom - base.top };
    }

    // The boxes the panes must stay clear of: each line of the eyebrow and the heading (so
    // the free space beside a short line counts), everything below the heading as one block
    // (no panes squeezed between the lede and the buttons), plus the logo.
    function obstacles(base) {
        var boxes = [], below = null, heading = slot.closest("h1"), seenHeading = false;
        Array.prototype.forEach.call(copy.children, function (el) {
            if (seenHeading) {
                var r = relative(el.getBoundingClientRect(), base);
                below = below ? { left: Math.min(below.left, r.left), top: Math.min(below.top, r.top), right: Math.max(below.right, r.right), bottom: Math.max(below.bottom, r.bottom) } : r;
                return;
            }
            seenHeading = el === heading;
            var range = document.createRange();
            range.selectNodeContents(el);
            Array.prototype.forEach.call(range.getClientRects(), function (r) {
                if (r.width > 0 && r.height > 0) boxes.push(relative(r, base));
            });
        });
        if (below) boxes.push(below);
        hero.querySelectorAll(".hero-logo, .corner").forEach(function (el) {
            boxes.push(relative(el.getBoundingClientRect(), base));
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

    // Greedy placement: each pane takes the free spot nearest to "more.", so the fleet grows
    // outward from it. Returns one box per pane; null where there is no room (phones).
    function layout() {
        var base = hero.getBoundingClientRect();
        var word = relative(slot.getBoundingClientRect(), base);
        var cx = word.left + (word.right - word.left) * 0.35, cy = (word.top + word.bottom) / 2;
        var blocked = obstacles(base);
        var placed = [];
        panes.forEach(function (p) { p.el.style.display = ""; });
        var minTop = 8, w = base.width, h = base.height;

        return panes.map(function (pane) {
            var pw = pane.el.offsetWidth, ph = pane.el.offsetHeight;
            var best = null, bestScore = Infinity;
            for (var y = minTop; y + ph <= h - 8; y += STEP) {
                for (var x = 8; x + pw <= w - 8; x += STEP) {
                    var box = { left: x, top: y, right: x + pw, bottom: y + ph };
                    var dx = x + pw / 2 - cx, dy = (y + ph / 2 - cy) * 1.6;
                    var score = dx * dx + dy * dy;
                    if (score >= bestScore) continue;
                    if (hits(box, blocked, GAP) || hits(box, placed, PANE_GAP)) continue;
                    best = box; bestScore = score;
                }
            }
            if (best) placed.push(best);
            return best;
        });
    }

    function place(boxes) {
        panes.forEach(function (pane, i) {
            var box = boxes[i];
            pane.box = box;
            pane.el.style.display = box ? "" : "none";
            if (!box) return;
            pane.el.style.left = box.left + "px";
            pane.el.style.top = box.top + "px";
        });
    }

    function spawn() {
        layer = document.createElement("div");
        layer.className = "hero-fleet";
        layer.setAttribute("aria-hidden", "true");
        var orbs = hero.querySelector(".hero-orbs");
        hero.insertBefore(layer, orbs ? orbs.nextSibling : hero.firstChild);

        for (var i = 0; i < MAX_PANES; i++) {
            var gen = generationOf(i);
            var el = document.createElement("span");
            el.className = "hero-pane";
            el.textContent = "more";
            el.style.setProperty("--pane-size", SIZES[gen]);
            el.style.setProperty("--rest-opacity", OPACITY[gen]);
            el.style.setProperty("--dot", DOTS[i % DOTS.length]);
            layer.appendChild(el);
            panes.push({ el: el, gen: gen });
        }
        place(layout());

        // Each pane flies out of the nearest pane of the generation before it ("more." for
        // the first), so the fleet visibly multiplies.
        var base = hero.getBoundingClientRect();
        var word = relative(slot.getBoundingClientRect(), base);
        var origin = { x: (word.left + word.right) / 2, y: (word.top + word.bottom) / 2 };
        function centre(box) { return { x: (box.left + box.right) / 2, y: (box.top + box.bottom) / 2 }; }

        panes.forEach(function (pane, i) {
            if (!pane.box) return;
            var c = centre(pane.box), from = origin, bestD = Infinity;
            panes.forEach(function (p) {
                if (!p.box || p.gen !== pane.gen - 1) return;
                var pc = centre(p.box), d = (pc.x - c.x) * (pc.x - c.x) + (pc.y - c.y) * (pc.y - c.y);
                if (d < bestD) { bestD = d; from = pc; }
            });
            pane.el.style.setProperty("--from-x", (from.x - c.x).toFixed(0) + "px");
            pane.el.style.setProperty("--from-y", (from.y - c.y).toFixed(0) + "px");
            pane.el.style.setProperty("--delay", (pane.gen * GENERATION + (i % 3) * 0.05).toFixed(2) + "s");
        });

        var pending = 0;
        window.addEventListener("resize", function () {
            clearTimeout(pending);
            pending = setTimeout(function () { place(layout()); }, 150);
        });
    }

    // "more." itself is CSS generated content on the slot (see app.css), so it never becomes
    // part of the heading's text.
    function run() {
        setTimeout(function () {
            slot.classList.add("is-swapping");
            setTimeout(function () {
                slot.classList.add("is-swapped");
                setTimeout(spawn, SPAWN_AFTER);
            }, OUT_TIME);
        }, SWAP_AFTER);
    }

    // Start once the hero is on screen and the fonts are in, so the measured text is final.
    function start() {
        var ready = document.fonts && document.fonts.ready ? document.fonts.ready : Promise.resolve();
        ready.then(run);
    }

    if ("IntersectionObserver" in window) {
        new IntersectionObserver(function (entries, observer) {
            if (!entries[0].isIntersecting) return;
            observer.disconnect();
            start();
        }).observe(hero);
    } else {
        start();
    }
})();
