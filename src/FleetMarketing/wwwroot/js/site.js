// Progressive-enhancement islands: platform toggle + copy-to-clipboard.
// Core content (the commands themselves) is already in the static HTML;
// this script only makes the platform switch interactive and adds copy buttons.
(function () {
    "use strict";

    var STORAGE_KEY = "fleet-install-platform";

    function detectDefaultPlatform() {
        try {
            var stored = window.localStorage.getItem(STORAGE_KEY);
            if (stored === "windows" || stored === "linux") return stored;
        } catch (e) {
            // localStorage unavailable (private mode, blocked storage) — fall through.
        }
        var ua = navigator.userAgent || "";
        return /linux/i.test(ua) && !/android/i.test(ua) ? "linux" : "windows";
    }

    function setPlatform(platform) {
        document.querySelectorAll("[data-platform-toggle]").forEach(function (toggle) {
            toggle.querySelectorAll("button[data-platform]").forEach(function (btn) {
                btn.classList.toggle("active", btn.dataset.platform === platform);
            });
        });

        document.querySelectorAll("[data-install-command]").forEach(function (pre) {
            var text = pre.dataset[platform];
            if (text) pre.textContent = text;
        });

        try {
            window.localStorage.setItem(STORAGE_KEY, platform);
        } catch (e) {
            // ignore — per-viewer convenience only
        }
    }

    document.querySelectorAll("[data-platform-toggle] button[data-platform]").forEach(function (btn) {
        btn.addEventListener("click", function () {
            setPlatform(btn.dataset.platform);
        });
    });

    setPlatform(detectDefaultPlatform());

    // Scroll-reveal: only runs with JS + IntersectionObserver + no reduced-motion
    // preference. The `js` class (set synchronously in <head>) is what actually
    // hides .reveal elements, so if any check below bails, nothing was ever hidden.
    var prefersReducedMotion = window.matchMedia &&
        window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    if (!prefersReducedMotion && "IntersectionObserver" in window) {
        var revealObserver = new IntersectionObserver(function (entries) {
            entries.forEach(function (entry) {
                if (entry.isIntersecting) {
                    entry.target.classList.add("in-view");
                    revealObserver.unobserve(entry.target);
                }
            });
        }, { threshold: 0.15, rootMargin: "0px 0px -40px 0px" });

        document.querySelectorAll(".reveal").forEach(function (el) {
            revealObserver.observe(el);
        });
    } else {
        document.querySelectorAll(".reveal").forEach(function (el) {
            el.classList.add("in-view");
        });
    }

    document.querySelectorAll(".copy-btn[data-copy-target]").forEach(function (btn) {
        btn.addEventListener("click", async function () {
            var container = btn.closest(".code-block") || document;
            var target = container.querySelector(btn.dataset.copyTarget);
            if (!target) return;
            var text = target.textContent || "";
            try {
                await navigator.clipboard.writeText(text);
            } catch (e) {
                return; // Clipboard API unavailable (no permission, insecure context) — fail silently.
            }
            var original = btn.textContent;
            btn.textContent = "copied";
            btn.classList.add("copied");
            setTimeout(function () {
                btn.textContent = original;
                btn.classList.remove("copied");
            }, 1500);
        });
    });
})();
