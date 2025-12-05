export type JobType = 'random' | 'price' | 'webhook';

export type JobStatus =
  | 'pending_payment'
  | 'payment_confirmed'
  | 'query_in_progress'
  | 'completed'
  | 'failed';

export interface OracleJob {
  id: string;
  type: JobType;
  parameters: Record<string, unknown>;
  status: JobStatus;
  result?: unknown;
  createdAt: Date;
  updatedAt: Date;
}

export interface PaymentRequest {
  paymentUrl: string;
  amount: number;
  currency: string;
}

export interface CreateJobRequest {
  type: JobType;
  parameters: Record<string, unknown>;
}

export interface CreateJobResponse {
  jobId: string;
  status: JobStatus;
  paymentRequest: PaymentRequest;
}


