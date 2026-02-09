# Frontend Design - Complete Specification

## Overview

The Frontend is a React-based web application that provides a clean, professional interface for the Microplate AI System. It features a white background design with premium aesthetics and intuitive user experience.

## Technology Stack

- **Framework**: React 18+
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **State Management**: TanStack Query (React Query)
- **Routing**: React Router v6
- **Forms**: React Hook Form + Zod
- **UI Components**: Headless UI + Custom Components
- **Icons**: Heroicons
- **Charts**: Chart.js / Recharts
- **WebSocket**: Native WebSocket API
- **Build Tool**: Vite
- **Package Manager**: Yarn

## Project Structure

```typescript
// Project structure
frontend/
├── src/
│   ├── components/
│   │   ├── ui/
│   │   │   ├── Button.tsx
│   │   │   ├── Input.tsx
│   │   │   ├── Modal.tsx
│   │   │   ├── Card.tsx
│   │   │   ├── Badge.tsx
│   │   │   ├── Spinner.tsx
│   │   │   └── Toast.tsx
│   │   ├── layout/
│   │   │   ├── AppShell.tsx
│   │   │   ├── Header.tsx
│   │   │   ├── Sidebar.tsx
│   │   │   └── Footer.tsx
│   │   ├── capture/
│   │   │   ├── SampleForm.tsx
│   │   │   ├── ImagePanel.tsx
│   │   │   ├── ActionsBar.tsx
│   │   │   ├── QRScanner.tsx
│   │   │   ├── CameraPreview.tsx
│   │   │   ├── ImageUpload.tsx
│   │   │   ├── ImageCapture.tsx
│   │   │   ├── CameraStatus.tsx
│   │   │   └── SystemLogs.tsx
│   │   ├── results/
│   │   │   ├── PredictTab.tsx
│   │   │   ├── SummaryTab.tsx
│   │   │   ├── ResultsTable.tsx
│   │   │   ├── WellGrid.tsx
│   │   │   └── ConfidenceChart.tsx
│   │   ├── auth/
│   │   │   ├── LoginForm.tsx
│   │   │   ├── RegisterForm.tsx
│   │   │   ├── ForgotPasswordForm.tsx
│   │   │   └── ResetPasswordForm.tsx
│   │   └── common/
│   │       ├── LoadingSpinner.tsx
│   │       ├── ErrorBoundary.tsx
│   │       ├── ConfirmDialog.tsx
│   │       └── StatusIndicator.tsx
│   ├── pages/
│   │   ├── CapturePage.tsx
│   │   ├── SampleHistoryPage.tsx
│   │   ├── LoginPage.tsx
│   │   ├── RegisterPage.tsx
│   │   ├── ForgotPasswordPage.tsx
│   │   ├── ResetPasswordPage.tsx
│   │   └── NotFoundPage.tsx
│   ├── hooks/
│   │   ├── useAuth.ts
│   │   ├── useWebSocket.ts
│   │   ├── useCapture.ts
│   │   ├── useResults.ts
│   │   ├── useResultsNew.ts
│   │   ├── useResultsDirect.ts
│   │   └── useInterface.ts
│   ├── services/
│   │   ├── api.ts
│   │   ├── auth.service.ts
│   │   ├── image.service.ts
│   │   ├── vision.service.ts
│   │   ├── results.service.ts
│   │   ├── results.service.direct.ts
│   │   ├── results.service.new.ts
│   │   ├── labware.service.ts
│   │   ├── capture.service.ts
│   │   ├── logs.service.ts
│   │   ├── notification.service.ts
│   │   └── search.service.ts
│   │   └── websocket.service.ts
│   ├── store/
│   │   ├── auth.store.ts
│   │   ├── capture.store.ts
│   │   └── ui.store.ts
│   ├── utils/
│   │   ├── validation.ts
│   │   ├── formatting.ts
│   │   ├── constants.ts
│   │   └── helpers.ts
│   ├── types/
│   │   ├── auth.types.ts
│   │   ├── capture.types.ts
│   │   ├── results.types.ts
│   │   └── common.types.ts
│   ├── styles/
│   │   ├── globals.css
│   │   ├── components.css
│   │   └── utilities.css
│   ├── App.tsx
│   ├── main.tsx
│   └── vite-env.d.ts
├── public/
│   ├── favicon.ico
│   ├── logo.svg
│   └── images/
├── package.json
├── tailwind.config.js
├── tsconfig.json
├── vite.config.ts
└── .env.example
```

