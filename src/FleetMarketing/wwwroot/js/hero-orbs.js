// Hero glow orbs: slow wandering motion that keeps the orbs from overlapping too much.
// The CSS keyframe animation in app.css is the no-JS fallback; when this script runs it
// switches that off (.is-js) and drives position, size and stacking order itself, because
// only a script can see where all three orbs are relative to each other.
(function () {
    "use strict";

    var container = document.querySelector(".hero-orbs");
    if (!container) return;
    if (window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    var hero = container.closest(".hero") || container.parentElement;

    // At most this fraction of the smaller orb's area may be covered by another orb.
    var MAX_OVERLAP = 0.2;
    // Where an orb visibly "ends", as a fraction of its half-width. The gradient fades to
    // transparent at 62%, but past ~50% it is too faint to read as part of the orb.
    var VISIBLE_RADIUS = 0.5;
    // The orbs' visible areas added together never exceed this fraction of the hero. The
    // base sizes below keep the total around 25-30%; this cap trims the peaks when several
    // orbs are at their largest at once.
    var MAX_COVERAGE = 0.35;
    // Seconds for the drawn position to catch up with the solved one; smooths out contact.
    var SMOOTHING = 0.6;
    var TAU = Math.PI * 2;

    // size: diameter as a fraction of sqrt(heroWidth * heroHeight), so the layout holds on
    // phones and wide screens alike. anchor: resting centre as a fraction of the hero.
    // Periods (seconds) are deliberately unrelated so the pattern never visibly repeats.
    var specs = {
        "hero-orb-cyan":   { tint: "125, 207, 255", size: 0.68, anchor: [0.18, 0.25], amp: [0.22, 0.28], periods: [47, 29, 53, 31], scale: [0.25, 37], phase: 0.0 },
        "hero-orb-purple": { tint: "187, 154, 247", size: 0.59, anchor: [0.82, 0.18], amp: [0.24, 0.26], periods: [41, 23, 59, 27], scale: [0.28, 43], phase: 2.1 },
        "hero-orb-orange": { tint: "255, 158, 100", size: 0.74, anchor: [0.50, 0.85], amp: [0.28, 0.20], periods: [53, 33, 43, 25], scale: [0.25, 31], phase: 4.2 }
    };

    var orbs = [];
    container.querySelectorAll(".hero-orb").forEach(function (el) {
        for (var cls in specs) {
            if (el.classList.contains(cls)) orbs.push({ el: el, spec: specs[cls], x: 0, y: 0, s: 1, r: 0, placed: false });
        }
    });
    if (orbs.length === 0) return;

    container.classList.add("is-js");

    // The hero heading takes on an orb's colour wherever that orb is behind it.
    var heading = hero.querySelector("h1");
    var canClipText = window.CSS && CSS.supports &&
        (CSS.supports("background-clip", "text") || CSS.supports("-webkit-background-clip", "text"));
    if (heading && canClipText) heading.classList.add("orb-tint");
    else heading = null;

    // Area of the intersection of two circles with radii a, b whose centres are d apart.
    function lensArea(a, b, d) {
        if (d >= a + b) return 0;
        var small = Math.min(a, b);
        if (d <= Math.abs(a - b)) return Math.PI * small * small;
        var a2 = a * a, b2 = b * b;
        var alpha = Math.acos((d * d + a2 - b2) / (2 * d * a));
        var beta = Math.acos((d * d + b2 - a2) / (2 * d * b));
        return a2 * (alpha - Math.sin(2 * alpha) / 2) + b2 * (beta - Math.sin(2 * beta) / 2);
    }

    // Smallest centre distance at which the overlap is within MAX_OVERLAP (bisection).
    function minDistance(a, b) {
        var small = Math.min(a, b);
        var limit = MAX_OVERLAP * Math.PI * small * small;
        var lo = Math.abs(a - b), hi = a + b;
        for (var i = 0; i < 24; i++) {
            var mid = (lo + hi) / 2;
            if (lensArea(a, b, mid) > limit) lo = mid; else hi = mid;
        }
        return hi;
    }

    // Push overlapping pairs apart until every pair is within the limit, keeping centres
    // loosely inside the hero (orbs may hang off the edge, as in the original design).
    function separate(points, w, h) {
        for (var iter = 0; iter < 8; iter++) {
            var moved = false;
            for (var i = 0; i < points.length; i++) {
                for (var j = i + 1; j < points.length; j++) {
                    var p = points[i], q = points[j];
                    var dx = q.x - p.x, dy = q.y - p.y;
                    var d = Math.sqrt(dx * dx + dy * dy) || 0.001;
                    var need = minDistance(p.r, q.r);
                    if (d < need) {
                        var push = (need - d) / 2 + 0.01;
                        var ux = dx / d, uy = dy / d;
                        p.x -= ux * push; p.y -= uy * push;
                        q.x += ux * push; q.y += uy * push;
                        moved = true;
                    }
                }
            }
            for (var k = 0; k < points.length; k++) {
                points[k].x = Math.min(Math.max(points[k].x, -0.15 * w), 1.15 * w);
                points[k].y = Math.min(Math.max(points[k].y, -0.15 * h), 1.15 * h);
            }
            if (!moved) break;
        }
    }

    var clock = 0, last = null, running = true, frame = 0;

    function step(now) {
        frame = 0;
        if (!running) return;
        var dt = last === null ? 0 : Math.min((now - last) / 1000, 0.1);
        last = now;
        clock += dt;

        var w = hero.clientWidth, h = hero.clientHeight;
        var unit = Math.sqrt(w * h);
        var t = clock;
        // Heading position in hero coordinates (the orbs' coordinate space). Read before
        // any style writes this frame so it does not force an extra layout.
        var headRect = null;
        if (heading) {
            var hr = heading.getBoundingClientRect(), herr = hero.getBoundingClientRect();
            headRect = { x: hr.left - herr.left, y: hr.top - herr.top };
        }

        // 1. Where each orb wants to be: a sum of two slow sines per axis around its anchor.
        var targets = orbs.map(function (o) {
            var sp = o.spec, pe = sp.periods, ph = sp.phase;
            return {
                x: w * (sp.anchor[0] + sp.amp[0] * (0.65 * Math.sin(TAU * t / pe[0] + ph) + 0.35 * Math.sin(TAU * t / pe[1] + ph * 1.7))),
                y: h * (sp.anchor[1] + sp.amp[1] * (0.65 * Math.sin(TAU * t / pe[2] + ph * 0.6) + 0.35 * Math.sin(TAU * t / pe[3] + ph * 2.3))),
                s: 1 + sp.scale[0] * Math.sin(TAU * t / sp.scale[1] + ph),
                d: sp.size * unit
            };
        });

        // Cap the combined visible area: if it is over budget, shrink every orb by the same
        // factor (area goes with the square of scale, hence the square root).
        var coverage = 0;
        targets.forEach(function (tg) {
            var r = tg.d / 2 * VISIBLE_RADIUS * tg.s;
            coverage += Math.PI * r * r;
        });
        var fit = Math.min(1, Math.sqrt(MAX_COVERAGE * w * h / coverage));
        targets.forEach(function (tg) {
            tg.s *= fit;
            tg.r = tg.d / 2 * VISIBLE_RADIUS * tg.s;
        });
        separate(targets, w, h);

        // 2. Ease the drawn position toward the solved one, then re-check the limit so the
        //    easing can never let two orbs sink into each other.
        var ease = 1 - Math.exp(-dt / SMOOTHING);
        orbs.forEach(function (o, i) {
            var tg = targets[i];
            if (!o.placed) { o.x = tg.x; o.y = tg.y; o.placed = true; }
            o.x += (tg.x - o.x) * ease;
            o.y += (tg.y - o.y) * ease;
            o.s = tg.s; o.d = tg.d; o.r = tg.r;
        });
        separate(orbs, w, h);

        // 3. Bigger reads as closer: stack by current size. Ranks swap exactly when two orbs
        //    are the same size, so the change in layering is barely perceptible.
        var byScale = orbs.slice().sort(function (a, b) { return a.s - b.s; });

        orbs.forEach(function (o) {
            var st = o.el.style;
            st.width = st.height = o.d + "px";
            st.transform = "translate3d(" + (o.x - o.d / 2).toFixed(1) + "px," + (o.y - o.d / 2).toFixed(1) + "px,0) scale(" + o.s.toFixed(4) + ")";
            st.zIndex = String(byScale.indexOf(o) + 1);
        });

        // 4. Tint the heading: one radial spot per orb at its position relative to the
        //    heading, frontmost orb listed first (CSS paints the first layer on top),
        //    over a plain white base. Solid core, fading out to white by the orb's edge.
        if (heading) {
            var layers = byScale.slice().reverse().map(function (o) {
                var r = Math.max(o.r * 1.15, 1);
                return "radial-gradient(circle " + r.toFixed(0) + "px at " +
                    (o.x - headRect.x).toFixed(0) + "px " + (o.y - headRect.y).toFixed(0) + "px, " +
                    "rgb(" + o.spec.tint + ") 0%, rgba(" + o.spec.tint + ", 0.85) 45%, rgba(" + o.spec.tint + ", 0) 100%)";
            });
            layers.push("linear-gradient(#fff, #fff)");
            heading.style.backgroundImage = layers.join(",");
        }

        frame = requestAnimationFrame(step);
    }

    function start() {
        if (frame) return;
        running = true;
        last = null;
        frame = requestAnimationFrame(step);
    }

    function stop() {
        running = false;
        if (frame) cancelAnimationFrame(frame);
        frame = 0;
    }

    // Only animate while the hero is on screen.
    if ("IntersectionObserver" in window) {
        new IntersectionObserver(function (entries) {
            entries[0].isIntersecting ? start() : stop();
        }).observe(hero);
    } else {
        start();
    }
})();
