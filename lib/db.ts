/**
 * Singleton Prisma client.
 *
 * In development, Next.js hot-reloads the server on file changes.
 * Without this pattern, each reload would open a new DB connection,
 * eventually exhausting the connection limit. Storing the client on
 * the global object means we reuse the same connection across reloads.
 */

import { PrismaClient } from "@prisma/client";

// Extend the Node.js global type so TypeScript doesn't complain
const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const db =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = db;
}
