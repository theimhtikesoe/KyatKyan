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
    setupPromise = (async () => {
      await prisma.$executeRawUnsafe(`CREATE EXTENSION IF NOT EXISTS "pgcrypto"`);

      const legacyCustomerId = await prisma.$queryRaw`
        SELECT 1
        FROM information_schema.columns
        WHERE table_name = 'Customer'
          AND column_name = 'id'
          AND udt_name <> 'uuid'
        LIMIT 1
      `;

      if (legacyCustomerId.length) {
        await prisma.$executeRawUnsafe(`DROP TABLE IF EXISTS "LedgerTransaction" CASCADE`);
        await prisma.$executeRawUnsafe(`DROP TABLE IF EXISTS "Ledger" CASCADE`);
        await prisma.$executeRawUnsafe(`DROP TABLE IF EXISTS "KpayAlias" CASCADE`);
        await prisma.$executeRawUnsafe(`DROP TABLE IF EXISTS "UnverifiedKpay" CASCADE`);
        await prisma.$executeRawUnsafe(`DROP TABLE IF EXISTS "Customer" CASCADE`);
      }

      await prisma.$executeRawUnsafe(`
        CREATE TABLE IF NOT EXISTS "Customer" (
          "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          "name" TEXT NOT NULL,
          "phone" TEXT,
          "routeTag" TEXT,
          "current_balance" INTEGER NOT NULL DEFAULT 0,
          "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
        )
      `);
      await prisma.$executeRawUnsafe(`
        CREATE TABLE IF NOT EXISTS "KpayAlias" (
          "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          "kpayName" TEXT NOT NULL UNIQUE,
          "customerId" UUID NOT NULL,
          CONSTRAINT "KpayAlias_customerId_fkey"
            FOREIGN KEY ("customerId") REFERENCES "Customer" ("id")
            ON DELETE CASCADE ON UPDATE CASCADE
        )
      `);
      await prisma.$executeRawUnsafe(`
        CREATE TABLE IF NOT EXISTS "Ledger" (
          "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          "customerId" UUID NOT NULL,
          "date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
          "type" TEXT NOT NULL,
          "saleType" TEXT NOT NULL,
          "itemSize" TEXT,
          "cartons" INTEGER,
          "rate" INTEGER,
          "deductions" INTEGER NOT NULL DEFAULT 0,
          "amount" INTEGER NOT NULL,
          "note" TEXT,
          "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
          CONSTRAINT "Ledger_customerId_fkey"
            FOREIGN KEY ("customerId") REFERENCES "Customer" ("id")
            ON DELETE CASCADE ON UPDATE CASCADE
        )
      `);
      await prisma.$executeRawUnsafe(`
        CREATE TABLE IF NOT EXISTS "UnverifiedKpay" (
          "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          "raw_text" TEXT NOT NULL,
          "kpayName" TEXT,
          "amount" INTEGER NOT NULL,
          "status" TEXT NOT NULL DEFAULT 'PENDING',
          "suggestedCustomerId" UUID,
          "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
          CONSTRAINT "UnverifiedKpay_suggestedCustomerId_fkey"
            FOREIGN KEY ("suggestedCustomerId") REFERENCES "Customer" ("id")
            ON DELETE SET NULL ON UPDATE CASCADE
        )
      `);

      await prisma.$executeRawUnsafe(`ALTER TABLE "Customer" ADD COLUMN IF NOT EXISTS "routeTag" TEXT`);
      await prisma.$executeRawUnsafe(
        `ALTER TABLE "Customer" ADD COLUMN IF NOT EXISTS "current_balance" INTEGER NOT NULL DEFAULT 0`,
      );
      await prisma.$executeRawUnsafe(`ALTER TABLE "UnverifiedKpay" ADD COLUMN IF NOT EXISTS "kpayName" TEXT`);
      await prisma.$executeRawUnsafe(
        `ALTER TABLE "UnverifiedKpay" ADD COLUMN IF NOT EXISTS "suggestedCustomerId" UUID`,
      );

      await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "Ledger_customerId_idx" ON "Ledger"("customerId")`);
      await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "Ledger_date_idx" ON "Ledger"("date")`);
      await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "UnverifiedKpay_status_idx" ON "UnverifiedKpay"("status")`);
      await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "UnverifiedKpay_kpayName_idx" ON "UnverifiedKpay"("kpayName")`);
    })();
  }

  return setupPromise;
}

export function databaseErrorResponse(error) {
  console.error(error);
  return {
    error: error.message || "Database request failed",
  };
}
