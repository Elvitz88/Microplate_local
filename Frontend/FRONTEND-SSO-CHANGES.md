# Frontend Changes for Cookie-Based SSO

## ✅ Option 1: Cookie-Based Authentication (Recommended)

ใช้ HTTP-only cookies แทน localStorage (ตรงกับ Authentication-service-be pattern)

---

### 📝 Changes Required

#### 1. Update API Service to Support Cookies

**File:** `src/services/api.ts`

**Before:**
```typescript
async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const response = await fetch(url, {
    ...options,
    headers
  })
}
```

**After:**
```typescript
async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const response = await fetch(url, {
    ...options,
    headers,
    credentials: 'include',  // ✅ ADD THIS - Send cookies with requests
  })
}
```

---

#### 2. Update SSO Flow in Auth Service

**File:** `src/services/auth.service.ts`

**Change A: Update SSO Login URL**

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
  const url = new URL('/api/v1/auth/login/aad', getAuthBaseUrl())  // ✅ Changed endpoint
  url.searchParams.set('continue', continueUrl)
  return url.toString()
}
```

**Change B: Remove Token Exchange (Cookies set automatically)**

**Before:**
```typescript
// SsoCallbackPage.tsx
const code = searchParams.get('code')
await authService.exchangeSsoCode(code)  // ❌ Not needed with cookie-based
```

**After:**
```typescript
// SsoCallbackPage.tsx
// No code exchange needed! Backend sets cookies automatically
// Just check if authenticated and redirect
useEffect(() => {
  const checkAuth = async () => {
    try {
      // Verify cookies are set by making an authenticated request
      const user = await authService.getCurrentUser()  // GET /api/v1/auth/me
      if (user) {
        // Cookies are set, redirect to app
        navigate('/capture')
      }
    } catch (error) {
      // Cookies not set or invalid, redirect to login
      navigate('/auth')
    }
  }

  checkAuth()
}, [])
```

---

#### 3. Update Authentication Check

**File:** `src/services/auth.service.ts`

**Add Method to Check Cookie-Based Auth:**

```typescript
/**
 * Check if user is authenticated (cookie-based)
 */
async isAuthenticatedWithCookies(): Promise<boolean> {
  try {
    // Try to get current user using cookies
    const response = await authApi.get('/api/v1/auth/me')
    return response.success === true
  } catch {
    return false
  }
}

/**
 * Get current user (uses cookies automatically)
 */
async getCurrentUser(): Promise<User> {
  const response = await authApi.get<{ success: boolean; data: User }>('/api/v1/auth/me')
  return response.data
}
```

---

#### 4. Update App.tsx Auth Check

**File:** `src/App.tsx`

**Before:**
```typescript
useEffect(() => {
  const checkAuth = () => {
    const token = authService.loadTokenFromStorage()
    const isValid = authService.isTokenValid()
    const authenticated = !!token && isValid
    setIsAuthenticated(authenticated)
  }
  checkAuth()
}, [])
```

**After:**
```typescript
useEffect(() => {
  const checkAuth = async () => {
    // Try cookie-based auth first
    const authenticated = await authService.isAuthenticatedWithCookies()
    setIsAuthenticated(authenticated)

    // Fallback: check localStorage (for normal login)
    if (!authenticated) {
      const token = authService.loadTokenFromStorage()
      const isValid = authService.isTokenValid()
      setIsAuthenticated(!!token && isValid)

      if (token && isValid) {
        authService.setTokensForAllServices(token)
      }
    }
  }
  checkAuth()
}, [])
```

---

#### 5. Update AuthGuard

**File:** `src/components/AuthGuard.tsx`

**Add Cookie Check:**

```typescript
useEffect(() => {
  const checkAuth = async () => {
    try {
      // Check cookie-based auth
      const authenticated = await authService.isAuthenticatedWithCookies()

      if (authenticated) {
        setIsAuthenticated(true)
        return
      }

      // Fallback: check localStorage tokens
      const token = authService.loadTokenFromStorage()
      if (!token) {
        navigate('/auth', { replace: true })
        return
      }

      const isValid = authService.isTokenValid()
      if (!isValid) {
        await authService.refreshToken()
        setIsAuthenticated(true)
      } else {
        setIsAuthenticated(true)
      }
    } catch (error) {
      authService.logout()
      navigate('/auth', { replace: true })
    }
  }

  checkAuth()
}, [navigate])
```

---

#### 6. Update Logout to Clear Cookies

**File:** `src/services/auth.service.ts`

**Before:**
```typescript
logout() {
  localStorage.removeItem(ACCESS_TOKEN_KEY)
  localStorage.removeItem(REFRESH_TOKEN_KEY)
  this.setTokensForAllServices('')
}
```

**After:**
```typescript
async logout() {
  // Clear localStorage tokens
  localStorage.removeItem(ACCESS_TOKEN_KEY)
  localStorage.removeItem(REFRESH_TOKEN_KEY)
  this.setTokensForAllServices('')

  // Call backend to clear cookies
  try {
    await authApi.post('/api/v1/auth/logout')
  } catch (error) {
    // Ignore errors, proceed with logout
  }
}
```

---

### 📄 Complete Updated Files

#### **src/services/auth.service.ts** (Partial Update)

```typescript
class AuthService {
  // ... existing methods ...

