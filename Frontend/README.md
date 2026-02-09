# Microplate Frontend

> Professional React + TypeScript web application for the Microplate AI System

---

## 📋 Table of Contents

- [Overview](#overview)
- [Features](#features)
- [Technology Stack](#technology-stack)
- [Project Structure](#project-structure)
- [Quick Start](#quick-start)
- [Development](#development)
- [Components](#components)
- [API Integration](#api-integration)
- [State Management](#state-management)
- [Styling](#styling)
- [Build & Deployment](#build--deployment)
- [Testing](#testing)
- [Troubleshooting](#troubleshooting)

---

## 🎯 Overview

The **Microplate Frontend** is a modern, professional web application built with React and TypeScript. It provides an intuitive interface for microplate image capture, AI-powered analysis, and result visualization.

### Design Philosophy

- 🎨 **Clean & Professional** - White background with premium aesthetics
- ⚡ **Fast & Responsive** - Optimized performance and real-time updates
- 📱 **Mobile-Friendly** - Responsive design for all screen sizes
- ♿ **Accessible** - WCAG 2.1 AA compliance
- 🔐 **Secure** - JWT authentication and secure API calls

---

## ✨ Features

### User Interface

- ✅ **Capture Page** - Main interface for image capture and analysis
- ✅ **Sample History** - Browse and search historical samples
- ✅ **Real-time Updates** - WebSocket integration for live results
- ✅ **QR Code Scanner** - Quick sample number entry
- ✅ **Responsive Design** - Works on desktop, tablet, and mobile
- ✅ **Dark Mode** - Optional dark theme support
- 🌐 **Localization** - Runtime language switching (Thai / English) across the entire UI

### Functionality

- ✅ **Authentication** - Login, register, password reset
- ✅ **Image Capture** - Capture from camera with preview
- ✅ **Image Upload** - Upload existing images
- ✅ **AI Analysis** - Run predictions on images
- ✅ **Result Visualization** - Well grid, charts, statistics
- ✅ **CSV Export** - Generate labware interface files
- ✅ **Sample Management** - View and delete samples/runs

### User Experience

- ✅ **Toast Notifications** - User-friendly feedback
- ✅ **Loading States** - Skeleton loaders and spinners
- ✅ **Error Handling** - Graceful error messages
- ✅ **Form Validation** - Real-time input validation
- ✅ **Keyboard Shortcuts** - Productivity features
- ✅ **Structured Logging** - Centralized Winston logger replaces `console.log` for consistent diagnostics

---

## 🛠️ Technology Stack

| Category | Technology | Version | Purpose |
|----------|-----------|---------|---------|
| **Framework** | React | 18+ | UI library |
| **Language** | TypeScript | 5.x | Type safety |
| **Build Tool** | Vite | 5.x | Fast development and build |
| **Styling** | Tailwind CSS | 3.x | Utility-first CSS |
| **State Management** | TanStack Query | 5.x | Server state management |
| **Routing** | React Router | 6.x | Client-side routing |
| **Forms** | React Hook Form | 7.x | Form handling |
| **Validation** | Zod | 3.x | Schema validation |
| **UI Components** | Headless UI | 2.x | Accessible components |
| **Icons** | Heroicons | 2.x | SVG icons |
| **Charts** | Recharts | 2.x | Data visualization |
| **HTTP Client** | Fetch API | Native | API calls |
| **WebSocket** | Native WebSocket | Native | Real-time updates |

---

## 📁 Project Structure

```typescript
microplate-fe/
├── public/                      # Static assets
│   ├── HAIlytics.png           # Logo
│   ├── science-illustration.svg
│   └── vite.svg
├── src/
│   ├── components/              # React components
│   │   ├── ui/                  # Base UI components
│   │   │   ├── Button.tsx
│   │   │   ├── Input.tsx
│   │   │   ├── Card.tsx
│   │   │   ├── Modal.tsx
│   │   │   ├── Badge.tsx
│   │   │   └── Spinner.tsx
│   │   ├── layout/              # Layout components
│   │   │   ├── AppShell.tsx
│   │   │   └── Header.tsx
│   │   ├── capture/             # Capture page components
│   │   │   ├── SampleForm.tsx
│   │   │   ├── ImagePanel.tsx
│   │   │   ├── ActionsBar.tsx
│   │   │   ├── QRScanner.tsx
│   │   │   ├── CameraPreview.tsx
│   │   │   ├── ImageUpload.tsx
│   │   │   ├── ImageCapture.tsx
│   │   │   └── SystemLogs.tsx
│   │   ├── results/             # Results components
│   │   │   ├── PredictTab.tsx
│   │   │   ├── SummaryTab.tsx
│   │   │   └── WellGrid.tsx
│   │   └── AuthGuard.tsx        # Protected route wrapper
│   ├── pages/                   # Page components
│   │   ├── CapturePage.tsx
│   │   ├── SampleHistoryPage.tsx
│   │   ├── LoginPage.tsx
│   │   ├── RegisterPage.tsx
│   │   ├── ForgotPasswordPage.tsx
│   │   ├── ProfilePage.tsx
│   │   └── NotFoundPage.tsx
│   ├── hooks/                   # Custom React hooks
│   │   ├── useCapture.ts
│   │   ├── useImageUpload.ts
│   │   ├── useResults.ts
│   │   ├── useResultsNew.ts
│   │   ├── useResultsDirect.ts
│   │   ├── useLogs.ts
│   │   └── useWebSocketLogs.ts
│   ├── services/                # API services
│   │   ├── api.ts               # Base API client
│   │   ├── auth.service.ts      # Authentication
│   │   ├── capture.service.ts   # Image capture
│   │   ├── image.service.ts     # Image management
│   │   ├── vision.service.ts    # AI inference
│   │   ├── results.service.ts   # Results API
│   │   ├── results.service.direct.ts
│   │   ├── results.service.new.ts
│   │   ├── labware.service.ts   # CSV generation
│   │   ├── logs.service.ts      # Logging
│   │   └── websocket.service.ts # WebSocket
│   ├── contexts/                # React contexts
│   │   └── ThemeContext.tsx
│   ├── utils/                   # Utility functions
│   │   ├── debugRuns.ts
│   │   └── mockData.ts
│   ├── App.tsx                  # Main app component
│   ├── App.css                  # App styles
│   ├── main.tsx                 # Entry point
│   └── index.css                # Global styles
├── dist/                        # Build output
├── node_modules/                # Dependencies
├── .env.example                 # Environment template
├── docker-compose.yml           # Docker deployment
├── Dockerfile                   # Docker image
├── nginx.conf                   # Nginx configuration
├── package.json                 # Dependencies and scripts
├── tsconfig.json                # TypeScript config
├── vite.config.ts               # Vite configuration
├── tailwind.config.js           # Tailwind config
├── postcss.config.js            # PostCSS config
└── README.md                    # This file
```

---

## 🚀 Quick Start

### Prerequisites

   ```bash
# Check Node.js version (18+ required)
node --version

# Check Yarn version
yarn --version

# If Yarn not installed
npm install -g yarn
```

### Installation

   ```bash
# Navigate to frontend directory
cd microplate-fe

# Install dependencies
yarn install

# Copy environment file
   cp env.example .env

# Edit environment variables
nano .env
```

### Environment Configuration

```bash
# .env (development defaults)
VITE_AUTH_SERVICE_URL=http://localhost:6401
VITE_IMAGE_SERVICE_URL=http://localhost:6402
VITE_VISION_SERVICE_URL=http://localhost:6410        # served through webpack proxy
VITE_RESULTS_SERVICE_URL=http://localhost:6410        # served through webpack proxy
VITE_LABWARE_SERVICE_URL=http://localhost:6405
VITE_PREDICTION_SERVICE_URL=http://localhost:6406
VITE_VISION_CAPTURE_SERVICE_URL=http://localhost:6410  # served through webpack proxy
VITE_MINIO_BASE_URL=http://localhost:9000

# WebSocket URLs
VITE_WS_RESULTS_URL=ws://localhost:6404/api/v1/results/ws
VITE_WS_CAPTURE_URL=ws://localhost:6410/ws/capture        # served through webpack proxy

# Application
VITE_APP_NAME=Microplate AI
VITE_APP_VERSION=1.0.0
```

> ✅ **Development**: `yarn dev` จะสร้าง proxy ให้เส้นทาง `/api/v1/capture/*` และ `/ws/capture` เข้าหา `http://localhost:6407` อัตโนมัติ  (ไม่ต้องเปิด CORS ใน service ย่อย)  
> 🚀 **Production**: ให้ทีมโครงสร้าง (IT) ตั้ง reverse proxy/gateway ที่ปลายทาง (เช่น Nginx) เพื่อ forward เส้นทางเดียวกันไปยังบริการจริง พร้อมกำหนดหัวข้อ CORS ตามโดเมนที่อนุญาต

#### Gateway / Reverse Proxy (Production)

ตัวอย่างการตั้งค่า Nginx (สรุปส่งต่อ capture service ผ่าน gateway เดียวกันกับ frontend):

```nginx
location /api/v1/capture/ {
    proxy_pass http://localhost:6407/api/v1/capture/;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
}

location /ws/capture {
    proxy_pass http://localhost:6407/ws/capture;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection "Upgrade";
}

# CORS headers (ตามโดเมนที่อนุญาต)
add_header Access-Control-Allow-Origin https://your-frontend.example.com;
add_header Access-Control-Allow-Credentials true;
add_header Access-Control-Allow-Headers "Content-Type, Authorization, X-Requested-With";
add_header Access-Control-Allow-Methods "GET, POST, PUT, PATCH, DELETE, OPTIONS";
```

> หมายเหตุ: หากมีบริการอื่น ๆ (results, labware ฯลฯ) ต้องเพิ่มเส้นทาง proxy ให้ครบถ้วนที่ gateway

### Run Development Server

   ```bash
# Start development server
   yarn dev

# Open browser
# http://localhost:6410
```

### Build for Production

```bash
# Build production bundle
yarn build

# Preview production build
yarn preview

# Analyze bundle size
yarn build --analyze
```

---

## 💻 Development

### Development Server

   ```bash
# Start with hot reload
yarn dev

# Start on different port
yarn dev --port 3000

# Start with network access
yarn dev --host
```

### Code Quality

```bash
# Run linting
yarn lint

# Fix linting issues
yarn lint:fix

# Type checking
yarn type-check

# Format code
yarn format

# Accessibility linting (jsx-a11y)
yarn lint --rule 'jsx-a11y/*'
```

### Logging & Monitoring

- All application logs flow through `src/utils/logger.ts`, a Winston-based logger configured with leveled transports.
- Avoid `console.log` and instead call `logger.debug/info/warn/error` so that output stays consistent between browser and Node environments.
- Network requests, calibration payloads, and grid generation now emit structured log objects for easier troubleshooting without cluttering the console.

### Project Commands

   ```bash
# Install dependencies
yarn install

# Add new dependency
yarn add package-name

# Add dev dependency
yarn add -D package-name

# Remove dependency
yarn remove package-name

# Update dependencies
yarn upgrade-interactive

# Clean install
rm -rf node_modules yarn.lock
yarn install
```

---

## 🧩 Components

### UI Components

#### Button Component

```typescript
// components/ui/Button.tsx
interface ButtonProps {
  variant?: 'primary' | 'secondary' | 'outline' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
  disabled?: boolean;
  children: React.ReactNode;
  onClick?: () => void;
}

export const Button: React.FC<ButtonProps> = ({
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled = false,
  children,
  onClick,
}) => {
  const baseStyles = 'rounded-lg font-medium transition-all duration-200';
  const variantStyles = {
    primary: 'bg-blue-600 text-white hover:bg-blue-700',
    secondary: 'bg-gray-200 text-gray-900 hover:bg-gray-300',
    outline: 'border-2 border-gray-300 text-gray-700 hover:border-gray-400',
    danger: 'bg-red-600 text-white hover:bg-red-700',
  };
  const sizeStyles = {
    sm: 'px-3 py-1.5 text-sm',
    md: 'px-4 py-2 text-base',
    lg: 'px-6 py-3 text-lg',
  };

  return (
    <button
      className={`${baseStyles} ${variantStyles[variant]} ${sizeStyles[size]}`}
      disabled={disabled || loading}
      onClick={onClick}
    >
      {loading && <Spinner size="sm" className="mr-2" />}
      {children}
    </button>
  );
};
```

#### Card Component

```typescript
// components/ui/Card.tsx
export const Card: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
      {children}
    </div>
  );
};
```

### Page Components

#### Capture Page

The main page for image capture and analysis:

```typescript
// pages/CapturePage.tsx
export const CapturePage: React.FC = () => {
  const { captureImage, isCapturing } = useCapture();
  const { sampleData, isLoading } = useResults();

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left: Sample Input */}
          <div className="lg:col-span-1">
            <Card>
              <h2 className="text-lg font-semibold mb-6">Sample Information</h2>
              <SampleForm />
            </Card>
          </div>

          {/* Center: Image Display */}
          <div className="lg:col-span-1">
            <ImagePanel />
          </div>

          {/* Right: Results */}
          <div className="lg:col-span-1">
            <ResultsTabs />
          </div>
        </div>

        {/* Actions Bar */}
        <ActionsBar />
      </div>
    </div>
  );
};
```

---

## 🔌 API Integration

### Service Layer

```typescript
// services/api.ts
class ApiClient {
  private baseUrl: string;

  constructor(serviceUrl: string) {
    this.baseUrl = serviceUrl;
  }

  async request<T>(
    endpoint: string,
    options?: RequestInit
  ): Promise<T> {
    const token = localStorage.getItem('accessToken');
    
    const response = await fetch(`${this.baseUrl}${endpoint}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...(token && { Authorization: `Bearer ${token}` }),
        ...options?.headers,
      },
    });

    if (!response.ok) {
      const error = await response.json();
      throw new ApiError(error);
    }

    return response.json();
  }

  async get<T>(endpoint: string): Promise<T> {
    return this.request<T>(endpoint);
  }

  async post<T>(endpoint: string, data?: any): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async put<T>(endpoint: string, data?: any): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async delete<T>(endpoint: string): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'DELETE',
    });
  }
}

// Create service clients
export const authApi = new ApiClient(import.meta.env.VITE_AUTH_SERVICE_URL);
export const resultsApi = new ApiClient(import.meta.env.VITE_RESULTS_SERVICE_URL);
export const captureApi = new ApiClient(import.meta.env.VITE_CAPTURE_SERVICE_URL);
```

### Service Examples

```typescript
// services/results.service.ts
export class ResultsService {
  async getAllSamples(): Promise<Sample[]> {
    const response = await resultsApi.get<ApiResponse<Sample[]>>(
      '/api/v1/results/direct/samples'
    );
    return response.data;
  }

  async getSampleRuns(sampleNo: string, page = 1, limit = 20): Promise<PaginatedRuns> {
    const response = await resultsApi.get<ApiResponse<PaginatedRuns>>(
      `/api/v1/results/direct/samples/${sampleNo}/runs?page=${page}&limit=${limit}`
    );
    return response.data;
  }

  async deleteRun(runId: number): Promise<void> {
    await resultsApi.delete(`/api/v1/results/direct/runs/${runId}`);
  }
}

export const resultsService = new ResultsService();
```

---

## 🎣 Custom Hooks

### useCapture Hook

```typescript
// hooks/useCapture.ts
export function useCapture() {
  const [currentImage, setCurrentImage] = useState<CapturedImage | null>(null);
  const [isCapturing, setIsCapturing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const captureImage = async (sampleNo: string, submissionNo?: string) => {
    setIsCapturing(true);
    setError(null);

    try {
      const response = await captureService.capture({
        sample_no: sampleNo,
        submission_no: submissionNo,
      });

      setCurrentImage(response.data);
      return response;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Capture failed';
      setError(errorMessage);
      throw err;
    } finally {
      setIsCapturing(false);
    }
  };

  return {
    currentImage,
    isCapturing,
    error,
    captureImage,
  };
}
```

### useResults Hook

```typescript
// hooks/useResultsDirect.ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

export function useResultsDirect() {
  const queryClient = useQueryClient();

  // Get all samples
  const { data: samples, isLoading } = useQuery({
    queryKey: ['samples'],
    queryFn: () => resultsService.getAllSamples(),
    refetchInterval: 10000, // Refetch every 10 seconds
  });

  // Get sample runs
  const useSampleRuns = (sampleNo: string) => {
    return useQuery({
      queryKey: ['sample-runs', sampleNo],
      queryFn: () => resultsService.getSampleRuns(sampleNo),
      enabled: !!sampleNo,
    });
  };

  // Delete run mutation
  const deleteRunMutation = useMutation({
    mutationFn: (runId: number) => resultsService.deleteRun(runId),
    onSuccess: () => {
      // Invalidate queries to refetch data
      queryClient.invalidateQueries({ queryKey: ['samples'] });
      queryClient.invalidateQueries({ queryKey: ['sample-runs'] });
    },
  });

  return {
    samples,
    isLoading,
    useSampleRuns,
    deleteRun: deleteRunMutation.mutate,
    isDeletingRun: deleteRunMutation.isPending,
  };
}
```

### useWebSocket Hook

```typescript
// hooks/useWebSocketLogs.ts
export function useWebSocketLogs() {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const wsRef = useRef<WebSocket | null>(null);

  useEffect(() => {
    const ws = new WebSocket(import.meta.env.VITE_WS_CAPTURE_URL);
    wsRef.current = ws;

    ws.onopen = () => {
      logger.info('WebSocket connected');
      setIsConnected(true);
    };

    ws.onmessage = (event) => {
      const message = JSON.parse(event.data);
      
      if (message.type === 'capture_progress' || message.type === 'capture_result') {
        setLogs((prev) => [
          {
            timestamp: new Date(),
            level: 'info',
            message: JSON.stringify(message.data),
          },
          ...prev.slice(0, 99), // Keep last 100 logs
        ]);
      }
    };

    ws.onerror = (error) => {
      console.error('WebSocket error:', error);
      setIsConnected(false);
    };

    ws.onclose = () => {
      logger.info('WebSocket disconnected');
      setIsConnected(false);
    };

    return () => {
      ws.close();
    };
  }, []);

  return { logs, isConnected };
}
```

---

## 🎨 Styling

### Tailwind Configuration

```javascript
// tailwind.config.js
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#eff6ff',
          100: '#dbeafe',
          500: '#3b82f6',
          600: '#2563eb',
          700: '#1d4ed8',
        },
        success: '#10b981',
        warning: '#f59e0b',
        error: '#ef4444',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
      boxShadow: {
        'sm': '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
        'DEFAULT': '0 1px 3px 0 rgba(0, 0, 0, 0.1)',
        'md': '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
        'lg': '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
      },
    },
  },
  plugins: [
    require('@tailwindcss/forms'),
  ],
};
```

### Global Styles

```css
/* src/index.css */
@tailwind base;
@tailwind components;
@tailwind utilities;

@layer base {
  * {
    @apply border-gray-200;
  }
  
  body {
    @apply bg-white text-gray-900 antialiased;
  }
}

@layer components {
  .card {
    @apply bg-white rounded-2xl shadow-sm border border-gray-200 p-6;
  }
  
  .btn-primary {
    @apply bg-blue-600 text-white px-4 py-2 rounded-lg font-medium 
           hover:bg-blue-700 transition-colors duration-200;
  }
  
  .input-field {
    @apply w-full px-4 py-2 border border-gray-300 rounded-lg 
           focus:ring-2 focus:ring-blue-500 focus:border-blue-500;
  }
}
```

---

## 🔗 Routing

### Route Configuration

```typescript
// App.tsx
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Public routes */}
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />
        <Route path="/reset-password" element={<ResetPasswordPage />} />

        {/* Protected routes */}
        <Route element={<AuthGuard />}>
          <Route path="/" element={<Navigate to="/capture" replace />} />
          <Route path="/capture" element={<CapturePage />} />
          <Route path="/history" element={<SampleHistoryPage />} />
          <Route path="/samples/:sampleNo" element={<SampleDetailPage />} />
          <Route path="/profile" element={<ProfilePage />} />
          <Route path="/settings" element={<SettingsPage />} />
        </Route>

        {/* 404 */}
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </BrowserRouter>
  );
}
```

### Protected Routes

```typescript
// components/AuthGuard.tsx
import { Navigate, Outlet } from 'react-router-dom';

