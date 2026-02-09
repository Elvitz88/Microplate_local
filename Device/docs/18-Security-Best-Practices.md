# Security Best Practices

## Overview

This document outlines comprehensive security best practices for the Microplate AI System, covering authentication, authorization, data protection, network security, and compliance requirements.

---

## Table of Contents

1. [Authentication Security](#authentication-security)
2. [Authorization & Access Control](#authorization--access-control)
3. [Data Protection](#data-protection)
4. [API Security](#api-security)
5. [Database Security](#database-security)
6. [Network Security](#network-security)
7. [Container Security](#container-security)
8. [Secret Management](#secret-management)
9. [Logging & Monitoring](#logging--monitoring)
10. [Incident Response](#incident-response)
11. [Compliance](#compliance)

---

## Authentication Security

### JWT Token Management

#### Token Configuration

```typescript
// Secure JWT configuration
const JWT_CONFIG = {
  accessToken: {
    secret: process.env.JWT_SECRET, // 256-bit minimum
    algorithm: 'HS256',
    expiresIn: '15m',              // Short-lived
    issuer: 'microplate-auth',
    audience: 'microplate-services',
  },
  refreshToken: {
    secret: process.env.JWT_REFRESH_SECRET, // Different secret
    algorithm: 'HS256',
    expiresIn: '7d',
    issuer: 'microplate-auth',
    audience: 'microplate-services',
  },
};
```

**Best Practices:**
- ✅ Use separate secrets for access and refresh tokens
- ✅ Generate secrets with `openssl rand -base64 32`
- ✅ Rotate secrets periodically (every 90 days)
- ✅ Never commit secrets to version control
- ✅ Use short expiration times (15 minutes for access tokens)
- ❌ Don't use symmetric encryption for sensitive data
- ❌ Don't expose tokens in URLs or logs

#### Token Rotation

```typescript
// Implement refresh token rotation
async function rotateRefreshToken(oldToken: string): Promise<TokenPair> {
  // Verify old token
  const payload = jwt.verify(oldToken, JWT_CONFIG.refreshToken.secret);
  
  // Check if token already used (replay attack)
  const tokenRecord = await prisma.refreshToken.findUnique({
    where: { token: oldToken },
  });
  
  if (tokenRecord.reused) {
    // Token reuse detected - revoke entire family
    await revokeTokenFamily(tokenRecord.family);
    throw new Error('Token reuse detected');
  }
  
  // Mark old token as used
  await prisma.refreshToken.update({
    where: { token: oldToken },
    data: { reused: true, revokedAt: new Date() },
  });
  
  // Generate new token pair
  const newTokens = await generateTokenPair(payload.userId);
  
  return newTokens;
}
```

### Password Security

#### Password Requirements

```typescript
// Password policy
const PASSWORD_POLICY = {
  minLength: 12,
  requireUppercase: true,
  requireLowercase: true,
  requireNumbers: true,
  requireSpecialChars: true,
  forbiddenPasswords: [
    'password', 'Password123!', '12345678',
    // Load from common password list
  ],
  maxAge: 90, // days
  historyCount: 5, // prevent reuse of last 5 passwords
};

// Validation function
function validatePassword(password: string): ValidationResult {
  const errors: string[] = [];
  
  if (password.length < PASSWORD_POLICY.minLength) {
    errors.push(`Minimum ${PASSWORD_POLICY.minLength} characters required`);
  }
  
  if (PASSWORD_POLICY.requireUppercase && !/[A-Z]/.test(password)) {
    errors.push('At least one uppercase letter required');
  }
  
  if (PASSWORD_POLICY.requireLowercase && !/[a-z]/.test(password)) {
    errors.push('At least one lowercase letter required');
  }
  
  if (PASSWORD_POLICY.requireNumbers && !/\d/.test(password)) {
    errors.push('At least one number required');
  }
  
  if (PASSWORD_POLICY.requireSpecialChars && !/[!@#$%^&*]/.test(password)) {
    errors.push('At least one special character required');
  }
  
  if (PASSWORD_POLICY.forbiddenPasswords.includes(password.toLowerCase())) {
    errors.push('Password is too common');
  }
  
  return {
    valid: errors.length === 0,
    errors,
  };
}
```

#### Password Hashing

```typescript
import argon2 from 'argon2';

// Secure password hashing with Argon2id
async function hashPassword(password: string): Promise<string> {
  return argon2.hash(password, {
    type: argon2.argon2id,
    memoryCost: 2 ** 16,  // 64 MB
    timeCost: 3,          // Number of iterations
    parallelism: 1,       // Degree of parallelism
  });
}

// Verify password
async function verifyPassword(hash: string, password: string): Promise<boolean> {
  try {
    return await argon2.verify(hash, password);
  } catch (error) {
    return false;
  }
}
```

**Why Argon2id?**
- ✅ Winner of Password Hashing Competition (2015)
- ✅ Resistant to GPU/ASIC attacks
- ✅ Configurable memory and time costs
- ✅ Hybrid approach (argon2id) combines security of argon2i and argon2d

### Multi-Factor Authentication (MFA)

```typescript
import speakeasy from 'speakeasy';
import QRCode from 'qrcode';

// Generate MFA secret
async function generateMFASecret(user: User): Promise<MFASetup> {
  const secret = speakeasy.generateSecret({
    name: `Microplate AI (${user.email})`,
    issuer: 'Microplate AI',
  });
  
  // Generate QR code
  const qrCodeUrl = await QRCode.toDataURL(secret.otpauth_url!);
  
  // Store secret (encrypted) in database
  await prisma.user.update({
    where: { id: user.id },
    data: {
      mfaSecret: await encrypt(secret.base32),
      mfaEnabled: false, // Enable after verification
    },
  });
  
  return {
    secret: secret.base32,
    qrCode: qrCodeUrl,
  };
}

// Verify MFA token
async function verifyMFAToken(user: User, token: string): Promise<boolean> {
  const secret = await decrypt(user.mfaSecret!);
  
  return speakeasy.totp.verify({
    secret,
    encoding: 'base32',
    token,
    window: 1, // Allow 1 step before/after for clock skew
  });
}
```

---

## Authorization & Access Control

### Role-Based Access Control (RBAC)

```typescript
// Define roles and permissions
enum Role {
  ADMIN = 'admin',
  OPERATOR = 'operator',
  VIEWER = 'viewer',
}

enum Permission {
  // Capture permissions
  CAPTURE_IMAGE = 'capture:image',
  VIEW_CAMERA = 'capture:view',
  
  // Analysis permissions
  RUN_INFERENCE = 'inference:run',
  VIEW_RESULTS = 'results:view',
  DELETE_RESULTS = 'results:delete',
  
  // Interface permissions
  GENERATE_CSV = 'interface:generate',
  
  // Admin permissions
  MANAGE_USERS = 'users:manage',
  MANAGE_ROLES = 'roles:manage',
  VIEW_AUDIT_LOGS = 'audit:view',
}

// Role-Permission mapping
const ROLE_PERMISSIONS: Record<Role, Permission[]> = {
  [Role.ADMIN]: Object.values(Permission), // All permissions
  
  [Role.OPERATOR]: [
    Permission.CAPTURE_IMAGE,
    Permission.VIEW_CAMERA,
    Permission.RUN_INFERENCE,
    Permission.VIEW_RESULTS,
    Permission.GENERATE_CSV,
  ],
  
  [Role.VIEWER]: [
    Permission.VIEW_CAMERA,
    Permission.VIEW_RESULTS,
  ],
};

// Authorization middleware
function requirePermission(...permissions: Permission[]) {
  return async (request: FastifyRequest, reply: FastifyReply) => {
    const user = request.user;
    
    if (!user) {
      return reply.code(401).send({ error: 'Unauthorized' });
    }
    
    const userPermissions = await getUserPermissions(user.id);
    const hasPermission = permissions.every(p => userPermissions.includes(p));
    
    if (!hasPermission) {
      return reply.code(403).send({ error: 'Forbidden' });
    }
  };
}

// Usage in routes
fastify.post('/api/v1/inference/predict', {
  preHandler: [
    authenticateRequest,
    requirePermission(Permission.RUN_INFERENCE),
  ],
  handler: async (request, reply) => {
    // Handler logic
  },
});
```

### Attribute-Based Access Control (ABAC)

```typescript
// Policy-based authorization
interface Policy {
  effect: 'allow' | 'deny';
  actions: string[];
  resources: string[];
  conditions?: {
    [key: string]: any;
  };
}

// Example policies
const POLICIES: Policy[] = [
  {
    effect: 'allow',
    actions: ['results:view'],
    resources: ['samples:*'],
    conditions: {
      'user.role': ['operator', 'admin'],
    },
  },
  {
    effect: 'allow',
    actions: ['results:delete'],
    resources: ['samples:*'],
    conditions: {
      'user.role': 'admin',
      'resource.createdBy': '${user.id}', // Only own resources
    },
  },
  {
    effect: 'deny',
    actions: ['*'],
    resources: ['samples:*'],
    conditions: {
      'user.emailVerified': false,
    },
  },
];

// Policy evaluation
async function evaluatePolicy(
  user: User,
  action: string,
  resource: string,
  context: Record<string, any>
): Promise<boolean> {
  for (const policy of POLICIES) {
    // Check if action matches
    const actionMatches = policy.actions.includes(action) || 
                         policy.actions.includes('*');
    
    // Check if resource matches
    const resourceMatches = matchPattern(resource, policy.resources);
    
    if (!actionMatches || !resourceMatches) continue;
    
    // Evaluate conditions
    if (policy.conditions) {
      const conditionsMet = await evaluateConditions(
        policy.conditions,
        { user, resource: context }
      );
      
      if (!conditionsMet) continue;
    }
    
    // Return based on effect
    return policy.effect === 'allow';
  }
  
  // Default deny
  return false;
}
```

---

## Data Protection

### Encryption at Rest

```typescript
import { createCipheriv, createDecipheriv, randomBytes, scryptSync } from 'crypto';

// Encrypt sensitive data
export class EncryptionService {
  private algorithm = 'aes-256-gcm';
  private keyLength = 32;
  private ivLength = 16;
  private tagLength = 16;
  
  private getKey(): Buffer {
    const password = process.env.ENCRYPTION_KEY!;
    const salt = process.env.ENCRYPTION_SALT!;
    return scryptSync(password, salt, this.keyLength);
  }
  
  encrypt(plaintext: string): string {
    const key = this.getKey();
    const iv = randomBytes(this.ivLength);
    
    const cipher = createCipheriv(this.algorithm, key, iv);
    
    let encrypted = cipher.update(plaintext, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    
    const tag = cipher.getAuthTag();
    
    // Return: iv + tag + encrypted
    return iv.toString('hex') + tag.toString('hex') + encrypted;
  }
  
  decrypt(ciphertext: string): string {
    const key = this.getKey();
    
    // Extract iv, tag, and encrypted data
    const iv = Buffer.from(ciphertext.slice(0, this.ivLength * 2), 'hex');
    const tag = Buffer.from(ciphertext.slice(this.ivLength * 2, (this.ivLength + this.tagLength) * 2), 'hex');
    const encrypted = ciphertext.slice((this.ivLength + this.tagLength) * 2);
    
    const decipher = createDecipheriv(this.algorithm, key, iv);
    decipher.setAuthTag(tag);
    
    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    
    return decrypted;
  }
}

// Usage
const encryptionService = new EncryptionService();

// Encrypt sensitive user data
const encrypted = encryptionService.encrypt(user.mfaSecret);
await prisma.user.update({
  where: { id: user.id },
  data: { mfaSecret: encrypted },
});
```

### Data Masking

```typescript
// Mask sensitive data in logs
function maskSensitiveData(data: any): any {
  const sensitiveFields = ['password', 'token', 'secret', 'apiKey', 'mfaSecret'];
  
  if (typeof data !== 'object' || data === null) {
    return data;
  }
  
  const masked = { ...data };
  
  for (const [key, value] of Object.entries(masked)) {
    if (sensitiveFields.some(field => key.toLowerCase().includes(field))) {
      masked[key] = '***REDACTED***';
    } else if (typeof value === 'object') {
      masked[key] = maskSensitiveData(value);
    }
  }
  
  return masked;
}

// Use in logging
fastify.addHook('onRequest', (request, reply, done) => {
  request.log.info({
    method: request.method,
    url: request.url,
    body: maskSensitiveData(request.body),
    query: maskSensitiveData(request.query),
  });
  done();
});
```

### Personal Data Protection (GDPR)

```typescript
// Data anonymization
async function anonymizeUser(userId: string): Promise<void> {
  await prisma.user.update({
    where: { id: userId },
    data: {
      email: `deleted_${userId}@anonymized.local`,
      username: `deleted_${userId}`,
      firstName: null,
      lastName: null,
      password: await hashPassword(randomBytes(32).toString('hex')),
      mfaSecret: null,
      isActive: false,
      deletedAt: new Date(),
    },
  });
  
  // Anonymize audit logs
  await prisma.auditLog.updateMany({
    where: { userId },
    data: {
      details: { anonymized: true },
    },
  });
}

// Data export for GDPR compliance
async function exportUserData(userId: string): Promise<UserDataExport> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      roles: true,
      auditLogs: true,
    },
  });
  
  const predictions = await prisma.predictionRun.findMany({
    where: { createdBy: userId },
    include: {
      wellPredictions: true,
      imageFiles: true,
    },
  });
  
  return {
    user: {
      email: user.email,
      username: user.username,
      firstName: user.firstName,
      lastName: user.lastName,
      createdAt: user.createdAt,
    },
    predictions,
    auditLogs: user.auditLogs,
  };
}
```

---

## API Security

### Input Validation

```typescript
import { z } from 'zod';

// Comprehensive input validation
const predictRequestSchema = z.object({
  sample_no: z.string()
    .min(1, 'Sample number is required')
    .max(50, 'Sample number too long')
    .regex(/^[A-Z0-9_-]+$/i, 'Invalid characters in sample number'),
  
  submission_no: z.string()
    .max(50, 'Submission number too long')
    .regex(/^[A-Z0-9_-]*$/i, 'Invalid characters in submission number')
    .optional(),
  
  model_version: z.string()
    .regex(/^v\d+\.\d+\.\d+$/, 'Invalid version format')
    .optional(),
  
  confidence_threshold: z.number()
    .min(0, 'Confidence must be >= 0')
    .max(1, 'Confidence must be <= 1')
    .optional(),
  
  description: z.string()
    .max(500, 'Description too long')
    .optional(),
});

// Sanitization
function sanitizeInput(input: string): string {
  return input
    .trim()
    .replace(/[<>]/g, '') // Remove potential XSS vectors
    .substring(0, 1000);  // Limit length
}
```

### Rate Limiting

```typescript
import rateLimit from '@fastify/rate-limit';

// Service-level rate limiting
await fastify.register(rateLimit, {
  max: 100,                    // Max 100 requests
  timeWindow: '1 minute',      // Per minute
  cache: 10000,               // Cache size
  allowList: ['127.0.0.1'],   // Whitelist
  redis: redisClient,         // Distributed rate limiting
  
  // Custom key generator
  keyGenerator: (request) => {
    // Rate limit by user ID if authenticated
    if (request.user) {
      return `user:${request.user.id}`;
    }
    // Otherwise by IP
    return request.ip;
  },
  
  // Custom error response
  errorResponseBuilder: (request, context) => {
    return {
      success: false,
      error: {
        code: 'RATE_LIMIT_EXCEEDED',
        message: 'Too many requests, please try again later',
        retryAfter: context.after,
      },
    };
  },
});

// Endpoint-specific rate limiting
fastify.post('/api/v1/auth/login', {
  config: {
    rateLimit: {
      max: 5,
      timeWindow: '15 minutes',
    },
  },
  handler: async (request, reply) => {
    // Login logic
  },
});
```

### CORS Configuration

- จัดการที่ API gateway / reverse proxy เพื่อควบคุม origin เดียวกันทั้งหมด
- Backend service พึ่งพา gateway headers และไม่จำเป็นต้องลง `@fastify/cors` นอกจากกรณีทดสอบแบบ stand-alone

### Content Security Policy (CSP)

```typescript
import helmet from '@fastify/helmet';

// Security headers
await fastify.register(helmet, {
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", 'data:', 'https:'],
      connectSrc: ["'self'", 'https://api.microplate.com'],
      fontSrc: ["'self'"],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'"],
      frameSrc: ["'none'"],
    },
  },
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true,
  },
  frameguard: {
    action: 'deny',
  },
  noSniff: true,
  referrerPolicy: {
    policy: 'strict-origin-when-cross-origin',
  },
});
```

---

## Database Security

### SQL Injection Prevention

```typescript
// ✅ GOOD: Using Prisma (parameterized queries)
const samples = await prisma.sampleSummary.findMany({
  where: {
    sampleNo: {
      contains: searchTerm, // Prisma handles escaping
    },
  },
});

// ✅ GOOD: Using raw query with parameters
const result = await prisma.$queryRaw`
  SELECT * FROM microplates.sample_summary
  WHERE sample_no = ${sampleNo}
`;

// ❌ BAD: String interpolation (vulnerable to SQL injection)
const result = await prisma.$queryRawUnsafe(`
  SELECT * FROM microplates.sample_summary
  WHERE sample_no = '${sampleNo}'
`);
```

### Database Access Control

```sql
-- Create read-only user for reporting
CREATE USER microplate_readonly WITH PASSWORD 'strong-password';
GRANT CONNECT ON DATABASE microplates TO microplate_readonly;
GRANT USAGE ON SCHEMA microplates TO microplate_readonly;
GRANT SELECT ON ALL TABLES IN SCHEMA microplates TO microplate_readonly;

-- Create service user with limited permissions
CREATE USER microplate_service WITH PASSWORD 'strong-password';
GRANT CONNECT ON DATABASE microplates TO microplate_service;
GRANT USAGE ON SCHEMA microplates, auth TO microplate_service;
GRANT SELECT, INSERT, UPDATE ON ALL TABLES IN SCHEMA microplates TO microplate_service;
GRANT SELECT, INSERT, UPDATE ON ALL TABLES IN SCHEMA auth TO microplate_service;

-- Revoke dangerous permissions
REVOKE CREATE ON SCHEMA public FROM PUBLIC;
REVOKE ALL ON SCHEMA public FROM microplate_service;
```

### Row-Level Security (RLS)

```sql
-- Enable RLS on sensitive tables
ALTER TABLE auth.users ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only see their own data
CREATE POLICY user_isolation_policy ON auth.users
  FOR SELECT
  USING (id = current_setting('app.current_user_id')::uuid);

-- Policy: Admins can see all users
CREATE POLICY admin_all_access ON auth.users
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM auth.user_roles ur
      JOIN auth.roles r ON r.id = ur.role_id
      WHERE ur.user_id = current_setting('app.current_user_id')::uuid
        AND r.name = 'admin'
    )
  );
```

### Database Encryption

```bash
# Enable PostgreSQL SSL
# postgresql.conf
ssl = on
ssl_cert_file = 'server.crt'
ssl_key_file = 'server.key'
ssl_ca_file = 'root.crt'

# Connection string with SSL
DATABASE_URL="postgresql://user:pass@host:5432/db?sslmode=require"
```

---

## Network Security

### TLS/SSL Configuration

```nginx
# nginx.conf
server {
    listen 443 ssl http2;
    server_name api.microplate.com;

    # SSL certificates
    ssl_certificate /etc/nginx/ssl/cert.pem;
    ssl_certificate_key /etc/nginx/ssl/key.pem;

    # SSL configuration
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers 'ECDHE-RSA-AES128-GCM-SHA256:ECDHE-RSA-AES256-GCM-SHA384';
    ssl_prefer_server_ciphers on;
    ssl_session_cache shared:SSL:10m;
    ssl_session_timeout 10m;

    # OCSP stapling
    ssl_stapling on;
    ssl_stapling_verify on;

    # Security headers
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains; preload" always;
    add_header X-Frame-Options "DENY" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
}
```

### Network Isolation

```yaml
# docker-compose.yml
networks:
  frontend-network:
    driver: bridge
    internal: false  # Accessible from outside
  
  backend-network:
    driver: bridge
    internal: true   # Isolated backend network

services:
  frontend:
    networks:
      - frontend-network
  
  auth-service:
    networks:
      - frontend-network  # Accessible from frontend
      - backend-network   # Can access database
  
  postgres:
    networks:
      - backend-network   # Only accessible from backend
```

---

## Container Security

### Docker Best Practices

```dockerfile
# Use specific version, not 'latest'
FROM node:18.17.0-alpine AS builder

# Run as non-root user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001

# Copy only necessary files
COPY --chown=nodejs:nodejs package*.json ./
RUN npm ci --only=production

COPY --chown=nodejs:nodejs . .

# Build application
RUN npm run build

# Production image
FROM node:18.17.0-alpine

# Security updates
RUN apk upgrade --no-cache && \
    apk add --no-cache dumb-init

# Non-root user
USER nodejs

WORKDIR /app

# Copy from builder
COPY --from=builder --chown=nodejs:nodejs /app/dist ./dist
COPY --from=builder --chown=nodejs:nodejs /app/node_modules ./node_modules

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node healthcheck.js

# Use dumb-init to handle signals properly
ENTRYPOINT ["dumb-init", "--"]
CMD ["node", "dist/server.js"]
```

### Image Scanning

```bash
# Scan images for vulnerabilities
docker scan microplate-ai/auth-service:latest

# Use Trivy for comprehensive scanning
trivy image microplate-ai/auth-service:latest

# Fail build if high/critical vulnerabilities found
trivy image --severity HIGH,CRITICAL --exit-code 1 microplate-ai/auth-service:latest
```

---

## Secret Management

### Environment Variables

```bash
# ❌ BAD: Hardcoded secrets
JWT_SECRET="my-secret-key"

# ✅ GOOD: Generate strong secrets
JWT_SECRET=$(openssl rand -base64 32)
DATABASE_PASSWORD=$(openssl rand -base64 32)
ENCRYPTION_KEY=$(openssl rand -hex 32)
```

### Vault Integration (Optional)

```typescript
import Vault from 'node-vault';

// Initialize Vault client
const vault = Vault({
  endpoint: process.env.VAULT_ADDR,
  token: process.env.VAULT_TOKEN,
});

// Retrieve secrets
async function getSecrets(): Promise<Secrets> {
  const { data } = await vault.read('secret/data/microplate');
  
  return {
    jwtSecret: data.data.JWT_SECRET,
    databasePassword: data.data.DATABASE_PASSWORD,
    encryptionKey: data.data.ENCRYPTION_KEY,
  };
}
```

### Docker Secrets

```yaml
# docker-compose.yml
version: '3.8'

secrets:
  jwt_secret:
    file: ./secrets/jwt_secret.txt
  db_password:
    file: ./secrets/db_password.txt

services:
  auth-service:
    secrets:
      - jwt_secret
      - db_password
    environment:
      - JWT_SECRET_FILE=/run/secrets/jwt_secret
      - DB_PASSWORD_FILE=/run/secrets/db_password
```

---

## Logging & Monitoring

### Secure Logging

```typescript
// Structured logging with sensitive data masking
const logger = pino({
  level: process.env.LOG_LEVEL || 'info',
  redact: {
    paths: [
      'req.headers.authorization',
      'req.headers.cookie',
      '*.password',
      '*.token',
      '*.secret',
      '*.apiKey',
    ],
    remove: true,
  },
  serializers: {
    req: (req) => ({
      method: req.method,
      url: req.url,
      headers: {
        host: req.headers.host,
        userAgent: req.headers['user-agent'],
        // Don't log authorization header
      },
      remoteAddress: req.ip,
      requestId: req.id,
    }),
  },
});
```

### Audit Logging

```typescript
// Comprehensive audit logging
async function logAuditEvent(event: AuditEvent): Promise<void> {
  await prisma.auditLog.create({
    data: {
      userId: event.userId,
      action: event.action,
      resource: event.resource,
      resourceId: event.resourceId,
      details: event.details,
      ipAddress: event.ipAddress,
      userAgent: event.userAgent,
      timestamp: new Date(),
    },
  });
  
  // Also log to external SIEM if configured
  if (process.env.SIEM_ENDPOINT) {
    await sendToSIEM(event);
  }
}

// Usage
await logAuditEvent({
  userId: user.id,
  action: 'DELETE_RUN',
  resource: 'prediction_run',
  resourceId: runId.toString(),
  details: { sampleNo, reason },
  ipAddress: request.ip,
  userAgent: request.headers['user-agent'],
});
```

### Security Monitoring

```typescript
// Detect suspicious activities
async function detectAnomalies(user: User): Promise<Alert[]> {
  const alerts: Alert[] = [];
  
  // Check for multiple failed login attempts
  const failedLogins = await prisma.auditLog.count({
    where: {
      userId: user.id,
      action: 'LOGIN_FAILED',
      createdAt: { gte: new Date(Date.now() - 15 * 60 * 1000) },
    },
  });
  
  if (failedLogins >= 5) {
    alerts.push({
      severity: 'HIGH',
      type: 'BRUTE_FORCE_ATTEMPT',
      userId: user.id,
      message: `${failedLogins} failed login attempts in 15 minutes`,
    });
  }
  
  // Check for unusual access patterns
  const recentActions = await prisma.auditLog.findMany({
    where: {
      userId: user.id,
      createdAt: { gte: new Date(Date.now() - 60 * 60 * 1000) },
    },
    select: { ipAddress: true },
  });
  
  const uniqueIPs = new Set(recentActions.map(a => a.ipAddress));
  if (uniqueIPs.size > 5) {
    alerts.push({
      severity: 'MEDIUM',
      type: 'MULTIPLE_LOCATIONS',
      userId: user.id,
      message: `Access from ${uniqueIPs.size} different IPs in 1 hour`,
    });
  }
  
  return alerts;
}
```

---

## Incident Response

### Incident Response Plan

```typescript
// Automated incident response
class IncidentResponder {
  async handleSecurityIncident(incident: SecurityIncident): Promise<void> {
    // 1. Log incident
    await this.logIncident(incident);
    
    // 2. Notify security team
    await this.notifySecurityTeam(incident);
    
    // 3. Take immediate action
    switch (incident.type) {
      case 'BRUTE_FORCE_ATTEMPT':
        await this.lockAccount(incident.userId);
        await this.blockIP(incident.ipAddress);
        break;
      
      case 'SQL_INJECTION_ATTEMPT':
        await this.blockIP(incident.ipAddress);
        await this.alertDevelopers(incident);
        break;
      
      case 'TOKEN_REUSE_DETECTED':
        await this.revokeAllUserTokens(incident.userId);
        await this.forceRelogin(incident.userId);
        break;
    }
    
    // 4. Generate incident report
    await this.generateIncidentReport(incident);
  }
  
  private async lockAccount(userId: string): Promise<void> {
    await prisma.user.update({
      where: { id: userId },
      data: {
        isActive: false,
        lockedAt: new Date(),
        lockReason: 'Security incident',
      },
    });
  }
  
  private async blockIP(ipAddress: string): Promise<void> {
    await redis.sadd('blocked_ips', ipAddress);
    await redis.expire('blocked_ips', 86400); // 24 hours
  }
}
```

---

## Compliance

### GDPR Compliance

```typescript
// Right to access
async function exportPersonalData(userId: string): Promise<PersonalDataExport> {
  return {
    personalInfo: await getUserPersonalInfo(userId),
    predictions: await getUserPredictions(userId),
    auditLogs: await getUserAuditLogs(userId),
    exportedAt: new Date(),
  };
}

// Right to be forgotten
async function deletePersonalData(userId: string): Promise<void> {
  // 1. Anonymize user data
  await anonymizeUser(userId);
  
  // 2. Delete or anonymize related data
  await anonymizeAuditLogs(userId);
  
  // 3. Log deletion
  await logDataDeletion(userId);
}

// Data retention policy
async function enforceRetentionPolicy(): Promise<void> {
  const retentionDays = 90;
  const cutoffDate = new Date(Date.now() - retentionDays * 24 * 60 * 60 * 1000);
  
  // Delete old audit logs
  await prisma.auditLog.deleteMany({
    where: { createdAt: { lt: cutoffDate } },
  });
  
  // Delete old refresh tokens
  await prisma.refreshToken.deleteMany({
    where: { expiresAt: { lt: new Date() } },
  });
}
```

---

## Security Checklist

### Development

- [ ] All secrets stored in environment variables
- [ ] Input validation on all endpoints
- [ ] Output encoding to prevent XSS
- [ ] Parameterized queries (no SQL injection)
- [ ] Authentication required for sensitive endpoints
- [ ] Authorization checks implemented
- [ ] Rate limiting configured
- [ ] CORS properly configured
- [ ] Security headers added
- [ ] Sensitive data masked in logs

### Testing

- [ ] Security tests written
- [ ] Penetration testing performed
- [ ] Dependency vulnerability scanning
- [ ] Container image scanning
- [ ] OWASP Top 10 tested

### Deployment

- [ ] TLS/SSL configured
- [ ] Strong secrets generated
- [ ] Firewall rules configured
- [ ] Database access restricted
- [ ] Non-root containers
- [ ] Security monitoring enabled
- [ ] Backup encryption enabled
- [ ] Incident response plan documented

### Operations

- [ ] Security patches applied regularly
- [ ] Audit logs reviewed
- [ ] Access reviews conducted
- [ ] Security training provided
- [ ] Incident response drills performed

---

## Conclusion

Security is an ongoing process, not a one-time task. This document provides comprehensive guidelines for securing the Microplate AI System. Regular security audits, updates, and training are essential to maintain a secure system.

**Remember:**
- **Defense in depth** - Multiple layers of security
- **Principle of least privilege** - Minimal necessary access
- **Fail securely** - Secure defaults and error handling
- **Keep it simple** - Complex systems have more vulnerabilities
- **Stay updated** - Regular patching and updates

