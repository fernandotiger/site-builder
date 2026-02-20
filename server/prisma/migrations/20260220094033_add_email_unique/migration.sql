/*
  Warnings:

  - A unique constraint covering the columns `[custom_domain]` on the table `WebsiteProject` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[email]` on the table `user` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "user" ALTER COLUMN "credits" SET DEFAULT 10;

-- CreateIndex
CREATE UNIQUE INDEX "WebsiteProject_custom_domain_key" ON "WebsiteProject"("custom_domain");

-- CreateIndex
CREATE UNIQUE INDEX "user_email_key" ON "user"("email");
