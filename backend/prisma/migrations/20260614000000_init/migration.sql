CREATE TYPE "TransactionType" AS ENUM ('INCOME', 'EXPENSE', 'TRANSFER');
CREATE TYPE "WalletType" AS ENUM ('CASH', 'BANK', 'EWALLET', 'DIGITAL_BANK');

CREATE TABLE "wallets" (
  "id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "type" "WalletType" NOT NULL,
  "balance" DECIMAL(15,2) NOT NULL DEFAULT 0,
  "opening_balance" DECIMAL(15,2) NOT NULL DEFAULT 0,
  "icon" TEXT,
  "color" TEXT,
  "is_active" BOOLEAN NOT NULL DEFAULT true,
  "sort_order" INTEGER NOT NULL DEFAULT 0,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "wallets_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "categories" (
  "id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "type" "TransactionType" NOT NULL,
  "icon" TEXT,
  "color" TEXT,
  "is_default" BOOLEAN NOT NULL DEFAULT false,
  "sort_order" INTEGER NOT NULL DEFAULT 0,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "categories_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "transactions" (
  "id" TEXT NOT NULL,
  "type" "TransactionType" NOT NULL,
  "amount" DECIMAL(15,2) NOT NULL,
  "description" TEXT,
  "date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "tags" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  "wallet_id" TEXT NOT NULL,
  "to_wallet_id" TEXT,
  "category_id" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "transactions_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "wallets_name_key" ON "wallets"("name");
CREATE INDEX "wallets_is_active_sort_order_idx" ON "wallets"("is_active", "sort_order");
CREATE UNIQUE INDEX "categories_name_type_key" ON "categories"("name", "type");
CREATE INDEX "categories_type_sort_order_idx" ON "categories"("type", "sort_order");
CREATE INDEX "transactions_wallet_id_idx" ON "transactions"("wallet_id");
CREATE INDEX "transactions_to_wallet_id_idx" ON "transactions"("to_wallet_id");
CREATE INDEX "transactions_category_id_idx" ON "transactions"("category_id");
CREATE INDEX "transactions_date_idx" ON "transactions"("date");
CREATE INDEX "transactions_type_idx" ON "transactions"("type");

ALTER TABLE "transactions" ADD CONSTRAINT "transactions_wallet_id_fkey" FOREIGN KEY ("wallet_id") REFERENCES "wallets"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_to_wallet_id_fkey" FOREIGN KEY ("to_wallet_id") REFERENCES "wallets"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "categories"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
