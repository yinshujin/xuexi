import { mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import { backup, DatabaseSync } from 'node:sqlite';

/**
 * Online SQLite backup (same mechanism as the sqlite3 CLI's `.backup`), safe
 * while the server is running in WAL mode.
 *
 *   node backup.mjs <destPath>        (DB_PATH env = source, default ./data/xuexi.db)
 */
async function main(): Promise<void> {
  const dest = process.argv[2];
  if (!dest) {
    console.error('usage: backup <destPath>');
    process.exit(2);
  }
  const src = process.env.DB_PATH || './data/xuexi.db';
  mkdirSync(dirname(dest), { recursive: true });
  const db = new DatabaseSync(src);
  try {
    const pages = await backup(db, dest);
    console.log(`[backup] ${src} -> ${dest} (${pages} pages)`);
  } finally {
    db.close();
  }
}

main().catch((err) => {
  console.error('[backup] failed', err);
  process.exit(1);
});
