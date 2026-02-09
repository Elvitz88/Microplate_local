# SSO Implementation Summary - Cookie-Based Pattern

## ✅ สิ่งที่ทำเสร็จแล้ว

### 1. Database Schema (Prisma)

เพิ่ม models สำหรับ Social Login:

```prisma
model User {
  // ... existing fields ...

  // Social login support
  socialUsers SocialUser[]
}

model SocialUser {
  id                  Int      @id
  userId              String   @db.Uuid
  socialId            String   // AAD Object ID
  socialAccountType   String   // "aad", "google", "facebook"

  @@unique([socialId, socialAccountType])
}
```

### 2. Services

#### SocialUserService (`src/services/socialUser.service.ts`)

**Key Methods:**
- `socialUserDetails(socialDetails)` - Find or create social user
- `socialLoginService(socialDetails)` - **ออก token ของเราเอง (ไม่ใช่ AAD token)**

**Pattern:** ตรงกับ Authentication-service-be แต่ใช้ Prisma + class-based

### 3. SSO Controller (`src/controllers/sso.controller.ts`)

**Pattern:** Cookie-based matching Authentication-service-be

#### Flow Diagram:

```
User → Frontend
  ↓
GET /api/v1/auth/login/aad?continue=https://app.com/dashboard
  ↓
Redirect to Azure AD Login
  ↓
User logs in (Azure AD)
  ↓
GET /api/v1/auth/login/aad/redirect?code=<aad_code>&state=https://app.com/dashboard
  ↓
Exchange AAD code → Get AAD profile (email, name, oid)
  ↓
Create/Find User in OUR database
  ↓
🔑 Issue OUR tokens (Backend-Microplate-auth-service tokens)
  ↓
Set cookies: auth_token, refresh_token (OUR tokens, not AAD)
  ↓
Redirect to https://app.com/dashboard
  ↓
Frontend uses OUR tokens in cookies for all API calls
```

#### Key Points:

1. **AAD Token = ยืนยันตัวตนเท่านั้น**
   - ใช้เพื่อดึง profile (email, name, oid)
   - ไม่ส่งไป Frontend
   - Discard หลังใช้งาน

2. **OUR Tokens = ใช้งานจริง**
   - ออกจาก `socialLoginService()`
   - JWT signed ด้วย `JWT_ACCESS_SECRET` ของเรา
   - ส่งกลับ Frontend ผ่าน cookies
   - Frontend ใช้ใน Authorization header

3. **Cookie Settings:**
   ```typescript
   res.cookie('auth_token', ourToken, {
     httpOnly: true,      // ป้องกัน XSS
     secure: true,        // HTTPS only (production)
     sameSite: 'lax',     // CSRF protection
     maxAge: 15 * 60 * 1000  // 15 minutes
   });
   ```

### 4. Routes

**New Routes:**
```
GET  /api/v1/auth/login/aad              - Start SSO
GET  /api/v1/auth/login/aad/redirect     - Handle callback
```

**Existing Routes (unchanged):**
```
POST /api/v1/auth/register               - Normal registration
POST /api/v1/auth/login                  - Normal login
GET  /api/v1/auth/sso/aad                - Modern OAuth2 flow (kept for compatibility)
POST /api/v1/auth/sso/exchange           - Exchange token (kept)
```

### 5. Configuration

**Added to `src/config/config.ts`:**

```typescript
interface Config {
  baseUrl: string;  // NEW: Base URL for SSO redirects

  azureAd: {
    defaultRedirect: string;  // NEW: Default redirect after SSO
    // ... existing fields
  }
}
```

**Environment Variables Required:**

```env
# Service URL
BASE_URL=http://localhost:6401

# Azure AD (existing)
AAD_CLIENT_ID=your-client-id
AAD_CLIENT_SECRET=your-client-secret
AAD_AUTHORITY=https://login.microsoftonline.com/your-tenant-id

# NEW: Default redirect
AAD_DEFAULT_REDIRECT=http://localhost:3000/dashboard
```

---

## 🔑 ความแตกต่างหลัก

