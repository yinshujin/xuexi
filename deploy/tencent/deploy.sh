#!/usr/bin/env bash
# Deploy xuexi to a Tencent Cloud Lighthouse server (or any Linux host with Docker).
#
#   deploy.sh <siteDir>            upload the built site (static app, packs/, catalog.json)
#   deploy.sh --init [<siteDir>]   first-time setup / update of the server side:
#                                  compose files, sync service source, .env, docker compose
#                                  up -d --build, daily backup cron; then uploads the site
#                                  if <siteDir> is given. Safe to re-run (never overwrites .env).
#
# Env:
#   TENCENT_HOST        required, ssh target, e.g. ubuntu@1.2.3.4
#   TENCENT_SSH_KEY     optional, path to the private key
#   TENCENT_SSH_PORT    optional, default 22
#   TENCENT_REMOTE_DIR  optional, default /srv/xuexi
#   Only used by --init when the server has no .env yet:
#   FAMILY_CODE         required on first init (>= 8 chars)
#   SITE_DOMAIN         optional (empty = plain HTTP on :80; HTTPS needs a domain)
#   TOKEN_SECRET        optional (generated on the server if missing)
#
# Needs locally: bash, ssh, rsync. On the server: Docker with the compose plugin, rsync.
set -euo pipefail

usage() {
  sed -n '2,20p' "$0" | sed 's/^# \{0,1\}//'
  exit 2
}

INIT=0
SITE_DIR=""
for arg in "$@"; do
  case "$arg" in
    --init) INIT=1 ;;
    -h | --help) usage ;;
    -*) echo "unknown option: $arg" >&2; usage ;;
    *) [ -z "$SITE_DIR" ] && SITE_DIR="$arg" || { echo "unexpected argument: $arg" >&2; usage; } ;;
  esac
done
[ "$INIT" = 1 ] || [ -n "$SITE_DIR" ] || usage

: "${TENCENT_HOST:?set TENCENT_HOST, e.g. ubuntu@1.2.3.4}"
REMOTE_DIR="${TENCENT_REMOTE_DIR:-/srv/xuexi}"
SSH_OPTS=(-o StrictHostKeyChecking=accept-new -o ServerAliveInterval=30 -p "${TENCENT_SSH_PORT:-22}")
[ -n "${TENCENT_SSH_KEY:-}" ] && SSH_OPTS+=(-i "$TENCENT_SSH_KEY")
RSYNC_SSH="ssh ${SSH_OPTS[*]}"

HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$HERE/../.." && pwd)"

remote() { ssh "${SSH_OPTS[@]}" "$TENCENT_HOST" "$@"; }
push() { rsync -az -e "$RSYNC_SSH" "$@"; }

if [ -n "$SITE_DIR" ]; then
  SITE_DIR="$(cd "$SITE_DIR" && pwd)"
  [ -f "$SITE_DIR/index.html" ] || { echo "error: $SITE_DIR/index.html not found (not a built site?)" >&2; exit 1; }
fi

echo "==> ensuring $REMOTE_DIR on $TENCENT_HOST"
remote "set -e
  if ! { mkdir -p '$REMOTE_DIR' 2>/dev/null && [ -w '$REMOTE_DIR' ]; }; then
    sudo mkdir -p '$REMOTE_DIR' && sudo chown \"\$(id -un)\":\"\$(id -gn)\" '$REMOTE_DIR'
  fi
  mkdir -p '$REMOTE_DIR/site' '$REMOTE_DIR/backups' '$REMOTE_DIR/src'
  command -v rsync >/dev/null || { echo 'rsync missing on server: sudo apt-get install -y rsync' >&2; exit 1; }"

