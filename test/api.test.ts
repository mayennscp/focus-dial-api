import assert from 'node:assert/strict';
import { afterEach, beforeEach, describe, it } from 'node:test';

import type { FastifyInstance } from 'fastify';

import { buildApp } from '../src/app.ts';

// Every test gets a fresh app with its own in-memory database.
let app: FastifyInstance;
beforeEach(async () => {
  app = await buildApp();
});
afterEach(async () => {
  await app.close();
});

const createSession = (payload: unknown) =>
  app.inject({ method: 'POST', url: '/sessions', payload: payload as object });

describe('GET /health', () => {
  it('responds with ok', async () => {
    const res = await app.inject('/health');
    assert.equal(res.statusCode, 200);
    assert.deepEqual(res.json(), { status: 'ok' });
  });
});

describe('POST /sessions', () => {
  it('creates a session and returns it with an id', async () => {
    const res = await createSession({ minutes: 25, finishedAt: 1_000 });
    assert.equal(res.statusCode, 201);
    assert.deepEqual(res.json(), { id: 1, minutes: 25, finishedAt: 1_000 });
  });

  it('defaults finishedAt to the current time', async () => {
    const before = Date.now();
    const res = await createSession({ minutes: 10 });
    assert.ok(res.json().finishedAt >= before);
  });

  for (const minutes of [0, 181, 2.5, '25']) {
    it(`rejects minutes = ${JSON.stringify(minutes)}`, async () => {
      const res = await createSession({ minutes });
      assert.equal(res.statusCode, 400);
      assert.equal(res.json().error, 'ValidationError');
      assert.equal(res.json().issues[0].path, 'minutes');
    });
  }
});

describe('GET /sessions', () => {
  it('lists sessions newest first and filters by time range', async () => {
    await createSession({ minutes: 10, finishedAt: 1_000 });
    await createSession({ minutes: 20, finishedAt: 2_000 });
    await createSession({ minutes: 30, finishedAt: 3_000 });

    const all = (await app.inject('/sessions')).json().sessions;
    assert.deepEqual(
      all.map((s: { minutes: number }) => s.minutes),
      [30, 20, 10]
    );

    const range = (await app.inject('/sessions?from=1500&to=3000')).json()
      .sessions;
    assert.deepEqual(
      range.map((s: { minutes: number }) => s.minutes),
      [20]
    );
  });

  it('rejects a non-numeric filter', async () => {
    const res = await app.inject('/sessions?limit=lots');
    assert.equal(res.statusCode, 400);
  });
});

describe('DELETE /sessions/:id', () => {
  it('deletes a session, then answers 404 for it', async () => {
    const { id } = (await createSession({ minutes: 25 })).json();

    const first = await app.inject({
      method: 'DELETE',
      url: `/sessions/${id}`,
    });
    assert.equal(first.statusCode, 204);

    const second = await app.inject({
      method: 'DELETE',
      url: `/sessions/${id}`,
    });
    assert.equal(second.statusCode, 404);
  });
});

describe('GET /stats', () => {
  it('summarises sessions for the given time zone', async () => {
    await createSession({ minutes: 25 });
    await createSession({ minutes: 50 });

    const res = await app.inject('/stats?tz=Europe/Warsaw');
    assert.equal(res.statusCode, 200);
    const stats = res.json();
    assert.deepEqual(stats.today, { sessions: 2, minutes: 75 });
    assert.equal(stats.streakDays, 1);
  });

  it('rejects an unknown time zone', async () => {
    const res = await app.inject('/stats?tz=Mars/Olympus_Mons');
    assert.equal(res.statusCode, 400);
  });
});
