@echo off
echo ========================================
echo Reset Schema for Result API Service
echo ========================================

echo.
echo 1. Resetting database...
npx prisma migrate reset --force

echo.
echo 2. Generating Prisma client...
npx prisma generate

echo.
echo 3. Deploying migrations...
npx prisma migrate deploy

echo.
echo ========================================
echo Schema reset completed!
echo ========================================
pause
