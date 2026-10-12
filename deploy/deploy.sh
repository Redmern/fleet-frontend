#!/usr/bin/env bash
# Manual deploy on the VPS: build the site image from a git ref and replace
# the running container.
#
#   deploy/deploy.sh            # deploy origin/main
#   deploy/deploy.sh <ref>      # deploy a branch, tag or commit
#
# The image is built from `git archive <ref>`, so the local checkout is never
# switched and local edits are never deployed. Needs docker + compose, the
# external `proxy` network and the `letsencrypt` resolver from frontdoor.
set -euo pipefail
cd "$(dirname "$0")/.."

ref="${1:-origin/main}"
compose=(docker compose -f deploy/compose.yaml)

git fetch --quiet origin
commit="$(git rev-parse --verify "$ref^{commit}")"
echo "Deploying $(git log -1 --format='%h %s' "$commit")"

git archive "$commit" | docker build --pull \
  --build-arg SITE_URL=https://fleet-tui.dev/ \
  --label org.opencontainers.image.revision="$commit" \
  -t fleet-frontend:local -

"${compose[@]}" up -d --no-build --wait
docker image prune -f --filter label=org.opencontainers.image.source=https://github.com/Redmern/fleet-frontend >/dev/null

"${compose[@]}" ps
curl -fsS -o /dev/null -w 'https://fleet-tui.dev/ -> %{http_code}\n' https://fleet-tui.dev/