  /**
   * SSO Login URL (Cookie-based pattern)
   */
  getSsoLoginUrl(continueUrl: string): string {
    const url = new URL('/api/v1/auth/login/aad', getAuthBaseUrl())
    url.searchParams.set('continue', continueUrl)
    return url.toString()
  }

  /**
   * Check if authenticated via cookies
   */
  async isAuthenticatedWithCookies(): Promise<boolean> {
    try {
      const response = await authApi.get('/api/v1/auth/me')
      return response.success === true
    } catch {
      return false
    }
  }

  /**
   * Get current user (uses cookies)
   */
  async getCurrentUser(): Promise<User> {
    const response = await authApi.get<{ success: boolean; data: User }>('/api/v1/auth/me')
    return response.data
  }

  /**
   * Logout (clear both tokens and cookies)
   */
  async logout(): Promise<void> {
    localStorage.removeItem(ACCESS_TOKEN_KEY)
    localStorage.removeItem(REFRESH_TOKEN_KEY)
    this.setTokensForAllServices('')

    try {
      await authApi.post('/api/v1/auth/logout')
    } catch {
      // Ignore errors
    }
  }

  // Remove or deprecate exchangeSsoCode() - not needed anymore
}
```

#### **src/services/api.ts** (Update)

```typescript
class ApiService {
  // ... existing code ...