| Aspect | Authentication-service-be | Backend-Microplate-auth-service (New) |
|--------|--------------------------|---------------------------------------|
| **ORM** | Sequelize | Prisma |
| **Pattern** | Functional | Class-based |
| **Token Storage** | User table (token, refreshToken fields) | RefreshToken table + User.token |
| **AAD Config** | Certificate-based | Client Secret (simpler) |
| **Social Tracking** | SocialUser table | SocialUser table (same) |
| **Token Issuer** | OUR system | OUR system ✅ |
| **Cookie Pattern** | `setAuthCookies()` helper | `setAuthCookies()` helper ✅ |

---

## 📋 ขั้นตอนการใช้งาน

### 1. ติดตั้ง Dependencies (ถ้ายังไม่ได้ทำ)

```bash
cd Backend-Microplate-auth-service

# Already installed:
# - @azure/msal-node ✅
# - @prisma/client ✅

# Need to install (optional for other features):
yarn add cookie-parser
yarn add -D @types/cookie-parser
```

### 2. Run Database Migration

```bash
# Generate Prisma Client
yarn prisma:generate

# Create migration
yarn prisma:migrate
# ชื่อ: "add_social_user_model"
```

### 3. Configure Environment

แก้ไข `.env`:

```env
# Base URL
BASE_URL=http://localhost:6401

# Azure AD
AAD_ENABLED=true
AAD_CLIENT_ID=your-azure-ad-client-id
AAD_CLIENT_SECRET=your-azure-ad-client-secret
AAD_AUTHORITY=https://login.microsoftonline.com/your-tenant-id
AAD_DEFAULT_REDIRECT=http://localhost:3000
AAD_ALLOWED_DOMAINS=yourdomain.com,example.com

# JWT (existing)
JWT_ACCESS_SECRET=your-secret-key
JWT_REFRESH_SECRET=your-refresh-secret
```

### 4. Start Service

```bash
yarn dev
# หรือ
yarn build && yarn start
```

### 5. Test SSO Flow

#### Manual Test:

1. เปิดเบราว์เซอร์:
   ```
   http://localhost:6401/api/v1/auth/login/aad?continue=http://localhost:3000/dashboard
   ```

2. Login ด้วย Azure AD

3. จะ redirect กลับพร้อม cookies

4. ตรวจสอบ cookies (F12 → Application → Cookies):
   ```
   auth_token: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
   refresh_token: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
   ```

#### API Test (curl):

```bash
# Start SSO (will redirect to AAD)
curl -v http://localhost:6401/api/v1/auth/login/aad?continue=http://localhost:3000

# After login, test with cookies
curl -v \
  -H "Cookie: auth_token=eyJhbGci..." \
  http://localhost:6401/api/v1/auth/me
```

---

## 🔐 Security Features

### 1. Domain Whitelist
```env
AAD_ALLOWED_DOMAINS=company.com,partner.com
```

ระบบจะ reject users ที่ไม่ได้มาจาก domain ที่อนุญาต

### 2. HTTP-Only Cookies

```typescript
res.cookie('auth_token', token, {
  httpOnly: true,  // JavaScript cannot access
  secure: true,    // HTTPS only
  sameSite: 'lax'  // CSRF protection
});
```

### 3. Audit Logging

ทุก SSO login จะถูก log:

```typescript
auditService.log({
  action: 'SSO_LOGIN',
  resource: 'auth',
  details: { provider: 'aad', isNewUser: true }
});
```

---

## 📊 Database Structure

### SocialUser Table

```sql
CREATE TABLE "auth"."social_users" (
  "id" SERIAL PRIMARY KEY,
  "userId" UUID NOT NULL,
  "socialId" VARCHAR NOT NULL,       -- AAD: oid claim
  "socialAccountType" VARCHAR NOT NULL, -- "aad", "google", etc.
  "createdAt" TIMESTAMP DEFAULT NOW(),
  "updatedAt" TIMESTAMP DEFAULT NOW(),

  CONSTRAINT "social_users_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "auth"."users"("id")
    ON DELETE CASCADE,

  CONSTRAINT "social_users_socialId_socialAccountType_key"
    UNIQUE ("socialId", "socialAccountType")
);
```

