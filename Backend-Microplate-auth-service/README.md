# Auth Service

Authentication and Authorization Service for Microplate AI System.

## ✅ Status: WORKING & TESTED

This service is **fully functional** and has been tested with all endpoints working correctly.

## Features

- ✅ User registration and login
- ✅ JWT access and refresh tokens with rotation
- ✅ Password reset (email verification disabled)
- ✅ Role-based access control (RBAC)
- ✅ Comprehensive audit logging
- ✅ Rate limiting (100 req/15min)
- ✅ Email notifications (password reset only)
- ✅ Swagger API documentation
- ✅ Health checks and monitoring
- ✅ Standalone service (no shared dependencies)

## Quick Start

### Prerequisites
- Node.js 20+ (tested with 22.13.1)
- PostgreSQL 15+ (tested with 15-alpine)
- Yarn 1.22+

### Installation

#### For Local Development
```bash
# Navigate to auth-service directory
cd microplate-be/services/auth-service

# Install dependencies
yarn install

# Copy environment file for local development
cp env.example .env

# Update .env with your configuration
# Note: Use localhost:35432 for database in local development
```

#### For Docker Compose
```bash
# Navigate to microplate-be directory
cd microplate-be

# Copy main environment file
cp env.example .env

# Update .env with your configuration
# Note: Use postgres:5432 for database in Docker
```

### Database Setup

```bash
# Generate Prisma client
yarn prisma:generate

# Run migrations
yarn prisma:migrate

# Seed database with default data
yarn prisma:seed
```

### Development

```bash
# Start development server
yarn dev

# Server will start on http://localhost:6401
# API docs available at http://localhost:6401/docs

# Run tests
yarn test

# Run linting
yarn lint

# Format code
yarn format

# Type checking
yarn type-check
```

## API Endpoints

### Authentication (All Tested ✅)

- `POST /api/v1/auth/register` - Register new user
- `POST /api/v1/auth/login` - Login user  
- `POST /api/v1/auth/refresh` - Refresh access token
- `POST /api/v1/auth/logout` - Logout user
- `POST /api/v1/auth/forgot-password` - Request password reset
- `POST /api/v1/auth/reset-password` - Reset password
- `POST /api/v1/auth/verify-email` - Verify email address (disabled - auto-verified)

### Azure AD SSO (Optional)

- `GET /api/v1/auth/sso/aad` - Start Azure AD login (redirects to Microsoft)
- `GET /api/v1/auth/sso/aad/redirect` - Azure AD callback (redirects to frontend with exchange code)
- `POST /api/v1/auth/sso/exchange` - Exchange SSO code for Microplate JWT tokens

### Health Checks

- `GET /healthz` - Basic health check
- `GET /readyz` - Readiness check  
- `GET /metrics` - Service metrics

### Documentation

- `GET /docs` - Swagger UI documentation

## API Testing Examples

### Register User
```bash
curl -X POST http://localhost:6401/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "username": "testuser",
    "password": "Test123!",
    "firstName": "Test",
    "lastName": "User"
  }'
```

### Login
```bash
curl -X POST http://localhost:6401/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "username": "testuser",
    "password": "Test123!"
  }'
```

### Refresh Token
```bash
curl -X POST http://localhost:6401/api/v1/auth/refresh \
  -H "Content-Type: application/json" \
  -d '{
    "refreshToken": "YOUR_REFRESH_TOKEN"
  }'
```

### Logout
```bash
curl -X POST http://localhost:6401/api/v1/auth/logout \
  -H "Content-Type: application/json" \
  -d '{
    "refreshToken": "YOUR_REFRESH_TOKEN"
  }'
```

### Forgot Password
```bash
curl -X POST http://localhost:6401/api/v1/auth/forgot-password \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com"
  }'
```

## Environment Variables

```env
# Database
DATABASE_URL="postgresql://postgres:microplate123@localhost:5432/microplates"

# JWT Secrets (CHANGE IN PRODUCTION!)
JWT_ACCESS_SECRET="your-super-secret-access-key-change-in-production"
JWT_REFRESH_SECRET="your-super-secret-refresh-key-change-in-production"

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
# Email verification disabled

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100

# CORS
CORS_ORIGIN="http://localhost:3000"
CORS_CREDENTIALS=true

# Logging
LOG_LEVEL="info"
LOG_FORMAT="pretty"
```

## Technology Stack

