#!/usr/bin/env bash
# Checks the static export produced by FleetMarketing.Ssg.
#
#   bash scripts/check-dist.sh dist
#
# Fails when:
#   - a required section id is missing from index.html
#   - an internal link or asset (href, src, poster, data-cast, css url()) does
#     not resolve to a file in the export, or a #fragment has no matching id
#   - known copy defects come back (typo, harness overclaim)
#   - the promo video is exported but its section/element is missing or
#     autoplays, or the section renders without the video file
set -euo pipefail

dist="${1:-dist}"
index="$dist/index.html"
fail=0

err() { echo "FAIL: $*" >&2; fail=1; }

[[ -f "$index" ]] || { echo "FAIL: $index not found" >&2; exit 1; }

# Sections the page must contain.
required_ids=(install mcp)
for id in "${required_ids[@]}"; do
    grep -q "id=\"$id\"" "$index" || err "missing section id=\"$id\""
done

# Internal references in the HTML.
refs=$(grep -o -E '[[:space:]](href|src|poster|data-cast)="[^"]*"' "$index" | sed -E 's/^[[:space:]][a-z-]+="(.*)"$/\1/' | sort -u)
while IFS= read -r ref; do
    [[ -z "$ref" ]] && continue
    case "$ref" in
        http://*|https://*|mailto:*|data:*|//*) continue ;;
        ./) continue ;;
        \#*)
            id="${ref#\#}"
            [[ -z "$id" ]] && continue
            grep -q "id=\"$id\"" "$index" || err "anchor $ref has no matching id"
            continue ;;
    esac
    path="${ref%%[?#]*}"
    path="${path#./}"
    [[ -e "$dist/$path" ]] || err "internal reference '$ref' does not resolve in $dist"
done <<< "$refs"

# Assets referenced from CSS (relative to the stylesheet).
while IFS= read -r css; do
    dir=$(dirname "$css")
    while IFS= read -r url; do
        [[ -z "$url" ]] && continue
        case "$url" in http://*|https://*|data:*|//*) continue ;; esac
        [[ -e "$dir/${url%%[?#]*}" ]] || err "css url '$url' in ${css#"$dist"/} does not resolve"
    done < <(grep -o -E 'url\(["'\'']?[^"'\'')]+' "$css" | sed -E 's/^url\(["'\'']?//' | sort -u)
done < <(find "$dist" -name '*.css' -not -path '*/vendor/*')

# Copy regressions.
grep -q 'Main-ochestrator' "$index" && err "typo 'Main-ochestrator' is back"
grep -qi 'and friends' "$index" && err "harness overclaim 'and friends' is back"
grep -qi 'free and open source' "$index" || err "'free and open source' statement missing"

# Promo video: rendered only when the file exists.
if [[ -f "$dist/media/fleet-promo.mp4" ]]; then
    grep -q 'id="showcase"' "$index" || err "media/fleet-promo.mp4 exported but section id=\"showcase\" missing"
    video=$(grep -o -E '<video[^>]*>' "$index" | head -n1)
    [[ -n "$video" ]] || err "no <video> element"
    [[ "$video" == *controls* ]] || err "<video> lacks controls"
    [[ "$video" == *poster=* ]] || err "<video> lacks poster"
    [[ "$video" == *'preload="metadata"'* ]] || err "<video> lacks preload=\"metadata\""
    [[ "$video" == *autoplay* ]] && err "<video> must not autoplay"
else
    grep -q '<video' "$index" && err "<video> rendered but media/fleet-promo.mp4 is absent"
fi

if [[ $fail -ne 0 ]]; then
    echo "check-dist: FAILED" >&2
    exit 1
fi
echo "check-dist: OK ($dist)"
