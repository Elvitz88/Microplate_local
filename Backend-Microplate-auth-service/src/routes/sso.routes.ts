import express from 'express';
import {
  ssoAadController,
  ssoRedirectController,
} from '../controllers/sso.controller';

const router = express.Router();

/**
 * SSO Routes (matching Authentication-service-be pattern)
 *
 * Flow:
 * 1. GET /aad?continue=<url> - Start SSO with Azure AD
 * 2. User logs in to Azure AD
 * 3. GET /aad/redirect?code=<code>&state=<url> - Handle callback
 * 4. System issues OUR tokens (not AAD tokens)
 * 5. Redirect to original URL with cookies set
 */

// Start AAD SSO flow
router.get('/aad', ssoAadController);

// Handle AAD callback
router.get('/aad/redirect', ssoRedirectController);

export default router;