## Design System

### Color Palette
```css
:root {
  /* Primary Colors */
  --color-primary-50: #eff6ff;
  --color-primary-100: #dbeafe;
  --color-primary-200: #bfdbfe;
  --color-primary-300: #93c5fd;
  --color-primary-400: #60a5fa;
  --color-primary-500: #3b82f6;
  --color-primary-600: #2563eb;
  --color-primary-700: #1d4ed8;
  --color-primary-800: #1e40af;
  --color-primary-900: #1e3a8a;

  /* Neutral Colors */
  --color-gray-50: #f9fafb;
  --color-gray-100: #f3f4f6;
  --color-gray-200: #e5e7eb;
  --color-gray-300: #d1d5db;
  --color-gray-400: #9ca3af;
  --color-gray-500: #6b7280;
  --color-gray-600: #4b5563;
  --color-gray-700: #374151;
  --color-gray-800: #1f2937;
  --color-gray-900: #111827;

  /* Status Colors */
  --color-success-500: #10b981;
  --color-warning-500: #f59e0b;
  --color-error-500: #ef4444;
  --color-info-500: #3b82f6;

  /* Background */
  --color-background: #ffffff;
  --color-surface: #f9fafb;
  --color-surface-elevated: #ffffff;
}
```

### Typography
```css
/* Font Families */
.font-sans {
  font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
}

.font-mono {
  font-family: 'JetBrains Mono', 'Fira Code', monospace;
}

/* Font Sizes */
.text-xs { font-size: 0.75rem; line-height: 1rem; }
.text-sm { font-size: 0.875rem; line-height: 1.25rem; }
.text-base { font-size: 1rem; line-height: 1.5rem; }
.text-lg { font-size: 1.125rem; line-height: 1.75rem; }
.text-xl { font-size: 1.25rem; line-height: 1.75rem; }
.text-2xl { font-size: 1.5rem; line-height: 2rem; }
.text-3xl { font-size: 1.875rem; line-height: 2.25rem; }
.text-4xl { font-size: 2.25rem; line-height: 2.5rem; }
```

### Spacing System
```css
/* Spacing Scale */
.space-1 { margin: 0.25rem; }
.space-2 { margin: 0.5rem; }
.space-3 { margin: 0.75rem; }
.space-4 { margin: 1rem; }
.space-6 { margin: 1.5rem; }
.space-8 { margin: 2rem; }
.space-12 { margin: 3rem; }
.space-16 { margin: 4rem; }
.space-20 { margin: 5rem; }
.space-24 { margin: 6rem; }
```

## Component Specifications

### App Shell
```tsx
// AppShell.tsx
export const AppShell: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return (
    <div className="min-h-screen bg-white">
      <Header />
      <main className="flex-1">
        {children}
      </main>
      <Footer />
    </div>
  );
};
```

### Header Component
```tsx
// Header.tsx
export const Header: React.FC = () => {
  const { user, logout } = useAuth();

  return (
    <header className="bg-white border-b border-gray-200 px-6 py-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <img src="/logo.svg" alt="Microplate AI" className="h-8 w-8" />
          <h1 className="text-xl font-semibold text-gray-900">Microplate AI</h1>
        </div>
        
        <div className="flex items-center space-x-4">
          <StatusIndicator />
          <UserMenu user={user} onLogout={logout} />
        </div>
      </div>
    </header>
  );
};
```

### Sample Form Component
```tsx
// SampleForm.tsx
export const SampleForm: React.FC = () => {
  const { captureImage, isCapturing } = useCapture();
  const { register, handleSubmit, formState: { errors } } = useForm<SampleFormData>({
    resolver: zodResolver(sampleFormSchema)
  });

  const onSubmit = async (data: SampleFormData) => {
    try {
      await captureImage(data);
    } catch (error) {
      toast.error('Failed to capture image');
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Sample Number
          </label>
          <Input
            {...register('sampleNo')}
            placeholder="Enter sample number"
            error={errors.sampleNo?.message}
          />
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Submission Number
          </label>
          <Input
            {...register('submissionNo')}
            placeholder="Enter submission number"
            error={errors.submissionNo?.message}
          />
        </div>
      </div>
      
      <div className="flex space-x-3">
        <Button
          type="submit"
          loading={isCapturing}
          className="flex-1"
        >
          {isCapturing ? 'Capturing...' : 'Capture Image'}
        </Button>
        
        <Button
          type="button"
          variant="outline"
          onClick={() => {/* QR Scanner */}}
        >
          <QrCodeIcon className="h-4 w-4 mr-2" />
          Scan QR
        </Button>
      </div>
    </form>
  );
};
```

