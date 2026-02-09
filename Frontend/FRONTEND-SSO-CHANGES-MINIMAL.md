# Frontend Changes - Minimal (Keep Token-Based)

## ✅ Option 2: Minimal Changes (Keep localStorage + Bearer Token)

ถ้าคุณต้องการให้ Backend **ส่ง tokens กลับมาแทนการตั้ง cookies** (ง่ายกว่า)

---

## 🔄 Backend Changes Required First

### แก้ไข SSO Controller ให้ส่ง tokens แทน cookies:

**File:** `Backend-Microplate-auth-service/src/controllers/sso.controller.ts`

**แทนที่:**
```typescript
// Redirect to original URL
const redirectUrl = new URL(continueUrl);
return res.redirect(redirectUrl.toString());
```

**ด้วย:**
```typescript
// Option A: Redirect with tokens in URL (less secure but simpler)
const redirectUrl = new URL(continueUrl);
redirectUrl.searchParams.set('access_token', loginResult.token);
redirectUrl.searchParams.set('refresh_token', loginResult.refreshToken);
return res.redirect(redirectUrl.toString());

// Option B: Better - Redirect to exchange endpoint
const exchangeCode = TokenUtil.generateSsoExchangeToken({
  userId: loginResult.user.id,
  continueUrl
});

const frontendCallbackUrl = new URL('/auth/sso/callback', config.frontendUrl);
frontendCallbackUrl.searchParams.set('code', exchangeCode);
return res.redirect(frontendCallbackUrl.toString());
```

---

## 📝 Frontend Changes (Minimal)

### 1. Update SSO Login URL

**File:** `src/services/auth.service.ts`

**Before:**
```typescript
getSsoLoginUrl(continueUrl: string) {
  const url = new URL('/api/v1/auth/sso/aad', getAuthBaseUrl())
  url.searchParams.set('continue', continueUrl)
  return url.toString()
}
```

**After:**
```typescript
getSsoLoginUrl(continueUrl: string) {
  // Change endpoint to new /login/aad
  const url = new URL('/api/v1/auth/login/aad', getAuthBaseUrl())
  url.searchParams.set('continue', continueUrl)
  return url.toString()
}
```

### 2. Update Callback Page (if using exchange code)

**File:** `src/pages/SsoCallbackPage.tsx`

**Keep existing code but update endpoint:**

```typescript
// If backend returns exchange code
const code = searchParams.get('code')

// Option A: Exchange via existing endpoint
await authService.exchangeSsoCode(code)  // Already exists

// Option B: If backend returns tokens directly in URL
const accessToken = searchParams.get('access_token')
const refreshToken = searchParams.get('refresh_token')

if (accessToken) {
  localStorage.setItem('access_token', accessToken)
  if (refreshToken) {
    localStorage.setItem('refresh_token', refreshToken)
  }
  authService.setTokensForAllServices(accessToken)
  navigate('/capture')
}
```

---

## 🔧 Complete Backend Implementation (Token-Based SSO)

**File:** `Backend-Microplate-auth-service/src/controllers/sso.controller.ts`

**Replace `ssoRedirectController` with:**

```typescript
/**
 * Handle AAD callback and issue exchange token (Token-based pattern)
 * GET /api/v1/auth/login/aad/redirect?code=<code>&state=<url>
 */
export const ssoRedirectController = async (req: Request, res: Response) => {
  try {
    if (!config.azureAd.enabled) {
      return res.status(503).send('Azure AD SSO is disabled');
    }

    const code = req.query['code'] as string;
    const continueUrl =
      (req.query['state'] as string) || config.azureAd.defaultRedirect;

    if (!code) {
      throw new Error('AAD authorization code not present in query params');
    }

    const msalApp = initializeMsal();

    // Exchange code for AAD token
    const tokenRequest: msal.AuthorizationCodeRequest = {
      code,
      scopes: ['user.read'],
      redirectUri: AAD_REDIRECT_URI,
    };

    const aadResponse = await msalApp.acquireTokenByCode(tokenRequest);

    if (!aadResponse || !aadResponse.idTokenClaims) {
      throw new Error('Failed to acquire token from AAD');
    }

    // Extract user info
    const idTokenClaims: any = aadResponse.idTokenClaims;
    const email = idTokenClaims.preferred_username?.toLowerCase();
    const name = idTokenClaims.name;
    const socialId = idTokenClaims.oid;

    if (!email || !socialId) {
      throw new Error('Required claims not present in AAD response');
    }

    // Check domain whitelist
    if (config.azureAd.allowedDomains.length > 0) {
      const emailDomain = email.split('@')[1];
      if (!config.azureAd.allowedDomains.includes(emailDomain)) {
        return res.status(403).send(
          `Access denied. Domain ${emailDomain} is not authorized.`
        );
      }
    }

    // Find or create user and issue OUR tokens
    const loginResult = await socialUserService.socialLoginService({
      socialId,
      socialAccountType: 'aad',
      email,
      name,
    });

    // Audit log
    await auditService.log({
      userId: loginResult.user.id,
      action: 'SSO_LOGIN',
      resource: 'auth',
      details: {
        provider: 'aad',
        email: loginResult.user.email,
        isNewUser: loginResult.isNewUser,
      },
      ...(req.ip ? { ipAddress: req.ip } : {}),
      ...(req.get('user-agent')
        ? { userAgent: req.get('user-agent') as string }
        : {}),
    });

    // ✅ TOKEN-BASED: Generate exchange code instead of setting cookies
    const exchangeCode = TokenUtil.generateSsoExchangeToken({
      userId: loginResult.user.id,
      continueUrl,
    });

    // Store tokens temporarily in database for exchange
    await prisma.user.update({
      where: { id: loginResult.user.id },
      data: {
        token: loginResult.token,
        refreshToken: loginResult.refreshToken,
      },
    });

    // Redirect to frontend callback with exchange code
    const frontendCallbackUrl = new URL('/auth/sso/callback', config.frontendUrl);
    frontendCallbackUrl.searchParams.set('code', exchangeCode);
    return res.redirect(frontendCallbackUrl.toString());
  } catch (error: any) {
    logger.error('Error in AAD SSO redirect', { error: error.message });
    return res.status(500).send(
      `<html><body>
        <h1>SSO Login Failed</h1>
        <p>Error: ${error.message}</p>
        <p><a href="${config.azureAd.defaultRedirect}">Return to Login</a></p>
      </body></html>`
    );
  }
};
```

