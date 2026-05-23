import type { FastifyInstance } from 'fastify';
import { serializerCompiler, validatorCompiler } from 'fastify-type-provider-zod';
import type { RequestContext } from './types.js';

declare module 'fastify' {
  interface FastifyRequest {
    ctx: RequestContext;
  }
}

export function configureFastify(app: FastifyInstance) {
  app.setValidatorCompiler(validatorCompiler);
  app.setSerializerCompiler(serializerCompiler);
}
