import type { FastifyInstance } from 'fastify';
import { z } from 'zod';

import type { SessionsRepo } from '../db.ts';
import { computeStats, isValidTimeZone } from '../stats.ts';
import { parse } from '../validation.ts';

const StatsQuery = z.object({
  // Days are counted in the user's time zone, not the server's.
  tz: z
    .string()
    .default('UTC')
    .refine(isValidTimeZone, { message: 'Unknown IANA time zone' }),
});

export function registerStatsRoutes(app: FastifyInstance, repo: SessionsRepo) {
  app.get('/stats', async (request) => {
    const { tz } = parse(StatsQuery, request.query);
    return computeStats(repo.listAll(), Date.now(), tz);
  });
}
