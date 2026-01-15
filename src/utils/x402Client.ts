/**
 * x402 Client Utility
 * Helper functions for processing x402 payments and handling 402 responses
 */

export interface PaymentInstructions {
  amount: string;
  currency: string;
  methods: string[];
  facilitator?: {
    url: string;
    name?: string;
  };
}

export interface X402Response {
  status: 402;
  payment: PaymentInstructions;
  jobId: string;
  message?: string;
}

/**
 * Process payment via facilitator (demo mode simulation)
 * In production, this would call the facilitator API to process on-chain payment
 */
export async function processPaymentWithFacilitator(
  paymentInfo: PaymentInstructions,
  jobId: string
): Promise<string> {
  // In demo mode, return a mock payment proof
  if (process.env.NODE_ENV === 'development' || !paymentInfo.facilitator) {
    // Simulate payment processing
    await new Promise((resolve) => setTimeout(resolve, 500));
    return `demo-payment-proof-${jobId}-${Date.now()}`;
  }

  // Production: Call facilitator API
  // const response = await fetch(`${paymentInfo.facilitator.url}/pay`, {
  //   method: 'POST',
  //   headers: { 'Content-Type': 'application/json' },
  //   body: JSON.stringify({
  //     amount: paymentInfo.amount,
  //     currency: paymentInfo.currency,
  //     jobId,
  //   }),
  // });
  // const result = await response.json();
  // return result.paymentProof;

  throw new Error('Facilitator payment processing not yet implemented');
}

/**
 * Check if response is a 402 Payment Required
 */
export function is402Response(response: Response): boolean {
  return response.status === 402;
}

/**
 * Extract payment instructions from 402 response
 */
export async function extractPaymentInstructions(
  response: Response
): Promise<X402Response> {
  const data = await response.json();
  return {
    status: 402,
    payment: data.payment,
    jobId: data.jobId,
    message: data.message,
  };
}
