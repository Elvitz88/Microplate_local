# Authentication Service Migration Progress

## สรุปงานที่ทำเสร็จแล้ว (Completed Tasks)

### ✅ 1. Database Schema Migration (Prisma)

เพิ่ม models ใหม่ใน `prisma/schema.prisma`:

#### User Model - เพิ่มฟิลด์ต่อไปนี้:
- `name` - ชื่อเต็ม (matching Authentication-service-be)
- `mobileNumber` - เบอร์โทรศัพท์
- `token`, `refreshToken`, `salt` - Token management
- `verified`, `verifiedPhone`, `verifiedEmail` - Verification flags
- `forceChangePassword` - บังคับเปลี่ยนรหัสผ่าน
- `oldPasswords[]` - เก็บประวัติรหัสผ่านเก่า
- `changePassTime` - เวลาเปลี่ยนรหัสผ่านล่าสุด
- `failedLoginAttempt`, `failedLoginwaitTime` - Account lockout
- `currentChallenge`, `twoFactorAuthenticationEnabled` - 2FA support

#### ✅ SocialUser Model (ใหม่):
```prisma
model SocialUser {
  id                  Int      @id @default(autoincrement())
  userId              String   @db.Uuid
  socialId            String   // Provider user ID
  socialAccountType   String   // "google", "facebook", "aad"
  ...
}
```

#### ✅ Otp Model (ใหม่):
```prisma
model Otp {
  id              BigInt   @id @default(autoincrement())
  userIdentifier  String   // Email or phone
  otpType         OtpType  // SIGN_UP, LOGIN, FORGOT_PASSWORD, etc.
  value           String   // OTP code
  token           String   // JWT session token
  ...
}

enum OtpType {
  SIGN_UP
  LOGIN
  FORGOT_PASSWORD
  CHANGE_PHONE
  CHANGE_EMAIL
}
```

#### ✅ Authenticator Model (ใหม่):
```prisma
model Authenticator {
  id                      Int      @id
  userId                  String   @db.Uuid
  credentialID            String   // WebAuthn credential
  credentialPublicKey     String   // Public key
  counter                 BigInt   // Signature counter
  credentialDeviceType    String   // Device type
  credentialBackedUp      Boolean
  transports              String?  // CSV of transport types
  ...
}
```

---

### ✅ 2. Services Created

#### SocialUser Service (`src/services/socialUser.service.ts`)

**Methods:**
- `socialUserDetails(socialDetails)` - Find or create social user
- `registerSocialUser(socialDetails)` - Register new user from social login
- `socialLoginService(socialDetails)` - Complete social login flow
- `getUserSocialAccounts(userId)` - Get user's social accounts
- `unlinkSocialAccount(userId, type)` - Unlink social account

**Pattern:** ตรงกับ Authentication-service-be/src/services/socialUserService.ts

#### OTP Service (`src/services/otp.service.ts`)

**Methods:**
- `generateOtp(params)` - Generate new OTP
- `verifyOtp(params)` - Verify OTP code
- `resendOtp(params)` - Resend OTP with rate limiting
- `cleanupExpiredOtps()` - Delete expired OTPs
- `getOtpStats()` - Get OTP statistics

**Features:**
- Configurable OTP length (default: 6 digits)
- Configurable expiry time (default: 10 minutes)
- Automatic invalidation of old OTPs
- Rate limiting (max 3 OTPs per minute)

**Pattern:** ตรงกับ Authentication-service-be/src/services/otpService.ts

---

## งานที่เหลือต้องทำ (Remaining Tasks)

### 📦 3. Install Dependencies

**ต้องรัน:**
```bash
cd Backend-Microplate-auth-service

# Install all required packages
yarn add @simplewebauthn/server google-auth-library passport-facebook @google-cloud/recaptcha-enterprise cookie-parser node-cron crypto-js
yarn add -D @types/cookie-parser @types/node-cron @types/crypto-js
```

**ดูรายละเอียด:** `INSTALL-DEPENDENCIES.md`

---

### 🔧 4. Update TokenUtil

**ต้องเพิ่มใน `src/utils/token.util.ts`:**
```typescript
/**
 * Generate OTP session token
 */
static generateOtpToken(payload: {
  userIdentifier: string;
  otpType: string;
}): string {
  return jwt.sign(
    {
      sub: payload.userIdentifier,
      type: 'otp' as const,
      otpType: payload.otpType,
      jti: randomUUID(),
      iss: ISSUER,
      aud: AUDIENCE
    },
    config.jwtAccessSecret,
    { expiresIn: '15m' } // OTP tokens expire in 15 minutes
  );
}
```

