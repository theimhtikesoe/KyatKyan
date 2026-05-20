import { prisma } from "@/lib/prisma";

let setupPromise;

export function requireDatabaseUrl() {
  if (!process.env.DATABASE_URL) {
    throw new Error(
      "DATABASE_URL is not configured. Add a Postgres database URL in Vercel Project Settings > Environment Variables.",
    );
  }
}

export async function ensureDatabase() {
  requireDatabaseUrl();

  if (!setupPromise) {
    setupPromise = prisma.$transaction([
      prisma.$executeRawUnsafe(`
        CREATE TABLE IF NOT EXISTS "Customer" (
          "id" SERIAL PRIMARY KEY,
          "name" TEXT NOT NULL,
          "phone" TEXT,
          "current_balance" INTEGER NOT NULL DEFAULT 0,
          "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
        );
      `),
      prisma.$executeRawUnsafe(`
        CREATE TABLE IF NOT EXISTS "LedgerTransaction" (
          "id" SERIAL PRIMARY KEY,
          "customer_id" INTEGER NOT NULL,
          "date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
          "type" TEXT NOT NULL,
          "amount" INTEGER NOT NULL,
          "note" TEXT,
          "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
          CONSTRAINT "LedgerTransaction_customer_id_fkey"
            FOREIGN KEY ("customer_id") REFERENCES "Customer" ("id")
            ON DELETE CASCADE ON UPDATE CASCADE
        );
      `),
      prisma.$executeRawUnsafe(`
        CREATE TABLE IF NOT EXISTS "UnverifiedKpay" (
          "id" SERIAL PRIMARY KEY,
          "raw_text" TEXT NOT NULL,
          "amount" INTEGER NOT NULL,
          "status" TEXT NOT NULL DEFAULT 'PENDING',
          "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
        );
      `),
      prisma.$executeRawUnsafe(`
        CREATE INDEX IF NOT EXISTS "LedgerTransaction_customer_id_idx"
          ON "LedgerTransaction"("customer_id");
      `),
    ]);
  }

  return setupPromise;
}

export function databaseErrorResponse(error) {
  console.error(error);
  return {
    error: error.message || "Database request failed",
  };
}
