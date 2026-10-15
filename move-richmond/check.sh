#!/bin/bash
# The week-ahead check: does every part of the kit still apply cleanly to the world as it is today? Changes nothing.
#
#     move-richmond/check.sh [PATH_TO_THE_CRM_CHECKOUT]
#
# It dry-runs the site against a fresh copy of origin/main, the working-branch files against this checkout, previews the listings prompt, and (if given the
# CRM checkout) dry-runs the CRM, which takes 3 to 4 minutes because it runs the CRM's own tests. A FAIL line says which sentence has drifted; see README.md.
set -e
cd "$(dirname "$0")/.."
git fetch -q origin main
TMP=$(mktemp -d)
WT="$TMP/main"
trap 'git worktree remove --force "$WT" 2>/dev/null || true; rm -rf "$TMP"' EXIT
git worktree add -q --detach "$WT" origin/main
[ -d node_modules ] && ln -s "$PWD/node_modules" "$WT/node_modules"
echo "== the site, against origin/main ($(git rev-parse --short origin/main))"
python3 move-richmond/apply_move.py --target "$WT" --quiet | tail -12
echo "== the working-branch files (flyer, caption guard, listing copy)"
python3 move-richmond/apply_move.py --target . --work --quiet | tail -4
echo "== the listings prompt"
python3 move-richmond/build_listings_prompt.py --preview --out "$TMP/listings-PREVIEW.txt"
if [ -n "$1" ]; then
  echo "== the CRM, against $1"
  python3 move-richmond/crm/apply_crm.py --target "$1" | tail -8
fi
echo "All dry runs clean."
