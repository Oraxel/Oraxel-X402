# Frontend Quick Start
## Get Your Demo Running in 5 Minutes

---

## 1. Install Dependencies

```bash
npm install socket.io-client
# or
yarn add socket.io-client
```

---

## 2. Copy This Code

### API Service (create `src/services/oraxelApi.ts`)

```typescript
const API_URL = 'http://localhost:3001/api';
const WS_URL = 'http://localhost:3001';

export const createJob = async (type: 'random' | 'price' | 'webhook', parameters: any) => {
  const res = await fetch(`${API_URL}/jobs`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ type, parameters }),
  });
  return res.json();
};

export const confirmPayment = async (jobId: string) => {
  const res = await fetch(`${API_URL}/jobs/${jobId}/confirm-payment`, {
    method: 'POST',
  });
  return res.json();
};

export const getJobStatus = async (jobId: string) => {
  const res = await fetch(`${API_URL}/jobs/${jobId}`);
  return res.json();
};
```

---

## 3. Demo Component (Matches Your Landing Page)

### x402 Protocol Support

The backend now supports the x402 protocol. You can use either:
- **x402 Protocol Flow**: Handle 402 responses and retry with payment (recommended)
- **Legacy Flow**: Use `/confirm-payment` endpoint (backward compatible)

```typescript
import { useState, useEffect } from 'react';
import io from 'socket.io-client';
import { createJob, confirmPayment, getJobStatus } from './services/oraxelApi';

const OraxelDemo = () => {
  const [activeTab, setActiveTab] = useState<'random' | 'price' | 'webhook'>('random');
  const [jobId, setJobId] = useState<string | null>(null);
  const [status, setStatus] = useState<string>('idle');
  const [result, setResult] = useState<any>(null);
  const [socket, setSocket] = useState<any>(null);

  // WebSocket setup
  useEffect(() => {
    const ws = io(WS_URL);
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
  }, [jobId, socket]);

  const handleGenerate = async () => {
    try {
      let parameters: any;
      
      if (activeTab === 'random') {
        parameters = { min: 1, max: 402 };
      } else if (activeTab === 'price') {
        parameters = { pair: 'SOL/USDC' };
      } else {
        parameters = { url: 'https://example.com/webhook' };
      }

      // Create job
      const { jobId: newJobId } = await createJob(activeTab, parameters);
      setJobId(newJobId);
      setStatus('creating');

      // Immediately check status (will get 402 if payment needed)
      const jobResult = await getJobStatus(newJobId);
      
      // Check if 402 Payment Required (x402 protocol)
      if (jobResult.status === 402) {
        setStatus('pending_payment');
        setPaymentInfo(jobResult.payment);
      } else {
        // Job already paid or completed
        setStatus(jobResult.status);
        if (jobResult.result) setResult(jobResult.result);
      }
    } catch (error: any) {
      console.error('Failed to create job:', error);
    }
  };

  const handleConfirmPayment = async () => {
    if (!jobId) return;
    try {
      setStatus('confirming');

      // Option 1: x402 Protocol Flow (recommended)
      // Process payment and retry with payment header
      const paymentProof = `demo-payment-${jobId}-${Date.now()}`;
      const job = await getJobStatus(jobId, paymentProof);
      setStatus(job.status);

      // Option 2: Legacy Flow (backward compatible)
      // await confirmPayment(jobId);
      // setStatus('query_in_progress');
    } catch (error: any) {
      console.error('Failed to confirm payment:', error);
    }
  };

  return (
    <div className="demo-panel">
      <h3>Try Oraxel Demo</h3>
      
      {/* Tabs */}
      <div className="tabs">
        <button 
          className={activeTab === 'random' ? 'active' : ''}
          onClick={() => setActiveTab('random')}
        >
          Randomness
        </button>
        <button 
          className={activeTab === 'price' ? 'active' : ''}
          onClick={() => setActiveTab('price')}
        >
          Price Feed
        </button>
        <button 
          className={activeTab === 'webhook' ? 'active' : ''}
          onClick={() => setActiveTab('webhook')}
        >
          Webhook Trigger
        </button>
      </div>

      {/* Data Source Dropdown (for random) */}
      {activeTab === 'random' && (
        <select>
          <option>Random number</option>
        </select>
      )}

      {/* Generate Button */}
      {status === 'idle' && (
        <button onClick={handleGenerate} className="generate-btn">
          Generate via x402
        </button>
      )}

      {/* Payment Confirmation (Demo) */}
      {status === 'pending_payment' && (
        <div>
          <p>Payment required: 0.003 SOL</p>
          <button onClick={handleConfirmPayment}>
            Simulate x402 Payment
          </button>
        </div>
      )}

      {/* Processing */}
      {status === 'query_in_progress' && (
        <div>
          <p>⏳ Oracle query in progress...</p>
        </div>
      )}

      {/* Results */}
      {status === 'completed' && result && (
        <div className="result">
          {activeTab === 'random' && (
            <div>
              <h4>Random Value:</h4>
              <p className="result-value">{result.value}</p>
              <p className="result-meta">Range: {result.min} - {result.max}</p>
            </div>
          )}
          {activeTab === 'price' && (
            <div>
              <h4>Price:</h4>
              <p className="result-value">${result.price}</p>
              <p className="result-meta">{result.pair} • {new Date(result.timestamp).toLocaleString()}</p>
            </div>
          )}
          {activeTab === 'webhook' && (
            <div>
              <h4>Webhook Status:</h4>
              <p className="result-value">{result.status}</p>
              <p className="result-meta">{result.message}</p>
            </div>
          )}
        </div>
      )}

      {/* Helper Text */}
      {status === 'idle' && (
        <p className="helper-text">Select a source and generate.</p>
      )}

      {/* Footer */}
      <p className="demo-footer">Demo mode. Not live data.</p>
    </div>
  );
};

export default OraxelDemo;
```

