import type { Session } from './db.ts';

export type DayTotal = { date: string; minutes: number };

export type Stats = {
  today: { sessions: number; minutes: number };
  /** Oldest first, always 7 entries, today last. */
  last7Days: DayTotal[];
  /** Consecutive days with at least one session, ending today or yesterday. */
  streakDays: number;
  total: { sessions: number; minutes: number };
};

const DAY_MS = 24 * 60 * 60 * 1000;

/** Calendar date ("2026-11-12") of a timestamp in the given IANA time zone. */
export function dateKey(timestamp: number, timeZone: string): string {
  // en-CA formats dates as YYYY-MM-DD.
  return new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(timestamp);
}

/** Shifts a "YYYY-MM-DD" key by whole days, safe across DST changes. */
export function shiftDate(key: string, days: number): string {
  const utc = Date.parse(`${key}T00:00:00Z`) + days * DAY_MS;
  return new Date(utc).toISOString().slice(0, 10);
}

export function isValidTimeZone(timeZone: string): boolean {
  try {
    new Intl.DateTimeFormat('en-US', { timeZone });
    return true;
  } catch {
    return false;
  }
}

/**
 * Pure function: everything it needs comes in as arguments, so it is easy to
 * test with fixed dates and time zones.
 */
export function computeStats(
  sessions: Pick<Session, 'minutes' | 'finishedAt'>[],
  now: number,
  timeZone: string
): Stats {
  const minutesByDay = new Map<string, number>();
  const countByDay = new Map<string, number>();
  let totalMinutes = 0;

  for (const s of sessions) {
    const key = dateKey(s.finishedAt, timeZone);
    minutesByDay.set(key, (minutesByDay.get(key) ?? 0) + s.minutes);
    countByDay.set(key, (countByDay.get(key) ?? 0) + 1);
    totalMinutes += s.minutes;
  }

  const today = dateKey(now, timeZone);

  const last7Days = Array.from({ length: 7 }, (_, i) => {
    const date = shiftDate(today, i - 6);
    return { date, minutes: minutesByDay.get(date) ?? 0 };
  });

  // A streak is still alive if today has no session yet but yesterday did.
  let day = minutesByDay.has(today) ? today : shiftDate(today, -1);
  let streakDays = 0;
  while (minutesByDay.has(day)) {
    streakDays++;
    day = shiftDate(day, -1);
  }

  return {
    today: {
      sessions: countByDay.get(today) ?? 0,
      minutes: minutesByDay.get(today) ?? 0,
    },
    last7Days,
    streakDays,
    total: { sessions: sessions.length, minutes: totalMinutes },
  };
}
