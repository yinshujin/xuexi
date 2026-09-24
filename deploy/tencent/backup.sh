#!/usr/bin/env bash
# Daily SQLite backup for the xuexi sync service (runs ON the server, in /srv/xuexi).
#
#   ./backup.sh                  make a backup now: backups/xuexi-YYYYmmdd-HHMMSS.db.gz,
#                                delete backups older than KEEP_DAYS (default 14)
#   ./backup.sh --install-cron   add a daily 03:17 cron job (idempotent)
#   ./backup.sh --restore FILE   restore backups/FILE (.db or .db.gz) - stops sync briefly
#
# The backup uses SQLite's online backup API (same as sqlite3 `.backup`) via the
# bundled backup.mjs inside the running container, so it is consistent while the
# service keeps running.
set -euo pipefail

cd "$(dirname "$(readlink -f "$0")")"
KEEP_DAYS="${KEEP_DAYS:-14}"
COMPOSE=(docker compose)
mkdir -p backups

case "${1:-}" in
  --install-cron)
    line="17 3 * * * $(pwd)/backup.sh >> $(pwd)/backups/backup.log 2>&1"
    { crontab -l 2>/dev/null | grep -v "xuexi.*backup.sh\|$(pwd)/backup.sh" || true; echo "$line"; } | crontab -
    echo "cron installed: $line"
    exit 0
    ;;
  --restore)
    file="${2:?usage: backup.sh --restore <file in backups/>}"
    file="$(basename "$file")"
    [ -f "backups/$file" ] || { echo "backups/$file not found" >&2; exit 1; }
    echo "Restoring backups/$file -> sync volume (the current DB is kept as /data/xuexi.db.before-restore)"
    "${COMPOSE[@]}" stop sync
    "${COMPOSE[@]}" run --rm --no-deps -u root --entrypoint sh sync -c "
      set -e
      [ -f /data/xuexi.db ] && cp /data/xuexi.db /data/xuexi.db.before-restore || true
      rm -f /data/xuexi.db-wal /data/xuexi.db-shm
      case '$file' in
        *.gz) gunzip -c '/backups/$file' > /data/xuexi.db ;;
        *) cp '/backups/$file' /data/xuexi.db ;;
      esac
      chown node:node /data/xuexi.db*
    "
    "${COMPOSE[@]}" up -d sync
    echo "Restored. Check: curl -s http://127.0.0.1/api/health (or your domain)"
    exit 0
    ;;
  "") ;;
  *)
    echo "usage: $0 [--install-cron | --restore FILE]" >&2
    exit 2
    ;;
esac

ts="$(date +%Y%m%d-%H%M%S)"
name="xuexi-$ts.db"
# -u root: ./backups is a host bind mount owned by root.
"${COMPOSE[@]}" exec -T -u root sync node --disable-warning=ExperimentalWarning backup.mjs "/backups/$name"
gzip -f "backups/$name"
echo "$(date -Is) backup ok: backups/$name.gz ($(du -h "backups/$name.gz" | cut -f1))"

# Keep KEEP_DAYS days of backups.
find backups -maxdepth 1 -name 'xuexi-*.db.gz' -mtime "+$((KEEP_DAYS - 1))" -print -delete