---

### 🍪 5. Cookie Middleware

**ต้องสร้าง:** `src/middleware/cookie.middleware.ts`

**Pattern จาก:** Authentication-service-be/src/middlewares/cookies/cookiesSetter.ts

**Functions:**
- `setCookies(res, data)` - Set auth cookies
- `clearCookies(res)` - Clear auth cookies

---

### 🔐 6. SSO Controller with Cookies

**ต้องสร้าง:** `src/controllers/sso.controller.ts`

**Pattern จาก:** Authentication-service-be/src/controllers/ssoController.ts

**Endpoints:**
- `GET /api/v1/auth/login/aad?continue=<url>` - Start AAD SSO
- `GET /api/v1/auth/login/aad/redirect` - Handle AAD callback

**Changes from current implementation:**
- Use cookie-based auth instead of token exchange
- Redirect to original URL after login
- Set HTTP-only cookies with tokens

---

### 🌐 7. Google Sign-In Controller

**ต้องสร้าง:** `src/controllers/googleSignIn.controller.ts`

**Pattern จาก:** Authentication-service-be/src/controllers/googleSignInController.ts

**Endpoints:**
- `POST /api/v1/auth/google/login` - Google OAuth login
- `POST /api/v1/auth/google/verify` - Verify Google ID token

---

### 📘 8. Facebook Sign-In Controller

**ต้องสร้าง:** `src/controllers/facebookSignIn.controller.ts`

**Pattern จาก:** Authentication-service-be/src/controllers/facebookSignInController.ts

**Endpoints:**
- `POST /api/v1/auth/facebook/login` - Facebook OAuth login

---

### 🔢 9. OTP Controller

**ต้องสร้าง:** `src/controllers/otp.controller.ts`

**Endpoints:**
- `POST /api/v1/auth/otp/send` - Send OTP
- `POST /api/v1/auth/otp/verify` - Verify OTP
- `POST /api/v1/auth/otp/resend` - Resend OTP

---

### 🔐 10. Biometric Authentication (2FA)

**ต้องสร้าง:** `src/controllers/biometric.controller.ts`

**Pattern จาก:** Authentication-service-be/src/controllers/biometricAuthenticationController.ts

**Endpoints:**
- `POST /api/v1/auth/2fa/register/start` - Start WebAuthn registration
- `POST /api/v1/auth/2fa/register/verify` - Verify registration
- `POST /api/v1/auth/2fa/login/start` - Start 2FA login
- `POST /api/v1/auth/2fa/login/verify` - Verify 2FA login

**Uses:** `@simplewebauthn/server`

---

### 🤖 11. CAPTCHA Middleware

**ต้องสร้าง:** `src/middleware/captcha.middleware.ts`

**Pattern จาก:** Authentication-service-be/src/middlewares/captcha/captchaValidation.ts

**Function:**
- `validateCaptcha(req, res, next)` - Validate reCAPTCHA Enterprise

---

### ⏰ 12. Background Jobs

**ต้องสร้าง:** `src/jobs/cleanup.job.ts`

**Pattern จาก:** Authentication-service-be/src/backgroundJobs/deleteOTP.ts

**Jobs:**
- OTP cleanup (every 1 hour) - Delete expired OTPs
- Unused token cleanup (every 24 hours)

**Uses:** `node-cron`

---

### 📝 13. Update Auth Routes

**ต้องแก้:** `src/routes/auth.routes.ts`

**เพิ่ม routes:**
```typescript
// Social Login
router.get('/login/aad', ssoController.initiate);
router.get('/login/aad/redirect', ssoController.callback);
router.post('/google/login', googleController.login);
router.post('/facebook/login', facebookController.login);

// OTP
router.post('/otp/send', otpController.send);
router.post('/otp/verify', otpController.verify);
router.post('/otp/resend', otpController.resend);

// 2FA
router.post('/2fa/register/start', biometricController.registerStart);
router.post('/2fa/register/verify', biometricController.registerVerify);
router.post('/2fa/login/start', biometricController.loginStart);
router.post('/2fa/login/verify', biometricController.loginVerify);
```

---

### 🗄️ 14. Database Migration

**ต้องรัน:**
```bash
# Generate Prisma Client
yarn prisma:generate

# Create migration
yarn prisma:migrate
# ชื่อ migration: "add_social_otp_2fa_features"

# Review migration SQL
cat prisma/migrations/xxx_add_social_otp_2fa_features/migration.sql
```

