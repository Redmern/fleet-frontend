// Vim-style page navigation — the site's own j/k/g/G + leader-chord keybinds,
// borrowed straight from fleet's TUI (see the "Rebindable keys" feature card)
// — plus a persistent statusline that makes it visible, not just a hidden
// interaction. Entirely JS-driven progressive enhancement: nothing on the
// page depends on this to be readable or usable, it's a bonus.
(function () {
    "use strict";

    // How long <space> must be pending before the which-key menu appears, so a
    // fast "space f" jumps straight to the section without the menu flashing up.
    var WHICH_KEY_DELAY = 250;
    var SCROLL_STEP = 90;
    var GITHUB_URL = "https://github.com/Redmern/fleet-tui";

    // Everything reachable after <space>. Drives the key handler, the which-key
    // menu and the "?" help, so the three can never disagree.
    var LEADER_KEYS = [
        { key: "t", label: "home", top: true },
        { key: "i", label: "the idea", section: "the-idea" },
        { key: "h", label: "how it works", section: "how-it-works" },
        { key: "m", label: "multiplexer", section: "multiplexer" },
        { key: "a", label: "across machines", section: "machines" },
        { key: "f", label: "features", section: "features" },
        { key: "r", label: "requirements", section: "requirements" },
        { key: "n", label: "install", section: "install" },
        { key: "d", label: "docs", section: "docs" },
        { key: "g", label: "open GitHub", href: GITHUB_URL }
    ];

    function leaderEntry(key) {
        for (var i = 0; i < LEADER_KEYS.length; i++) {
            if (LEADER_KEYS[i].key === key) return LEADER_KEYS[i];
        }
        return null;
    }

    function runLeader(entry) {
        if (entry.href) window.location.href = entry.href;
        else if (entry.top) smoothScrollTo(0);
        else scrollToId(entry.section);
    }

    var SECTION_LABELS = {
        "the-idea": "the idea",
        "how-it-works": "how it works",
        multiplexer: "multiplexer",
        machines: "across machines",
        features: "features",
        requirements: "requirements",
        install: "install",
        docs: "docs"
    };

    var reduceMotion = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    function isTypingTarget(el) {
        if (!el) return false;
        var tag = el.tagName;
        return el.isContentEditable || tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT";
    }

    // Custom scroll animation, not the browser's native `behavior: "smooth"`
    // (repeated native smooth scrollBy() calls each interrupt the previous
    // animation mid-flight, which is what made taps feel stuttery to begin
    // with). One rAF loop drives two modes:
    //   "ease"  — a single tap: glide toward a fixed target, decelerating.
    //   "hold"  — the key is actually held (event.repeat): constant-velocity
    //             scroll for as long as it's down, so repeated auto-repeat
    //             keydowns don't each yank the target further ahead (that
    //             surge/decay/surge/decay pattern is what read as "jittery").
    var HOLD_VELOCITY = 15;
    var mode = null; // null | "ease" | "hold"
    var scrollTarget = 0;
    var holdDir = 0;
    var raf = null;

    function maxScroll() {
        var doc = document.documentElement;
        return Math.max(0, doc.scrollHeight - doc.clientHeight);
    }

    function clampScroll(pos) {
        return Math.max(0, Math.min(pos, maxScroll()));
    }

    function tick() {
        if (mode === "hold") {
            window.scrollTo(0, clampScroll(window.scrollY + holdDir * HOLD_VELOCITY));
            raf = requestAnimationFrame(tick);
            return;
        }
        if (mode === "ease") {
            var current = window.scrollY;
            var diff = scrollTarget - current;
            if (Math.abs(diff) < 0.5) {
                window.scrollTo(0, scrollTarget);
                mode = null;
                raf = null;
                return;
            }
            window.scrollTo(0, current + diff * 0.22);
            raf = requestAnimationFrame(tick);
            return;
        }
        raf = null;
    }

    function smoothScrollTo(pos) {
        if (reduceMotion) {
            window.scrollTo(0, clampScroll(pos));
            return;
        }
        scrollTarget = clampScroll(pos);
        mode = "ease";
        if (!raf) raf = requestAnimationFrame(tick);
    }

    function smoothScrollBy(delta) {
        var base = mode === "ease" ? scrollTarget : window.scrollY;
        smoothScrollTo(base + delta);
    }

    function startHold(dir) {
        if (reduceMotion) return;
        holdDir = dir;
        mode = "hold";
        if (!raf) raf = requestAnimationFrame(tick);
    }

    function stopHold() {
        if (mode === "hold") mode = null;
    }

    function scrollToId(id) {
        var el = document.getElementById(id);
        if (!el) return;
        smoothScrollTo(el.getBoundingClientRect().top + window.scrollY);
    }

    // --- statusline (a persistent Neovim-style bar, not a hidden easter egg) ---

    var sectionEls = Array.prototype.slice.call(document.querySelectorAll("main section[id]"));
    var modeEl, sectionEl, posEl;

    function buildStatusline() {
        var bar = document.createElement("div");
        bar.className = "statusline";
        bar.setAttribute("aria-hidden", "true");

        modeEl = document.createElement("span");
        modeEl.className = "statusline-segment statusline-mode";
        modeEl.textContent = "NORMAL";

        var file = document.createElement("span");
        file.className = "statusline-segment statusline-file";
        file.textContent = "fleet/index.html";

        var spacer = document.createElement("span");
        spacer.className = "statusline-spacer";

        sectionEl = document.createElement("span");
        sectionEl.className = "statusline-segment statusline-section";
        sectionEl.textContent = "hero";

        posEl = document.createElement("span");
        posEl.className = "statusline-segment statusline-pos";
        posEl.textContent = "0%";

        function keyGroup(label, keysHtml, essential, onClick) {
            var el = document.createElement("button");
            el.type = "button";
            el.className = "statusline-segment statusline-keys" + (essential ? "" : " statusline-keys-extra");
            el.innerHTML = '<span class="statusline-keys-label">' + label + '</span>' + keysHtml;
            el.addEventListener("click", onClick || function () {
                isHelpOpen() ? closeHelp() : openHelp();
            });
            return el;
        }

        bar.appendChild(modeEl);
        bar.appendChild(file);
        bar.appendChild(spacer);
        bar.appendChild(sectionEl);
        bar.appendChild(posEl);
        bar.appendChild(keyGroup("navigation", '<kbd>j</kbd>/<kbd>k</kbd>'));
        bar.appendChild(keyGroup("top/bottom", '<kbd>g</kbd>/<kbd>G</kbd>'));
        var jump = keyGroup("jump", '<kbd>space</kbd>', false, function () {
            leaderActive ? clearLeader() : armLeader(0);
        });
        jump.classList.add("statusline-keys-jump");
        bar.appendChild(jump);
        bar.appendChild(keyGroup("menu", '<kbd>?</kbd>', true));
        document.body.appendChild(bar);
        document.body.classList.add("has-statusline");
    }

    function setMode(mode) {
        if (!modeEl) return;
        modeEl.textContent = mode;
        modeEl.classList.toggle("leader", mode === "LEADER");
    }

    function currentSectionId() {
        var current = null;
        for (var i = 0; i < sectionEls.length; i++) {
            if (sectionEls[i].getBoundingClientRect().top <= 120) current = sectionEls[i].id;
        }
        return current;
    }

    function updateStatusline() {
        if (!sectionEl || !posEl) return;
        var id = currentSectionId();
        sectionEl.textContent = id ? (SECTION_LABELS[id] || id) : "hero";

        var doc = document.documentElement;
        var max = doc.scrollHeight - doc.clientHeight;
        var pct = max > 0 ? Math.round((window.scrollY / max) * 100) : 100;
        posEl.textContent = pct <= 0 ? "top" : pct >= 100 ? "bot" : pct + "%";
    }

    var ticking = false;
    function onScrollOrResize() {
        if (ticking) return;
        ticking = true;
        requestAnimationFrame(function () {
            updateStatusline();
            ticking = false;
        });
    }

    // --- leader chord state + which-key menu ---
    // Like which-key.nvim: <space> arms the leader, and if no follow-up key comes
    // within WHICH_KEY_DELAY a menu of what each next key does appears. The leader
    // then stays armed until a key is pressed, Esc, <space> again or a click elsewhere.

    var leaderActive = false;
    var whichKeyTimer = null;
    var whichKeyEl = null;

    function whichKey() {
        if (whichKeyEl) return whichKeyEl;

        whichKeyEl = document.createElement("div");
        whichKeyEl.className = "which-key glass";
        whichKeyEl.setAttribute("role", "menu");
        whichKeyEl.setAttribute("aria-label", "Leader key bindings");

        var items = LEADER_KEYS.map(function (entry) {
            return '<button type="button" class="which-key-item" role="menuitem" data-key="' + entry.key + '">' +
                '<kbd>' + entry.key + '</kbd><span class="which-key-arrow">→</span>' +
                '<span class="which-key-label' + (entry.href ? ' which-key-label-link' : '') + '">' + entry.label + '</span>' +
                '</button>';
        }).join("");

        whichKeyEl.innerHTML =
            '<div class="which-key-head"><kbd>space</kbd><span>jump to…</span></div>' +
            '<div class="which-key-grid">' + items + '</div>' +
            '<div class="which-key-foot"><kbd>esc</kbd> close</div>';

        whichKeyEl.addEventListener("click", function (e) {
            var btn = e.target.closest(".which-key-item");
            if (!btn) return;
            var entry = leaderEntry(btn.dataset.key);
            clearLeader();
            if (entry) runLeader(entry);
        });

        document.body.appendChild(whichKeyEl);
        // Force a style flush so the first open animates instead of appearing instantly.
        void whichKeyEl.offsetWidth;
        return whichKeyEl;
    }

    function showWhichKey() {
        whichKeyTimer = null;
        if (leaderActive) whichKey().classList.add("open");
    }

    function clearLeader() {
        leaderActive = false;
        if (whichKeyTimer) { clearTimeout(whichKeyTimer); whichKeyTimer = null; }
        if (whichKeyEl) whichKeyEl.classList.remove("open");
        setMode("NORMAL");
    }

    function armLeader(delay) {
        leaderActive = true;
        setMode("LEADER");
        whichKeyTimer = setTimeout(showWhichKey, delay === undefined ? WHICH_KEY_DELAY : delay);
    }

    // Clicking anywhere outside the menu dismisses it. The statusline "jump" button
    // is excluded: it toggles the menu itself on click, and closing it here first
    // (mousedown fires before click) would make that click re-open it.
    document.addEventListener("mousedown", function (e) {
        if (!leaderActive) return;
        if (whichKeyEl && whichKeyEl.contains(e.target)) return;
        if (e.target.closest && e.target.closest(".statusline-keys-jump")) return;
        clearLeader();
    });

    // --- help overlay (toggled with "?" or the statusline's key segment) ---

    var backdrop = null;
    function helpOverlay() {
        if (backdrop) return backdrop;

        backdrop = document.createElement("div");
        backdrop.className = "keys-help-backdrop";
        backdrop.addEventListener("click", function (e) {
            if (e.target === backdrop) closeHelp();
        });

        var panel = document.createElement("div");
        panel.className = "keys-help glass";
        panel.setAttribute("role", "dialog");
        panel.setAttribute("aria-label", "Keyboard shortcuts");

        var rows = [
            ["j / k", "scroll down / up"],
            ["g / G", "jump to top / bottom"]
        ].concat(LEADER_KEYS.map(function (entry) {
            return ["space " + entry.key, entry.label];
        }), [
            ["space", "show the jump menu"],
            ["?", "toggle this help"]
        ]);

        var dl = rows.map(function (row) {
            return '<dt><kbd>' + row[0].split(" ").join('</kbd> <kbd>') + '</kbd></dt><dd>' + row[1] + '</dd>';
        }).join("");

        panel.innerHTML =
            '<h3>Keyboard shortcuts</h3>' +
            '<p class="keys-help-sub">Same conventions as fleet itself — j/k/g/G and a leader chord.</p>' +
            '<dl>' + dl + '</dl>';

        backdrop.appendChild(panel);
        document.body.appendChild(backdrop);
        return backdrop;
    }

    function openHelp() {
        if (leaderActive) clearLeader();
        helpOverlay().classList.add("open");
    }

    function closeHelp() {
        if (backdrop) backdrop.classList.remove("open");
    }

    function isHelpOpen() {
        return !!(backdrop && backdrop.classList.contains("open"));
    }

    // --- key handling ---

    document.addEventListener("keydown", function (e) {
        if (isTypingTarget(document.activeElement)) return;
        if (e.metaKey || e.ctrlKey || e.altKey) return;

        if (e.key === "Escape") {
            if (isHelpOpen()) { closeHelp(); return; }
            if (leaderActive) { clearLeader(); return; }
            return;
        }

        if (leaderActive) {
            // A lone modifier (e.g. Shift on the way to "?") is not the follow-up key.
            if (e.key === "Shift" || e.key === "CapsLock") return;
            e.preventDefault();
            var entry = leaderEntry(e.key.toLowerCase());
            clearLeader();
            if (entry) runLeader(entry);
            else if (e.key === "?") openHelp();
            return;
        }

        switch (e.key) {
            case " ":
                e.preventDefault();
                if (isHelpOpen()) closeHelp();
                armLeader();
                break;
            case "j":
                if (e.repeat) startHold(1); else smoothScrollBy(SCROLL_STEP);
                break;
            case "k":
                if (e.repeat) startHold(-1); else smoothScrollBy(-SCROLL_STEP);
                break;
            case "g":
                smoothScrollTo(0);
                break;
            case "G":
                smoothScrollTo(maxScroll());
                break;
            case "?":
                e.preventDefault();
                isHelpOpen() ? closeHelp() : openHelp();
                break;
        }
    });

    document.addEventListener("keyup", function (e) {
        if (e.key === "j" || e.key === "k") stopHold();
    });

    // A held key stops firing keyup if focus leaves the page/tab mid-hold
    // (alt-tab, devtools, etc.) — without this the scroll would run forever.
    window.addEventListener("blur", stopHold);

    buildStatusline();
    updateStatusline();
    window.addEventListener("scroll", onScrollOrResize, { passive: true });
    window.addEventListener("resize", onScrollOrResize);

    // A console easter egg for the people who will absolutely open devtools —
    // developers building terminal tools for developers.
    console.log(
        "%c⛵ fleet",
        "color:#7dcfff;font-family:monospace;font-size:16px;font-weight:700;"
    );
    console.log(
        "%cNice of you to open devtools. You're exactly who this is for.\n\n" +
        "Try the keyboard: j/k to scroll, g/G for top/bottom, and <space> then\n" +
        "a letter to jump around (t/i/h/f/r/n/d). Watch the statusline at the\n" +
        "bottom — it's live. Press ? for the full list.\n\n" +
        "Source: https://github.com/Redmern/fleet-tui",
        "color:#9aa5ce;font-family:monospace;font-size:12px;"
    );
})();
