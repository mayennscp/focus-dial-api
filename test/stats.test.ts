import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { computeStats, dateKey, shiftDate } from '../src/stats.ts';

const HOUR = 60 * 60 * 1000;
const DAY = 24 * HOUR;
// 12 Nov 2026, 10:00 in Warsaw (UTC+1).
const NOW = Date.parse('2026-11-12T09:00:00Z');

describe('dateKey', () => {
  it('uses the given time zone, not UTC', () => {
    // 23:30 UTC on 11 Nov is already 12 Nov in Warsaw.
    const t = Date.parse('2026-11-11T23:30:00Z');
    assert.equal(dateKey(t, 'UTC'), '2026-11-11');
    assert.equal(dateKey(t, 'Europe/Warsaw'), '2026-11-12');
  });
});

describe('shiftDate', () => {
  it('moves across month and year boundaries', () => {
    assert.equal(shiftDate('2026-03-01', -1), '2026-02-28');
    assert.equal(shiftDate('2026-12-31', 1), '2027-01-01');
  });

  it('is not affected by DST changes', () => {
    // Clocks in Poland go back on 25 Oct 2026.
    assert.equal(shiftDate('2026-10-26', -1), '2026-10-25');
    assert.equal(shiftDate('2026-10-25', -1), '2026-10-24');
  });
});

describe('computeStats', () => {
  const tz = 'Europe/Warsaw';

  it('returns zeros and seven empty days with no sessions', () => {
    const stats = computeStats([], NOW, tz);
    assert.deepEqual(stats.today, { sessions: 0, minutes: 0 });
    assert.equal(stats.last7Days.length, 7);
    assert.equal(stats.last7Days.at(-1)?.date, '2026-11-12');
    assert.equal(stats.streakDays, 0);
  });

  it('sums today and the last seven days', () => {
    const stats = computeStats(
      [
        { minutes: 25, finishedAt: NOW },
        { minutes: 15, finishedAt: NOW - HOUR },
        { minutes: 50, finishedAt: NOW - 3 * DAY },
        { minutes: 60, finishedAt: NOW - 30 * DAY },
      ],
      NOW,
      tz
    );
    assert.deepEqual(stats.today, { sessions: 2, minutes: 40 });
    assert.deepEqual(
      stats.last7Days.map((d) => d.minutes),
      [0, 0, 0, 50, 0, 0, 40]
    );
    assert.deepEqual(stats.total, { sessions: 4, minutes: 150 });
  });

  it('counts a streak of consecutive days ending today', () => {
    const sessions = [0, 1, 2, 4].map((d) => ({
      minutes: 25,
      finishedAt: NOW - d * DAY,
    }));
    assert.equal(computeStats(sessions, NOW, tz).streakDays, 3);
  });

  it('keeps the streak alive when today has no session yet', () => {
    const sessions = [1, 2].map((d) => ({
      minutes: 25,
      finishedAt: NOW - d * DAY,
    }));
    assert.equal(computeStats(sessions, NOW, tz).streakDays, 2);
  });

  it('breaks the streak after a day without sessions', () => {
    const sessions = [2, 3].map((d) => ({
      minutes: 25,
      finishedAt: NOW - d * DAY,
    }));
    assert.equal(computeStats(sessions, NOW, tz).streakDays, 0);
  });
});