---

### ⚙️ 15. Environment Variables

**ต้องเพิ่มใน `.env`:**
```env
# Google Sign-In
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=

# Facebook Login
FACEBOOK_APP_ID=
FACEBOOK_APP_SECRET=

# reCAPTCHA
RECAPTCHA_PROJECT_ID=
RECAPTCHA_SITE_KEY=
RECAPTCHA_API_KEY=
CAPTCHA_ENABLED=true

# OTP
OTP_LENGTH=6
OTP_EXPIRY_MINUTES=10

# 2FA
TWO_FACTOR_AUTH_ENABLED=true
RP_NAME="Microplate System"
RP_ID=localhost
EXPECTED_ORIGIN=http://localhost:3000

# Cookies
COOKIE_SECRET=
COOKIE_DOMAIN=localhost
COOKIE_SECURE=false
COOKIE_HTTP_ONLY=true
```

---

## Variable Naming Conventions (ตรงกับ Authentication-service-be)

### ✅ Database/Model Level:
- `camelCase` สำหรับทุก properties: `name`, `email`, `mobileNumber`, `verifiedEmail`

### ✅ Service/Function Level:
- `camelCase` สำหรับ functions: `socialUserDetails()`, `generateOtp()`, `verifyOtp()`
- `PascalCase` สำหรับ classes: `SocialUserService`, `OtpService`

### ✅ Constants:
- `SCREAMING_SNAKE_CASE`: `OTP_TYPES`, `USER_VERIFY`

### ✅ Variables:
- `camelCase`: `const userDetails = ...`, `const otpValue = ...`

---

## Next Steps (ลำดับการทำงาน)

1. **Install dependencies** (5 min)
   ```bash
   yarn add [packages...]
   ```

2. **Update TokenUtil** (5 min)
   - Add `generateOtpToken()` method

3. **Create middleware** (30 min)
   - Cookie middleware
   - CAPTCHA middleware

4. **Create controllers** (2-3 hours)
   - SSO controller (cookie-based)
   - Google Sign-In controller
   - Facebook Sign-In controller
   - OTP controller
   - Biometric controller

5. **Create background jobs** (30 min)
   - OTP cleanup job
   - Setup cron scheduler

6. **Update routes** (15 min)
   - Register all new endpoints

7. **Database migration** (10 min)
   - Generate Prisma client
   - Run migration

8. **Testing** (1-2 hours)
   - Test each social login flow
   - Test OTP flow
   - Test 2FA flow
   - Test with Frontend

---

## Testing Checklist

- [ ] SSO login with Azure AD (cookie-based)
- [ ] Google Sign-In
- [ ] Facebook Sign-In
- [ ] OTP send/verify
- [ ] OTP expiry
- [ ] 2FA registration
- [ ] 2FA login
- [ ] CAPTCHA validation
- [ ] Account lockout after failed attempts
- [ ] Password history check
- [ ] Social account linking/unlinking
- [ ] Background job OTP cleanup

---

## Files Modified

1. ✅ `prisma/schema.prisma` - Added SocialUser, Otp, Authenticator models
2. ✅ `src/services/socialUser.service.ts` - New service
3. ✅ `src/services/otp.service.ts` - New service
4. ✅ `INSTALL-DEPENDENCIES.md` - Installation guide
5. ✅ `MIGRATION-PROGRESS.md` - This file

## Files To Create

6. ⏳ `src/middleware/cookie.middleware.ts`
7. ⏳ `src/middleware/captcha.middleware.ts`
8. ⏳ `src/controllers/sso.controller.ts`
9. ⏳ `src/controllers/googleSignIn.controller.ts`
10. ⏳ `src/controllers/facebookSignIn.controller.ts`
11. ⏳ `src/controllers/otp.controller.ts`
12. ⏳ `src/controllers/biometric.controller.ts`
13. ⏳ `src/jobs/cleanup.job.ts`
14. ⏳ `src/utils/token.util.ts` - Update with OTP token method

## Files To Update

15. ⏳ `src/routes/auth.routes.ts` - Add new endpoints
16. ⏳ `src/server.ts` - Register cookie parser, start cron jobs
17. ⏳ `.env.example` - Add new environment variables

---

**Status:** 40% Complete (Database + Core Services Done)

**Estimated Time Remaining:** 4-6 hours

**Ready for:** Dependency installation and controller implementation
