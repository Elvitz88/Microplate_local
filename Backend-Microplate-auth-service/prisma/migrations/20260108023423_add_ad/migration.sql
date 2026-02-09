/*
  Warnings:

  - A unique constraint covering the columns `[mobileNumber]` on the table `users` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[token]` on the table `users` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[refreshToken]` on the table `users` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[salt]` on the table `users` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[resetPasswordToken]` on the table `users` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `name` to the `users` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "auth"."OtpType" AS ENUM ('SIGN_UP', 'LOGIN', 'FORGOT_PASSWORD', 'CHANGE_PHONE', 'CHANGE_EMAIL');

-- AlterTable
ALTER TABLE "auth"."users" ADD COLUMN     "changePassTime" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "currentChallenge" TEXT,
ADD COLUMN     "failedLoginAttempt" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "failedLoginwaitTime" TIMESTAMP(3),
ADD COLUMN     "forceChangePassword" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "mobileNumber" TEXT,
ADD COLUMN     "name" TEXT NOT NULL,
ADD COLUMN     "oldPasswords" TEXT[],
ADD COLUMN     "refreshToken" TEXT,
ADD COLUMN     "resetPasswordToken" TEXT,
ADD COLUMN     "salt" TEXT,
ADD COLUMN     "token" TEXT,
ADD COLUMN     "twoFactorAuthenticationEnabled" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "verified" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "verifiedEmail" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "verifiedPhone" BOOLEAN NOT NULL DEFAULT false,
ALTER COLUMN "email" DROP NOT NULL;

-- CreateTable
CREATE TABLE "auth"."social_users" (
    "id" SERIAL NOT NULL,
    "userId" UUID NOT NULL,
    "socialId" TEXT NOT NULL,
    "socialAccountType" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "social_users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "auth"."otps" (
    "id" BIGSERIAL NOT NULL,
    "userId" UUID,
    "userIdentifier" TEXT NOT NULL,
    "otpType" "auth"."OtpType" NOT NULL,
    "issueTime" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "token" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "verified" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "otps_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "auth"."authenticators" (
    "id" SERIAL NOT NULL,
    "userId" UUID NOT NULL,
    "credentialID" TEXT NOT NULL,
    "credentialPublicKey" TEXT NOT NULL,
    "counter" BIGINT NOT NULL,
    "credentialDeviceType" VARCHAR(32) NOT NULL,
    "credentialBackedUp" BOOLEAN NOT NULL,
    "transports" VARCHAR(255),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "authenticators_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "social_users_socialId_socialAccountType_key" ON "auth"."social_users"("socialId", "socialAccountType");

-- CreateIndex
CREATE UNIQUE INDEX "authenticators_credentialID_key" ON "auth"."authenticators"("credentialID");

-- CreateIndex
CREATE UNIQUE INDEX "users_mobileNumber_key" ON "auth"."users"("mobileNumber");

-- CreateIndex
CREATE UNIQUE INDEX "users_token_key" ON "auth"."users"("token");

-- CreateIndex
CREATE UNIQUE INDEX "users_refreshToken_key" ON "auth"."users"("refreshToken");

-- CreateIndex
CREATE UNIQUE INDEX "users_salt_key" ON "auth"."users"("salt");

-- CreateIndex
CREATE UNIQUE INDEX "users_resetPasswordToken_key" ON "auth"."users"("resetPasswordToken");

-- AddForeignKey
ALTER TABLE "auth"."social_users" ADD CONSTRAINT "social_users_userId_fkey" FOREIGN KEY ("userId") REFERENCES "auth"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "auth"."otps" ADD CONSTRAINT "otps_userId_fkey" FOREIGN KEY ("userId") REFERENCES "auth"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "auth"."authenticators" ADD CONSTRAINT "authenticators_userId_fkey" FOREIGN KEY ("userId") REFERENCES "auth"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
