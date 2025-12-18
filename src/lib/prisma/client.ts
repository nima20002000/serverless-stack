import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

// Configure connection pool for Vercel build environment
// During builds, Vercel has very limited connection pool (connection_limit: 1)
// We need to use minimal connections and increase timeout
const getDatasourceUrl = () => {
  const baseUrl = process.env.DATABASE_URL || '';

  // During build time, use minimal connections to avoid pool exhaustion
  if (process.env.VERCEL_ENV === 'production' || process.env.VERCEL_ENV === 'preview') {
    // Add connection pool parameters for Vercel
    const url = new URL(baseUrl);
    url.searchParams.set('connection_limit', '1');
    url.searchParams.set('pool_timeout', '20');
    return url.toString();
  }

  return baseUrl;
};

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    // Disable query logging since we're migrating to Supabase
    log: ["error"],
    datasources: {
      db: {
        url: getDatasourceUrl(),
      },
    },
  });

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;

export default prisma;
