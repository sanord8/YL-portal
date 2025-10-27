import { PrismaClient } from '@prisma/client';

// Singleton pattern for Prisma Client
const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

/**
 * Optimized Prisma Client with connection pooling
 * - Connection pool: 20 connections (optimal for most workloads)
 * - Pool timeout: 20 seconds
 * - Query logging: Development only
 */
export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
    datasources: {
      db: {
        url: process.env.DATABASE_URL
          ? `${process.env.DATABASE_URL}?connection_limit=20&pool_timeout=20&connect_timeout=10`
          : undefined,
      },
    },
  });

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}

// Graceful shutdown with connection cleanup
process.on('beforeExit', async () => {
  await prisma.$disconnect();
});
