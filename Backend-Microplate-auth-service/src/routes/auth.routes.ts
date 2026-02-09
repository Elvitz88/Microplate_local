import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { AuthService } from '../services/auth.service';
import { AuditService } from '../services/audit.service';
import { AadService } from '../services/aad.service';
import ssoRoutes from './sso.routes';
import { requireAuth, AuthRequest } from '../middleware/auth.middleware';

import { ApiResponse, SsoExchangeRequest } from '../types/auth.types';
import { logger } from '../utils/logger';
import { TokenUtil } from '../utils/token.util';
import { resolveContinueUrl } from '../utils/url.util';
import { config } from '../config/config';

const prisma = new PrismaClient();
const auditService = new AuditService(prisma);
const authService = new AuthService(prisma, auditService);
let aadService: AadService | null = null;

const getAadService = (): AadService => {
  if (!aadService) {
    aadService = new AadService();
  }
  return aadService;
};

const router = Router();


router.post('/register', async (req, res) => {
  try {
    const result = await authService.register(req.body, {
      ipAddress: req.ip || 'unknown',
      userAgent: req.headers['user-agent'] || 'unknown'
    });

    const response: ApiResponse = {
      success: true,
      data: result
    };

    res.status(201).json(response);
  } catch (error: any) {
    logger.error('Register error', { error, body: req.body });
    res.status(error.status || 500).json({
      success: false,
      error: {
        code: error.code || 'REGISTRATION_FAILED',
        message: error.message || 'Registration failed'
      }
    });
  }
});


router.post('/login', async (req, res) => {
  try {
    const result = await authService.login(req.body, {
      ipAddress: req.ip || 'unknown',
      userAgent: req.headers['user-agent'] || 'unknown'
    });

    const response: ApiResponse = {
      success: true,
      data: result
    };

    res.json(response);
  } catch (error: any) {
    logger.error('Login error', { error, body: req.body });
    res.status(error.status || 500).json({
      success: false,
      error: {
        code: error.code || 'LOGIN_FAILED',
        message: error.message || 'Login failed'
      }
    });
  }
});


router.post('/refresh', async (req, res) => {
  try {
    const body = req.body;
    const result = await authService.refreshToken(body.refreshToken, {
      ipAddress: req.ip || 'unknown',
      userAgent: req.headers['user-agent'] || 'unknown'
    });

    const response: ApiResponse = {
      success: true,
      data: result
    };

    res.json(response);
  } catch (error: any) {
    logger.error('Refresh token error', { error, body: req.body });
    res.status(error.status || 500).json({
      success: false,
      error: {
        code: error.code || 'REFRESH_FAILED',
        message: error.message || 'Token refresh failed'
      }
    });
  }
});


router.post('/logout', async (req, res) => {
  try {
    const body = req.body;
    await authService.logout(body.refreshToken);

    const response: ApiResponse = {
      success: true,
      message: 'Logged out successfully'
    };

    res.json(response);
  } catch (error) {
    throw error;
  }
});


router.post('/forgot-password', async (req, res) => {
  try {
    const result = await authService.requestPasswordReset(req.body, {
      ipAddress: req.ip || 'unknown',
      userAgent: req.headers['user-agent'] || 'unknown'
    });

    const response: ApiResponse = {
      success: true,
      data: result
    };

    res.json(response);
  } catch (error) {
    throw error;
  }
});


router.post('/reset-password', async (req, res) => {
  try {
    const result = await authService.resetPassword(req.body, {
      ipAddress: req.ip || 'unknown',
      userAgent: req.headers['user-agent'] || 'unknown'
    });

    const response: ApiResponse = {
      success: true,
      data: result
    };

    res.json(response);
  } catch (error) {
    throw error;
  }
});


router.post('/verify-email', async (req, res) => {
  try {
    const result = await authService.verifyEmail(req.body);

    const response: ApiResponse = {
      success: true,
      data: result
    };

    res.json(response);
  } catch (error) {
    throw error;
  }
});

// Get current user profile (requires auth)
router.get('/profile', requireAuth, async (req: AuthRequest, res) => {
  try {
    const userId = req.userId!;
    const user = await authService.getCurrentUser(userId);
    res.json({ success: true, data: user });
  } catch (error: any) {
    logger.error('Get profile error', { error, userId: req.userId });
    res.status(error?.message === 'USER_NOT_FOUND' ? 404 : 500).json({
      success: false,
      error: {
        code: error?.code || 'PROFILE_FETCH_FAILED',
        message: error?.message || 'Failed to load profile'
      }
    });
  }
});

