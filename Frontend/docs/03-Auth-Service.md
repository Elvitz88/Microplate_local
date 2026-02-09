# Auth Service - Complete Specification

## Overview

The Auth Service handles all authentication and authorization for the Microplate AI System. It provides JWT-based authentication with refresh token rotation, role-based access control, and comprehensive security features.

## Technology Stack

- **Runtime**: Node.js 18+
- **Framework**: Fastify 4.x
- **Language**: TypeScript
- **ORM**: Prisma 5.x
- **Database**: PostgreSQL 17
- **Authentication**: JWT (jsonwebtoken)
- **Password Hashing**: Argon2id (argon2)
- **Email**: Nodemailer with SMTP/SendGrid
- **Validation**: Zod
- **Documentation**: OpenAPI 3.0

## Service Architecture

```typescript
// Project structure
auth-service/
├── src/
│   ├── config/
│   │   ├── database.ts
│   │   ├── jwt.ts
│   │   └── email.ts
│   ├── controllers/
│   │   ├── auth.controller.ts
│   │   ├── user.controller.ts
│   │   └── admin.controller.ts
│   ├── services/
│   │   ├── auth.service.ts
│   │   ├── user.service.ts
│   │   ├── email.service.ts
│   │   └── audit.service.ts
│   ├── middleware/
│   │   ├── auth.middleware.ts
│   │   ├── validation.middleware.ts
│   │   └── rate-limit.middleware.ts
│   ├── routes/
│   │   ├── auth.routes.ts
│   │   ├── user.routes.ts
│   │   └── admin.routes.ts
│   ├── schemas/
│   │   ├── auth.schemas.ts
│   │   └── user.schemas.ts
│   ├── utils/
│   │   ├── password.util.ts
│   │   ├── token.util.ts
│   │   └── validation.util.ts
│   ├── types/
│   │   └── auth.types.ts
│   └── app.ts
├── prisma/
│   ├── schema.prisma
│   └── migrations/
├── tests/
├── package.json
├── tsconfig.json
└── .env.example
```

## API Endpoints

### Authentication Endpoints

#### POST /api/v1/auth/register
Register a new user account.

**Request Body:**
```json
{
  "email": "user@example.com",
  "username": "johndoe",
  "password": "SecurePass123!",
  "firstName": "John",
  "lastName": "Doe"
}
```

**Response:**
```json
{
  "success": true,
  "message": "User registered successfully. Please check your email for verification.",
  "data": {
    "userId": "uuid",
    "email": "user@example.com",
    "username": "johndoe",
    "emailVerified": false
  }
}
```

#### POST /api/v1/auth/login
Authenticate user and return JWT tokens.

**Request Body:**
```json
{
  "username": "johndoe", // or email
  "password": "SecurePass123!"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "expiresIn": 900, // 15 minutes
    "tokenType": "Bearer",
    "user": {
      "id": "uuid",
      "email": "user@example.com",
      "username": "johndoe",
      "firstName": "John",
      "lastName": "Doe",
      "roles": ["operator"],
      "emailVerified": true
    }
  }
}
```

#### POST /api/v1/auth/refresh
Refresh access token using refresh token.

**Request Body:**
```json
{
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "expiresIn": 900,
    "tokenType": "Bearer"
  }
}
```

#### POST /api/v1/auth/logout
Logout user and revoke refresh token.

