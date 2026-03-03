-- DropForeignKey
ALTER TABLE "WebsiteProject" DROP CONSTRAINT "WebsiteProject_userId_fkey";

-- CreateTable
CREATE TABLE "DeletedUser" (
    "id" TEXT NOT NULL,
    "originalId" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "snapshot" JSONB NOT NULL,
    "deletedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DeletedUser_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "WebsiteProject" ADD CONSTRAINT "WebsiteProject_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;
