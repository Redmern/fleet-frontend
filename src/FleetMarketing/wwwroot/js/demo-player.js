// The "See it live" recording: a real fleet session (asciicast), played with the vendored
// asciinema-player. The recording is only fetched when the section comes near the viewport;
// it plays while the section is in view and pauses when it leaves. Its markers ("m" events)
// become chapter buttons under the player. Without JS, or if loading fails, the section's
// <noscript> text stays and no chapters are shown.
(function () {
    "use strict";

    var root = document.querySelector("[data-demo-player]");
    var chapterList = document.querySelector("[data-demo-chapters]");
    if (!root || !window.AsciinemaPlayer || !window.fetch) return;

    var reduceMotion = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    var player = null;

    function markersOf(cast) {
        var markers = [];
        cast.split("\n").slice(1).forEach(function (line) {
            if (line.indexOf('"m"') < 0) return;
            try {
                var e = JSON.parse(line);
                if (e[1] === "m") markers.push({ time: e[0], label: e[2] });
            } catch (err) { /* not an event line */ }
        });
        return markers;
    }

    function formatTime(seconds) {
        var s = Math.floor(seconds);
        return Math.floor(s / 60) + ":" + (s % 60 < 10 ? "0" : "") + (s % 60);
    }

    function showChapters(markers) {
        if (!chapterList || markers.length === 0) return;
        var buttons = markers.map(function (m, i) {
            var item = document.createElement("li");
            var button = document.createElement("button");
            button.type = "button";
            button.className = "demo-chapter";
            button.innerHTML = '<span class="demo-chapter-time"></span><span class="demo-chapter-label"></span>';
            button.firstChild.textContent = formatTime(m.time);
            button.lastChild.textContent = m.label;
            button.addEventListener("click", function () {
                player.seek({ marker: i }).then(function () { player.play(); });
                setActive(i);
            });
            item.appendChild(button);
            chapterList.appendChild(item);
            return button;
        });

        function setActive(index) {
            buttons.forEach(function (b, i) { b.classList.toggle("active", i === index); });
        }

        player.addEventListener("marker", function (e) { setActive(e.index); });
        chapterList.hidden = false;
    }

    function start() {
        fetch(root.getAttribute("data-cast"))
            .then(function (response) {
                if (!response.ok) throw new Error(response.status + " " + response.statusText);
                return response.text();
            })
            .then(function (cast) {
                player = window.AsciinemaPlayer.create({ data: cast }, root, {
                    autoPlay: false,
                    loop: true,
                    fit: "width",
                    theme: "fleet",
                    // A frame from the dashboard, shown until playback starts (and with reduced motion).
                    poster: "npt:" + (root.getAttribute("data-poster") || "0:05"),
                    terminalFontFamily: getComputedStyle(root).getPropertyValue("--demo-font").trim() || "monospace"
                });
                showChapters(markersOf(cast));
                if (reduceMotion || !("IntersectionObserver" in window)) return;
                new IntersectionObserver(function (seen) {
                    seen.forEach(function (e) {
                        if (e.isIntersecting) player.play();
                        else player.pause();
                    });
                }, { threshold: 0.35 }).observe(root);
            })
            .catch(function (err) {
                if (window.console) console.warn("fleet demo: could not load the recording", err);
            });
    }

    if (!("IntersectionObserver" in window)) {
        start();
        return;
    }

    new IntersectionObserver(function (entries, observer) {
        if (!entries.some(function (e) { return e.isIntersecting; })) return;
        observer.disconnect();
        start();
    }, { rootMargin: "600px 0px" }).observe(root);
})();
