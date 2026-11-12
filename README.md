# Focus Dial API

The backend for [Focus Dial](https://github.com/mayennscp/focus-dial), a
React Native focus timer. It stores finished focus sessions and computes
stats: today's total, the last 7 days and the current streak.

**Stack:** Node.js, TypeScript, Fastify, Zod, SQLite (`node:sqlite`),
`node:test`, Docker, GitHub Actions.

## Highlights

- **No build step.** Node runs the TypeScript directly with type stripping,
  and `tsc --noEmit` only checks types.
- **No native dependencies.** Storage uses Node's built-in `node:sqlite`.
  All SQL sits in one small repository module ([`src/db.ts`](src/db.ts)).
- **Validated input.** Every query, body and route parameter goes through a
  Zod schema. Bad input gets a `400` with a list of what is wrong.
- **Time-zone-aware stats.** Days are counted in the user's IANA time zone,
  and date arithmetic works on calendar dates, so a DST change cannot skip or
  repeat a day ([`src/stats.ts`](src/stats.ts) is a pure function).
- **Tested.** 20 tests with `node:test`: routes through Fastify's
  `inject()` on a fresh in-memory database, plus the stats edge cases.
- **Containerised.** The Docker image runs as a non-root user and keeps
  data on a volume. CI builds it and smoke-tests `/health`.

## API

| Method | Path | Description |
| --- | --- | --- |
| `GET` | `/health` | Liveness check |
| `GET` | `/sessions?from=&to=&limit=` | Sessions, newest first. `from`/`to` are Unix ms |
| `POST` | `/sessions` | Body `{ "minutes": 25, "finishedAt"?: 1794492307205 }` → `201` |
| `DELETE` | `/sessions/:id` | `204`, or `404` if the session does not exist |
| `GET` | `/stats?tz=Europe/Warsaw` | Today, last 7 days, streak and totals |

```bash
curl -X POST localhost:3000/sessions -H "Content-Type: application/json" -d '{"minutes": 25}'
curl "localhost:3000/stats?tz=Europe/Warsaw"
```

Example `/stats` response:

```json
{
  "today": { "sessions": 2, "minutes": 50 },
  "last7Days": [{ "date": "2026-11-06", "minutes": 0 }, "…", { "date": "2026-11-12", "minutes": 50 }],
  "streakDays": 3,
  "total": { "sessions": 14, "minutes": 410 }
}
```

## Running

Requires Node.js 22.18 or newer.

```bash
npm install
npm run dev        # http://localhost:3000, restarts on changes
npm test
npm run typecheck
```

Or with Docker:

```bash
docker compose up --build
```

| Variable | Default | |
| --- | --- | --- |
| `PORT` | `3000` | |
| `HOST` | `0.0.0.0` | Reachable from a phone on the same Wi-Fi |
| `DB_PATH` | `focus-dial.db` | `:memory:` for a throwaway database |

## Project structure

```
src/
  server.ts          starts the server
  app.ts             builds the Fastify app (used by the tests too)
  config.ts          settings from environment variables
  db.ts              SQLite schema and sessions repository
  stats.ts           pure stats calculation
  validation.ts      Zod parsing and error responses
  routes/            sessions and stats endpoints
test/                node:test suites
```

## License

MIT
