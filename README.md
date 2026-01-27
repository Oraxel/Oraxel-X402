# Oraxel

Oraxel is an x402-powered oracle and execution layer that enables on-demand oracle queries with payment processing.

## Overview

This backend provides a REST API for creating oracle jobs, processing x402 payments, and executing oracle queries. The system is designed to be easily extensible, with clear separation between demo/mock functionality and future live integrations.

## Features

- **Oracle Job Management**: Create and track oracle jobs through their lifecycle
- **x402 Payment Integration**: Simulated payment processing (ready for real integration)
- **Multiple Oracle Types**: Support for randomness, price feeds, and webhook triggers
- **State Management**: Jobs move through states: `pending_payment` → `payment_confirmed` → `query_in_progress` → `completed`/`failed`

## Project Structure

```
src/
├── server.ts          # Express app bootstrap
├── routes/            # Route definitions
│   ├── jobRoutes.ts
│   └── healthRoutes.ts
├── controllers/       # Business logic handlers
│   └── JobController.ts
├── services/          # Core services
│   ├── JobService.ts      # Job storage and management
│   ├── X402Service.ts     # Payment processing (mocked)
│   └── OracleService.ts   # Oracle execution (demo/live)
└── types/             # TypeScript interfaces
    └── index.ts
```

## Setup

### Prerequisites

- Node.js 18+ 
- npm or yarn

### Installation

1. Clone the repository and navigate to the project directory

2. Install dependencies:
```bash
npm install
```

3. Copy the example environment file:
```bash
cp .env.example .env
```

4. Edit `.env` and configure:
   - `PORT`: Server port (default: 3001)
   - `CORS_ORIGIN`: Frontend origin (default: http://localhost:3000)
   - `ORAXEL_MODE`: Set to `"demo"` for mocked behavior or `"live"` for future real integrations

### Running the Server

**Development mode** (with hot reload):
```bash
npm run dev
```

**Production mode**:
```bash
npm run build
npm start
```

The server will start on `http://localhost:3001` (or your configured PORT).

## API Endpoints

### 1. Create Oracle Job

**POST** `/api/jobs`

Creates a new oracle job and returns a payment request.

**Request Body:**
```json
{
  "type": "random",
  "parameters": {
    "min": 1,
    "max": 402
  }
}
```

**Response (201):**
```json
{
  "jobId": "abc123",
  "status": "pending_payment",
  "paymentRequest": {
    "paymentUrl": "https://x402-demo.payment.example.com/pay/abc123",
    "amount": 0.003,
    "currency": "SOL"
  }
}
```

**Job Types:**
- `"random"`: Generate random number. Parameters: `{ min: number, max: number }`
- `"price"`: Get price feed. Parameters: `{ pair: string }` (e.g., "SOL/USDC")
- `"webhook"`: Trigger webhook. Parameters: `{ url: string }`

### 2. Confirm Payment (Simulate)

**POST** `/api/jobs/:id/confirm-payment`

Simulates x402 payment confirmation and triggers oracle execution.

**Response (200):**
```json
{
  "id": "abc123",
  "type": "random",
  "parameters": { "min": 1, "max": 402 },
  "status": "completed",
  "result": {
    "value": 42,
    "min": 1,
    "max": 402,
    "timestamp": "2024-01-01T12:00:00.000Z"
  },
  "createdAt": "2024-01-01T12:00:00.000Z",
  "updatedAt": "2024-01-01T12:00:05.000Z"
}
```

### 3. Get Job Status

**GET** `/api/jobs/:id`

Retrieves the current status and result of an oracle job.

**Response (200):**
```json
{
  "id": "abc123",
  "type": "random",
  "parameters": { "min": 1, "max": 402 },
  "status": "completed",
  "result": { "value": 42, "min": 1, "max": 402, "timestamp": "..." },
  "createdAt": "2024-01-01T12:00:00.000Z",
  "updatedAt": "2024-01-01T12:00:05.000Z"
}
```

**Response (404):**
```json
{
  "message": "Job not found"
}
```

### 4. Health Check

**GET** `/api/health`

Returns server health status.

**Response (200):**
```json
{
  "status": "ok",
  "uptime": 3600,
  "timestamp": "2024-01-01T12:00:00.000Z"
}
```

## Example cURL Commands

### Create a random oracle job:
```bash
curl -X POST http://localhost:3001/api/jobs \
  -H "Content-Type: application/json" \
  -d '{
    "type": "random",
    "parameters": {
      "min": 1,
      "max": 402
    }
  }'
```

### Create a price feed job:
```bash
curl -X POST http://localhost:3001/api/jobs \
  -H "Content-Type: application/json" \
  -d '{
    "type": "price",
    "parameters": {
      "pair": "SOL/USDC"
    }
  }'
```

### Simulate payment confirmation:
```bash
curl -X POST http://localhost:3001/api/jobs/abc123/confirm-payment
```

### Get job status:
```bash
curl http://localhost:3001/api/jobs/abc123
```

## Frontend Integration

### Workflow

1. **User clicks "Generate via x402"**
   - Frontend calls `POST /api/jobs` with job type and parameters
   - Store the returned `jobId` and display the `paymentRequest` in the UI

2. **User clicks "Simulate x402 payment"** (demo mode)
   - Frontend calls `POST /api/jobs/:id/confirm-payment`
   - Show "Oracle query in progress" while waiting for response
   - The backend will:
     - Update job status to `payment_confirmed`
     - Execute the oracle query (with simulated delay)
     - Return the completed job with `result`

3. **Display Results**
   - Once the response returns, display:
     - `status`: Current job status
     - `result`: The oracle result (random number, price, or webhook confirmation)

### Example React Integration

```typescript
// Create job
const createJob = async (type: 'random' | 'price' | 'webhook', parameters: object) => {
  const response = await fetch('http://localhost:3001/api/jobs', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ type, parameters }),
  });
  return response.json();
};

// Confirm payment
const confirmPayment = async (jobId: string) => {
  const response = await fetch(`http://localhost:3001/api/jobs/${jobId}/confirm-payment`, {
    method: 'POST',
  });
  return response.json();
};

