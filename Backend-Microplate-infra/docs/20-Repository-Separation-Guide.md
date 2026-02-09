# Repository Separation Guide

## Overview
This document outlines the strategy for separating the Microplate AI System monorepo into three separate repositories:
1. `microplate-fe` - Frontend application
2. `microplate-be` - Backend services
3. `microplate-device` - Device services

## Current Structure
```
MICROPLATE-AI-System/
├── microplate-fe/          # Frontend React application
├── microplate-be/          # Backend services (Node.js)
│   ├── services/
│   │   ├── auth-service/
│   │   ├── image-ingesion-service/
│   │   ├── result-api-service/
│   │   ├── prediction-db-service/
│   │   ├── labware-interface-service/
│   │   └── vision-inference-service/
│   └── shared/             # Shared utilities
└── microplate-device/      # Device services (Python)
    └── vision-capture-service/
```

## Target Structure

### Repository 1: microplate-fe
```
microplate-fe/
├── src/
├── public/
├── package.json
├── webpack.config.js
├── tsconfig.json
├── .github/workflows/
└── README.md
```

### Repository 2: microplate-be
```
microplate-be/
├── services/
│   ├── auth-service/
│   ├── image-ingesion-service/
│   ├── result-api-service/
│   ├── prediction-db-service/
│   ├── labware-interface-service/
│   └── vision-inference-service/
├── shared/
├── docker-compose.yml
├── .github/workflows/
└── README.md
```

### Repository 3: microplate-device
```
microplate-device/
├── vision-capture-service/
├── .github/workflows/
└── README.md
```

## Dependencies Between Repositories

### Frontend → Backend
- API endpoints for all services
- WebSocket connections
- Authentication tokens

### Backend Services Interdependencies
- Auth service provides JWT tokens
- Services share database schemas
- Services communicate via HTTP/REST

### Device → Backend
- Vision capture service → Vision inference service
- Device service → Image ingestion service

## Shared Code to Extract

### 1. Authentication Middleware
- **Location**: `microplate-be/shared/auth-middleware.ts`
- **Action**: Extract to npm package or copy to each service
- **Dependencies**: `jsonwebtoken`, `express`

### 2. Logger Utility
- **Location**: `microplate-be/shared/logger.ts`
- **Action**: Extract to npm package `@microplate/logger`
- **Dependencies**: `winston`

### 3. API Contracts
- **Location**: Documentation in `docs/15-API-Reference.md`
- **Action**: Maintain as OpenAPI/Swagger specs
- **Versioning**: Use semantic versioning for API changes

## Migration Steps

### Phase 1: Preparation
1. ✅ Document all dependencies
2. ✅ Extract shared utilities to packages
3. ✅ Ensure all services have independent configs
4. ✅ Update CI/CD pipelines for each repository

### Phase 2: Repository Creation
1. Create three new GitHub repositories:
   - `microplate-fe`
   - `microplate-be`
   - `microplate-device`

2. Initialize each repository with:
   - README.md
   - .gitignore
   - LICENSE
   - GitHub Actions workflows

### Phase 3: Code Migration
1. Copy frontend code to `microplate-fe`
2. Copy backend code to `microplate-be`
3. Copy device code to `microplate-device`
4. Update import paths in each repository
5. Update package.json files
6. Remove cross-repository dependencies

### Phase 4: Dependency Management
1. Create npm packages for shared utilities:
   - `@microplate/auth-middleware`
   - `@microplate/logger`
   - `@microplate/types`

2. Publish packages to npm registry (private or public)

3. Update each repository to use published packages:
   ```json
   {
     "dependencies": {
       "@microplate/auth-middleware": "^1.0.0",
       "@microplate/logger": "^1.0.0"
     }
   }
   ```

### Phase 5: CI/CD Updates
1. Update GitHub Actions workflows for each repository
2. Configure environment-specific deployments
3. Set up cross-repository dependencies in CI/CD

### Phase 6: Documentation
1. Update README files for each repository
2. Document API contracts
3. Create deployment guides
4. Update architecture diagrams

## API Contracts

### Authentication Service API
- Base URL: `http://localhost:6401`
- Endpoints documented in: `docs/15-API-Reference.md`

### Image Ingestion Service API
- Base URL: `http://localhost:6402`
- Endpoints: Image upload, signed URL generation

### Result API Service
- Base URL: `http://localhost:6404`
- Endpoints: Sample queries, run details, statistics

### Labware Interface Service
- Base URL: `http://localhost:6405`
- Endpoints: CSV generation, file management

## Shared Database Schemas

### Prisma Schemas
Each service maintains its own Prisma schema:
- `auth-service/prisma/schema.prisma`
- `image-ingesion-service/prisma/schema.prisma`
- `result-api-service/prisma/schema.prisma`
- `prediction-db-service/prisma/schema.prisma`
- `labware-interface-service/prisma/schema.prisma`

### Migration Strategy
- Keep schemas synchronized via version control
- Use database migrations for schema changes
- Document schema dependencies

## Communication Protocols

### Service-to-Service Communication
- HTTP/REST for synchronous calls
- JWT tokens for authentication
- Service discovery via environment variables

### Frontend-to-Backend Communication
- REST API calls
- WebSocket for real-time updates
- JWT tokens stored in localStorage

## Testing Strategy

### Frontend Repository
- Unit tests for components
- Integration tests for API calls
- E2E tests with WebdriverIO

### Backend Repository
- Unit tests for each service
- Integration tests for service interactions
- API contract tests

### Device Repository
- Unit tests for Python services
- Integration tests for device communication

## Deployment Considerations

### Independent Deployment
- Each repository can be deployed independently
- Version tags for releases
- Environment-specific configurations

### Dependency Management
- Use semantic versioning
- Pin dependency versions
- Regular dependency updates

## Rollback Plan
If separation causes issues:
1. Maintain monorepo as backup
2. Keep shared code synchronized
3. Document any breaking changes
4. Gradual migration approach

## Checklist

- [ ] Extract shared utilities to npm packages
- [ ] Update all import paths
- [ ] Create three separate repositories
- [ ] Migrate code to respective repositories
- [ ] Update CI/CD pipelines
- [ ] Update documentation
- [ ] Test all services independently
- [ ] Verify API contracts
- [ ] Update deployment scripts
- [ ] Train team on new structure

