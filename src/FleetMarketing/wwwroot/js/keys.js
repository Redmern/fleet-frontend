// Vim-style page navigation — the site's own j/k/g/G + leader-chord keybinds,
// borrowed straight from fleet's TUI (see the "Rebindable keys" feature card).
// Entirely JS-driven progressive enhancement: nothing on the page depends on
// this to be readable or usable, it's a bonus for people who'd appreciate it.
(function () {
    "use strict";

    var LEADER_TIMEOUT = 1200;
    var SCROLL_STEP = 90;

    var SECTIONS = {
        i: "the-idea",
        h: "how-it-works",
        f: "features",
        r: "requirements",
        n: "install",
        d: "docs"
    };

    var reduceMotion = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    function isTypingTarget(el) {
        if (!el) return false;
        var tag = el.tagName;
        return el.isContentEditable || tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT";
    }

    function smooth(behaviorOverride) {
        return reduceMotion ? "auto" : (behaviorOverride || "smooth");
    }

    function scrollToId(id) {
        var el = document.getElementById(id);
        if (el) el.scrollIntoView({ behavior: smooth(), block: "start" });
    }

    // --- leader hint (bottom-right pill while a chord is pending) ---

    var hintEl = null;
    function hint() {
        if (!hintEl) {
            hintEl = document.createElement("div");
            hintEl.className = "leader-hint";
            hintEl.setAttribute("aria-hidden", "true");
            document.body.appendChild(hintEl);
        }
        return hintEl;
    }

    var leaderActive = false;
    var leaderTimer = null;

    function clearLeader() {
        leaderActive = false;
        if (leaderTimer) { clearTimeout(leaderTimer); leaderTimer = null; }
        hint().classList.remove("visible");
    }

    function armLeader() {
        leaderActive = true;
        var el = hint();
        el.textContent = "<leader> …  i/h/f/r/n/d · g";
        el.classList.add("visible");
        leaderTimer = setTimeout(clearLeader, LEADER_TIMEOUT);
    }

    // --- help overlay (toggled with "?") ---

    var backdrop = null;
    function helpOverlay() {
        if (backdrop) return backdrop;

        backdrop = document.createElement("div");
        backdrop.className = "keys-help-backdrop";
        backdrop.addEventListener("click", function (e) {
            if (e.target === backdrop) closeHelp();
        });

        var panel = document.createElement("div");
        panel.className = "keys-help";
        panel.setAttribute("role", "dialog");
        panel.setAttribute("aria-label", "Keyboard shortcuts");

        var rows = [
            ["j / k", "scroll down / up"],
            ["g / G", "jump to top / bottom"],
            ["space i", "the idea"],
            ["space h", "how it works"],
            ["space f", "features"],
            ["space r", "requirements"],
            ["space n", "install"],
            ["space d", "docs"],
            ["space g", "open GitHub"],
            ["?", "toggle this help"]
        ];

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
        helpOverlay().classList.add("open");
    }

    function closeHelp() {
        if (backdrop) backdrop.classList.remove("open");
    }

    function isHelpOpen() {
        return !!(backdrop && backdrop.classList.contains("open"));
    }

    // --- discoverability chip ---

    var chip = document.createElement("button");
    chip.type = "button";
    chip.className = "keys-chip";
    chip.innerHTML = 'Press <kbd>?</kbd> for keyboard shortcuts';
    chip.addEventListener("click", openHelp);
    document.body.appendChild(chip);

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
            e.preventDefault();
            var key = e.key.toLowerCase();
            if (key === "g") {
                window.location.href = "https://github.com/Redmern/fleet-tui";
            } else if (SECTIONS[key]) {
                scrollToId(SECTIONS[key]);
            }
            clearLeader();
            return;
        }

        switch (e.key) {
            case " ":
                e.preventDefault();
                armLeader();
                break;
            case "j":
                window.scrollBy({ top: SCROLL_STEP, behavior: smooth() });
                break;
            case "k":
                window.scrollBy({ top: -SCROLL_STEP, behavior: smooth() });
                break;
            case "g":
                window.scrollTo({ top: 0, behavior: smooth() });
                break;
            case "G":
                window.scrollTo({ top: document.body.scrollHeight, behavior: smooth() });
                break;
            case "?":
                e.preventDefault();
                isHelpOpen() ? closeHelp() : openHelp();
                break;
        }
    });

    // A console easter egg for the people who will absolutely open devtools —
    // developers building terminal tools for developers.
    console.log(
        "%c⛵ fleet",
        "color:#7dcfff;font-family:monospace;font-size:16px;font-weight:700;"
    );
    console.log(
        "%cNice of you to open devtools. You're exactly who this is for.\n\n" +
        "Try the keyboard: j/k to scroll, g/G for top/bottom, and <space> then\n" +
        "a letter to jump around (i/h/f/r/n/d). Press ? on the page for the\n" +
        "full list.\n\n" +
        "Source: https://github.com/Redmern/fleet-tui",
        "color:#9aa5ce;font-family:monospace;font-size:12px;"
    );
})();