### Image Panel Component
```tsx
// ImagePanel.tsx
export const ImagePanel: React.FC = () => {
  const { currentImage, isProcessing } = useCapture();
  const { lastRun } = useResults();

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
      <div className="aspect-video bg-gray-50 rounded-xl overflow-hidden relative">
        {currentImage ? (
          <img
            src={currentImage.url}
            alt="Captured microplate"
            className="w-full h-full object-contain"
          />
        ) : (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <CameraIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500">No image captured</p>
            </div>
          </div>
        )}
        
        {isProcessing && (
          <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center">
            <div className="bg-white rounded-lg p-4 flex items-center space-x-3">
              <Spinner size="sm" />
              <span className="text-sm font-medium">Processing...</span>
            </div>
          </div>
        )}
      </div>
      
      {lastRun && (
        <div className="mt-4 p-4 bg-blue-50 rounded-lg">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-blue-900">
                Last Analysis: {formatDateTime(lastRun.predictAt)}
              </p>
              <p className="text-xs text-blue-700">
                Confidence: {(lastRun.statistics.averageConfidence * 100).toFixed(1)}%
              </p>
            </div>
            <Badge variant="success">
              {lastRun.status}
            </Badge>
          </div>
        </div>
      )}
    </div>
  );
};
```

### Results Tabs Component
```tsx
// ResultsTabs.tsx
export const ResultsTabs: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'predict' | 'summary'>('predict');
  const { sampleNo } = useCapture();
  const { data: sampleData, isLoading } = useSampleData(sampleNo);

  if (!sampleNo) {
    return (
      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
        <div className="text-center text-gray-500">
          <ChartBarIcon className="h-12 w-12 mx-auto mb-4" />
          <p>Select a sample to view results</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-200">
      <div className="border-b border-gray-200">
        <nav className="flex space-x-8 px-6">
          <button
            onClick={() => setActiveTab('predict')}
            className={`py-4 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'predict'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            Prediction Results
          </button>
          <button
            onClick={() => setActiveTab('summary')}
            className={`py-4 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'summary'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            Summary
          </button>
        </nav>
      </div>
      
      <div className="p-6">
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Spinner size="lg" />
          </div>
        ) : activeTab === 'predict' ? (
          <PredictTab sampleData={sampleData} />
        ) : (
          <SummaryTab sampleData={sampleData} />
        )}
      </div>
    </div>
  );
};
```

### Predict Tab Component
```tsx
// PredictTab.tsx
export const PredictTab: React.FC<{ sampleData: SampleData }> = ({ sampleData }) => {
  const { lastRun } = sampleData;

  if (!lastRun) {
    return (
      <div className="text-center text-gray-500 py-8">
        <BeakerIcon className="h-12 w-12 mx-auto mb-4" />
        <p>No prediction results available</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <StatCard
          title="Total Wells"
          value={lastRun.statistics.totalDetections}
          icon={Squares2X2Icon}
        />
        <StatCard
          title="Positive"
          value={lastRun.statistics.positiveCount}
          icon={CheckCircleIcon}
          color="success"
        />
        <StatCard
          title="Negative"
          value={lastRun.statistics.negativeCount}
          icon={XCircleIcon}
          color="error"
        />
        <StatCard
          title="Confidence"
          value={`${(lastRun.statistics.averageConfidence * 100).toFixed(1)}%`}
          icon={ChartBarIcon}
          color="info"
        />
      </div>

      {/* Well Grid */}
      <div>
        <h3 className="text-lg font-medium text-gray-900 mb-4">Well Analysis</h3>
        <WellGrid predictions={lastRun.wellPredictions} />
      </div>

      {/* Confidence Chart */}
      <div>
        <h3 className="text-lg font-medium text-gray-900 mb-4">Confidence Distribution</h3>
        <ConfidenceChart predictions={lastRun.wellPredictions} />
      </div>
    </div>
  );
};
```

### Summary Tab Component
```tsx
// SummaryTab.tsx
export const SummaryTab: React.FC<{ sampleData: SampleData }> = ({ sampleData }) => {
  const { summary, totalRuns } = sampleData;

  if (!summary) {
    return (
      <div className="text-center text-gray-500 py-8">
        <ChartPieIcon className="h-12 w-12 mx-auto mb-4" />
        <p>No summary data available</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <SummaryCard
          title="Distribution"
          data={summary.distribution}
          type="distribution"
        />
        <SummaryCard
          title="Concentration"
          data={summary.concentration}
          type="percentage"
        />
        <SummaryCard
          title="Quality Metrics"
          data={summary.qualityMetrics}
          type="metrics"
        />
      </div>

      {/* Trend Chart */}
      <div>
        <h3 className="text-lg font-medium text-gray-900 mb-4">Analysis Trend</h3>
        <TrendChart sampleData={sampleData} />
      </div>

      {/* Run History */}
      <div>
        <h3 className="text-lg font-medium text-gray-900 mb-4">
          Run History ({totalRuns} runs)
        </h3>
        <RunHistoryTable sampleData={sampleData} />
      </div>
    </div>
  );
};
```

## Page Layouts

### Capture Page Layout
```tsx
// CapturePage.tsx
export const CapturePage: React.FC = () => {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Column - Sample Input */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-6">
                Sample Information
              </h2>
              <SampleForm />
            </div>
          </div>

          {/* Center Column - Image Display */}
          <div className="lg:col-span-1">
            <ImagePanel />
          </div>

          {/* Right Column - Results */}
          <div className="lg:col-span-1">
            <ResultsTabs />
          </div>
        </div>

        {/* Action Bar */}
        <div className="mt-8">
          <ActionsBar />
        </div>
      </div>
    </div>
  );
};
```

### Sample History Page Layout
```tsx
// SampleHistoryPage.tsx
export const SampleHistoryPage: React.FC = () => {
  const { data: samples, isLoading } = useSamples();

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900">Sample History</h1>
          <p className="text-gray-600 mt-2">
            View and manage all analyzed samples
          </p>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Spinner size="lg" />
          </div>
        ) : (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200">
            <SamplesTable samples={samples} />
          </div>
        )}
      </div>
    </div>
  );
};
```

## Custom Hooks

### useAuth Hook
```tsx
// useAuth.ts
export const useAuth = () => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const login = async (credentials: LoginCredentials) => {
    const response = await authService.login(credentials);
    setUser(response.user);
    localStorage.setItem('accessToken', response.accessToken);
    localStorage.setItem('refreshToken', response.refreshToken);
  };

  const logout = async () => {
    await authService.logout();
    setUser(null);
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
  };

  const refreshToken = async () => {
    const refreshToken = localStorage.getItem('refreshToken');
    if (!refreshToken) throw new Error('No refresh token');

    const response = await authService.refresh(refreshToken);
    setUser(response.user);
    localStorage.setItem('accessToken', response.accessToken);
    localStorage.setItem('refreshToken', response.refreshToken);
  };

  useEffect(() => {
    const initAuth = async () => {
      const token = localStorage.getItem('accessToken');
      if (token) {
        try {
          const user = await authService.getCurrentUser();
          setUser(user);
        } catch (error) {
          // Token expired, try refresh
          try {
            await refreshToken();
          } catch {
            // Refresh failed, clear auth
            logout();
          }
        }
      }
      setIsLoading(false);
    };

    initAuth();
  }, []);

  return { user, isLoading, login, logout, refreshToken };
};
```

### useCapture Hook
```tsx
// useCapture.ts
export const useCapture = () => {
  const [currentImage, setCurrentImage] = useState<CapturedImage | null>(null);
  const [isCapturing, setIsCapturing] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  const captureImage = async (data: SampleFormData) => {
    setIsCapturing(true);
    try {
      const response = await captureService.capture(data);
      setCurrentImage(response);
    } finally {
      setIsCapturing(false);
    }
  };

  const predictImage = async () => {
    if (!currentImage) return;

    setIsProcessing(true);
    try {
      await inferenceService.predict({
        sampleNo: currentImage.sampleNo,
        imagePath: currentImage.imagePath
      });
    } finally {
      setIsProcessing(false);
    }
  };

  return {
    currentImage,
    isCapturing,
    isProcessing,
    captureImage,
    predictImage
  };
};
```

### useWebSocket Hook
```tsx
// useWebSocket.ts
export const useWebSocket = (url: string) => {
  const [socket, setSocket] = useState<WebSocket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [lastMessage, setLastMessage] = useState<any>(null);

  useEffect(() => {
    const ws = new WebSocket(url);
    
    ws.onopen = () => {
      setIsConnected(true);
      setSocket(ws);
    };

    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      setLastMessage(data);
    };

    ws.onclose = () => {
      setIsConnected(false);
      setSocket(null);
    };

    ws.onerror = (error) => {
      console.error('WebSocket error:', error);
    };

    return () => {
      ws.close();
    };
  }, [url]);

  const sendMessage = (message: any) => {
    if (socket && isConnected) {
      socket.send(JSON.stringify(message));
    }
  };

  return { socket, isConnected, lastMessage, sendMessage };
};
```

## API Integration

### API Service
```tsx
// api.ts
class ApiService {
  private baseURL: string;
  private accessToken: string | null = null;

  constructor(baseURL: string) {
    this.baseURL = baseURL;
  }

  setAccessToken(token: string) {
    this.accessToken = token;
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${this.baseURL}${endpoint}`;
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
      ...options.headers,
    };

    if (this.accessToken) {
      headers.Authorization = `Bearer ${this.accessToken}`;
    }

    const response = await fetch(url, {
      ...options,
      headers,
    });

    if (!response.ok) {
      throw new ApiError(response.status, await response.text());
    }

    return response.json();
  }

  async get<T>(endpoint: string): Promise<T> {
    return this.request<T>(endpoint, { method: 'GET' });
  }

  async post<T>(endpoint: string, data?: any): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'POST',
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  async put<T>(endpoint: string, data?: any): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'PUT',
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  async delete<T>(endpoint: string): Promise<T> {
    return this.request<T>(endpoint, { method: 'DELETE' });
  }
}

