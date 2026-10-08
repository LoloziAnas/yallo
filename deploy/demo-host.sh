#!/usr/bin/env bash
# Hosts the public Yallo demo API on this laptop (docs/DEMO.md):
#   - the API from a deploy copy of a commit, DEPLOY_PROFILE=demo, state in a file, on DEMO_PORT (5180);
#   - a Cloudflare quick tunnel to it (https://<random>.trycloudflare.com, a new URL on every start);
#   - the tunnel's URL published as api.json on the gh-pages branch (GitHub Pages), where the apps look it up.
#
#   deploy/demo-host.sh prepare [commit]   build the API from a commit (default HEAD) into .deploy/demo/<sha>
#   deploy/demo-host.sh install            install and start the systemd --user services (after prepare)
#   deploy/demo-host.sh status             services, local and public health, the published URL
#   deploy/demo-host.sh logs               follow both services' logs
#   deploy/demo-host.sh restart            restart both (e.g. after prepare); the tunnel gets a new URL
#   deploy/demo-host.sh uninstall          stop and remove the services (the state file is kept)
#   deploy/demo-host.sh api | tunnel       what the services run (foreground)
#   deploy/demo-host.sh publish <url>      publish an API URL to api.json by hand
#
# Settings: environment, or ~/.config/yallo-demo.env (KEY=value lines).
set -euo pipefail

