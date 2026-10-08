#!/usr/bin/env bash
# The shared integration servers as systemd --user services, so they come back by themselves after a crash or a stray
# kill: yallo-int-api (:5190, enforce, state in api/data/state-5190.json) and yallo-int-bo (:5191, vite preview).
# Both run from .deploy/current (built by deploy/prepare.sh).
#   deploy/integration.sh install     write and start the units (once)
#   deploy/integration.sh restart     after deploy/prepare.sh: serve the new build
#   deploy/integration.sh status | logs | uninstall
set -euo pipefail
root=$(git -C "$(dirname "$(readlink -f "$0")")" rev-parse --show-toplevel)
units="$HOME/.config/systemd/user"
node=$(command -v node)
case "${1:-}" in
  install)
    mkdir -p "$units"
    cat > "$units/yallo-int-api.service" <<UNIT
[Unit]
Description=Yallo integration API (:5190, from .deploy/current)

[Service]
WorkingDirectory=$root/.deploy/current/api
Environment=PATH=$(dirname "$node"):/usr/bin:/bin
Environment=AUTH_MODE=enforce
Environment=STATE_FILE=$root/api/data/state-5190.json
ExecStart=$node --import tsx src/main.ts
Restart=always
RestartSec=3

[Install]
WantedBy=default.target
UNIT
    cat > "$units/yallo-int-bo.service" <<UNIT
[Unit]
Description=Yallo integration back office (:5191, vite preview of .deploy/current)
After=yallo-int-api.service

[Service]
WorkingDirectory=$root/.deploy/current/back-office
Environment=PATH=$(dirname "$node"):/usr/bin:/bin
ExecStart=$node node_modules/vite/bin/vite.js preview --port 5191 --strictPort
Restart=always
RestartSec=3

[Install]
WantedBy=default.target
UNIT
    systemctl --user daemon-reload
    systemctl --user enable --now yallo-int-api.service yallo-int-bo.service ;;
  restart) systemctl --user restart yallo-int-api.service yallo-int-bo.service ;;
  status) systemctl --user --no-pager status yallo-int-api.service yallo-int-bo.service | grep -E '●|Active:|Main PID' || true
          curl -s localhost:5190/api/health; echo ;;
  logs) journalctl --user -f -u yallo-int-api.service -u yallo-int-bo.service ;;
  uninstall)
    systemctl --user disable --now yallo-int-api.service yallo-int-bo.service 2>/dev/null || true
    rm -f "$units/yallo-int-api.service" "$units/yallo-int-bo.service"
    systemctl --user daemon-reload ;;
  *) sed -n '2,8p' "$0"; exit 1 ;;
esac
