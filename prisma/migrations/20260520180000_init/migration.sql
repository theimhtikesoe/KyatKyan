CREATE TABLE "Customer" (
  "id" SERIAL PRIMARY KEY,
  "name" TEXT NOT NULL,
  "phone" TEXT,
  "current_balance" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE "LedgerTransaction" (
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

CREATE TABLE "UnverifiedKpay" (
  "id" SERIAL PRIMARY KEY,
  "raw_text" TEXT NOT NULL,
  "amount" INTEGER NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'PENDING',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX "LedgerTransaction_customer_id_idx" ON "LedgerTransaction"("customer_id");