[ -f "$HOME/.config/yallo-demo.env" ] && set -a && . "$HOME/.config/yallo-demo.env" && set +a
DATA=${DEMO_DATA:-$HOME/.local/share/yallo-demo}
PORT=${DEMO_PORT:-5180}
REPO=${YALLO_REPO:-$(git -C "$(dirname "$(readlink -f "$0")")" rev-parse --show-toplevel 2>/dev/null || echo "$HOME/Desktop/yallo")}
CLOUDFLARED=${CLOUDFLARED:-$HOME/.local/bin/cloudflared}
# Where api.json is published: this repo's origin (the personal SSH alias, never the work key), branch gh-pages.
PAGES_REMOTE=${PAGES_REMOTE:-$(git -C "$REPO" remote get-url origin)}
PAGES_BRANCH=${PAGES_BRANCH:-gh-pages}
PAGES_URL=${PAGES_URL:-https://lolozianas.github.io/yallo/api.json}
CORS=${CORS_ORIGINS:-https://lolozianas.github.io}
TZONE=${DEMO_TIME_ZONE:-+00:00}
UNITS="$HOME/.config/systemd/user"

log() { echo "[demo-host] $*"; }
die() { echo "[demo-host] $*" >&2; exit 1; }

prepare() {
  local rev dir
  rev=$(git -C "$REPO" rev-parse --short "${1:-HEAD}")
  dir="$REPO/.deploy/demo/$rev"
  rm -rf "$dir" && mkdir -p "$dir"
  git -C "$REPO" archive "$rev" shared api deploy | tar -x -C "$dir"
  (cd "$dir/shared" && npm ci --silent --no-audit --no-fund)
  (cd "$dir/api" && npm ci --silent --no-audit --no-fund && npm run build --silent)
  ln -sfn "$dir" "$REPO/.deploy/demo/current"
  "$REPO/deploy/prune.sh" "$REPO/.deploy/demo" 2   # keep this build and the previous one
  log "built $rev in $dir. Run '$0 restart' (or install) to serve it."
}

api() {
  local dir="$REPO/.deploy/demo/current/api"
  [ -f "$dir/dist/server.mjs" ] || die "no build at $dir: run '$0 prepare' first"
  mkdir -p "$DATA"
  cd "$dir"
  export NODE_ENV=production DEPLOY_PROFILE=demo PORT HOST=127.0.0.1 STATE_FILE="$DATA/state.json" \
    CORS_ORIGINS="$CORS" DEMO_TIME_ZONE="$TZONE" YALLO_VERSION="demo-$(basename "$(readlink -f "$REPO/.deploy/demo/current")")"
  exec node dist/server.mjs
}

# Publishes {"api": url, "updatedAt": now} as api.json on the Pages branch, from a clone kept for it.
publish() {
  local url=$1 dir="$DATA/pages" try
  [[ $url =~ ^https://[a-z0-9.-]+$ ]] || die "not an API URL: $url"
  case "$PAGES_REMOTE" in *github.com:*|*//github.com/*) die "refusing to push with the default github.com SSH key ($PAGES_REMOTE): use the personal alias";; esac
  if [ ! -d "$dir/.git" ]; then
    mkdir -p "$dir"
    git -C "$dir" init -q
    git -C "$dir" remote add origin "$PAGES_REMOTE"
  fi
  git -C "$dir" remote set-url origin "$PAGES_REMOTE"
  for try in 1 2 3 4 5; do
    if git -C "$dir" fetch -q --depth 1 origin "$PAGES_BRANCH" 2>/dev/null; then
      git -C "$dir" checkout -q -B "$PAGES_BRANCH" FETCH_HEAD
    else
      # First publish: a branch with only the config (the Pages workflow adds the sites next to it).
      git -C "$dir" checkout -q --orphan "$PAGES_BRANCH" 2>/dev/null || true
      git -C "$dir" rm -rqf --ignore-unmatch . >/dev/null
      touch "$dir/.nojekyll"
    fi
    printf '{"api":"%s","updatedAt":"%s"}\n' "$url" "$(date -u +%Y-%m-%dT%H:%M:%SZ)" > "$dir/api.json"
    git -C "$dir" add -A
    git -C "$dir" -c user.name="Yallo demo host" -c user.email="39221873+LoloziAnas@users.noreply.github.com" \
      commit -qm "demo: API at $url" || true
    if git -C "$dir" push -q origin "HEAD:$PAGES_BRANCH"; then
      log "published $url to $PAGES_BRANCH (live at $PAGES_URL in about a minute)"
      return 0
    fi
    log "push refused (try $try), fetching again"
    sleep $((try * 3))
  done
  die "could not publish $url"
}

# Runs a quick tunnel, publishes its URL once it answers, and exits when it stops working (systemd restarts it).
tunnel() {
  [ -x "$CLOUDFLARED" ] || die "cloudflared not found at $CLOUDFLARED"
  local logf url="" fails=0 pid i
  mkdir -p "$DATA" && logf="$DATA/cloudflared.log"
  # Wait for the local API first, so a restart of the API doesn't burn a tunnel URL.
  until curl -sf "http://127.0.0.1:$PORT/api/health" >/dev/null; do sleep 2; done
  : > "$logf"
  "$CLOUDFLARED" tunnel --no-autoupdate --url "http://127.0.0.1:$PORT" >"$logf" 2>&1 &
  pid=$!
  trap 'kill $pid 2>/dev/null' EXIT
  for i in $(seq 1 60); do
    url=$(grep -oE 'https://[a-z0-9-]+\.trycloudflare\.com' "$logf" | head -1 || true)
    [ -n "$url" ] && break
    kill -0 $pid 2>/dev/null || die "cloudflared exited: $(tail -5 "$logf")"
    sleep 1
  done
  [ -n "$url" ] || die "no tunnel URL after 60 s: $(tail -5 "$logf")"
  log "tunnel $url, waiting for it to answer"
  for i in $(seq 1 60); do curl -sf --max-time 5 "$url/api/health" >/dev/null && break; sleep 2; done
  curl -sf --max-time 5 "$url/api/health" >/dev/null || die "tunnel $url never answered"
  publish "$url"
  # Watch: the tunnel process, and the public URL whenever the local API is up.
  while kill -0 $pid 2>/dev/null; do
    sleep 30
    curl -sf --max-time 5 "http://127.0.0.1:$PORT/api/health" >/dev/null || { fails=0; continue; }
    if curl -sf --max-time 10 "$url/api/health" >/dev/null; then fails=0; else fails=$((fails + 1)); log "tunnel check failed ($fails/4)"; fi
    [ $fails -ge 4 ] && die "tunnel $url stopped answering; restarting for a new one"
  done
  die "cloudflared exited: $(tail -5 "$logf")"
}

install() {
  [ -f "$REPO/.deploy/demo/current/api/dist/server.mjs" ] || die "run '$0 prepare' first"
  mkdir -p "$UNITS" "$DATA"
  # The services run a copy of this script, so edits in the working tree don't reach them until the next install.
  cp "$(readlink -f "$0")" "$DATA/demo-host.sh" && chmod +x "$DATA/demo-host.sh"
  local envs="Environment=YALLO_REPO=$REPO"
  cat > "$UNITS/yallo-demo-api.service" <<EOF
[Unit]
Description=Yallo public demo API (port $PORT)
After=network-online.target

[Service]
$envs
ExecStart=$DATA/demo-host.sh api
Restart=always
RestartSec=3

[Install]
WantedBy=default.target
EOF
  cat > "$UNITS/yallo-demo-tunnel.service" <<EOF
[Unit]
Description=Yallo public demo: Cloudflare quick tunnel and api.json
After=yallo-demo-api.service network-online.target
Wants=yallo-demo-api.service

[Service]
$envs
ExecStart=$DATA/demo-host.sh tunnel
Restart=always
RestartSec=10

[Install]
WantedBy=default.target
EOF
  systemctl --user daemon-reload
  systemctl --user enable --now yallo-demo-api.service yallo-demo-tunnel.service
  log "installed. '$0 status' shows the URL once the tunnel is up (about 30 s)."
  loginctl show-user "$USER" -p Linger | grep -q yes || log "note: run 'loginctl enable-linger' so the services run without a login session"
}

status() {
  systemctl --user --no-pager status yallo-demo-api.service yallo-demo-tunnel.service 2>/dev/null | grep -E '●|Active:' || true
  echo "local:     $(curl -sf "http://127.0.0.1:$PORT/api/health" || echo down)"
  local url
  url=$(grep -oE 'https://[a-z0-9-]+\.trycloudflare\.com' "$DATA/cloudflared.log" 2>/dev/null | head -1 || true)
  echo "tunnel:    ${url:-none} $( [ -n "$url" ] && curl -sf --max-time 10 "$url/api/health" >/dev/null && echo '(answers)' || echo '(not answering)')"
  echo "published: $(curl -sf --max-time 10 "$PAGES_URL?_=$(date +%s)" || echo 'not reachable')"
}

case "${1:-}" in
  prepare) shift; prepare "$@" ;;
  api) api ;;
  tunnel) tunnel ;;
  publish) publish "${2:?url}" ;;
  install) install ;;
  status) status ;;
  logs) journalctl --user -f -u yallo-demo-api.service -u yallo-demo-tunnel.service ;;
  restart) systemctl --user restart yallo-demo-api.service yallo-demo-tunnel.service ;;
  uninstall)
    systemctl --user disable --now yallo-demo-api.service yallo-demo-tunnel.service 2>/dev/null || true
    rm -f "$UNITS/yallo-demo-api.service" "$UNITS/yallo-demo-tunnel.service"
    systemctl --user daemon-reload
    log "removed; the state stays in $DATA" ;;
  *) sed -n '2,16p' "$0"; exit 1 ;;
esac
