@echo off
echo ========================================
echo Fixing Migration and Schema
echo ========================================

echo 1. Resetting database (clearing failed migrations)...
call npx prisma migrate reset --force

echo.
echo 2. Generating Prisma Client...
call npx prisma generate

echo.
echo 3. Creating new migration for schema sync...
call npx prisma migrate dev --name fix_schema_sync

echo.
echo ========================================
echo Fix completed!
echo ========================================
pause
