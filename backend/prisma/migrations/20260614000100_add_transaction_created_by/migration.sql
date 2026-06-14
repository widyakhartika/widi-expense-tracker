ALTER TABLE "transactions"
  ADD COLUMN "created_by_telegram_id" TEXT,
  ADD COLUMN "created_by_name" TEXT;

CREATE INDEX "transactions_created_by_telegram_id_idx"
  ON "transactions"("created_by_telegram_id");
