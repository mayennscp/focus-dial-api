import cors from '@fastify/cors';
import Fastify, { type FastifyInstance } from 'fastify';

export type AppOptions = {
  logger?: boolean;
};

/**
 * Builds the Fastify app without starting it, so tests can drive it with
 * `app.inject()` and no open port.
 */
export async function buildApp(
  options: AppOptions = {}
): Promise<FastifyInstance> {
  const app = Fastify({ logger: options.logger ?? false });

  // The Expo web build runs on another origin than the API.
  await app.register(cors, { origin: true });

  app.get('/health', async () => ({ status: 'ok' }));

  return app;
}
