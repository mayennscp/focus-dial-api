import type { FastifyError, FastifyReply, FastifyRequest } from 'fastify';
import { z } from 'zod';

/** Thrown by `parse` and turned into a 400 response by `errorHandler`. */
export class ValidationError extends Error {
  readonly issues: { path: string; message: string }[];

  constructor(error: z.ZodError) {
    super('Invalid request');
    this.issues = error.issues.map((issue) => ({
      path: issue.path.join('.'),
      message: issue.message,
    }));
  }
}

export function parse<T extends z.ZodType>(
  schema: T,
  data: unknown
): z.infer<T> {
  const result = schema.safeParse(data);
  if (!result.success) throw new ValidationError(result.error);
  return result.data;
}

export function errorHandler(
  error: FastifyError | Error,
  request: FastifyRequest,
  reply: FastifyReply
) {
  if (error instanceof ValidationError) {
    return reply
      .status(400)
      .send({ error: 'ValidationError', issues: error.issues });
  }
  // Malformed JSON and other client errors Fastify already classified.
  const status = 'statusCode' in error ? error.statusCode : undefined;
  if (status && status < 500) {
    return reply
      .status(status)
      .send({ error: error.name, message: error.message });
  }
  request.log.error(error);
  return reply.status(500).send({ error: 'InternalServerError' });
}