**Request Body:**
```json
{
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**Response:**
```json
{
  "success": true,
  "message": "Logged out successfully"
}
```

#### POST /api/v1/auth/forgot-password
Request password reset.

**Request Body:**
```json
{
  "email": "user@example.com"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Password reset email sent if account exists"
}
```

#### POST /api/v1/auth/reset-password
Reset password using token.

**Request Body:**
```json
{
  "token": "reset-token",
  "newPassword": "NewSecurePass123!"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Password reset successfully"
}
```

#### POST /api/v1/auth/verify-email
Verify email address.

**Request Body:**
```json
{
  "token": "verification-token"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Email verified successfully"
}
```

### User Management Endpoints

#### GET /api/v1/auth/me
Get current user profile.

**Headers:**
```
Authorization: Bearer <access-token>
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "email": "user@example.com",
    "username": "johndoe",
    "firstName": "John",
    "lastName": "Doe",
    "roles": ["operator"],
    "emailVerified": true,
    "lastLoginAt": "2024-01-15T10:30:00Z",
    "createdAt": "2024-01-01T00:00:00Z"
  }
}
```

#### PUT /api/v1/auth/me
Update user profile.

**Headers:**
```
Authorization: Bearer <access-token>
```

**Request Body:**
```json
{
  "firstName": "John",
  "lastName": "Doe"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Profile updated successfully",
  "data": {
    "id": "uuid",
    "email": "user@example.com",
    "username": "johndoe",
    "firstName": "John",
    "lastName": "Doe",
    "updatedAt": "2024-01-15T10:30:00Z"
  }
}
```

#### POST /api/v1/auth/change-password
Change user password.

**Headers:**
```
Authorization: Bearer <access-token>
```

**Request Body:**
```json
{
  "currentPassword": "CurrentPass123!",
  "newPassword": "NewSecurePass123!"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Password changed successfully"
}
```

### Admin Endpoints

#### GET /api/v1/auth/users
Get all users (admin only).

**Headers:**
```
Authorization: Bearer <access-token>
```

**Query Parameters:**
- `page`: Page number (default: 1)
- `limit`: Items per page (default: 10)
- `search`: Search term
- `role`: Filter by role
- `isActive`: Filter by active status

**Response:**
```json
{
  "success": true,
  "data": {
    "users": [
      {
        "id": "uuid",
        "email": "user@example.com",
        "username": "johndoe",
        "firstName": "John",
        "lastName": "Doe",
        "roles": ["operator"],
        "isActive": true,
        "emailVerified": true,
        "lastLoginAt": "2024-01-15T10:30:00Z",
        "createdAt": "2024-01-01T00:00:00Z"
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 10,
      "total": 1,
      "totalPages": 1
    }
  }
}
```

#### PUT /api/v1/auth/users/:id/roles
Assign roles to user (admin only).

**Headers:**
```
Authorization: Bearer <access-token>
```

**Request Body:**
```json
{
  "roleIds": [1, 2]
}
```

**Response:**
```json
{
  "success": true,
  "message": "User roles updated successfully"
}
```

#### PUT /api/v1/auth/users/:id/status
Update user status (admin only).

**Headers:**
```
Authorization: Bearer <access-token>
```

**Request Body:**
```json
{
  "isActive": false
}
```

**Response:**
```json
{
  "success": true,
  "message": "User status updated successfully"
}
```

## Security Features

### Password Policy
- Minimum 8 characters
- At least one uppercase letter
- At least one lowercase letter
- At least one number
- At least one special character
- No common passwords

### JWT Configuration
```typescript
// JWT settings
const JWT_CONFIG = {
  accessToken: {
    secret: process.env.JWT_ACCESS_SECRET,
    expiresIn: '15m',
    algorithm: 'HS256'
  },
  refreshToken: {
    secret: process.env.JWT_REFRESH_SECRET,
    expiresIn: '7d',
    algorithm: 'HS256'
  }
};
```

### Token Rotation
- Refresh tokens are rotated on each use
- Old refresh tokens are invalidated
- Token family tracking prevents token reuse attacks
- Automatic cleanup of expired tokens

### Rate Limiting
```typescript
// Rate limiting configuration
const RATE_LIMITS = {
  login: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 5, // 5 attempts per window
    skipSuccessfulRequests: true
  },
  register: {
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 3 // 3 registrations per hour
  },
  forgotPassword: {
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 3 // 3 requests per hour
  }
};
```

## Implementation Details

### Password Hashing
```typescript
import argon2 from 'argon2';

export class PasswordUtil {
  static async hash(password: string): Promise<string> {
    return argon2.hash(password, {
      type: argon2.argon2id,
      memoryCost: 2 ** 16, // 64 MB
      timeCost: 3,
      parallelism: 1
    });
  }

  static async verify(hash: string, password: string): Promise<boolean> {
    return argon2.verify(hash, password);
  }
}
```

### JWT Token Management
```typescript
import jwt from 'jsonwebtoken';

export class TokenUtil {
  static generateAccessToken(payload: TokenPayload): string {
    return jwt.sign(payload, process.env.JWT_ACCESS_SECRET!, {
      expiresIn: '15m',
      algorithm: 'HS256'
    });
  }

