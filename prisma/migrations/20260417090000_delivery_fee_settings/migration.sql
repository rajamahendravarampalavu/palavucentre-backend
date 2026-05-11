-- AlterTable
ALTER TABLE "orders"
ADD COLUMN "deliveryFeePaise" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "site_settings"
ADD COLUMN "deliveryFeePaise" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN "freeDeliveryThresholdPaise" INTEGER NOT NULL DEFAULT 0;