if [ "$INIT" = 1 ]; then
  echo "==> uploading compose files and sync service source"
  push "$HERE/docker-compose.yml" "$HERE/Caddyfile" "$HERE/backup.sh" "$HERE/.env.example" "$TENCENT_HOST:$REMOTE_DIR/"
  # Build context for the sync image: same relative paths as in the repo.
  push --delete --relative \
    "$REPO_ROOT/./apps/sync/package.json" \
    "$REPO_ROOT/./apps/sync/Dockerfile" \
    "$REPO_ROOT/./apps/sync/Dockerfile.dockerignore" \
    "$REPO_ROOT/./apps/sync/src" \
    "$REPO_ROOT/./apps/sync/scripts" \
    "$REPO_ROOT/./packages/shared/package.json" \
    "$REPO_ROOT/./packages/shared/src" \
    "$TENCENT_HOST:$REMOTE_DIR/src/"

  echo "==> preparing .env"
  if remote "test -f '$REMOTE_DIR/.env'"; then
    echo "    $REMOTE_DIR/.env exists - left unchanged"
  else
    : "${FAMILY_CODE:?first --init needs FAMILY_CODE (>= 8 chars) to create the server .env}"
    [ "${#FAMILY_CODE}" -ge 8 ] || { echo "FAMILY_CODE must be at least 8 characters" >&2; exit 1; }
    # Values travel over ssh stdin, not the command line.
    printf 'SITE_DOMAIN=%s\nFAMILY_CODE=%s\nTOKEN_SECRET=%s\n' \
      "${SITE_DOMAIN:-}" "$FAMILY_CODE" "${TOKEN_SECRET:-}" |
      remote "set -e; cd '$REMOTE_DIR'
        umask 077
        IFS= read -r l1; IFS= read -r l2; IFS= read -r l3
        secret=\"\${l3#TOKEN_SECRET=}\"
        [ -n \"\$secret\" ] || secret=\"\$(openssl rand -base64 48 2>/dev/null | tr -d '\n')\"
        [ -n \"\$secret\" ] || secret=\"\$(head -c 48 /dev/urandom | base64 | tr -d '\n')\"
        V1=\"\${l1#SITE_DOMAIN=}\" V2=\"\${l2#FAMILY_CODE=}\" V3=\"\$secret\" awk '
          /^SITE_DOMAIN=/ { print \"SITE_DOMAIN=\" ENVIRON[\"V1\"]; next }
          /^FAMILY_CODE=/ { print \"FAMILY_CODE=\" ENVIRON[\"V2\"]; next }
          /^TOKEN_SECRET=/ { print \"TOKEN_SECRET=\" ENVIRON[\"V3\"]; next }
          { print }' .env.example > .env
        echo '    created .env (edit it on the server to change settings)'"
  fi

  echo "==> docker compose up -d --build"
  remote "set -e; cd '$REMOTE_DIR'; chmod +x backup.sh
    if docker info >/dev/null 2>&1; then D=docker; else
      command -v docker >/dev/null || { echo 'Docker is not installed on the server (see deploy/tencent/README.md)' >&2; exit 1; }
      grouped=0; sudo usermod -aG docker \"\$(id -un)\" 2>/dev/null && grouped=1
      D='sudo docker'
    fi
    \$D compose up -d --build --remove-orphans
    \$D compose ps
    if [ \"\$D\" = docker ]; then ./backup.sh --install-cron
    elif [ \"\$grouped\" = 1 ]; then
      echo 'NOTE: you were added to the docker group. Run  deploy.sh --init  once more (or'
      echo '      ./backup.sh --install-cron  in $REMOTE_DIR) to install the daily backup cron.'
    else
      echo 'NOTE: this user cannot run docker without sudo; install the backup cron as root:'
      echo '      sudo crontab -e  ->  17 3 * * * $REMOTE_DIR/backup.sh >> $REMOTE_DIR/backups/backup.log 2>&1'
    fi"
fi

if [ -n "$SITE_DIR" ]; then
  echo "==> uploading site from $SITE_DIR"
  # Pass 1: new files except entry points (clients never see an index.html
  # that references files which are not uploaded yet).
  # EdgeOne-only files (if the same folder was also built for EdgeOne) are skipped.
  SKIP=(--exclude=/edge-functions --exclude=/edgeone.json --exclude=/package.json)
  push "${SKIP[@]}" --exclude=/index.html --exclude=/sw.js --exclude=/catalog.json \
    --exclude='/manifest.webmanifest' "$SITE_DIR/" "$TENCENT_HOST:$REMOTE_DIR/site/"
  # Pass 2: entry points, then remove files that no longer exist.
  push "${SKIP[@]}" --delete-after "$SITE_DIR/" "$TENCENT_HOST:$REMOTE_DIR/site/"
  echo "==> site deployed (Caddy serves it directly, no restart needed)"
fi
