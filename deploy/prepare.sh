#!/usr/bin/env bash
# Builds the committed API and back office into .deploy/<sha>, away from the working tree, and points
# .deploy/current at it. The integration servers run from there, so edits in progress never reach them.
#   deploy/prepare.sh            # build HEAD
#   deploy/prepare.sh <commit>   # build another commit
set -euo pipefail
root=$(git -C "$(dirname "$0")" rev-parse --show-toplevel)
rev=$(git -C "$root" rev-parse --short "${1:-HEAD}")
dir="$root/.deploy/$rev"
rm -rf "$dir" && mkdir -p "$dir"
git -C "$root" archive "$rev" shared api back-office | tar -x -C "$dir"
(cd "$dir/shared" && npm ci --silent --no-audit --no-fund)
(cd "$dir/api" && npm ci --silent --no-audit --no-fund)
(cd "$dir/back-office" && npm ci --silent --no-audit --no-fund && npx vite build --logLevel warn)
ln -sfn "$dir" "$root/.deploy/current"
echo "Built $rev in $dir"
echo "Run:  (cd $root/.deploy/current/api && STATE_FILE=$root/api/data/state-5190.json npm start)"
echo "      (cd $root/.deploy/current/back-office && npx vite preview --port 5191 --strictPort)"
