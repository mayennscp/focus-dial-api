import type { FastifyInstance } from 'fastify';
import { z } from 'zod';

import type { SessionsRepo } from '../db.ts';
import { parse } from '../validation.ts';

const ListQuery = z.object({
  from: z.coerce.number().int().nonnegative().optional(),
  to: z.coerce.number().int().positive().optional(),
  limit: z.coerce.number().int().min(1).max(500).optional(),
});

const CreateBody = z.object({
  minutes: z.number().int().min(1).max(180),
  /** Defaults to "now" on the server when the client does not send it. */
  finishedAt: z.number().int().positive().optional(),
});

const IdParams = z.object({
  id: z.coerce.number().int().positive(),
});

export function registerSessionRoutes(
  app: FastifyInstance,
  repo: SessionsRepo
) {
  app.get('/sessions', async (request) => {
    const query = parse(ListQuery, request.query);
    return { sessions: repo.list(query) };
  });

  app.post('/sessions', async (request, reply) => {
    const body = parse(CreateBody, request.body);
    const session = repo.insert(body.minutes, body.finishedAt ?? Date.now());
    return reply.status(201).send(session);
  });

  app.delete('/sessions/:id', async (request, reply) => {
    const { id } = parse(IdParams, request.params);
    if (!repo.remove(id)) {
      return reply
        .status(404)
        .send({ error: 'NotFound', message: `Session ${id} does not exist` });
    }
    return reply.status(204).send();
  });
}
