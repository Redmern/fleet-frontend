#!/usr/bin/env python3
"""Records a real fleet session in a pty, driven by commands from a FIFO.

    python3 drive.py <workdir>

It starts `bash` in a 120x34 pty inside the isolated demo environment (see README.md) and
writes every byte the terminal prints, with its time, to <workdir>/raw.jsonl. A pyte screen
follows along, so a driver can wait for text and look at the screen (pyte has no alternate
screen, so screen.txt is for waiting on text; cut.mjs --peek shows the real screen).

Commands are JSON lines written to <workdir>/cmd (a FIFO):
    {"keys": "fleet\\r"}          type these bytes (JSON escapes, so "\\u0013" is ctrl+s)
    {"type": "text", "cps": 12}   type text at a human pace
    {"marker": "Open a project"}  a chapter marker at this moment
    {"dump": true}                write the screen to <workdir>/screen.txt
    {"quit": true}                stop recording now (the processes in the pty get SIGHUP)
"""
import codecs
import json
import os
import pty
import re
import select
import signal
import struct
import sys
import fcntl
import termios
import time

import pyte

COLS, ROWS = 120, 34

# fleet asks the terminal about itself at start-up; a real terminal answers, so this does too.
QUERIES = re.compile(rb"\x1b\[(?:18t|14t|6n|\?u|0?c)|\x1b\](?:10|11);\?(?:\x1b\\|\x07)")
COLORS = {b"10": b"rgb:cdcd/d6d6/f4f4", b"11": b"rgb:1e1e/1e1e/2e2e"}  # Catppuccin Mocha text/base


def answer(query, screen):
    if query.endswith(b"18t"):
        return b"\x1b[8;%d;%dt" % (ROWS, COLS)
    if query.endswith(b"14t"):
        return b"\x1b[4;%d;%dt" % (ROWS * 20, COLS * 10)
    if query.endswith(b"6n"):
        return b"\x1b[%d;%dR" % (screen.cursor.y + 1, screen.cursor.x + 1)
    if query.endswith(b"c"):
        return b"\x1b[?62;22c"
    if query.startswith(b"\x1b]"):
        code = query[2:4]
        return b"\x1b]" + code + b";" + COLORS[code] + b"\x1b\\"
    return b""  # kitty keyboard query: not supported, the DA answer says so


def main():
    work = sys.argv[1]
    os.makedirs(work, exist_ok=True)
    fifo = os.path.join(work, "cmd")
    if not os.path.exists(fifo):
        os.mkfifo(fifo)

    pid, fd = pty.fork()
    if pid == 0:
        os.chdir(os.environ.get("DEMO_CWD", os.getcwd()))
        os.execvp("bash", ["bash", "--norc", "--noprofile", "-i"])

    fcntl.ioctl(fd, termios.TIOCSWINSZ, struct.pack("HHHH", ROWS, COLS, 0, 0))
    screen = pyte.Screen(COLS, ROWS)
    stream = pyte.ByteStream(screen)
    raw = open(os.path.join(work, "raw.jsonl"), "w")
    raw.write(json.dumps({"version": 2, "width": COLS, "height": ROWS,
                          "env": {"TERM": "xterm-256color"}}) + "\n")
    start = time.monotonic()
    # Opened read-write so the FIFO always has a writer and never reads as EOF.
    cmd_fd = os.open(fifo, os.O_RDWR | os.O_NONBLOCK)
    pending = b""
    decoder = codecs.getincrementaldecoder("utf-8")("replace")
    # Keys and typed text share one queue, so they reach the pty in the order they were sent.
    typing = []  # queued (due_time, bytes)

    def now():
        return round(time.monotonic() - start, 3)

    def dump():
        with open(os.path.join(work, "screen.txt"), "w") as f:
            f.write(f"t={now()} cursor={screen.cursor.y},{screen.cursor.x}\n")
            f.write("\n".join(screen.display) + "\n")

    def handle(cmd):
        due = max(time.monotonic(), typing[-1][0] if typing else 0)
        if "keys" in cmd:
            typing.append((due, cmd["keys"].encode()))
        if "type" in cmd:
            gap = 1.0 / cmd.get("cps", 12)
            for ch in cmd["type"]:
                typing.append((due, ch.encode()))
                due += gap
        if "marker" in cmd:
            raw.write(json.dumps([now(), "m", cmd["marker"]]) + "\n")
        if cmd.get("dump"):
            dump()
        return not cmd.get("quit")

    alive = True
    while alive:
        r, _, _ = select.select([fd, cmd_fd], [], [], 0.02)
        if fd in r:
            try:
                data = os.read(fd, 65536)
            except OSError:
                break
            if not data:
                break
            stream.feed(data)
            for q in QUERIES.finditer(data):
                reply = answer(q.group(0), screen)
                if reply:
                    os.write(fd, reply)
            text = decoder.decode(data)
            if text:
                raw.write(json.dumps([now(), "o", text]) + "\n")
            raw.flush()
            dump()
        if cmd_fd in r:
            pending += os.read(cmd_fd, 65536)
            while b"\n" in pending:
                line, pending = pending.split(b"\n", 1)
                if not line.strip():
                    continue
                try:
                    cmd = json.loads(line)
                except ValueError as err:  # a typo must not end the take
                    print(f"drive: ignored bad command {line!r}: {err}", file=sys.stderr)
                    continue
                if not handle(cmd):
                    alive = False
        while typing and typing[0][0] <= time.monotonic():
            os.write(fd, typing.pop(0)[1])

    raw.close()
    try:
        os.kill(pid, signal.SIGHUP)
    except ProcessLookupError:
        pass


if __name__ == "__main__":
    main()
