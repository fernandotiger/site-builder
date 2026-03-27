-- AlterTable
ALTER TABLE "user" ADD COLUMN     "planId" TEXT DEFAULT 'basic',
ADD COLUMN     "stripeCustomerId" TEXT,
ADD COLUMN     "subscriptionId" TEXT,
ADD COLUMN     "subscriptionStatus" TEXT DEFAULT 'inactive';