export const AuthGuard: React.FC = () => {
  const token = localStorage.getItem('accessToken');
  
  if (!token) {
    return <Navigate to="/login" replace />;
  }
  
  return (
    <AppShell>
      <Outlet />
    </AppShell>
  );
};
```

---

## 📊 State Management

### TanStack Query Setup

```typescript
// main.tsx
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
      staleTime: 5 * 60 * 1000, // 5 minutes
    },
    mutations: {
      retry: 0,
    },
  },
});

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <App />
      <ReactQueryDevtools initialIsOpen={false} />
    </QueryClientProvider>
  </React.StrictMode>
);
```

### Context API (Optional)

```typescript
// contexts/ThemeContext.tsx
import { createContext, useContext, useState } from 'react';

interface ThemeContextType {
  theme: 'light' | 'dark';
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [theme, setTheme] = useState<'light' | 'dark'>('light');

  const toggleTheme = () => {
    setTheme((prev) => (prev === 'light' ? 'dark' : 'light'));
  };

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within ThemeProvider');
  }
  return context;
};
```

---

## 🧪 Testing

### Setup Testing Environment

```bash
# Install testing dependencies
yarn add -D vitest @testing-library/react @testing-library/jest-dom @testing-library/user-event jsdom
```

### Vitest Configuration

```typescript
// vitest.config.ts
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    globals: true,
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: ['node_modules/', 'src/test/'],
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
});
```

### Component Tests

```typescript
// src/components/SampleForm.test.tsx
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { SampleForm } from './SampleForm';

