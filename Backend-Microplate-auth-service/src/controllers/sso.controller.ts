import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { SocialUserService } from '../services/socialUser.service';
import { AuditService } from '../services/audit.service';
import { AadService } from '../services/aad.service';
import { logger } from '../utils/logger';
import { config } from '../config/config';

const prisma = new PrismaClient();
const socialUserService = new SocialUserService(prisma);
const auditService = new AuditService(prisma);

/**
 * SSO Controller - Token-based SSO matching Authentication-service-be
 *
 * Uses AadService for auth URL and code exchange (includes profile photo via User.Read).
 * The system issues its OWN tokens from Backend-Microplate-auth-service.
 */

const getAadService = (): AadService => new AadService();

/**
 * Start AAD SSO flow
 * GET /api/v1/auth/login/aad?continue=<url>
 */
export const ssoAadController = async (req: Request, res: Response) => {
  try {
    if (!config.azureAd.enabled) {
      return res.status(503).send('Azure AD SSO is disabled');
    }

    const continueUrl =
      (req.query['continue'] as string) || config.azureAd.defaultRedirect;
    const authUrl = await getAadService().getAuthUrl(continueUrl);

    logger.info('SSO AAD flow initiated', {
      continueUrl,
      redirectUri: config.azureAd.redirectUri,
    });

    return res.redirect(authUrl);
  } catch (error) {
    logger.error('Error initiating AAD SSO', { error });
    return res.status(500).json({
      success: false,
      error: {
        code: 'SSO_INITIATION_FAILED',
        message: 'Failed to initiate SSO login',
      },
    });
  }
};

/**
 * Handle AAD callback and issue OUR tokens
 * GET /api/v1/auth/login/aad/redirect?code=<code>&state=<url>
 * Uses AadService.exchangeCode so profile photo (avatarUrl) is fetched from Graph when User.Read is in scopes.
 */
export const ssoRedirectController = async (req: Request, res: Response) => {
  try {
    if (!config.azureAd.enabled) {
      return res.status(503).send('Azure AD SSO is disabled');
    }

    const code = req.query['code'] as string;
    const state = req.query['state'] as string;

    if (!code) {
      throw new Error('AAD authorization code not present in query params');
    }

    const { profile, continueUrl: decodedContinueUrl } = await getAadService().exchangeCode(code, state);
    const continueUrl = decodedContinueUrl || state || config.azureAd.defaultRedirect;

    const email = profile.email?.toLowerCase();
    const socialId = profile.oid;
    const name = profile.name ?? '';

    if (!email || !socialId) {
      throw new Error('Required claims (email, oid) not present in AAD response');
    }

    // Check domain whitelist (if configured)
    if (config.azureAd.allowedDomains.length > 0) {
      const emailDomain = email.split('@')[1] ?? '';
      if (emailDomain && !config.azureAd.allowedDomains.includes(emailDomain)) {
        logger.warn('SSO login attempt from unauthorized domain', {
          email,
          domain: emailDomain,
        });
        return res.status(403).send(
          `Access denied. Your email domain (${emailDomain}) is not authorized to access this system.`
        );
      }
    }

    logger.info('AAD authentication successful', {
      email,
      socialId,
      name,
    });

    const loginResult = await socialUserService.socialLoginService({
      socialId,
      socialAccountType: 'aad',
      email,
      name,
      ...(profile.avatarUrl ? { avatarUrl: profile.avatarUrl } : {}),
    });

    logger.info('Social login successful - OUR tokens issued', {
      userId: loginResult.user.id,
      email: loginResult.user.email,
      isNewUser: loginResult.isNewUser,
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

    // TOKEN-BASED: Redirect with tokens in URL parameters
    const redirectUrl = new URL(continueUrl);
    redirectUrl.searchParams.set('access_token', loginResult.token);
    redirectUrl.searchParams.set('refresh_token', loginResult.refreshToken);
    return res.redirect(redirectUrl.toString());
  } catch (error: any) {
    logger.error('Error in AAD SSO redirect', { error: error.message });

    // User-friendly error page or redirect to login with error
    return res.status(500).send(
      `<html>
        <body>
          <h1>SSO Login Failed</h1>
          <p>Error: ${error.message}</p>
          <p><a href="${config.azureAd.defaultRedirect}">Return to Login</a></p>
        </body>
      </html>`
    );
  }
};

// Note: Cookie-based authentication functions removed
// Using token-based approach instead (tokens sent via URL parameters)
