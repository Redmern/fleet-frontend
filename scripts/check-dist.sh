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
#   - a terminal recording (data-cast) is not a 120x34 asciicast v2 with
#     chapter markers, or a <video> comes back (the promo mp4 is retired)
#   - og:image / twitter:image is not a PNG that ships in the export
set -euo pipefail

dist="${1:-dist}"
index="$dist/index.html"
fail=0

err() { echo "FAIL: $*" >&2; fail=1; }

[[ -f "$index" ]] || { echo "FAIL: $index not found" >&2; exit 1; }

# Sections the page must contain.
required_ids=(install demo mcp showcase orchestrators ai-dlc features positioning compare weaker)
for id in "${required_ids[@]}"; do
    grep -q "id=\"$id\"" "$index" || err "missing section id=\"$id\""
done

# Internal references in the HTML.
refs=$(grep -o -E '[[:space:]](href|src|poster|data-cast)="[^"]*"' "$index" | sed -E 's/^[[:space:]][a-z-]+="(.*)"$/\1/' | sort -u || true)
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
grep -qF 'Main-ochestrator' "$index" && err "typo 'Main-ochestrator' is back"
grep -qiF 'and friends' "$index" && err "harness overclaim 'and friends' is back"

# Comparison table: every cell is yes/no/partly with a source, or "Not documented".
cells=$(grep -o -P '<td class="cmp-cell[^"]*"[^>]*>.*?</td>' "$index" || true)
[[ -n "$cells" ]] || err "comparison table has no cells"
while IFS= read -r cell; do
    [[ -z "$cell" ]] && continue
    verdict=$(sed -E 's/.*data-verdict="([a-z]*)".*/\1/' <<< "$cell")
    case "$verdict" in
        yes|no|partly) [[ "$cell" == *'href="#src-'* ]] || err "comparison cell without source: $cell" ;;
        nd) [[ "$cell" == *'Not documented'* ]] || err "nd cell must read 'Not documented': $cell" ;;
        *) err "comparison cell with unknown verdict: $cell" ;;
    esac
done <<< "$cells"
grep -qF 'as of October 2026' "$index" || err "comparison footnote 'as of October 2026' missing"

# fleet's ISO mode is not a sandbox: its Offline cell stays "Partly".
fleet_row=$(grep -o -P '<tr class="compare-fleet">.*?</tr>' <<< "$(tr -d '\n' < "$index")" || true)
[[ $(grep -o 'data-verdict="partly"' <<< "$fleet_row" | wc -l) -eq 1 ]] || err "fleet's Offline cell must be 'Partly'"

# Every listed source is cited, and every source link has an accessible name.
for id in $(grep -o -E '<li id="src-[A-Za-z0-9]+"' "$index" | sed -E 's/.*src-//; s/"//'); do
    grep -qF "href=\"#src-$id\"" "$index" || err "source $id is listed but never cited"
done
unnamed=$(grep -o -E '<a class="cmp-src"[^>]*>' "$index" | grep -vF 'aria-label="Source: ' || true)
[[ -z "$unnamed" ]] || err "source links without aria-label: $(head -n1 <<< "$unnamed")"

# Caveats that must stay visible, each in its own section.
section() { perl -0ne 'print $1 if /(<section id="'"$1"'".*?<\/section>)/s' "$index"; }
has() { section "$1" | grep -qiF -- "$2" || err "section #$1 lacks caveat '$2'"; }
has mcp 'not a sandbox'
has features 'Enforced by fleet, not a sandbox'
has features 'Jira pull is experimental'
has orchestrators 'claude.ai login'
has ai-dlc '.NET repos'
has weaker 'not yet used in anger'
section weaker | grep -qiF 'roadmap' || err "weaknesses note does not point to the roadmap"

# CLI commands fleet does not have.
grep -qF 'fleet <span class="accent-magenta">repo add' "$index" && err "'fleet repo add' is not a fleet CLI command"
grep -qF 'Finish workflow' "$index" && err "'Finish workflow' card has no source in features.md"

# Terminal recordings: both sections play an asciicast with chapter markers.
casts=$(grep -o -E 'data-cast="[^"]*"' "$index" | sed -E 's/data-cast="(.*)"/\1/' || true)
[[ $(wc -w <<< "$casts") -ge 2 ]] || err "expected two terminal recordings (data-cast), found: $casts"
for cast in $casts; do
    file="$dist/$cast"
    [[ -f "$file" ]] || continue  # reported above as an unresolved reference
    head -n1 "$file" | grep -qE '"version": ?2' || err "$cast is not an asciicast v2"
    head -n1 "$file" | grep -qE '"width": ?120' || err "$cast is not 120 columns wide"
    head -n1 "$file" | grep -qE '"height": ?34' || err "$cast is not 34 rows high"
    grep -qE '^\[[0-9.]+, ?"m",' "$file" || err "$cast has no chapter markers"
done
grep -qF '<video' "$index" && err "<video> is back; the promo mp4 is retired from the page"

# Social preview: a PNG (crawlers skip SVG) that the export contains.
for prop in 'property="og:image"' 'name="twitter:image"'; do
    url=$(grep -o -E "<meta $prop content=\"[^\"]*\"" "$index" | sed -E 's/.*content="(.*)"/\1/' || true)
    [[ "$url" == *.png ]] || err "$prop is not a PNG: '$url'"
    [[ -f "$dist/${url##*/}" ]] || err "$prop file ${url##*/} is not in $dist"
done

if [[ $fail -ne 0 ]]; then
    echo "check-dist: FAILED" >&2
    exit 1
fi
echo "check-dist: OK ($dist)"