describe('SampleForm', () => {
  it('should render form fields', () => {
    render(<SampleForm />);

    expect(screen.getByLabelText(/sample number/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/submission number/i)).toBeInTheDocument();
  });

  it('should handle form submission', async () => {
    const user = userEvent.setup();
    const mockSubmit = jest.fn();
    
    render(<SampleForm onSubmit={mockSubmit} />);

    await user.type(screen.getByLabelText(/sample number/i), 'TEST001');
    await user.type(screen.getByLabelText(/submission number/i), 'SUB001');
    await user.click(screen.getByRole('button', { name: /capture/i }));

    expect(mockSubmit).toHaveBeenCalledWith({
      sampleNo: 'TEST001',
      submissionNo: 'SUB001',
    });
  });
});
```

### Running Tests

```bash
# Run all tests
yarn test

# Run in watch mode
yarn test:watch

# Run with coverage
yarn test:coverage

# Open coverage report
open coverage/index.html

# Run specific test file
yarn test SampleForm.test.tsx
```

---

## 🚢 Build & Deployment

### Development Build

```bash
# Start development server
yarn dev

# Build without type checking (faster)
yarn build --mode development
```

### Production Build

```bash
# Build for production
yarn build

# Preview production build
yarn preview

# Analyze bundle size
yarn build --analyze
```

### Docker Deployment

```bash
# Build Docker image
docker build -t microplate/frontend:latest .

