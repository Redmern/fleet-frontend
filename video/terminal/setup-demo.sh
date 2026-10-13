#!/usr/bin/env bash
# Builds the throwaway "shop" project the recording works on, in fleet's layout:
#   <root>/origin/<repo>.git     a bare "remote" for each repo
#   <root>/shop/<repo>/.git      bare repo with a "main" worktree, as fleet creates them
#   <root>/config/projects/shop.json
#
#   bash setup-demo.sh /tmp/fleet-demo     (recreates that folder; refuses one that is not a demo)
set -euo pipefail
root="$(realpath -m "${1:?usage: setup-demo.sh <demo-root>}")"
here="$(cd "$(dirname "$0")" && pwd)"
# Only ever delete an empty folder or an earlier demo.
if [[ -e "$root" && -n "$(ls -A "$root")" && ! -f "$root/config/projects/shop.json" ]]; then
    echo "$root is not empty and not an earlier demo; refusing to delete it" >&2
    exit 1
fi
export GIT_AUTHOR_NAME="fleet demo" GIT_AUTHOR_EMAIL=demo@example.com
export GIT_COMMITTER_NAME="fleet demo" GIT_COMMITTER_EMAIL=demo@example.com

rm -rf "$root"
mkdir -p "$root/origin" "$root/shop" "$root/config/projects" "$root/run"
chmod 700 "$root/run"
for repo in api web; do
    tmp="$root/tmp-$repo"
    cp -r "$here/demo/$repo" "$tmp"
    git -C "$tmp" init -q -b main
    git -C "$tmp" add -A
    git -C "$tmp" commit -qm "shop-$repo: first version"
    git clone -q --bare "$tmp" "$root/origin/$repo.git"
    rm -rf "$tmp"
    git clone -q --bare "$root/origin/$repo.git" "$root/shop/$repo/.git"
    git -C "$root/shop/$repo/.git" config remote.origin.fetch "+refs/heads/*:refs/remotes/origin/*"
    git -C "$root/shop/$repo/.git" worktree add -q "$root/shop/$repo/main" main
done
cat > "$root/config/projects/shop.json" <<JSON
{
  "version": 1,
  "name": "shop",
  "root": "$root/shop"
}
JSON
echo "demo ready in $root"