### Example Data:

| id | userId | socialId | socialAccountType | createdAt |
|----|--------|----------|-------------------|-----------|
| 1 | uuid-123 | aad-oid-456 | aad | 2026-01-06 |
| 2 | uuid-789 | google-id-012 | google | 2026-01-06 |

---

## ⚠️ Important Notes

### 1. ไม่ใช้ AAD Token โดยตรง

**❌ ผิด:**
```typescript
// Don't return AAD access token to frontend
return {
  token: aadResponse.accessToken  // ❌ WRONG!
}
```

**✅ ถูก:**
```typescript
// Issue OUR token
const result = await socialUserService.socialLoginService({...});
return {
  token: result.token,  // ✅ OUR JWT token
  refreshToken: result.refreshToken  // ✅ OUR refresh token
}
```

### 2. Cookie vs Bearer Token

**Frontend ใช้ทั้ง 2 แบบได้:**

**Option A: Cookie-based (SSO flow)**
```typescript
// Auto-sent by browser
fetch('/api/users/me')  // Cookies sent automatically
```

**Option B: Bearer Token (Normal login)**
```typescript
// Manual Authorization header
fetch('/api/users/me', {
  headers: {
    'Authorization': `Bearer ${token}`
  }
})
```

**Backend รองรับทั้ง 2:**
```typescript
// Check cookie first, then Authorization header
const token = req.cookies.auth_token ||
              req.headers.authorization?.replace('Bearer ', '');
```

### 3. Token Expiry

- **Access Token**: 15 minutes (cookie + JWT expiry)
- **Refresh Token**: 7 days (cookie + JWT expiry)
- **AAD Token**: ใช้ครั้งเดียวแล้วทิ้ง (not stored)

---

## 🧪 Testing Checklist

- [ ] SSO login สำเร็จ
- [ ] User ใหม่ถูกสร้างใน database
- [ ] SocialUser record ถูกสร้าง
- [ ] Cookies ถูกตั้งค่าถูกต้อง
- [ ] Redirect ไปยัง continue URL
- [ ] Domain whitelist ทำงาน (ถ้าตั้งค่า)
- [ ] Audit log ถูกบันทึก
- [ ] Token ของเราใช้งานได้ (not AAD token)
- [ ] Refresh token flow ทำงาน

---

## 🔄 Migration from Old SSO (OAuth2 3-step flow)

**Old Flow (keep for compatibility):**
```
GET /sso/aad → Redirect to AAD → /sso/aad/redirect → POST /sso/exchange
```

**New Flow (cookie-based):**
```
GET /login/aad → Redirect to AAD → /login/aad/redirect (with cookies)
```

**Both work simultaneously!** Frontend can choose which to use.

---

## 📚 Files Modified/Created

### ✅ Created:
1. `src/services/socialUser.service.ts` - Social user management
2. `src/controllers/sso.controller.ts` - Cookie-based SSO
3. `src/routes/sso.routes.ts` - SSO endpoints
4. `SSO-IMPLEMENTATION-SUMMARY.md` - This file

### ✅ Modified:
1. `prisma/schema.prisma` - Added SocialUser model
2. `src/config/config.ts` - Added baseUrl, defaultRedirect
3. `src/routes/auth.routes.ts` - Mounted SSO routes

---

## 🎯 Summary

**Core Principle:**
- **AAD Token = Authentication proof only** (discarded after use)
- **OUR Tokens = Authorization for app** (issued by our system)
- **Frontend uses OUR tokens** (not AAD tokens)
- **Pattern matches Authentication-service-be** (cookie-based)

**Result:**
✅ ระบบออก token ของเราเอง
✅ Frontend ใช้ token ของเรา
✅ AAD ใช้แค่ยืนยันตัวตน
✅ Compatible กับ Authentication-service-be pattern
✅ Class-based + Prisma (modern stack)

---

**Status:** ✅ Ready for Testing

**Next Steps:**
1. Run `yarn prisma:migrate`
2. Configure `.env` with AAD credentials
3. Test SSO flow
4. (Optional) Add Google, Facebook sign-in later
