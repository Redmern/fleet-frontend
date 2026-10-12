#!/usr/bin/env bash
# Asserts the promo mp4 meets AC-10 and the size/codec budget:
# 60-90 s, 1920x1080, h264 yuv420p, moov atom up front (+faststart), under 15 MB.
set -euo pipefail

file="${1:-out/fleet-promo.mp4}"
fail=0
err() { echo "FAIL: $*" >&2; fail=1; }

if [[ ! -f "$file" ]]; then
    echo "FAIL: $file does not exist" >&2
    exit 1
fi

probe() { ffprobe -v error -select_streams v:0 -show_entries "$1" -of default=nw=1:nk=1 "$file"; }

duration=$(ffprobe -v error -show_entries format=duration -of default=nw=1:nk=1 "$file")
width=$(probe stream=width)
height=$(probe stream=height)
codec=$(probe stream=codec_name)
pix_fmt=$(probe stream=pix_fmt)
size=$(stat -c %s "$file")
max_size=$((15 * 1024 * 1024))

awk -v d="$duration" 'BEGIN { exit !(d >= 60 && d <= 90) }' || err "duration ${duration}s not in 60-90 s"
[[ "$width" == 1920 && "$height" == 1080 ]] || err "resolution ${width}x${height}, want 1920x1080"
[[ "$codec" == h264 ]] || err "codec $codec, want h264"
[[ "$pix_fmt" == yuv420p ]] || err "pix_fmt $pix_fmt, want yuv420p"
(( size < max_size )) || err "size $size bytes, want < $max_size"

# +faststart puts the moov atom before mdat, so playback starts before the download ends.
moov_offset=$(grep -obUa -m1 moov "$file" | head -1 | cut -d: -f1)
mdat_offset=$(grep -obUa -m1 mdat "$file" | head -1 | cut -d: -f1)
(( ${moov_offset:-0} > 0 && moov_offset < ${mdat_offset:-0} )) || err "moov atom not before mdat (missing +faststart)"

if (( fail )); then exit 1; fi
printf 'OK: %s  %.1f s  %sx%s  %s %s  %d bytes\n' "$file" "$duration" "$width" "$height" "$codec" "$pix_fmt" "$size"