  async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`

    const headers: HeadersInit = {
      'Content-Type': 'application/json',
      ...options.headers,
    }

    // Add Bearer token if available (for non-SSO login)
    if (this.accessToken) {
      (headers as Record<string, string>).Authorization = `Bearer ${this.accessToken}`
    }

    const response = await fetch(url, {
      ...options,
      headers,
      credentials: 'include',  // ✅ Send cookies
    })

    // ... rest of the code ...
  }
}
```

#### **src/pages/SsoCallbackPage.tsx** (Complete Rewrite)

```typescript
import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { authService } from '../services/auth.service'

/**
 * SSO Callback Page (Cookie-based)
 *
 * After Azure AD login, backend sets HTTP-only cookies automatically
 * This page just verifies cookies and redirects
 */
export function SsoCallbackPage() {
  const navigate = useNavigate()

  useEffect(() => {
    const handleCallback = async () => {
      try {
        // Check if cookies are set by backend
        const authenticated = await authService.isAuthenticatedWithCookies()

        if (authenticated) {
          // Success! Redirect to app
          navigate('/capture', { replace: true })
        } else {
          // Cookies not set, authentication failed
          navigate('/auth?error=sso_failed', { replace: true })
        }
      } catch (error) {
        console.error('SSO callback error:', error)
        navigate('/auth?error=sso_failed', { replace: true })
      }
    }

    handleCallback()
  }, [navigate])

  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="text-center">
        <h2 className="text-xl font-semibold mb-2">Completing sign-in...</h2>
        <p className="text-gray-600">Please wait</p>
      </div>
    </div>
  )
}
```

---

### 🔧 Backend Endpoint Required

Add this endpoint in Backend for logout:

**File:** `src/controllers/sso.controller.ts`

```typescript
/**
 * Logout and clear cookies
 * POST /api/v1/auth/logout
 */
export const logoutController = async (req: Request, res: Response) => {
  try {
    clearAuthCookies(res)

    // Optional: Invalidate refresh token in database
    // const token = req.cookies.refresh_token
    // await tokenService.revokeRefreshToken(token)

    res.json({
      success: true,
      message: 'Logged out successfully'
    })
  } catch (error) {
    logger.error('Logout error', { error })
    res.status(500).json({
      success: false,
      error: {
        code: 'LOGOUT_FAILED',
        message: 'Failed to logout'
      }
    })
  }
}
```

---

### ✅ Testing Steps

1. **Start Backend:**
   ```bash
   cd Backend-Microplate-auth-service
   yarn dev
   ```

2. **Start Frontend:**
   ```bash
   cd Frontend
   npm run dev
   ```

3. **Test SSO Flow:**
   - Go to `http://localhost:3000/auth`
   - Click "Sign in with Microsoft"
   - Login with Azure AD
   - Should redirect back to app with cookies set
   - Check cookies in DevTools (F12 → Application → Cookies):
     - `auth_token` (HTTP-only)
     - `refresh_token` (HTTP-only)

4. **Test API Calls:**
   - Open DevTools Network tab
   - Make API calls
   - Verify `Cookie:` header is sent with requests

5. **Test Logout:**
   - Click logout button
   - Verify cookies are cleared
   - Verify redirected to login page

---

### 🔐 Security Benefits of Cookie-Based Auth

1. **XSS Protection:** HTTP-only cookies can't be accessed by JavaScript
2. **CSRF Protection:** SameSite=lax prevents cross-site requests
3. **Simpler Code:** No need to manually add Authorization header
4. **Automatic Transmission:** Cookies sent with every request

---

### ⚠️ Important Notes

1. **CORS Configuration:**
   Backend must allow credentials:
   ```typescript
   // In auth-service config
   cors: {
     origin: 'http://localhost:3000',
     credentials: true,  // ✅ Required for cookies
   }
   ```

2. **Cookie Domain:**
   If frontend and backend on different domains, cookies won't work unless:
   - Use same domain with different ports (OK for development)
   - Configure CORS properly for production

3. **Backwards Compatibility:**
   This implementation supports BOTH:
   - Cookie-based auth (for SSO)
   - Token-based auth (for normal login)

---

### 📊 Summary of Changes

| File | Change | Reason |
|------|--------|--------|
| `src/services/api.ts` | Add `credentials: 'include'` | Send cookies with requests |
| `src/services/auth.service.ts` | Add `isAuthenticatedWithCookies()` | Check cookie-based auth |
| `src/services/auth.service.ts` | Update `getSsoLoginUrl()` | New `/login/aad` endpoint |
| `src/services/auth.service.ts` | Update `logout()` | Clear cookies on backend |
| `src/pages/SsoCallbackPage.tsx` | Rewrite | Remove token exchange logic |
| `src/App.tsx` | Update auth check | Support cookie auth |
| `src/components/AuthGuard.tsx` | Update auth check | Support cookie auth |

---

**Status:** ✅ Ready to implement

**Estimated Time:** 30-60 minutes
