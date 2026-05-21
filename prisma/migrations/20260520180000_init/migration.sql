CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TABLE "Customer" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "name" TEXT NOT NULL,
  "phone" TEXT,
  "routeTag" TEXT,
  "current_balance" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Customer_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "KpayAlias" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "kpayName" TEXT NOT NULL,
  "customerId" UUID NOT NULL,
  CONSTRAINT "KpayAlias_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "KpayAlias_customerId_fkey"
    FOREIGN KEY ("customerId") REFERENCES "Customer" ("id")
    ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE "Ledger" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "customerId" UUID NOT NULL,
  "type" TEXT NOT NULL,
  "saleType" TEXT NOT NULL,
  "itemSize" TEXT,
  "cartons" INTEGER,
  "rate" INTEGER,
  "deductions" INTEGER NOT NULL DEFAULT 0,
  "amount" INTEGER NOT NULL,
  "note" TEXT,
  "date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Ledger_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "Ledger_customerId_fkey"
    FOREIGN KEY ("customerId") REFERENCES "Customer" ("id")
    ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE "UnverifiedKpay" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "raw_text" TEXT NOT NULL,
  "kpayName" TEXT,
  "amount" INTEGER NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'PENDING',
  "suggestedCustomerId" UUID,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "UnverifiedKpay_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "UnverifiedKpay_suggestedCustomerId_fkey"
    FOREIGN KEY ("suggestedCustomerId") REFERENCES "Customer" ("id")
    ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "KpayAlias_kpayName_key" ON "KpayAlias"("kpayName");
CREATE INDEX "Ledger_customerId_idx" ON "Ledger"("customerId");
CREATE INDEX "Ledger_date_idx" ON "Ledger"("date");
CREATE INDEX "UnverifiedKpay_status_idx" ON "UnverifiedKpay"("status");
CREATE INDEX "UnverifiedKpay_kpayName_idx" ON "UnverifiedKpay"("kpayName");