# Run container
docker run -d \
  --name microplate-frontend \
  -p 6410:80 \
  microplate/frontend:latest

# Using Docker Compose
docker-compose up -d

# View logs
docker-compose logs -f
```

### Nginx Configuration

```nginx
# nginx.conf
events {
    worker_connections 1024;
}

http {
    include /etc/nginx/mime.types;
    default_type application/octet-stream;

    # Gzip compression
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_types text/plain text/css text/xml text/javascript 
               application/x-javascript application/xml+rss 
               application/javascript application/json;

    server {
        listen 80;
        server_name localhost;
        root /usr/share/nginx/html;
        index index.html;

        # Security headers
        add_header X-Frame-Options "DENY" always;
        add_header X-Content-Type-Options "nosniff" always;
        add_header X-XSS-Protection "1; mode=block" always;

        # Serve static files
        location / {
            try_files $uri $uri/ /index.html;
        }

        # Cache static assets
        location ~* \.(js|css|png|jpg|jpeg|gif|svg|ico|woff|woff2|ttf|eot)$ {
            expires 1y;
            add_header Cache-Control "public, immutable";
        }

        # Don't cache index.html
        location = /index.html {
            add_header Cache-Control "no-cache, no-store, must-revalidate";
        }
    }
}
```

---

## 🐛 Troubleshooting

### Build Errors

**Issue:** `Module not found` errors

```bash
# Clear cache and reinstall
rm -rf node_modules yarn.lock
yarn install

