-- CreateEnum
CREATE TYPE "SecurityActivityType" AS ENUM ('LOGIN', 'FAILED_LOGIN', 'PASSWORD_CHANGED', 'PASSWORD_RESET_REQUESTED', 'PASSWORD_RESET_COMPLETED', 'LOGOUT');

-- CreateTable
CREATE TABLE "SecurityActivity" (
    "id" TEXT NOT NULL,
    "type" "SecurityActivityType" NOT NULL,
    "description" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "userId" TEXT NOT NULL,

    CONSTRAINT "SecurityActivity_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "SecurityActivity_userId_createdAt_idx" ON "SecurityActivity"("userId", "createdAt");

-- AddForeignKey
ALTER TABLE "SecurityActivity" ADD CONSTRAINT "SecurityActivity_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