// Poll job status
const getJobStatus = async (jobId: string) => {
  const response = await fetch(`http://localhost:3001/api/jobs/${jobId}`);
  return response.json();
};
```

## Job States

Jobs progress through the following states:

1. **`pending_payment`**: Job created, waiting for x402 payment
2. **`payment_confirmed`**: Payment received, oracle query initiated
3. **`query_in_progress`**: Oracle is executing the query
4. **`completed`**: Query finished successfully, result available
5. **`failed`**: Query failed, error details in `result`

## Configuration

### Environment Variables

- `PORT`: Server port (default: 3001)
- `NODE_ENV`: Environment mode (development/production)
- `CORS_ORIGIN`: Allowed CORS origin (default: http://localhost:3000)
- `X402_API_KEY`: x402 API key (for future live mode)
- `X402_MERCHANT_ID`: x402 merchant ID (for future live mode)
- `ORAXEL_MODE`: `"demo"` or `"live"` (default: `"demo"`)

## Development

### Scripts

- `npm run dev`: Start development server with hot reload
- `npm run build`: Compile TypeScript to JavaScript
- `npm start`: Run compiled production build
- `npm run lint`: Run ESLint
- `npm run lint:fix`: Fix ESLint errors automatically

### Adding Real Integrations

The codebase is structured to make it easy to swap out mocked services:

1. **X402Service**: Replace `createPaymentRequest` and `simulatePaymentConfirmation` with real API calls
2. **OracleService**: Implement real oracle providers in `executeRandomJob`, `executePriceJob`, `executeWebhookJob`
3. **JobService**: Replace in-memory Map with database (Postgres, Supabase, etc.)

## Future Enhancements

- [ ] Real x402 payment integration
- [ ] Solana VRF for randomness
- [ ] Real price oracle integrations (Pyth, Switchboard, etc.)
- [ ] Database persistence (Supabase/Postgres)
- [ ] Webhook callbacks from x402
- [ ] Job queue system (Bull, BullMQ)
- [ ] Rate limiting
- [ ] Authentication/authorization
- [ ] WebSocket support for real-time job updates

## License

MIT


