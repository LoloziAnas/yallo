#!/usr/bin/env bash
# Deletes old build copies in a deploy folder (.deploy or .deploy/demo), keeping the newest $2 (default 2) and any
# build a running process is using. Called by prepare.sh and demo-host.sh prepare after each build.
#   deploy/prune.sh <dir> [keep]
set -euo pipefail
dir=$(readlink -f "${1:?deploy folder}")
keep=${2:-2}
in_use=$(for p in /proc/[0-9]*; do readlink "$p/cwd" 2>/dev/null || true; done | grep -o "^$dir/[0-9a-f]\{7,\}" | sort -u || true)
n=0
for b in $(ls -1td "$dir"/*/ 2>/dev/null | sed 's:/$::'); do
  name=$(basename "$b")
  [[ $name =~ ^[0-9a-f]{7,40}$ ]] || continue
  n=$((n + 1))
  if [ $n -le "$keep" ] || grep -qx "$b" <<<"$in_use" || [ "$(readlink -f "$dir/current")" = "$b" ]; then continue; fi
  rm -rf "${b:?}"
  echo "pruned $name"
done
