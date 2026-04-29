#!/usr/bin/env bash
# deploy.sh — push current branch to server and rebuild
#
# Usage: ./deploy.sh [branch]
#   branch defaults to main
#
# What it does:
#   1. git push origin <branch>
#   2. SSH → git pull
#   3. php artisan migrate --force
#   4. npm run build (frontend)
#   5. php artisan config:clear && route:clear && cache:clear
#   6. php artisan queue:restart

set -euo pipefail

BRANCH="${1:-main}"
HOST="portal.blackrudder.com"
USER="ivykqymy"
APP="/home2/ivykqymy/public_html/beneath"
SOCKET="/tmp/ssh_beneath_deploy_$$"

echo "==> Pushing branch '${BRANCH}' to origin…"
git push origin "${BRANCH}"

echo "==> Opening ControlMaster…"
ssh -M -S "$SOCKET" -fNT -o ControlPersist=120 "$USER@$HOST"
ssh_r() { ssh -S "$SOCKET" "$USER@$HOST" "$@"; }

echo "==> Pulling on server…"
ssh_r "cd $APP && git pull origin ${BRANCH} 2>&1"

echo "==> Running migrations…"
ssh_r "cd $APP && php artisan migrate --force 2>&1"

echo "==> Rebuilding frontend…"
ssh_r "cd $APP/frontend && npm run build 2>&1 | tail -10"

echo "==> Clearing caches…"
ssh_r "cd $APP && php artisan config:clear && php artisan route:clear && php artisan cache:clear 2>&1"

echo "==> Restarting queue workers…"
ssh_r "cd $APP && php artisan queue:restart 2>&1"

ssh -S "$SOCKET" -O exit "$USER@$HOST" 2>/dev/null || true

echo ""
echo "✓ Deployed branch '${BRANCH}' to ${HOST}."