// Update current user profile (requires auth)
router.put('/profile', requireAuth, async (req: AuthRequest, res) => {
  try {
    const userId = req.userId!;
    const body = req.body as { email?: string; username?: string; fullName?: string; avatarUrl?: string | null };
    const payload: { email?: string; username?: string; fullName?: string; avatarUrl?: string | null } = {};
    if (body.email !== undefined) payload.email = body.email;
    if (body.username !== undefined) payload.username = body.username;
    if (body.fullName !== undefined) payload.fullName = body.fullName;
    if (body.avatarUrl !== undefined) payload.avatarUrl = body.avatarUrl;
    const user = await authService.updateProfile(userId, payload);
    res.json({ success: true, data: user, message: 'Profile updated successfully' });
  } catch (error: any) {
    logger.error('Update profile error', { error, userId: req.userId });
    res.status(error?.message === 'USER_NOT_FOUND' ? 404 : 500).json({
      success: false,
      error: {
        code: error?.code || 'PROFILE_UPDATE_FAILED',
        message: error?.message || 'Failed to update profile'
      }
    });
  }
});

router.get('/sso/aad', async (req, res) => {
  try {
    if (!config.azureAd.enabled) {
      res.status(503).json({
        success: false,
        error: {
          code: 'AAD_DISABLED',
          message: 'Azure AD SSO is disabled'
        }
      });
      return;
    }
    const continueUrl = req.query['continue'] as string | undefined;
    const authUrl = await getAadService().getAuthUrl(continueUrl);
    res.redirect(authUrl);
  } catch (error: any) {
    logger.error('AAD SSO start error', { error });
    res.status(500).json({
      success: false,
      error: {
        code: error.code || 'AAD_SSO_START_FAILED',
        message: error.message || 'Failed to start Azure AD login'
      }
    });
  }
});

router.get('/sso/aad/redirect', async (req, res) => {
  try {
    if (!config.azureAd.enabled) {
      res.status(503).send('Azure AD SSO is disabled');
      return;
    }
    const code = req.query['code'] as string | undefined;
    const state = req.query['state'] as string | undefined;

    if (!code) {
      res.status(400).send('AAD code not present in query params');
      return;
    }

    const { profile, continueUrl } = await getAadService().exchangeCode(code, state);
    const user = await authService.resolveSsoUser(profile, {
      ipAddress: req.ip || 'unknown',
      userAgent: req.headers['user-agent'] || 'unknown'
    });

    const defaultContinueUrl = new URL('/auth/sso/callback', config.frontendUrl).toString();
    const safeContinueUrl = resolveContinueUrl(continueUrl, defaultContinueUrl, config.cors.allowedOrigins);
    const exchangeToken = TokenUtil.generateSsoExchangeToken({ userId: user.id, continueUrl: safeContinueUrl });

    const redirectUrl = new URL(safeContinueUrl);
    redirectUrl.searchParams.set('code', exchangeToken);
    res.redirect(redirectUrl.toString());
  } catch (error: any) {
    logger.error('AAD SSO redirect error', { error });
    res.status(500).send('AAD login failed');
  }
});

router.post('/sso/exchange', async (req, res) => {
  try {
    const body = req.body as SsoExchangeRequest;
    if (!body?.code) {
      res.status(400).json({
        success: false,
        error: {
          code: 'SSO_CODE_REQUIRED',
          message: 'SSO code is required'
        }
      });
      return;
    }
    const result = await authService.exchangeSsoCode(body.code, {
      ipAddress: req.ip || 'unknown',
      userAgent: req.headers['user-agent'] || 'unknown'
    });

    const response: ApiResponse = {
      success: true,
      data: result
    };

    res.json(response);
  } catch (error: any) {
    logger.error('SSO exchange error', { error });
    res.status(500).json({
      success: false,
      error: {
        code: error.code || 'SSO_EXCHANGE_FAILED',
        message: error.message || 'SSO exchange failed'
      }
    });
  }
});

// Mount SSO routes (cookie-based pattern from Authentication-service-be)
// Routes: GET /login/aad, GET /login/aad/redirect
router.use('/login', ssoRoutes);

export { router as authRoutes };
