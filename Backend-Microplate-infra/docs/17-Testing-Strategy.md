# Testing Strategy

## Overview

This document outlines the comprehensive testing strategy for the Microplate AI System, covering unit tests, integration tests, end-to-end tests, and performance testing across all services.

---

## Table of Contents

1. [Testing Pyramid](#testing-pyramid)
2. [Unit Testing](#unit-testing)
3. [Integration Testing](#integration-testing)
4. [End-to-End Testing](#end-to-end-testing)
5. [API Contract Testing](#api-contract-testing)
6. [Performance Testing](#performance-testing)
7. [Security Testing](#security-testing)
8. [Test Data Management](#test-data-management)
9. [Continuous Integration](#continuous-integration)
10. [Test Coverage Goals](#test-coverage-goals)

---

## Testing Pyramid

```
                    ╱╲
                   ╱  ╲
                  ╱ E2E╲       ~10% - User workflows
                 ╱______╲
                ╱        ╲
               ╱Integration╲  ~30% - Service interactions
              ╱____________╲
             ╱              ╲
            ╱  Unit Tests    ╲ ~60% - Individual functions
           ╱__________________╲
```

**Philosophy:**
- **60% Unit Tests** - Fast, isolated, component testing
- **30% Integration Tests** - API and database interactions
- **10% E2E Tests** - Critical user journeys

---

## Unit Testing

### Backend Services (Node.js/TypeScript)

**Framework:** Jest + ts-jest

#### Setup

```bash
# Install dependencies
yarn add -D jest @types/jest ts-jest supertest @testing-library/jest-dom

# Generate Jest config
npx ts-jest config:init
```

#### Configuration

```javascript
// jest.config.js
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/src', '<rootDir>/tests'],
  testMatch: ['**/__tests__/**/*.ts', '**/?(*.)+(spec|test).ts'],
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/**/*.d.ts',
    '!src/**/*.interface.ts',
    '!src/**/index.ts',
  ],
  coverageThreshold: {
    global: {
      branches: 70,
      functions: 70,
      lines: 70,
      statements: 70,
    },
  },
  setupFilesAfterEnv: ['<rootDir>/tests/setup.ts'],
};
```

#### Example Unit Tests

**Testing Services:**

```typescript
// tests/services/result.service.test.ts
import { ResultService } from '../../src/services/result.service';
import { PrismaClient } from '@prisma/client';

// Mock Prisma
jest.mock('@prisma/client');

describe('ResultService', () => {
  let service: ResultService;
  let prisma: jest.Mocked<PrismaClient>;

  beforeEach(() => {
    prisma = new PrismaClient() as jest.Mocked<PrismaClient>;
    service = new ResultService(prisma);
  });

  describe('getSampleSummary', () => {
    it('should return sample summary when found', async () => {
      // Arrange
      const mockSummary = {
        sampleNo: 'TEST001',
        summary: { distribution: { positive: 10, negative: 5 } },
        totalRuns: 1,
        lastRunAt: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      prisma.sampleSummary.findUnique = jest.fn().mockResolvedValue(mockSummary);

      // Act
      const result = await service.getSampleSummary('TEST001');

      // Assert
      expect(result).toEqual(mockSummary);
      expect(prisma.sampleSummary.findUnique).toHaveBeenCalledWith({
        where: { sampleNo: 'TEST001' },
      });
    });

    it('should throw NotFoundError when sample not found', async () => {
      // Arrange
      prisma.sampleSummary.findUnique = jest.fn().mockResolvedValue(null);

      // Act & Assert
      await expect(service.getSampleSummary('NOTFOUND')).rejects.toThrow('Sample NOTFOUND not found');
    });
  });

  describe('calculateDistribution', () => {
    it('should correctly aggregate distribution', () => {
      // Arrange
      const interfaceResults = [
        { results: { distribution: { positive: 5, negative: 3 } } },
        { results: { distribution: { positive: 3, negative: 2 } } },
      ];

      // Act
      const distribution = service['calculateDistribution'](interfaceResults);

      // Assert
      expect(distribution).toEqual({ positive: 8, negative: 5 });
    });
  });
});
```

**Testing Controllers:**

```typescript
// tests/controllers/result.controller.test.ts
import { FastifyInstance } from 'fastify';
import { buildApp } from '../../src/app';

describe('Result Controller', () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    app = await buildApp({ logger: false });
  });

  afterAll(async () => {
    await app.close();
  });

  describe('GET /api/v1/results/samples/:sampleNo/summary', () => {
    it('should return sample summary', async () => {
      // Act
      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/results/samples/TEST001/summary',
        headers: {
          authorization: 'Bearer valid-token',
        },
      });

      // Assert
      expect(response.statusCode).toBe(200);
      expect(response.json()).toMatchObject({
        success: true,
        data: {
          sampleNo: 'TEST001',
        },
      });
    });

    it('should return 404 when sample not found', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/results/samples/NOTFOUND/summary',
        headers: {
          authorization: 'Bearer valid-token',
        },
      });

      expect(response.statusCode).toBe(404);
    });

    it('should return 401 when unauthorized', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/results/samples/TEST001/summary',
      });

      expect(response.statusCode).toBe(401);
    });
  });
});
```

### Python Services (Vision Inference & Capture)

**Framework:** pytest

#### Setup

```bash
# Install dependencies
pip install pytest pytest-asyncio pytest-cov httpx

# Create pytest.ini
cat > pytest.ini << EOF
[pytest]
testpaths = tests
python_files = test_*.py
python_classes = Test*
python_functions = test_*
asyncio_mode = auto
EOF
```

#### Example Unit Tests

```python
# tests/test_inference_service.py
import pytest
from unittest.mock import Mock, patch
from app.services.inference_service import InferenceService

@pytest.fixture
def inference_service():
    return InferenceService()

@pytest.mark.asyncio
async def test_predict_success(inference_service):
    # Arrange
    sample_no = "TEST001"
    image_path = "/path/to/image.jpg"
    
    with patch.object(inference_service, 'load_image') as mock_load:
        mock_load.return_value = Mock()
        
        # Act
        result = await inference_service.predict(sample_no, image_path)
        
        # Assert
        assert result.run_id is not None
        assert result.sample_no == sample_no
        assert result.status == "completed"

def test_calculate_distribution():
    # Arrange
    detections = [
        Mock(class_name='positive'),
        Mock(class_name='positive'),
        Mock(class_name='negative'),
    ]
    
    service = InferenceService()
    
    # Act
    distribution = service.calculate_distribution(detections)
    
    # Assert
    assert distribution == {'positive': 2, 'negative': 1}
```

### Frontend (React/TypeScript)

**Framework:** Vitest + React Testing Library

#### Setup

```bash
# Install dependencies
yarn add -D vitest @testing-library/react @testing-library/jest-dom @testing-library/user-event jsdom
```

#### Configuration

```typescript
// vitest.config.ts
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    globals: true,
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules/',
        'src/test/',
      ],
    },
  },
});
```

#### Example Component Tests

```typescript
// src/components/SampleForm.test.tsx
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { SampleForm } from './SampleForm';

describe('SampleForm', () => {
  it('should render form fields', () => {
    render(<SampleForm onSubmit={jest.fn()} />);

    expect(screen.getByLabelText(/sample number/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/submission number/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /capture/i })).toBeInTheDocument();
  });

  it('should submit form with valid data', async () => {
    const mockSubmit = jest.fn();
    render(<SampleForm onSubmit={mockSubmit} />);

    const user = userEvent.setup();

    // Fill form
    await user.type(screen.getByLabelText(/sample number/i), 'TEST001');
    await user.type(screen.getByLabelText(/submission number/i), 'SUB001');

    // Submit
    await user.click(screen.getByRole('button', { name: /capture/i }));

    // Assert
    await waitFor(() => {
      expect(mockSubmit).toHaveBeenCalledWith({
        sampleNo: 'TEST001',
        submissionNo: 'SUB001',
      });
    });
  });

  it('should show validation errors', async () => {
    render(<SampleForm onSubmit={jest.fn()} />);

    const user = userEvent.setup();

    // Submit empty form
    await user.click(screen.getByRole('button', { name: /capture/i }));

    // Assert errors shown
    expect(await screen.findByText(/sample number is required/i)).toBeInTheDocument();
  });
});
```

---

## Integration Testing

### API Integration Tests

**Testing service-to-service communication:**

```typescript
// tests/integration/inference-flow.test.ts
import { setupTestEnvironment, teardownTestEnvironment } from '../helpers/test-env';

describe('Inference Flow Integration', () => {
  beforeAll(async () => {
    await setupTestEnvironment();
  });

  afterAll(async () => {
    await teardownTestEnvironment();
  });

  it('should complete full inference workflow', async () => {
    // 1. Upload image
    const uploadResponse = await fetch('http://localhost:6402/api/v1/images', {
      method: 'POST',
      body: formData,
      headers: { authorization: `Bearer ${token}` },
    });
    const { data: imageData } = await uploadResponse.json();

    // 2. Run inference
    const inferenceResponse = await fetch('http://localhost:6405/api/v1/inference/predict', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        sample_no: 'TEST001',
        image_path: imageData.filePath,
      }),
    });
    const { data: inferenceData } = await inferenceResponse.json();

    // 3. Verify results stored
    const resultsResponse = await fetch(
      `http://localhost:6404/api/v1/results/runs/${inferenceData.run_id}`,
      { headers: { authorization: `Bearer ${token}` } }
    );
    const { data: resultsData } = await resultsResponse.json();

    // Assert complete workflow
    expect(inferenceData.status).toBe('completed');
    expect(resultsData.wellPredictions).toHaveLength(96);
    expect(resultsData.rowCounts).toBeDefined();
  });
});
```

### Database Integration Tests

```typescript
// tests/integration/database.test.ts
import { PrismaClient } from '@prisma/client';

describe('Database Integration', () => {
  let prisma: PrismaClient;

  beforeAll(async () => {
    prisma = new PrismaClient({
      datasources: {
        db: {
          url: process.env.TEST_DATABASE_URL,
        },
      },
    });
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  beforeEach(async () => {
    // Clean database
    await prisma.wellPrediction.deleteMany();
    await prisma.predictionRun.deleteMany();
  });

  it('should cascade delete related records', async () => {
    // Create prediction run
    const run = await prisma.predictionRun.create({
      data: {
        sampleNo: 'TEST001',
        status: 'completed',
        modelVersion: 'v1.0.0',
      },
    });

    // Create well predictions
    await prisma.wellPrediction.createMany({
      data: [
        { runId: run.id, wellId: 'A1', class_: 'positive', confidence: 0.9, bbox: {} },
        { runId: run.id, wellId: 'A2', class_: 'negative', confidence: 0.8, bbox: {} },
      ],
    });

    // Delete run
    await prisma.predictionRun.delete({ where: { id: run.id } });

    // Assert cascaded deletion
    const wellCount = await prisma.wellPrediction.count({ where: { runId: run.id } });
    expect(wellCount).toBe(0);
  });

  it('should trigger sample summary update', async () => {
    // Create run with interface results
    const run = await prisma.predictionRun.create({
      data: {
        sampleNo: 'TEST002',
        status: 'completed',
        modelVersion: 'v1.0.0',
        interfaceResults: {
          create: {
            results: {
              distribution: { positive: 10, negative: 5 },
            },
          },
        },
      },
    });

    // Wait for trigger
    await new Promise(resolve => setTimeout(resolve, 100));

    // Check sample summary updated
    const summary = await prisma.sampleSummary.findUnique({
      where: { sampleNo: 'TEST002' },
    });

    expect(summary).toBeDefined();
    expect(summary?.summary).toMatchObject({
      distribution: { positive: 10, negative: 5 },
    });
  });
});
```

---

## End-to-End Testing

### Cypress Configuration

```typescript
// cypress.config.ts
import { defineConfig } from 'cypress';

export default defineConfig({
  e2e: {
    baseUrl: 'http://localhost:6410',
    supportFile: 'cypress/support/e2e.ts',
    specPattern: 'cypress/e2e/**/*.cy.ts',
    viewportWidth: 1920,
    viewportHeight: 1080,
    video: true,
    screenshotOnRunFailure: true,
    env: {
      apiUrl: 'http://localhost:6404',
      authUrl: 'http://localhost:6401',
    },
  },
});
```

### E2E Test Examples

```typescript
// cypress/e2e/capture-workflow.cy.ts
describe('Capture and Analysis Workflow', () => {
  beforeEach(() => {
    // Login
    cy.login('test@example.com', 'password123');
    cy.visit('/capture');
  });

  it('should complete full capture and analysis flow', () => {
    // Enter sample information
    cy.get('[data-testid="sample-no-input"]').type('TEST001');
    cy.get('[data-testid="submission-no-input"]').type('SUB001');

    // Capture image
    cy.get('[data-testid="capture-button"]').click();
    cy.get('[data-testid="image-panel"]').should('be.visible');
    cy.get('[data-testid="image-panel"] img').should('have.attr', 'src');

    // Run prediction
    cy.get('[data-testid="predict-button"]').click();
    cy.get('[data-testid="loading-spinner"]').should('be.visible');
    
    // Wait for results
    cy.get('[data-testid="results-tabs"]', { timeout: 30000 }).should('be.visible');

    // Verify prediction results
    cy.get('[data-testid="predict-tab"]').click();
    cy.get('[data-testid="well-grid"]').should('be.visible');
    cy.get('[data-testid="well-grid"] .well').should('have.length', 96);

    // Check summary
    cy.get('[data-testid="summary-tab"]').click();
    cy.get('[data-testid="summary-distribution"]').should('contain', 'positive');
    cy.get('[data-testid="summary-distribution"]').should('contain', 'negative');

    // Generate CSV
    cy.get('[data-testid="interface-button"]').click();
    cy.get('[data-testid="toast-success"]').should('contain', 'CSV generated');
  });

  it('should handle errors gracefully', () => {
    // Submit without sample number
    cy.get('[data-testid="capture-button"]').click();
    cy.get('[data-testid="error-message"]').should('contain', 'required');

    // Try to predict without image
    cy.get('[data-testid="sample-no-input"]').type('TEST002');
    cy.get('[data-testid="predict-button"]').click();
    cy.get('[data-testid="toast-error"]').should('contain', 'No image');
  });
});
```

### Custom Commands

```typescript
// cypress/support/commands.ts
Cypress.Commands.add('login', (email: string, password: string) => {
  cy.request({
    method: 'POST',
    url: `${Cypress.env('authUrl')}/api/v1/auth/login`,
    body: { username: email, password },
  }).then((response) => {
    window.localStorage.setItem('accessToken', response.body.data.access_token);
    window.localStorage.setItem('refreshToken', response.body.data.refresh_token);
  });
});

Cypress.Commands.add('seedDatabase', () => {
  cy.exec('yarn prisma db seed');
});
```

---

## API Contract Testing

### Pact Testing

```typescript
// tests/contract/result-api.pact.test.ts
import { Pact } from '@pact-foundation/pact';
import path from 'path';

describe('Result API Contract', () => {
  const provider = new Pact({
    consumer: 'frontend',
    provider: 'result-api-service',
    port: 9000,
    log: path.resolve(process.cwd(), 'logs', 'pact.log'),
    dir: path.resolve(process.cwd(), 'pacts'),
  });

  beforeAll(() => provider.setup());
  afterEach(() => provider.verify());
  afterAll(() => provider.finalize());

  describe('GET /api/v1/results/samples/:sampleNo/summary', () => {
    beforeEach(() => {
      return provider.addInteraction({
        state: 'sample TEST001 exists',
        uponReceiving: 'a request for sample summary',
        withRequest: {
          method: 'GET',
          path: '/api/v1/results/samples/TEST001/summary',
          headers: {
            Authorization: 'Bearer token',
          },
        },
        willRespondWith: {
          status: 200,
          headers: {
            'Content-Type': 'application/json',
          },
          body: {
            success: true,
            data: {
              sampleNo: 'TEST001',
              distribution: {
                positive: 10,
                negative: 5,
              },
            },
          },
        },
      });
    });

    it('returns sample summary', async () => {
      const response = await fetch('http://localhost:9000/api/v1/results/samples/TEST001/summary', {
        headers: { Authorization: 'Bearer token' },
      });

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.data.sampleNo).toBe('TEST001');
    });
  });
});
```

---

## Performance Testing

### Load Testing with k6

```javascript
// tests/performance/load-test.js
import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
  stages: [
    { duration: '30s', target: 20 },  // Ramp up
    { duration: '1m', target: 20 },   // Stay at 20 users
    { duration: '30s', target: 0 },   // Ramp down
  ],
  thresholds: {
    http_req_duration: ['p(95)<500'], // 95% requests < 500ms
    http_req_failed: ['rate<0.01'],   // Error rate < 1%
  },
};

export default function () {
  // Login
  const loginRes = http.post('http://localhost:6401/api/v1/auth/login', JSON.stringify({
    username: 'test@example.com',
    password: 'password123',
  }), {
    headers: { 'Content-Type': 'application/json' },
  });

  check(loginRes, {
    'login successful': (r) => r.status === 200,
  });

  const token = loginRes.json('data.access_token');

  // Get sample summary
  const summaryRes = http.get('http://localhost:6404/api/v1/results/samples/TEST001/summary', {
    headers: { Authorization: `Bearer ${token}` },
  });

  check(summaryRes, {
    'summary retrieved': (r) => r.status === 200,
    'response time OK': (r) => r.timings.duration < 500,
  });

  sleep(1);
}
```

### Run Performance Tests

```bash
# Install k6
brew install k6

# Run load test
k6 run tests/performance/load-test.js

# Run with custom users
k6 run --vus 50 --duration 2m tests/performance/load-test.js
```

---

## Security Testing

### OWASP ZAP Integration

```bash
# Run ZAP scan
docker run -v $(pwd):/zap/wrk/:rw -t owasp/zap2docker-stable \
  zap-baseline.py -t http://localhost:6404 -r zap-report.html
```

### SQL Injection Testing

```typescript
// tests/security/sql-injection.test.ts
describe('SQL Injection Prevention', () => {
  it('should prevent SQL injection in sample_no parameter', async () => {
    const maliciousInput = "TEST001'; DROP TABLE users; --";

    const response = await app.inject({
      method: 'GET',
      url: `/api/v1/results/samples/${encodeURIComponent(maliciousInput)}/summary`,
      headers: { authorization: 'Bearer valid-token' },
    });

    // Should return 404 or validation error, not 500
    expect([400, 404]).toContain(response.statusCode);

    // Verify table still exists
    const tableExists = await prisma.$queryRaw`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_name = 'users'
      );
    `;
    expect(tableExists).toBeTruthy();
  });
});
```

---

## Test Data Management

### Database Seeding

```typescript
// prisma/seed.ts
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  // Create test users
  const user = await prisma.user.upsert({
    where: { email: 'test@example.com' },
    update: {},
    create: {
      email: 'test@example.com',
      username: 'testuser',
      password: await hashPassword('password123'),
    },
  });

  // Create test prediction runs
  for (let i = 1; i <= 10; i++) {
    await prisma.predictionRun.create({
      data: {
        sampleNo: `TEST${String(i).padStart(3, '0')}`,
        status: 'completed',
        modelVersion: 'v1.0.0',
        wellPredictions: {
          createMany: {
            data: generateWellPredictions(96),
          },
        },
      },
    });
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
```

### Test Fixtures

```typescript
// tests/fixtures/prediction-run.fixture.ts
export const mockPredictionRun = {
  id: 1,
  sampleNo: 'TEST001',
  status: 'completed',
  modelVersion: 'v1.0.0',
  predictAt: new Date('2024-01-01'),
  createdAt: new Date('2024-01-01'),
  updatedAt: new Date('2024-01-01'),
};

export const mockWellPredictions = [
  {
    id: 1,
    runId: 1,
    wellId: 'A1',
    class_: 'positive',
    confidence: 0.95,
    bbox: { xmin: 10, ymin: 20, xmax: 30, ymax: 40 },
  },
  // ... more predictions
];
```

---

## Continuous Integration

### GitHub Actions Workflow

```yaml
# .github/workflows/test.yml
name: Test Suite

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main]

jobs:
  unit-tests:
    runs-on: ubuntu-latest

    services:
      postgres:
        image: postgres:17
        env:
          POSTGRES_PASSWORD: postgres
          POSTGRES_DB: microplates_test
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
        ports:
          - 5432:5432

      redis:
        image: redis:7-alpine
        ports:
          - 6379:6379

    steps:
      - uses: actions/checkout@v3

      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
          cache: 'yarn'

      - name: Install dependencies
        run: yarn install --frozen-lockfile

      - name: Run migrations
        run: yarn prisma migrate deploy
        env:
          DATABASE_URL: postgresql://postgres:postgres@localhost:5432/microplates_test

      - name: Run unit tests
        run: yarn test:unit --coverage

      - name: Upload coverage
        uses: codecov/codecov-action@v3

  integration-tests:
    runs-on: ubuntu-latest
    needs: unit-tests

    steps:
      - uses: actions/checkout@v3

      - name: Start services
        run: docker-compose up -d

      - name: Wait for services
        run: |
          timeout 60 bash -c 'until curl -f http://localhost:6401/healthz; do sleep 2; done'

      - name: Run integration tests
        run: yarn test:integration

  e2e-tests:
    runs-on: ubuntu-latest
    needs: integration-tests

    steps:
      - uses: actions/checkout@v3

      - name: Start full stack
        run: docker-compose -f docker-compose.test.yml up -d

      - name: Run E2E tests
        uses: cypress-io/github-action@v5
        with:
          wait-on: 'http://localhost:6410'
          wait-on-timeout: 120

      - name: Upload screenshots
        uses: actions/upload-artifact@v3
        if: failure()
        with:
          name: cypress-screenshots
          path: cypress/screenshots
```

---

## Test Coverage Goals

### Minimum Coverage Requirements

| Component | Coverage Target |
|-----------|----------------|
| **Services** | 80% |
| **Controllers** | 70% |
| **Utilities** | 90% |
| **Models** | 60% |
| **Overall** | 75% |

### Running Coverage Reports

```bash
# Backend services
yarn test:coverage

# View HTML report
open coverage/lcov-report/index.html

# Frontend
yarn test:coverage --ui

# Generate combined report
yarn test:coverage:all
```

---

## Best Practices

### 1. Test Organization

- **AAA Pattern**: Arrange, Act, Assert
- **One assertion per test** when possible
- **Descriptive test names**: `should return 404 when sample not found`
- **Group related tests** with `describe` blocks

### 2. Test Data

- **Use factories** for test data generation
- **Clean up after tests**
- **Avoid shared mutable state**
- **Use meaningful test data** (not just `test1`, `test2`)

### 3. Mocking

- **Mock external dependencies**
- **Don't mock what you're testing**
- **Use typed mocks** in TypeScript
- **Verify mock calls** when relevant

### 4. Async Testing

- **Always await async operations**
- **Set appropriate timeouts**
- **Handle promise rejections**
- **Use `waitFor` for UI updates**

### 5. Debugging Tests

```typescript
// Enable debug logging
DEBUG=* yarn test

// Run single test file
yarn test path/to/test.ts

// Run with debugger
node --inspect-brk node_modules/.bin/jest --runInBand

// Use test.only for focused testing
test.only('should test specific case', () => {
  // ...
});
```

---

## Conclusion

This comprehensive testing strategy ensures:
- **High code quality** through extensive test coverage
- **Confidence in deployments** with automated testing
- **Fast feedback loops** with unit tests
- **System reliability** through integration and E2E tests
- **Performance assurance** with load testing
- **Security validation** with security testing

Follow these guidelines and continuously improve test coverage to maintain a robust and reliable system.

