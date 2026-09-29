// The "See it live" recording: a real fleet session (asciicast), played with the vendored
// asciinema-player. The player (and its ~1 MB recording) is only created when the section
// comes near the viewport; it plays while the section is in view and pauses when it leaves.
// Without JS, or if the player fails to load, the section's <noscript> text stays.
(function () {
    "use strict";

    var root = document.querySelector("[data-demo-player]");
    if (!root || !window.AsciinemaPlayer) return;

    var reduceMotion = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    var player = null;

    function create() {
        player = window.AsciinemaPlayer.create(root.getAttribute("data-cast"), root, {
            autoPlay: false,
            loop: true,
            preload: true,
            fit: "width",
            theme: "fleet",
            // A frame from the dashboard, shown until playback starts (and with reduced motion).
            poster: "npt:" + (root.getAttribute("data-poster") || "0:05"),
            terminalFontFamily: getComputedStyle(root).getPropertyValue("--demo-font").trim() || "monospace"
        });
    }

    if (!("IntersectionObserver" in window)) {
        create();
        return;
    }

    new IntersectionObserver(function (entries, observer) {
        if (!entries.some(function (e) { return e.isIntersecting; })) return;
        observer.disconnect();
        create();
        if (reduceMotion) return;
        new IntersectionObserver(function (seen) {
            seen.forEach(function (e) {
                if (e.isIntersecting) player.play();
                else player.pause();
            });
        }, { threshold: 0.35 }).observe(root);
    }, { rootMargin: "600px 0px" }).observe(root);
})();
