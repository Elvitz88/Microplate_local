import * as msal from '@azure/msal-node';
import fs from 'fs';
import { config } from '../config/config';
import { logger } from '../utils/logger';

export interface AadProfile {
  email: string;
  name?: string;
  oid?: string;
  preferredUsername?: string;
  avatarUrl?: string;
}

interface AadStatePayload {
  continueUrl?: string;
}

const encodeState = (payload: AadStatePayload): string => {
  const json = JSON.stringify(payload);
  return Buffer.from(json, 'utf8').toString('base64url');
};

const decodeState = (state?: string): AadStatePayload => {
  if (!state) return {};
  try {
    const json = Buffer.from(state, 'base64url').toString('utf8');
    return JSON.parse(json) as AadStatePayload;
  } catch (error) {
    logger.warn('Failed to decode AAD state payload', { error });
    return {};
  }
};

const getMsalClient = (): msal.ConfidentialClientApplication => {
  if (!config.azureAd.enabled) {
    throw new Error('AAD_NOT_ENABLED');
  }

  const { clientId, authority, clientSecret, certThumbprint, privateKeyPath } = config.azureAd;

  const auth: msal.Configuration['auth'] = {
    clientId,
    authority,
  };

  if (clientSecret) {
    auth.clientSecret = clientSecret;
  } else if (certThumbprint && privateKeyPath) {
    if (!fs.existsSync(privateKeyPath)) {
      throw new Error(`AAD_PRIVATE_KEY_NOT_FOUND:${privateKeyPath}`);
    }
    auth.clientCertificate = {
      thumbprint: certThumbprint,
      privateKey: fs.readFileSync(privateKeyPath, 'utf8'),
    };
  } else {
    throw new Error('AAD_CLIENT_CREDENTIALS_MISSING');
  }

  return new msal.ConfidentialClientApplication({
    auth,
    system: {
      loggerOptions: {
        loggerCallback(_loglevel, message) {
          logger.info(message);
        },
        piiLoggingEnabled: false,
        logLevel: msal.LogLevel.Warning,
      },
    },
  });
};

export class AadService {
  private client: msal.ConfidentialClientApplication;

  constructor() {
    this.client = getMsalClient();
  }

  async getAuthUrl(continueUrl?: string): Promise<string> {
    const authCodeUrlParameters: msal.AuthorizationUrlRequest = {
      scopes: config.azureAd.scopes,
      redirectUri: config.azureAd.redirectUri,
      state: encodeState(continueUrl ? { continueUrl } : {}),
    };

    return this.client.getAuthCodeUrl(authCodeUrlParameters);
  }

  async exchangeCode(code: string, state?: string): Promise<{ profile: AadProfile; continueUrl?: string }> {
    const tokenRequest: msal.AuthorizationCodeRequest = {
      code,
      scopes: config.azureAd.scopes,
      redirectUri: config.azureAd.redirectUri,
    };

    const response = await this.client.acquireTokenByCode(tokenRequest);
    if (!response) {
      throw new Error('AAD_TOKEN_RESPONSE_EMPTY');
    }

    const claims: Record<string, any> = response.idTokenClaims || {};
    const preferredUsername = claims['preferred_username'] || claims['upn'];
    const email = preferredUsername || claims['email'];

    if (!email) {
      throw new Error('AAD_EMAIL_NOT_FOUND');
    }

    // Fetch profile photo from Microsoft Graph API
    let avatarUrl: string | undefined;
    const hasAccessToken = Boolean(response.accessToken);
    logger.info('exchangeCode: profile photo check', { hasAccessToken });
    if (response.accessToken) {
      logger.info('Fetching profile photo from Microsoft Graph');
      avatarUrl = await this.getProfilePhoto(response.accessToken);
      if (avatarUrl) {
        logger.info('Profile photo fetched from Microsoft Graph for SSO user');
      }
    } else {
      logger.info('No access token available, skipping profile photo fetch');
    }

    const profile: AadProfile = {
      email: String(email).toLowerCase(),
      ...(claims['name'] ? { name: String(claims['name']) } : {}),
      ...(claims['oid'] ? { oid: String(claims['oid']) } : {}),
      ...(preferredUsername ? { preferredUsername: String(preferredUsername) } : {}),
      ...(avatarUrl ? { avatarUrl } : {}),
    };

    const decodedState = decodeState(state);

    return { profile, ...(decodedState.continueUrl ? { continueUrl: decodedState.continueUrl } : {}) };
  }

  /**
   * Fetch user's profile photo from Microsoft Graph API
   * Returns base64 data URL or undefined if no photo available
   */
  async getProfilePhoto(accessToken: string): Promise<string | undefined> {
    try {
      const response = await fetch('https://graph.microsoft.com/v1.0/me/photo/$value', {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });

      if (!response.ok) {
        if (response.status === 404) {
          logger.info('User has no profile photo in Azure AD (Graph 404)');
          return undefined;
        }
        logger.warn('Failed to fetch profile photo from Graph API', {
          status: response.status,
          statusText: response.statusText,
        });
        return undefined;
      }

      const arrayBuffer = await response.arrayBuffer();
      const base64 = Buffer.from(arrayBuffer).toString('base64');
      const contentType = response.headers.get('content-type') || 'image/jpeg';

      return `data:${contentType};base64,${base64}`;
    } catch (error) {
      logger.warn('Error fetching profile photo from Graph API', { error });
      return undefined;
    }
  }
}
