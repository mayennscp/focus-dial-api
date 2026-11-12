import type { DatabaseSync } from 'node:sqlite';

import cors from '@fastify/cors';
import Fastify, { type FastifyInstance } from 'fastify';

import { createSessionsRepo, openDatabase } from './db.ts';
import { registerSessionRoutes } from './routes/sessions.ts';
import { registerStatsRoutes } from './routes/stats.ts';
import { errorHandler } from './validation.ts';

export type AppOptions = {
  logger?: boolean;
  /** Path of the SQLite file. Ignored when `db` is given. */
  dbPath?: string;
  /** An already opened database, e.g. an in-memory one in tests. */
  db?: DatabaseSync;
};

/**
 * Builds the Fastify app without starting it, so tests can drive it with
 * `app.inject()` and no open port.
 */
export async function buildApp(
  options: AppOptions = {}
): Promise<FastifyInstance> {
  const app = Fastify({ logger: options.logger ?? false });
  const db = options.db ?? openDatabase(options.dbPath ?? ':memory:');
  const sessions = createSessionsRepo(db);

  app.setErrorHandler(errorHandler);
  app.addHook('onClose', async () => db.close());

  // The Expo web build runs on another origin than the API.
  await app.register(cors, {
    origin: true,
    methods: ['GET', 'POST', 'DELETE'],
  });

  app.get('/health', async () => ({ status: 'ok' }));
  registerSessionRoutes(app, sessions);
  registerStatsRoutes(app, sessions);

  return app;
}
