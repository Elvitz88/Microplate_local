# การติดตั้ง Dependencies สำหรับ Authentication Features

## Dependencies ที่ต้องเพิ่ม

รันคำสั่งนี้เพื่อติดตั้ง packages ที่จำเป็นทั้งหมด:

```bash
cd Backend-Microplate-auth-service

# Production dependencies
yarn add @simplewebauthn/server@^9.0.0
yarn add google-auth-library@^9.6.0
yarn add passport-facebook@^3.0.0
yarn add @google-cloud/recaptcha-enterprise@^5.5.0
yarn add cookie-parser@^1.4.6
yarn add node-cron@^3.0.3
yarn add crypto-js@^4.2.0

# Dev dependencies
yarn add -D @types/cookie-parser@^1.4.6
yarn add -D @types/node-cron@^3.0.11
yarn add -D @types/crypto-js@^4.2.2
```

## อธิบาย Dependencies

| Package | Version | ใช้สำหรับ |
|---------|---------|-----------|
| `@simplewebauthn/server` | ^9.0.0 | WebAuthn/FIDO2 biometric authentication (2FA) |
| `google-auth-library` | ^9.6.0 | Google Sign-In integration |
| `passport-facebook` | ^3.0.0 | Facebook Login integration |
| `@google-cloud/recaptcha-enterprise` | ^5.5.0 | Google reCAPTCHA Enterprise for bot protection |
| `cookie-parser` | ^1.4.6 | Parse and set HTTP cookies |
| `node-cron` | ^3.0.3 | Cron jobs for background tasks (e.g., OTP cleanup) |
| `crypto-js` | ^4.2.0 | Encryption utilities |

## การติดตั้งแบบเลือก

หากต้องการติดตั้งทีละ feature:

### 1. Social Login (Google + Facebook)
```bash
yarn add google-auth-library passport-facebook
```

### 2. Two-Factor Authentication (2FA/WebAuthn)
```bash
yarn add @simplewebauthn/server
```

### 3. CAPTCHA Protection
```bash
yarn add @google-cloud/recaptcha-enterprise
```

### 4. Cookie Support
```bash
yarn add cookie-parser
yarn add -D @types/cookie-parser
```

### 5. Background Jobs
```bash
yarn add node-cron
yarn add -D @types/node-cron
```

## หลังจากติดตั้ง

1. **Generate Prisma Client**:
```bash
yarn prisma:generate
```

2. **Create Migration**:
```bash
yarn prisma:migrate
# กรอกชื่อ migration: "add_social_otp_2fa_models"
```

3. **Deploy Migration (Production)**:
```bash
yarn prisma:deploy
```

## Environment Variables ที่ต้องเพิ่ม

เพิ่มใน `.env` file:

```env
# Google Sign-In
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret

# Facebook Login
FACEBOOK_APP_ID=your-facebook-app-id
FACEBOOK_APP_SECRET=your-facebook-app-secret

# reCAPTCHA Enterprise
RECAPTCHA_PROJECT_ID=your-gcp-project-id
RECAPTCHA_SITE_KEY=your-recaptcha-site-key
RECAPTCHA_API_KEY=your-recaptcha-api-key
CAPTCHA_ENABLED=true

# OTP Configuration
OTP_LENGTH=6
OTP_EXPIRY_MINUTES=10

# 2FA Configuration
TWO_FACTOR_AUTH_ENABLED=true
TWO_FACTOR_AUTH_REQUIRED=false
RP_NAME="Microplate System"
RP_ID=localhost
EXPECTED_ORIGIN=http://localhost:3000

# Cookie Configuration
COOKIE_SECRET=your-cookie-secret-key-change-in-production
COOKIE_DOMAIN=localhost
COOKIE_SECURE=false
COOKIE_HTTP_ONLY=true
COOKIE_SAME_SITE=lax
```

## ตรวจสอบการติดตั้ง

```bash
# ดู dependencies ที่ติดตั้ง
yarn list --pattern "@simplewebauthn|google-auth|passport-facebook|recaptcha|cookie-parser|node-cron"

# Build เพื่อ check TypeScript
yarn build

# Run type check
yarn type-check
```
