import { DatabaseSync } from 'node:sqlite';

export type Session = {
  id: number;
  minutes: number;
  /** Unix time in milliseconds. */
  finishedAt: number;
};

type SessionRow = {
  id: number;
  minutes: number;
  finished_at: number;
};

const SCHEMA = `
  CREATE TABLE IF NOT EXISTS sessions (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    minutes     INTEGER NOT NULL CHECK (minutes BETWEEN 1 AND 180),
    finished_at INTEGER NOT NULL,
    created_at  INTEGER NOT NULL DEFAULT (unixepoch() * 1000)
  );
  CREATE INDEX IF NOT EXISTS sessions_finished_at ON sessions (finished_at);
`;

/** Opens (or creates) the database. Pass ':memory:' for tests. */
export function openDatabase(path: string): DatabaseSync {
  const db = new DatabaseSync(path);
  db.exec('PRAGMA journal_mode = WAL;');
  db.exec(SCHEMA);
  return db;
}

const toSession = (row: SessionRow): Session => ({
  id: row.id,
  minutes: row.minutes,
  finishedAt: row.finished_at,
});

export type SessionQuery = {
  from?: number;
  to?: number;
  limit?: number;
};

/**
 * All SQL lives here, behind a small repository, so routes stay free of
 * queries and the storage could be swapped (e.g. for Postgres) in one place.
 */
export function createSessionsRepo(db: DatabaseSync) {
  const insertStmt = db.prepare(
    'INSERT INTO sessions (minutes, finished_at) VALUES (?, ?) RETURNING id, minutes, finished_at'
  );
  const listStmt = db.prepare(
    `SELECT id, minutes, finished_at FROM sessions
     WHERE finished_at >= ? AND finished_at < ?
     ORDER BY finished_at DESC
     LIMIT ?`
  );
  const deleteStmt = db.prepare('DELETE FROM sessions WHERE id = ?');

  return {
    insert(minutes: number, finishedAt: number): Session {
      return toSession(insertStmt.get(minutes, finishedAt) as SessionRow);
    },

    list({
      from = 0,
      to = Number.MAX_SAFE_INTEGER,
      limit = 500,
    }: SessionQuery = {}): Session[] {
      return (listStmt.all(from, to, limit) as SessionRow[]).map(toSession);
    },

    remove(id: number): boolean {
      return Number(deleteStmt.run(id).changes) > 0;
    },
  };
}

export type SessionsRepo = ReturnType<typeof createSessionsRepo>;
