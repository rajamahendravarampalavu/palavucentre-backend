-- AlterTable
ALTER TABLE "catering_inquiries" ADD COLUMN     "deletedAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "contact_inquiries" ADD COLUMN     "deletedAt" TIMESTAMP(3),
ADD COLUMN     "subject" TEXT NOT NULL DEFAULT 'General inquiry',
ALTER COLUMN "phone" DROP NOT NULL;

-- AlterTable
ALTER TABLE "franchise_inquiries" ADD COLUMN     "deletedAt" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "admin_audit_logs" (
    "id" SERIAL NOT NULL,
    "adminId" INTEGER,
    "action" TEXT NOT NULL,
    "targetId" TEXT NOT NULL,
    "targetType" TEXT NOT NULL,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "admin_audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "admin_audit_logs_action_targetType_createdAt_idx" ON "admin_audit_logs"("action", "targetType", "createdAt");

-- CreateIndex
CREATE INDEX "admin_audit_logs_adminId_createdAt_idx" ON "admin_audit_logs"("adminId", "createdAt");

-- CreateIndex
CREATE INDEX "catering_inquiries_deletedAt_status_createdAt_idx" ON "catering_inquiries"("deletedAt", "status", "createdAt");

-- CreateIndex
CREATE INDEX "contact_inquiries_deletedAt_status_createdAt_idx" ON "contact_inquiries"("deletedAt", "status", "createdAt");

-- CreateIndex
CREATE INDEX "franchise_inquiries_deletedAt_status_createdAt_idx" ON "franchise_inquiries"("deletedAt", "status", "createdAt");