  static generateRefreshToken(payload: TokenPayload): string {
    return jwt.sign(payload, process.env.JWT_REFRESH_SECRET!, {
      expiresIn: '7d',
      algorithm: 'HS256'
    });
  }

  static verifyAccessToken(token: string): TokenPayload {
    return jwt.verify(token, process.env.JWT_ACCESS_SECRET!) as TokenPayload;
  }

  static verifyRefreshToken(token: string): TokenPayload {
    return jwt.verify(token, process.env.JWT_REFRESH_SECRET!) as TokenPayload;
  }
}
```

### Email Service
```typescript
export class EmailService {
  async sendVerificationEmail(user: User, token: string): Promise<void> {
    const verificationUrl = `${process.env.FRONTEND_URL}/verify-email?token=${token}`;
    
    await this.sendEmail({
      to: user.email,
      subject: 'Verify Your Email Address',
      template: 'email-verification',
      data: {
        name: user.firstName || user.username,
        verificationUrl
      }
    });
  }

  async sendPasswordResetEmail(user: User, token: string): Promise<void> {
    const resetUrl = `${process.env.FRONTEND_URL}/reset-password?token=${token}`;
    
    await this.sendEmail({
      to: user.email,
      subject: 'Reset Your Password',
      template: 'password-reset',
      data: {
        name: user.firstName || user.username,
        resetUrl,
        expiresIn: '30 minutes'
      }
    });
  }
}
```

## Environment Configuration

```bash
# Database
DATABASE_URL="postgresql://postgres:password@localhost:5432/microplates"

# JWT Secrets
JWT_ACCESS_SECRET="your-super-secret-access-key"
JWT_REFRESH_SECRET="your-super-secret-refresh-key"

# Email Configuration
SMTP_HOST="smtp.gmail.com"
SMTP_PORT=587
SMTP_USER="your-email@gmail.com"
SMTP_PASS="your-app-password"
SMTP_FROM="Microplate AI <noreply@microplate-ai.com>"

# Application
NODE_ENV="development"
PORT=6401
FRONTEND_URL="http://localhost:3000"
API_BASE_URL="http://localhost:6400"

# Security
BCRYPT_ROUNDS=12
TOKEN_EXPIRY_ACCESS="15m"
TOKEN_EXPIRY_REFRESH="7d"
PASSWORD_RESET_EXPIRY="30m"
EMAIL_VERIFICATION_EXPIRY="24h"

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
```

## Error Handling

### Error Response Format
```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid input data",
    "details": [
      {
        "field": "email",
        "message": "Invalid email format"
      }
    ],
    "requestId": "uuid",
    "timestamp": "2024-01-15T10:30:00Z"
  }
}
```

### Common Error Codes
- `VALIDATION_ERROR`: Input validation failed
- `AUTHENTICATION_ERROR`: Invalid credentials
- `AUTHORIZATION_ERROR`: Insufficient permissions
- `TOKEN_EXPIRED`: JWT token expired
- `TOKEN_INVALID`: Invalid JWT token
- `USER_NOT_FOUND`: User does not exist
- `EMAIL_ALREADY_EXISTS`: Email already registered
- `USERNAME_ALREADY_EXISTS`: Username already taken
- `RATE_LIMIT_EXCEEDED`: Too many requests
- `INTERNAL_ERROR`: Server error

## Testing Strategy

### Unit Tests
- Password hashing and verification
- JWT token generation and validation
- Email service functionality
- Input validation

### Integration Tests
- Authentication flows
- User registration and verification
- Password reset flow
- Role management

### Security Tests
- SQL injection prevention
- XSS protection
- CSRF protection
- Rate limiting effectiveness

## Monitoring and Logging

### Audit Logging
All authentication events are logged:
- Login attempts (success/failure)
- Password changes
- Role assignments
- Account status changes
- Token refresh events

### Health Checks
- `/healthz`: Basic health check
- `/readyz`: Readiness check (database connectivity)
- `/metrics`: Prometheus metrics

### Metrics
- Authentication success/failure rates
- Token refresh frequency
- User registration rate
- Password reset requests
- Active user sessions
