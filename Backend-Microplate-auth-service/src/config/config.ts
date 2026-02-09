import { config as dotenvConfig } from 'dotenv';


dotenvConfig();

interface Config {
  databaseUrl: string;
  jwtAccessSecret: string;
  jwtRefreshSecret: string;
  ssoExchangeExpiry: string;
  smtp: {
    host: string;
    port: number;
    user: string;
    pass: string;
    from: string;
  };
  nodeEnv: string;
  port: number;
  baseUrl: string; // Base URL for this service (for SSO redirects)
  frontendUrl: string;
  apiBaseUrl: string;
  bcryptRounds: number;
  tokenExpiryAccess: string;
  tokenExpiryRefresh: string;
  passwordResetExpiry: string;
  rateLimitWindowMs: number;
  rateLimitMaxRequests: number;
  logLevel: string;
  logFormat: string;
  cors: {
    enabled: boolean;
    allowedOrigins: string[];
    allowedMethods: string;
    allowedHeaders: string;
    exposedHeaders: string[];
    maxAge: number;
  };
  azureAd: {
    enabled: boolean;
    clientId: string;
    authority: string;
    redirectUri: string;
    scopes: string[];
    clientSecret?: string;
    certThumbprint?: string;
    privateKeyPath?: string;
    allowedDomains: string[];
    defaultRedirect: string; // Default URL to redirect after SSO login
  };
}

const parseCommaList = (value: string | undefined, defaults: string[]): string[] => {
  if (!value) {
    return defaults;
  }

  const items = value
    .split(',')
    .map((item) => item.trim())
    .filter((item) => item.length > 0);

  return items.length > 0 ? items : defaults;
};

export const config: Config = {
  
  databaseUrl: process.env['DATABASE_URL'] || 'postgresql://postgres:password@localhost:5432/microplates',

  
  jwtAccessSecret: process.env['JWT_ACCESS_SECRET'] || 'your-super-secret-access-key',
  jwtRefreshSecret: process.env['JWT_REFRESH_SECRET'] || 'your-super-secret-refresh-key',
  ssoExchangeExpiry: process.env['SSO_EXCHANGE_EXPIRY'] || '2m',

  
  smtp: {
    host: process.env['SMTP_HOST'] || 'smtp.gmail.com',
    port: parseInt(process.env['SMTP_PORT'] || '587'),
    user: process.env['SMTP_USER'] || '',
    pass: process.env['SMTP_PASS'] || '',
    from: process.env['SMTP_FROM'] || 'Microplate AI <noreply@microplate-ai.com>'
  },


  nodeEnv: process.env['NODE_ENV'] || 'development',
  port: parseInt(process.env['PORT'] || '6401'),
  baseUrl: process.env['BASE_URL'] || 'http://localhost:6401', // Base URL for this auth service
  frontendUrl: process.env['FRONTEND_URL'] || 'http://localhost:3000',
  apiBaseUrl: process.env['API_BASE_URL'] || 'http://localhost:6400',

  
  bcryptRounds: parseInt(process.env['BCRYPT_ROUNDS'] || '12'),
  tokenExpiryAccess: process.env['TOKEN_EXPIRY_ACCESS'] || '15m',
  tokenExpiryRefresh: process.env['TOKEN_EXPIRY_REFRESH'] || '7d',
  passwordResetExpiry: process.env['PASSWORD_RESET_EXPIRY'] || '30m',

  rateLimitWindowMs: parseInt(process.env['RATE_LIMIT_WINDOW_MS'] || '900000'),
  rateLimitMaxRequests: parseInt(process.env['RATE_LIMIT_MAX_REQUESTS'] || '100'),

  logLevel: process.env['LOG_LEVEL'] || 'info',
  logFormat: process.env['LOG_FORMAT'] || 'pretty',

  cors: {
    enabled: process.env['ENABLE_CORS'] !== 'false',
    allowedOrigins: parseCommaList(process.env['CORS_ALLOWED_ORIGINS'], ['http://localhost:6410']),
    allowedMethods: process.env['CORS_ALLOWED_METHODS'] || 'GET,POST,PUT,PATCH,DELETE,OPTIONS',
    allowedHeaders:
      process.env['CORS_ALLOWED_HEADERS'] ||
      'Origin, X-Requested-With, Content-Type, Accept, Authorization, X-Request-ID',
    exposedHeaders: parseCommaList(process.env['CORS_EXPOSED_HEADERS'], ['X-Request-ID']),
    maxAge: parseInt(process.env['CORS_MAX_AGE'] || '600'),
  },
  azureAd: {
    enabled: process.env['AAD_ENABLED'] === 'true',
    clientId: process.env['AAD_CLIENT_ID'] || '',
    authority: process.env['AAD_AUTHORITY'] || '',
    redirectUri:
      process.env['AAD_REDIRECT_URI'] ||
      `${process.env['BASE_URL'] || 'http://localhost:6401'}/api/v1/auth/login/aad/redirect`,
    // User.Read is required to fetch profile photo from Graph API (/me/photo/$value)
    scopes: parseCommaList(process.env['AAD_SCOPES'], ['openid', 'profile', 'email', 'User.Read']),
    ...(process.env['AAD_CLIENT_SECRET'] ? { clientSecret: process.env['AAD_CLIENT_SECRET'] } : {}),
    ...(process.env['AAD_CERT_THUMBPRINT'] ? { certThumbprint: process.env['AAD_CERT_THUMBPRINT'] } : {}),
    ...(process.env['AAD_PRIVATE_KEY_PATH'] ? { privateKeyPath: process.env['AAD_PRIVATE_KEY_PATH'] } : {}),
    allowedDomains: parseCommaList(process.env['AAD_ALLOWED_DOMAINS'], []),
    defaultRedirect: process.env['AAD_DEFAULT_REDIRECT'] || process.env['FRONTEND_URL'] || 'http://localhost:3000',
  },
};


if (!config.jwtAccessSecret || config.jwtAccessSecret === 'your-super-secret-access-key') {
  throw new Error('JWT_ACCESS_SECRET must be set in production');
}

if (!config.jwtRefreshSecret || config.jwtRefreshSecret === 'your-super-secret-refresh-key') {
  throw new Error('JWT_REFRESH_SECRET must be set in production');
}

if (config.nodeEnv === 'production' && !config.smtp.user) {
  throw new Error('SMTP_USER must be set in production');
}

if (config.nodeEnv === 'production' && !config.smtp.pass) {
  throw new Error('SMTP_PASS must be set in production');
}

if (config.azureAd.enabled) {
  if (!config.azureAd.clientId || !config.azureAd.authority || !config.azureAd.redirectUri) {
    throw new Error('AAD_CLIENT_ID, AAD_AUTHORITY, and AAD_REDIRECT_URI must be set when AAD is enabled');
  }

  if (!config.azureAd.clientSecret && !(config.azureAd.certThumbprint && config.azureAd.privateKeyPath)) {
    throw new Error('AAD client credentials are missing (client secret or certificate)');
  }
}