### Add Exchange Endpoint

**File:** `Backend-Microplate-auth-service/src/routes/sso.routes.ts`

```typescript
import express from 'express';
import {
  ssoAadController,
  ssoRedirectController,
  ssoExchangeController,  // ✅ Add this
} from '../controllers/sso.controller';

const router = express.Router();

router.get('/aad', ssoAadController);
router.get('/aad/redirect', ssoRedirectController);
router.post('/aad/exchange', ssoExchangeController);  // ✅ Add this

export default router;
```

### Add Exchange Controller

**File:** `Backend-Microplate-auth-service/src/controllers/sso.controller.ts`

```typescript
/**
 * Exchange SSO code for tokens (Token-based pattern)
 * POST /api/v1/auth/login/aad/exchange
 */
export const ssoExchangeController = async (req: Request, res: Response) => {
  try {
    const { code } = req.body;

    if (!code) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'MISSING_CODE',
          message: 'Exchange code is required',
        },
      });
    }

    // Verify exchange token
    const decoded = TokenUtil.verifySsoExchangeToken(code);

    // Get user and their tokens
    const user = await prisma.user.findUniqueOrThrow({
      where: { id: decoded.userId },
      select: {
        id: true,
        email: true,
        username: true,
        name: true,
        token: true,
        refreshToken: true,
        roles: {
          include: {
            role: true,
          },
        },
      },
    });

    if (!user.token || !user.refreshToken) {
      throw new Error('User tokens not found');
    }

    const roles = user.roles.map((ur) => ur.role.name);

    // Return tokens to frontend
    res.json({
      success: true,
      data: {
        accessToken: user.token,
        refreshToken: user.refreshToken,
        user: {
          id: user.id,
          email: user.email,
          username: user.username,
          name: user.name,
          roles,
        },
      },
    });
  } catch (error: any) {
    logger.error('SSO exchange error', { error });
    res.status(401).json({
      success: false,
      error: {
        code: 'EXCHANGE_FAILED',
        message: error.message || 'Failed to exchange code',
      },
    });
  }
};
```

---

## 📋 Frontend Changes Summary

### Only need to change 1 line!

**File:** `src/services/auth.service.ts`

```typescript
getSsoLoginUrl(continueUrl: string) {
  // Before: '/api/v1/auth/sso/aad'
  // After:  '/api/v1/auth/login/aad'
  const url = new URL('/api/v1/auth/login/aad', getAuthBaseUrl())
  url.searchParams.set('continue', continueUrl)
  return url.toString()
}

// Keep existing exchangeSsoCode() - it will work with new /login/aad/exchange
```

**Optional:** Update exchange endpoint in auth.service.ts:

```typescript
async exchangeSsoCode(code: string) {
  // Before: '/api/v1/auth/sso/exchange'
  // After:  '/api/v1/auth/login/aad/exchange'
  const res = await authApi.post<LoginResponse>('/api/v1/auth/login/aad/exchange', { code })
  storeTokensFromResponse(res)
  return res
}
```

---

## ✅ Summary

### Option 2 Benefits:
- ✅ **Minimal frontend changes** (1-2 lines)
- ✅ **Keep existing token storage** (localStorage)
- ✅ **Keep existing auth flow**
- ✅ **No CORS complexity** with credentials

### Option 2 Drawbacks:
- ❌ Less secure than HTTP-only cookies (XSS vulnerability)
- ❌ Need to manually manage Authorization header
- ❌ Tokens visible in localStorage (DevTools)

---

## 🆚 Comparison: Cookie vs Token

| Feature | Cookie-Based (Option 1) | Token-Based (Option 2) |
|---------|-------------------------|------------------------|
| **Security** | ✅ HTTP-only (XSS safe) | ⚠️ localStorage (XSS risk) |
| **Complexity** | Medium (CORS + cookies) | Low (existing pattern) |
| **Frontend Changes** | ~7 files | 1-2 lines |
| **Backend Changes** | Cookie setup | Exchange endpoint |
| **CSRF Protection** | ✅ SameSite cookie | N/A |
| **Pattern Match** | ✅ Authentication-service-be | ✅ Current codebase |

---

## 💡 Recommendation

**Use Option 1 (Cookie-Based) if:**
- Security is priority
- You want to match Authentication-service-be pattern exactly
- You have time to update frontend (~1 hour)

**Use Option 2 (Token-Based) if:**
- You want minimal changes
- You want to keep existing frontend architecture
- Security is acceptable (internal app)

---

**Your Choice:** คุณต้องการใช้แบบไหนครับ? 😊
