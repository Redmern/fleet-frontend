// Animated terminal mockup for the hero section.
// Progressive enhancement only: without this script, the <noscript> fallback
// inside [data-terminal-body] renders a static snapshot of the same flow.
(function () {
    "use strict";

    var root = document.querySelector("[data-terminal-mockup]");
    if (!root) return;

    var body = root.querySelector("[data-terminal-body]");
    if (!body) return;

    var tabs = root.querySelector("[data-wz-tabs]");

    function resetTabs() {
        if (!tabs) return;
        tabs.querySelectorAll(".wz-tab.agent-tab").forEach(function (t) { t.remove(); });
    }

    function addAgentTab(label) {
        if (!tabs) return null;
        var tab = el("div", "wz-tab agent-tab");
        var dot = el("span", "wz-tab-dot");
        dot.style.background = "var(--yellow)";
        tab.appendChild(dot);
        tab.appendChild(document.createTextNode(label));
        tabs.appendChild(tab);
        return dot;
    }

    var reduceMotion = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    function el(tag, className, text) {
        var node = document.createElement(tag);
        if (className) node.className = className;
        if (text !== undefined) node.textContent = text;
        return node;
    }

    function line(promptText, fillText) {
        var row = el("div", "terminal-line");
        if (promptText) row.appendChild(el("span", "prompt", promptText));
        row.appendChild(el("span", "fill", fillText || ""));
        return row;
    }

    function clear() {
        body.innerHTML = "";
    }

    function wait(ms) {
        return new Promise(function (resolve) { setTimeout(resolve, ms); });
    }

    async function typeInto(fillSpan, text, speed) {
        if (reduceMotion) {
            fillSpan.textContent = text;
            return;
        }
        for (var i = 0; i < text.length; i++) {
            fillSpan.textContent += text[i];
            await wait(speed);
        }
    }

    async function scene1() {
        clear();
        resetTabs();
        var l1 = line("$", "");
        body.appendChild(l1);
        var cursor = el("span", "terminal-cursor");
        l1.appendChild(cursor);
        await typeInto(l1.querySelector(".fill"), "fleet", 70);
        cursor.remove();
        await wait(reduceMotion ? 0 : 400);

        body.appendChild(line("", "? Pick a project ›"));
        await wait(reduceMotion ? 0 : 250);
        var picker = el("div", "terminal-line");
        picker.appendChild(el("span", "fill", "  fleet-frontend"));
        picker.style.color = "var(--cyan)";
        body.appendChild(picker);
        body.appendChild(line("", "  fleet-tui"));
        body.appendChild(line("", "  scratch"));
        await wait(reduceMotion ? 300 : 900);

        body.appendChild(line("", "Opening dashboard for fleet-frontend…"));
        await wait(reduceMotion ? 300 : 1100);
    }

    async function scene2() {
        clear();
        var panes = el("div", "terminal-panes");
        var left = el("div", "terminal-pane");
        left.appendChild(el("div", "pane-label", "claude code"));
        left.appendChild(line("$", "fix flaky test in auth.spec.ts"));
        left.appendChild(line("", "Reading src/auth/auth.spec.ts…"));

        var right = el("div", "terminal-pane");
        right.appendChild(el("div", "pane-label", "fleet dashboard"));
        var row1 = el("div", "dashboard-row");
        row1.innerHTML = '<span><span class="status-dot working"></span><span class="agent-name">main</span> ' +
            '<span class="branch-pill">main <span class="dirty">●</span></span></span>' +
            '<span class="agent-state">working</span>';
        right.appendChild(row1);

        panes.appendChild(left);
        panes.appendChild(right);
        body.appendChild(panes);

        await wait(reduceMotion ? 300 : 1200);

        var cmdLine = line("$", "");
        left.appendChild(cmdLine);
        var cursor = el("span", "terminal-cursor");
        cmdLine.appendChild(cursor);
        await typeInto(cmdLine.querySelector(".fill"), 'fleet dispatch "add pagination to /users"', 35);
        cursor.remove();
        await wait(reduceMotion ? 200 : 500);

        // Matches the real workflow: dispatch spins up a sub-orchestrator that
        // appears on its own WezTerm tab (fleet-tui docs/DESIGN.md).
        var tabDot = addAgentTab("add-pagination");

        var row2 = el("div", "dashboard-row");
        row2.innerHTML = '<span><span class="status-dot working"></span><span class="agent-name">sub-orchestrator #2</span> ' +
            '<span class="branch-pill">add-pagination</span></span><span class="agent-state">working</span>';
        right.appendChild(row2);
        await wait(reduceMotion ? 400 : 1800);

        row2.innerHTML = '<span><span class="status-dot done"></span><span class="agent-name">sub-orchestrator #2</span> ' +
            '<span class="branch-pill">add-pagination <span class="ahead">↑1</span></span></span>' +
            '<span class="agent-state">done</span>';
        if (tabDot) tabDot.style.background = "var(--green)";
        await wait(reduceMotion ? 600 : 2200);
    }

    async function loop() {
        while (true) {
            await scene1();
            await scene2();
            if (reduceMotion) break; // show one static pass, then stop animating
        }
    }

    loop();
})();