---

## 4. Complete Flow

```
User clicks "Generate via x402"
  ↓
POST /api/jobs → Returns { jobId, paymentRequest }
  ↓
Show payment info (0.003 SOL)
  ↓
User clicks "Simulate Payment" (demo)
  ↓
POST /api/jobs/:id/confirm-payment
  ↓
Job status → "query_in_progress"
  ↓
WebSocket: job:updated event
  ↓
Job status → "completed" with result
  ↓
Display result to user
```

---

## 5. Status Indicators

```typescript
const getStatusDisplay = (status: string) => {
  switch (status) {
    case 'pending_payment':
      return { text: 'Awaiting Payment', icon: '💳', color: 'yellow' };
    case 'payment_confirmed':
      return { text: 'Payment Confirmed', icon: '✅', color: 'green' };
    case 'query_in_progress':
      return { text: 'Processing...', icon: '⏳', color: 'blue' };
    case 'completed':
      return { text: 'Completed', icon: '✨', color: 'green' };
    case 'failed':
      return { text: 'Failed', icon: '❌', color: 'red' };
    default:
      return { text: 'Idle', icon: '⚪', color: 'gray' };
  }
};
```

---

## 6. Error Handling

```typescript
try {
  const job = await createJob('random', { min: 1, max: 100 });
} catch (error: any) {
  if (error.message.includes('Invalid')) {
    // Show validation error
  } else if (error.message.includes('network')) {
    // Show network error
  } else {
    // Show generic error
  }
}
```

---

## 7. Environment Variables

Create `.env.local`:
```env
REACT_APP_ORAXEL_API_URL=http://localhost:3001/api
REACT_APP_ORAXEL_WS_URL=http://localhost:3001
REACT_APP_ORAXEL_API_KEY=demo-key  # Optional in demo mode
```

---

## That's It!

Your demo should now work exactly like the landing page demo panel. The backend is running on `localhost:3001`, so make sure it's started with `npm run dev`.

For full details, see `FRONTEND_INTEGRATION_GUIDE.md`.

