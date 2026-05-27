/**
 * Prisma client singleton — safe for serverless (avoids connection pool exhaustion).
 * Vercel functions are stateless; we reuse the client across warm invocations
 * via the global object trick.
 */
import { PrismaClient } from '@prisma/client';

const globalForPrisma = globalThis;

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['warn', 'error'] : ['error'],
  });

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}