# Clear Vite cache
rm -rf node_modules/.vite
yarn dev
```

**Issue:** TypeScript errors

```bash
# Regenerate types
yarn type-check

# Check tsconfig.json is correct
cat tsconfig.json
```

### Runtime Errors

**Issue:** Blank page in production

```bash
# Check if build completed successfully
ls -la dist/

# Check for errors in browser console
# Open DevTools (F12) > Console

# Test production build locally
yarn preview

# Check base path in vite.config.ts
base: '/'  # Should match deployment path
```

**Issue:** API calls failing

```bash
# Check environment variables
echo $VITE_RESULTS_SERVICE_URL

# Verify services are running
curl http://localhost:6404/healthz

# Check CORS configuration on backend
# See backend service CORS settings
```

### Performance Issues

**Issue:** Slow page load

```bash
# Analyze bundle size
yarn build --analyze

# Check for large dependencies
yarn why package-name

# Use code splitting
const CapturePage = lazy(() => import('./pages/CapturePage'));
```

**Issue:** Memory leaks

```bash
# Profile in browser
# Chrome DevTools > Memory > Take heap snapshot

# Check for unclosed WebSocket connections
# Check for uncleared intervals/timeouts
# Use cleanup in useEffect
```

---

## 🎨 Design System

### Color Scheme

```typescript
// Tailwind color classes
const colors = {
  // Status colors
  positive: 'text-green-600 bg-green-50',
  negative: 'text-red-600 bg-red-50',
  pending: 'text-yellow-600 bg-yellow-50',
  
  // UI colors
  primary: 'text-blue-600 bg-blue-600',
  secondary: 'text-gray-600 bg-gray-200',
  success: 'text-green-600 bg-green-600',
  danger: 'text-red-600 bg-red-600',
};
```

### Typography

```typescript
// Font sizes
const typography = {
  xs: 'text-xs',      // 0.75rem
  sm: 'text-sm',      // 0.875rem
  base: 'text-base',  // 1rem
  lg: 'text-lg',      // 1.125rem
  xl: 'text-xl',      // 1.25rem
  '2xl': 'text-2xl',  // 1.5rem
  '3xl': 'text-3xl',  // 1.875rem
};
```

### Component Patterns

```typescript
// Consistent component structure
export interface ComponentProps {
  className?: string;
  children?: React.ReactNode;
}