export const apiService = new ApiService(import.meta.env.VITE_API_BASE_URL);
```

## Environment Configuration

```bash
# API Configuration
VITE_API_BASE_URL=http://localhost:6400
VITE_WS_URL=ws://localhost:6404/api/v1/results/ws

# Application
VITE_APP_NAME=Microplate AI
VITE_APP_VERSION=1.0.0
VITE_APP_DESCRIPTION=AI-powered microplate analysis system

# Features
VITE_ENABLE_QR_SCANNER=true
VITE_ENABLE_WEBSOCKET=true
VITE_ENABLE_ANALYTICS=false

# Development
VITE_DEBUG_MODE=false
VITE_MOCK_API=false
```

## Responsive Design

### Breakpoints
```css
/* Tailwind CSS breakpoints */
sm: 640px   /* Small devices */
md: 768px   /* Medium devices */
lg: 1024px  /* Large devices */
xl: 1280px  /* Extra large devices */
2xl: 1536px /* 2X large devices */
```

### Mobile Layout
```tsx
// Mobile-optimized capture page
export const MobileCapturePage: React.FC = () => {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Mobile header */}
      <div className="bg-white border-b border-gray-200 px-4 py-3">
        <h1 className="text-lg font-semibold text-gray-900">Capture</h1>
      </div>

      {/* Mobile content */}
      <div className="p-4 space-y-4">
        {/* Sample form - full width on mobile */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
          <SampleForm />
        </div>

        {/* Image panel - full width on mobile */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
          <ImagePanel />
        </div>

        {/* Results - collapsible on mobile */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200">
          <ResultsTabs />
        </div>
      </div>
    </div>
  );
};
```

## Accessibility Features

### ARIA Labels and Roles
```tsx
// Accessible button component
export const Button: React.FC<ButtonProps> = ({
  children,
  loading,
  disabled,
  ...props
}) => {
  return (
    <button
      {...props}
      disabled={disabled || loading}
      aria-disabled={disabled || loading}
      aria-label={loading ? 'Loading...' : undefined}
    >
      {loading && <Spinner size="sm" className="mr-2" />}
      {children}
    </button>
  );
};
```

### Keyboard Navigation
```tsx
// Keyboard navigation for tabs
export const AccessibleTabs: React.FC = () => {
  const [activeTab, setActiveTab] = useState(0);
  const tabRefs = useRef<(HTMLButtonElement | null)[]>([]);

  const handleKeyDown = (event: KeyboardEvent) => {
    if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
      event.preventDefault();
      const direction = event.key === 'ArrowLeft' ? -1 : 1;
      const newIndex = (activeTab + direction + tabs.length) % tabs.length;
      setActiveTab(newIndex);
      tabRefs.current[newIndex]?.focus();
    }
  };

  return (
    <div role="tablist" onKeyDown={handleKeyDown}>
      {tabs.map((tab, index) => (
        <button
          key={tab.id}
          ref={(el) => (tabRefs.current[index] = el)}
          role="tab"
          aria-selected={activeTab === index}
          tabIndex={activeTab === index ? 0 : -1}
          onClick={() => setActiveTab(index)}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
};
```

## Performance Optimization

### Code Splitting
```tsx
// Lazy loading for pages
const CapturePage = lazy(() => import('./pages/CapturePage'));
const SampleHistoryPage = lazy(() => import('./pages/SampleHistoryPage'));

// Route with Suspense
<Route
  path="/capture"
  element={
    <Suspense fallback={<LoadingSpinner />}>
      <CapturePage />
    </Suspense>
  }
/>
```

### Image Optimization
```tsx
// Optimized image component
export const OptimizedImage: React.FC<ImageProps> = ({
  src,
  alt,
  ...props
}) => {
  const [isLoaded, setIsLoaded] = useState(false);
  const [hasError, setHasError] = useState(false);

  return (
    <div className="relative">
      {!isLoaded && !hasError && (
        <div className="absolute inset-0 bg-gray-200 animate-pulse rounded" />
      )}
      <img
        src={src}
        alt={alt}
        onLoad={() => setIsLoaded(true)}
        onError={() => setHasError(true)}
        className={`transition-opacity duration-300 ${
          isLoaded ? 'opacity-100' : 'opacity-0'
        }`}
        {...props}
      />
    </div>
  );
};
```

## Testing Strategy

### Unit Tests
```tsx
// Component testing with React Testing Library
import { render, screen, fireEvent } from '@testing-library/react';
import { SampleForm } from './SampleForm';

test('submits form with valid data', async () => {
  const mockOnSubmit = jest.fn();
  render(<SampleForm onSubmit={mockOnSubmit} />);

  fireEvent.change(screen.getByLabelText('Sample Number'), {
    target: { value: 'S123456' }
  });
  fireEvent.change(screen.getByLabelText('Submission Number'), {
    target: { value: 'SUB789' }
  });
  fireEvent.click(screen.getByRole('button', { name: 'Capture Image' }));

  expect(mockOnSubmit).toHaveBeenCalledWith({
    sampleNo: 'S123456',
    submissionNo: 'SUB789'
  });
});
```

### Integration Tests
```tsx
// API integration testing
import { apiService } from './api';

test('captures image successfully', async () => {
  const mockResponse = {
    success: true,
    data: {
      capture_id: 'uuid',
      sample_no: 'S123456',
      image_url: 'https://example.com/image.jpg'
    }
  };

  global.fetch = jest.fn().mockResolvedValue({
    ok: true,
    json: () => Promise.resolve(mockResponse)
  });

  const result = await apiService.post('/capture', {
    sample_no: 'S123456'
  });

  expect(result).toEqual(mockResponse);
});
```

## Deployment Configuration

### Vite Configuration
```typescript
// vite.config.ts
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  build: {
    outDir: 'dist',
    sourcemap: true,
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom'],
          ui: ['@headlessui/react', '@heroicons/react'],
          utils: ['react-hook-form', 'zod', 'date-fns'],
        },
      },
    },
  },
  server: {
    port: 3000,
    proxy: {
      '/api': {
        target: 'http://localhost:6400',
        changeOrigin: true,
      },
    },
  },
});
```

### Docker Configuration
```dockerfile
# Dockerfile
FROM node:18-alpine as builder

WORKDIR /app
COPY package.json yarn.lock ./
RUN yarn install --frozen-lockfile

COPY . .
RUN yarn build

FROM nginx:alpine
COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/nginx.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
```