- **Runtime**: Node.js 20+
- **Framework**: Fastify 5.x
- **Database**: PostgreSQL 15+ with Prisma ORM
- **Authentication**: JWT with @fastify/jwt
- **Password Hashing**: Argon2
- **Validation**: JSON Schema (Fastify v5 compatible)
- **Documentation**: Swagger UI
- **Logging**: Pino
- **TypeScript**: Full type safety

## Default Users

After running the seed script, you'll have these default users:

- **Admin**: `admin@microplate-ai.com` / `Admin123!`
- **Operator**: `john.doe@microplate-ai.com` / `Test123!`
- **User**: `jane.smith@microplate-ai.com` / `Test123!`
- **Lab Tech**: `lab.tech@microplate-ai.com` / `Test123!`

## Security Features

### Password Policy
- Minimum 8 characters
- At least one uppercase letter
- At least one lowercase letter
- At least one number
- At least one special character
- No common passwords

### Token Security
- JWT access tokens (15 minutes expiry)
- JWT refresh tokens (7 days expiry)
- Token rotation on refresh
- Token family tracking
- Automatic token revocation on password change

### Rate Limiting
- 100 requests per 15 minutes per IP
- Configurable limits per endpoint

### Audit Logging
- All authentication events logged
- User actions tracked
- IP address and user agent recorded
- Configurable retention period

## Database Schema

The service uses PostgreSQL with the following main tables:

- `auth.users` - User accounts
- `auth.roles` - User roles and permissions
- `auth.user_roles` - User-role assignments
- `auth.refresh_tokens` - Refresh token storage
- `auth.password_reset_tokens` - Password reset tokens
- `auth.email_verification_tokens` - Email verification tokens
- `auth.audit_logs` - Audit trail

## Testing

```bash
# Run all tests
yarn test

# Run tests with coverage
yarn test:coverage

# Run tests in watch mode
yarn test:watch
```

## Docker Deployment

### Build and Run

```bash
# Build image
docker build -t auth-service:latest .

# Run with environment variables
docker run -d \
  --name auth-service \
  -p 6401:6401 \
  -e DATABASE_URL="postgresql://postgres:password@host.docker.internal:5432/microplates" \
  -e JWT_ACCESS_SECRET="your-production-secret" \
  -e JWT_REFRESH_SECRET="your-production-refresh-secret" \
  -e NODE_ENV=production \
  auth-service:latest

# Or run with .env file
docker run -d --name auth-service -p 6401:6401 --env-file .env auth-service:latest
```

### Docker Compose (Standalone)

```bash
# Run with PostgreSQL
docker-compose up -d

# View logs
docker-compose logs -f auth-service

# Stop services
docker-compose down
```

## Production Checklist

- [ ] Set strong JWT secrets (32+ characters)
- [ ] Configure production database URL
- [ ] Set up SMTP for password reset emails
- [ ] Enable HTTPS/TLS
- [ ] Configure CORS origins for production domains
- [ ] Set up monitoring and alerting
- [ ] Configure log aggregation
- [ ] Set up database backups
- [ ] Configure rate limiting for production load
- [ ] Set up health check monitoring

## Monitoring

### Health Checks
- `/healthz` - Basic health status
- `/readyz` - Readiness with database check
- `/metrics` - Service metrics and statistics

### Logging
- Structured JSON logs
- Request/response logging
- Error tracking
- Performance metrics

## Troubleshooting

### Common Issues

1. **Database Connection**: Check DATABASE_URL and PostgreSQL status
2. **JWT Errors**: Verify JWT secrets are set correctly
3. **Email Issues**: Check SMTP configuration
4. **Rate Limiting**: Adjust limits in configuration
5. **Fastify Plugin Errors**: Ensure all plugins are compatible with Fastify 5.x

### Debug Mode

Set `LOG_LEVEL=debug` for detailed logging.

### Service Status

```bash
# Check if service is running
curl http://localhost:6401/healthz

# View service logs
docker logs auth-service

# Check database connection
yarn prisma:studio
```

## Recent Updates

- ✅ **Fixed Fastify 5.x compatibility** - Updated all plugins to v5 compatible versions
- ✅ **Fixed TypeScript errors** - Resolved exactOptionalPropertyTypes issues
- ✅ **Updated validation schemas** - Migrated from Zod to JSON Schema for Fastify v5
- ✅ **Added JWT binding** - Fixed token generation by binding Fastify instance
- ✅ **Tested all endpoints** - All authentication flows working correctly
- ✅ **Made service standalone** - No shared dependencies, fully self-contained

## Contributing

1. Follow the coding standards
2. Write tests for new features
3. Update documentation
4. Use conventional commit messages
5. Test with Fastify 5.x compatibility

## License

This project is proprietary and confidential.