export const Component: React.FC<ComponentProps> = ({
  className = '',
  children,
}) => {
  return (
    <div className={`base-styles ${className}`}>
      {children}
    </div>
  );
};
```

---

## 📦 Available Scripts

### Development

```bash
yarn dev              # Start development server
yarn dev --port 3000  # Start on custom port
yarn dev --host       # Expose to network
```

### Build

```bash
yarn build            # Production build
yarn preview          # Preview production build
yarn build:analyze    # Analyze bundle size
```

### Code Quality

```bash
yarn lint             # Run ESLint
yarn lint:fix         # Fix linting issues
yarn format           # Format with Prettier
yarn type-check       # TypeScript type checking
```

### Testing

```bash
yarn test             # Run tests
yarn test:watch       # Watch mode
yarn test:coverage    # With coverage report
yarn test:ui          # Interactive UI
```

### Dependencies

```bash
yarn install          # Install dependencies
yarn add package      # Add dependency
yarn upgrade          # Update dependencies
yarn outdated         # Check outdated packages
```

---

## 📚 Key Dependencies

### Core Dependencies

```json
{
  "dependencies": {
    "react": "^18.2.0",
    "react-dom": "^18.2.0",
    "react-router-dom": "^6.20.0",
    "@tanstack/react-query": "^5.17.0",
    "react-hook-form": "^7.49.0",
    "zod": "^3.22.0",
    "@headlessui/react": "^1.7.0",
    "@heroicons/react": "^2.1.0",
    "recharts": "^2.10.0",
    "date-fns": "^3.0.0"
  },
  "devDependencies": {
    "@vitejs/plugin-react": "^4.2.0",
    "vite": "^5.0.0",
    "typescript": "^5.3.0",
    "tailwindcss": "^3.4.0",
    "autoprefixer": "^10.4.0",
    "postcss": "^8.4.0",
    "eslint": "^8.56.0",
    "prettier": "^3.1.0",
    "vitest": "^1.1.0"
  }
}
```

---

## 🔐 Security

### Authentication Flow

```typescript
// Store tokens securely
localStorage.setItem('accessToken', token);
localStorage.setItem('refreshToken', refreshToken);

// Add to request headers
headers: {
  'Authorization': `Bearer ${localStorage.getItem('accessToken')}`
}

// Clear on logout
localStorage.removeItem('accessToken');
localStorage.removeItem('refreshToken');
```

### XSS Prevention

```typescript
// Always sanitize user input
import DOMPurify from 'dompurify';

const sanitized = DOMPurify.sanitize(userInput);

// Use React's built-in escaping
<div>{userInput}</div>  // Safe - React escapes automatically

// Dangerous (avoid):
<div dangerouslySetInnerHTML={{ __html: userInput }} />  // Unsafe!
```

---

## 📞 Support

### Documentation

- 📖 [Frontend Design Guide](../docs/10-Frontend-Design.md)
- 🎨 [Component Library](./src/components/README.md)
- 🔧 [Troubleshooting](../docs/16-Troubleshooting-Guide.md)

### Getting Help

- Check browser DevTools console for errors
- Review network tab for failed API calls
- Check service health endpoints
- Review application logs

---

## 📄 License

Part of the Microplate AI System - MIT License

---

<div align="center">

**Microplate Frontend** - Professional React + TypeScript Application

[Main README](../README.md) • [Backend Services](../microplate-be/) • [Device Services](../microplate-device/)

</div>
