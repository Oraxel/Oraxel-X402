# Frontend Integration Guide
## Oraxel Backend API - Complete Integration Instructions

---

## Table of Contents
1. [Setup & Configuration](#setup--configuration)
2. [Authentication](#authentication)
3. [API Endpoints](#api-endpoints)
4. [WebSocket Integration](#websocket-integration)
5. [Complete Demo Flow](#complete-demo-flow)
6. [Example React Component](#example-react-component)
7. [Error Handling](#error-handling)
8. [TypeScript Types](#typescript-types)

---

## Setup & Configuration

### Base URL
```typescript
const API_BASE_URL = 'http://localhost:3001/api'; // Development
// const API_BASE_URL = 'https://api.oraxel.com/api'; // Production
```

### WebSocket URL
```typescript
const WS_URL = 'http://localhost:3001'; // Development
// const WS_URL = 'https://api.oraxel.com'; // Production
```

### API Key (Optional in Demo Mode)
```typescript
const API_KEY = process.env.REACT_APP_ORAXEL_API_KEY || 'demo-key';
```

---

## Authentication

### In Demo Mode
Authentication is optional. If `ORAXEL_MODE=demo` and `REQUIRE_AUTH` is not set, requests work without auth.

### In Production
Include API key in headers:
```typescript
const headers = {
  'Content-Type': 'application/json',
  'x-api-key': API_KEY, // or use JWT token
};
```

### Alternative: JWT Token
```typescript
const headers = {
  'Content-Type': 'application/json',
  'Authorization': `Bearer ${jwtToken}`,
};
```

---

## API Endpoints

### 1. Create Oracle Job

**Endpoint:** `POST /api/jobs`

**Request:**
```typescript
interface CreateJobRequest {
  type: 'random' | 'price' | 'webhook';
  parameters: {
    // For random: { min: number, max: number }
    // For price: { pair: string }
    // For webhook: { url: string }
  };
}

const createJob = async (type: string, parameters: object) => {
  const response = await fetch(`${API_BASE_URL}/jobs`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': API_KEY, // Optional in demo
    },
    body: JSON.stringify({ type, parameters }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Failed to create job');
  }

  return response.json();
};
```

**Response:**
```typescript
interface CreateJobResponse {
  jobId: string;
  status: 'pending_payment';
  paymentRequest: {
    paymentUrl: string;
    amount: number; // 0.003
    currency: string; // "SOL"
  };
}
```

**Example Usage:**
```typescript
// Create random oracle job
const job = await createJob('random', { min: 1, max: 402 });

// Create price feed job
const priceJob = await createJob('price', { pair: 'SOL/USDC' });

// Create webhook job
const webhookJob = await createJob('webhook', { 
  url: 'https://your-app.com/webhook' 
});
```

---

### 2. Confirm Payment (Demo Mode)

**Endpoint:** `POST /api/jobs/:id/confirm-payment`

**Note:** In demo mode, this simulates payment. In production, x402 will call your webhook.

```typescript
const confirmPayment = async (jobId: string) => {
  const response = await fetch(`${API_BASE_URL}/jobs/${jobId}/confirm-payment`, {
    method: 'POST',
    headers: {
      'x-api-key': API_KEY, // Optional in demo
    },
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Failed to confirm payment');
  }

  return response.json();
};
```

**Response:**
```typescript
interface JobResponse {
  id: string;
  type: 'random' | 'price' | 'webhook';
  parameters: object;
  status: 'query_in_progress' | 'completed' | 'failed';
  result?: {
    // Random: { value: number, min: number, max: number, timestamp: string }
    // Price: { pair: string, price: number, timestamp: string, source: string }
    // Webhook: { url: string, status: string, message: string, timestamp: string }
  };
  createdAt: string;
  updatedAt: string;
}
```

---

### 3. Get Job Status (x402-Compliant)

**Endpoint:** `GET /api/jobs/:id`

**x402 Protocol Flow:**
- First request may return `402 Payment Required` if payment needed
- Retry with `X-402-Payment` header after processing payment
- Returns `200 OK` with job data after payment verified

```typescript
const getJobStatus = async (jobId: string, paymentProof?: string) => {
  const headers: Record<string, string> = {
    'x-api-key': API_KEY, // Optional in demo
  };

  // Include payment header if provided (x402 protocol)
  if (paymentProof) {
    headers['X-402-Payment'] = paymentProof;
  }

  const response = await fetch(`${API_BASE_URL}/jobs/${jobId}`, {
    headers,
  });

  // Handle 402 Payment Required (x402 protocol)
  if (response.status === 402) {
    const paymentInfo = await response.json();
    return {
      status: 402,
      payment: paymentInfo.payment,
      jobId: paymentInfo.jobId,
      message: paymentInfo.message,
    };
  }

  if (!response.ok) {
    if (response.status === 404) {
      throw new Error('Job not found');
    }
    const error = await response.json();
    throw new Error(error.message || 'Failed to get job status');
  }

  return response.json();
};
```

**Response:**
- **402 Payment Required**: `{ payment: PaymentInstructions, jobId: string, message?: string }`
- **200 OK**: `JobResponse` (same as above)

---

### 4. List Jobs (with Pagination)

**Endpoint:** `GET /api/jobs?limit=50&offset=0&status=completed&type=random`

```typescript
interface ListJobsParams {
  limit?: number; // Default: 50
  offset?: number; // Default: 0
  status?: 'pending_payment' | 'payment_confirmed' | 'query_in_progress' | 'completed' | 'failed';
  type?: 'random' | 'price' | 'webhook';
}

const listJobs = async (params: ListJobsParams = {}) => {
  const queryParams = new URLSearchParams();
  if (params.limit) queryParams.append('limit', params.limit.toString());
  if (params.offset) queryParams.append('offset', params.offset.toString());
  if (params.status) queryParams.append('status', params.status);
  if (params.type) queryParams.append('type', params.type);

  const response = await fetch(`${API_BASE_URL}/jobs?${queryParams}`, {
    headers: {
      'x-api-key': API_KEY, // Optional in demo
    },
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Failed to list jobs');
  }

  return response.json();
};
```

**Response:**
```typescript
interface ListJobsResponse {
  jobs: JobResponse[];
  pagination: {
    limit: number;
    offset: number;
    total: number;
    hasMore: boolean;
  };
}
```

---

### 5. Health Check

**Endpoint:** `GET /api/health`

```typescript
const checkHealth = async () => {
  const response = await fetch(`${API_BASE_URL}/health`);
  return response.json();
};
```

**Response:**
```typescript
interface HealthResponse {
  status: 'ok' | 'degraded';
  uptime: number; // seconds
  timestamp: string;
  services: {
    database: 'healthy' | 'unhealthy' | 'not_configured';
    redis: 'healthy' | 'unhealthy' | 'not_configured';
  };
  memory: {
    heapUsed: number; // MB
    heapTotal: number; // MB
    rss: number; // MB
  };
}
```

---

## WebSocket Integration

### Setup Socket.io Client

**Install:**
```bash
npm install socket.io-client
```

**Connect:**
```typescript
import io from 'socket.io-client';

const socket = io(WS_URL, {
  transports: ['websocket'],
  // Optional: Add auth if required
  // auth: {
  //   token: API_KEY,
  // },
});

socket.on('connect', () => {
  console.log('Connected to Oraxel WebSocket');
});

socket.on('disconnect', () => {
  console.log('Disconnected from Oraxel WebSocket');
});

socket.on('connect_error', (error) => {
  console.error('WebSocket connection error:', error);
});
```

### Subscribe to Job Updates

```typescript
// Subscribe to a specific job
socket.emit('subscribe:job', jobId);

// Listen for job updates
socket.on('job:updated', (data: {
  jobId: string;
  status: 'payment_confirmed' | 'query_in_progress' | 'completed' | 'failed';
  result?: any;
}) => {
  console.log('Job updated:', data);
  // Update your UI with the new status
});
```

### Complete WebSocket Hook Example

```typescript
import { useEffect, useState } from 'react';
import io from 'socket.io-client';

const useJobUpdates = (jobId: string | null) => {
  const [jobStatus, setJobStatus] = useState<string | null>(null);
  const [result, setResult] = useState<any>(null);

  useEffect(() => {
    if (!jobId) return;

    const socket = io(WS_URL);

    socket.on('connect', () => {
      socket.emit('subscribe:job', jobId);
    });

    socket.on('job:updated', (data) => {
      setJobStatus(data.status);
      if (data.result) {
        setResult(data.result);
      }
    });

    return () => {
      socket.disconnect();
    };
  }, [jobId]);

  return { jobStatus, result };
};
```

---

## Complete Demo Flow

### Option A: x402 Protocol Flow (Recommended)

```typescript
// 1. User selects oracle type and configures parameters
const handleCreateJob = async () => {
  try {
    // Create job
    const { jobId } = await createJob('random', {
      min: 1,
      max: 402,
    });

    // Store jobId
    setCurrentJobId(jobId);

    // Immediately request job status (will get 402 if payment needed)
    await handleGetJobStatus(jobId);
  } catch (error) {
    console.error('Failed to create job:', error);
  }
};

// 2. Get job status (handles 402 response)
const handleGetJobStatus = async (jobId: string) => {
  try {
    const result = await getJobStatus(jobId);

    // Check if payment required (402 response)
    if (result.status === 402) {
      setPaymentInfo(result.payment);
      setJobStatus('pending_payment');
      // Show payment UI
      return;
    }

    // Job retrieved successfully
    setJob(result);
    setJobStatus(result.status);

    // If in progress, subscribe to updates
    if (result.status === 'query_in_progress') {
      subscribeToJob(jobId);
    }
  } catch (error) {
    console.error('Failed to get job status:', error);
  }
};

// 3. Process payment and retry (x402 protocol)
const handleProcessPayment = async (jobId: string) => {
  try {
    // In demo mode, simulate payment
    // In production, process payment via facilitator
    const paymentProof = await processPaymentWithFacilitator(
      paymentInfo,
      jobId
    );

    // Retry request with payment header (x402 protocol)
    const job = await getJobStatus(jobId, paymentProof);

    // Payment verified, job processing
    setJobStatus(job.status);
    subscribeToJob(jobId);
  } catch (error) {
    console.error('Failed to process payment:', error);
  }
};
```

### Option B: Legacy Flow (Backward Compatible)

```typescript
// 1. User selects oracle type and configures parameters
const handleCreateJob = async () => {
  try {
    // Create job
    const { jobId, paymentRequest } = await createJob('random', {
      min: 1,
      max: 402,
    });

    // Store jobId
    setCurrentJobId(jobId);

    // Show payment request
    console.log('Payment required:', paymentRequest);
    // Display: "Pay 0.003 SOL via x402"

    // In demo mode, show "Simulate Payment" button
    // In production, redirect to paymentRequest.paymentUrl
  } catch (error) {
    console.error('Failed to create job:', error);
  }
};

// 2. User confirms payment (demo mode) - Legacy endpoint
const handleConfirmPayment = async () => {
  if (!currentJobId) return;

  try {
    // Confirm payment (triggers oracle execution)
    const job = await confirmPayment(currentJobId);

    // Job status will be 'query_in_progress'
    setJobStatus(job.status);

    // Subscribe to WebSocket for real-time updates
    subscribeToJob(currentJobId);
  } catch (error) {
    console.error('Failed to confirm payment:', error);
  }
};

// 3. Listen for completion via WebSocket
const subscribeToJob = (jobId: string) => {
  socket.emit('subscribe:job', jobId);

  socket.on('job:updated', (data) => {
    if (data.status === 'completed') {
      // Display result
      displayResult(data.result);
    } else if (data.status === 'failed') {
      // Display error
      displayError(data.result.error);
    } else {
      // Update status
      setJobStatus(data.status);
    }
  });
};

// 4. Fallback: Poll job status (if WebSocket unavailable)
const pollJobStatus = async (jobId: string) => {
  const interval = setInterval(async () => {
    try {
      const job = await getJobStatus(jobId);
      
      if (job.status === 'completed' || job.status === 'failed') {
        clearInterval(interval);
        displayResult(job.result);
      } else {
        setJobStatus(job.status);
      }
    } catch (error) {
      clearInterval(interval);
      console.error('Failed to poll job status:', error);
    }
  }, 2000); // Poll every 2 seconds

  return () => clearInterval(interval);
};
```

---

## Example React Component

```typescript
import React, { useState, useEffect } from 'react';
import io from 'socket.io-client';

const OraxelDemo: React.FC = () => {
  const [jobId, setJobId] = useState<string | null>(null);
  const [status, setStatus] = useState<string>('idle');
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [socket, setSocket] = useState<any>(null);

  // Initialize WebSocket
  useEffect(() => {
    const ws = io('http://localhost:3001');
    ws.on('connect', () => console.log('Connected'));
    setSocket(ws);

    return () => ws.disconnect();
  }, []);

  // Subscribe to job updates
  useEffect(() => {
    if (!jobId || !socket) return;

    socket.emit('subscribe:job', jobId);
    socket.on('job:updated', (data: any) => {
      setStatus(data.status);
      if (data.result) setResult(data.result);
    });

    return () => {
      socket.off('job:updated');
    };
  }, [jobId, socket]);

  const handleCreateRandomJob = async () => {
    try {
      setError(null);
      setStatus('creating');

      const response = await fetch('http://localhost:3001/api/jobs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'random',
          parameters: { min: 1, max: 402 },
        }),
      });

      const data = await response.json();
      setJobId(data.jobId);
      setStatus('pending_payment');
    } catch (err: any) {
      setError(err.message);
      setStatus('idle');
    }
  };

  const handleConfirmPayment = async () => {
    if (!jobId) return;

    try {
      setStatus('confirming_payment');

      const response = await fetch(
        `http://localhost:3001/api/jobs/${jobId}/confirm-payment`,
        { method: 'POST' }
      );

      const data = await response.json();
      setStatus(data.status);
    } catch (err: any) {
      setError(err.message);
    }
  };

  return (
    <div className="oraxel-demo">
      <h1>Oraxel Oracle Demo</h1>

      {!jobId && (
        <button onClick={handleCreateRandomJob}>
          Generate Random Number via x402
        </button>
      )}

      {jobId && status === 'pending_payment' && (
        <div>
          <p>Payment required: 0.003 SOL</p>
          <button onClick={handleConfirmPayment}>
            Simulate x402 Payment (Demo)
          </button>
        </div>
      )}

      {status === 'query_in_progress' && (
        <div>
          <p>⏳ Oracle query in progress...</p>
        </div>
      )}

      {status === 'completed' && result && (
        <div>
          <h2>Result:</h2>
          <p>Random value: {result.value}</p>
          <p>Range: {result.min} - {result.max}</p>
        </div>
      )}

      {status === 'failed' && (
        <div>
          <p>❌ Job failed: {result?.error}</p>
        </div>
      )}

      {error && <p className="error">Error: {error}</p>}

      <div className="status">
        <strong>Status:</strong> {status}
        {jobId && <div>Job ID: {jobId}</div>}
      </div>
    </div>
  );
};

export default OraxelDemo;
```

---

## Error Handling

### Common Errors

```typescript
interface ApiError {
  message: string;
  status: number;
  requestId?: string;
}

const handleApiError = (error: any): string => {
  if (error.response) {
    // HTTP error response
    const apiError: ApiError = error.response.data;
    return apiError.message || `Error ${apiError.status}`;
  } else if (error.request) {
    // Request made but no response
    return 'Network error: Could not reach server';
  } else {
    // Something else
    return error.message || 'An unexpected error occurred';
  }
};
```

### Error States to Handle

1. **400 Bad Request**: Invalid parameters
   ```typescript
   if (response.status === 400) {
     const error = await response.json();
     // Show: error.message
   }
   ```

2. **401 Unauthorized**: Missing/invalid API key
   ```typescript
   if (response.status === 401) {
     // Show: "Authentication required"
   }
   ```

3. **404 Not Found**: Job doesn't exist
   ```typescript
   if (response.status === 404) {
     // Show: "Job not found"
   }
   ```

4. **429 Too Many Requests**: Rate limit exceeded
   ```typescript
   if (response.status === 429) {
     // Show: "Too many requests. Please try again later."
   }
   ```

5. **500 Internal Server Error**: Server error
   ```typescript
   if (response.status === 500) {
     // Show: "Server error. Please try again."
   }
   ```

---

## x402 Protocol Integration

### Handling 402 Payment Required

The backend now supports the x402 protocol. When requesting a job that requires payment, you'll receive a `402 Payment Required` response.

```typescript
// Example: x402-compliant job retrieval
const getJobWithPayment = async (jobId: string) => {
  // First request - may get 402
  let response = await fetch(`${API_BASE_URL}/jobs/${jobId}`, {
    headers: { 'x-api-key': API_KEY },
  });

  // Handle 402 Payment Required
  if (response.status === 402) {
    const paymentInfo = await response.json();
    
    // Process payment via facilitator
    const paymentProof = await processPaymentWithFacilitator(
      paymentInfo.payment,
      jobId
    );

    // Retry with payment header (x402 protocol)
    response = await fetch(`${API_BASE_URL}/jobs/${jobId}`, {
      headers: {
        'x-api-key': API_KEY,
        'X-402-Payment': paymentProof, // Payment proof/signature
      },
    });
  }

  // Now should get 200 OK with job data
  return response.json();
};
```

### Payment Processing Helper

```typescript
// Helper function for processing payments
async function processPaymentWithFacilitator(
  paymentInfo: PaymentInstructions,
  jobId: string
): Promise<string> {
  // In demo mode, simulate payment
  if (process.env.NODE_ENV === 'development') {
    // Simulate payment processing delay
    await new Promise(resolve => setTimeout(resolve, 500));
    return `demo-payment-proof-${jobId}-${Date.now()}`;
  }

  // Production: Call facilitator API
  // const response = await fetch(`${paymentInfo.facilitator.url}/pay`, {
  //   method: 'POST',
  //   body: JSON.stringify({
  //     amount: paymentInfo.amount,
  //     currency: paymentInfo.currency,
  //     jobId,
  //   }),
  // });
  // const result = await response.json();
  // return result.paymentProof;
}
```

---

## TypeScript Types

### Complete Type Definitions

```typescript
// Job Types
export type JobType = 'random' | 'price' | 'webhook';
export type JobStatus = 
  | 'pending_payment'
  | 'payment_confirmed'
  | 'query_in_progress'
  | 'completed'
  | 'failed';

// x402 Protocol Types
export interface PaymentInstructions {
  amount: string;
  currency: string;
  methods: string[];
  facilitator?: {
    url: string;
    name?: string;
  };
}

export interface X402PaymentResponse {
  payment: PaymentInstructions;
  jobId: string;
  message?: string;
  error?: string;
}

// Request Types
export interface CreateJobRequest {
  type: JobType;
  parameters: RandomParameters | PriceParameters | WebhookParameters;
}

export interface RandomParameters {
  min: number;
  max: number;
}

export interface PriceParameters {
  pair: string; // e.g., "SOL/USDC"
}

export interface WebhookParameters {
  url: string;
}

// Response Types
export interface CreateJobResponse {
  jobId: string;
  status: JobStatus;
  paymentRequest: PaymentRequest;
}

export interface PaymentRequest {
  paymentUrl: string;
  amount: number;
  currency: string;
}

export interface JobResponse {
  id: string;
  type: JobType;
  parameters: object;
  status: JobStatus;
  result?: RandomResult | PriceResult | WebhookResult;
  createdAt: string;
  updatedAt: string;
}

export interface RandomResult {
  value: number;
  min: number;
  max: number;
  timestamp: string;
}

export interface PriceResult {
  pair: string;
  price: number;
  timestamp: string;
  source: string;
}

export interface WebhookResult {
  url: string;
  status: string;
  message: string;
  timestamp: string;
  jobId: string;
}

export interface ListJobsResponse {
  jobs: JobResponse[];
  pagination: {
    limit: number;
    offset: number;
    total: number;
    hasMore: boolean;
  };
}
```

---

## Quick Start Checklist

- [ ] Set up API base URL and WebSocket URL
- [ ] Install `socket.io-client` for WebSocket support
- [ ] Create API service functions (createJob, confirmPayment, getJobStatus)
- [ ] Set up WebSocket connection and subscription
- [ ] Implement error handling
- [ ] Create UI components for each job type
- [ ] Add loading states and status indicators
- [ ] Test complete flow: create → pay → receive result

---

## Demo Mode vs Production

### Demo Mode (Current)
- Authentication optional
- Payment simulation via `/confirm-payment` endpoint
- Mock oracle responses
- Good for development and testing

### Production (Future)
- Authentication required (API key or JWT)
- Real x402 payment integration
- Real oracle providers (VRF, price feeds)
- Webhook callbacks from x402

---

## Additional Resources

- **API Documentation**: `http://localhost:3001/api/docs` (Swagger UI)
- **Health Check**: `http://localhost:3001/api/health`
- **Backend README**: See `README.md` in repository

---

This guide provides everything you need to integrate the Oraxel backend with your frontend demo. Start with the React component example and customize it for your needs!

