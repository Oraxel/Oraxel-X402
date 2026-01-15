import { logger } from '../utils/logger';
import { env } from '../utils/env';

export interface PaymentVerificationResult {
  verified: boolean;
  transactionId?: string;
  amount?: number;
  currency?: string;
  error?: string;
}

export class FacilitatorService {
  private facilitatorUrl: string | undefined;
  private apiKey: string | undefined;
  private mode: 'demo' | 'live';

  constructor() {
    this.facilitatorUrl = process.env.FACILITATOR_URL;
    this.apiKey = process.env.FACILITATOR_API_KEY;
    this.mode = env.ORAXEL_MODE;
  }

  /**
   * Verify payment via facilitator
   * In demo mode, accepts any payment header for testing
   * In live mode, calls facilitator API to verify on-chain transaction
   */
  async verifyPayment(
    paymentHeader: string,
    jobId: string,
    expectedAmount: number = 0.003
  ): Promise<PaymentVerificationResult> {
    if (this.mode === 'demo' || !this.facilitatorUrl) {
      // In demo mode, simulate verification
      logger.info('Demo mode: Simulating payment verification', { jobId });
      await new Promise((resolve) => setTimeout(resolve, 200)); // Simulate API call
      return {
        verified: true,
        transactionId: `demo-tx-${jobId}`,
        amount: expectedAmount,
        currency: 'SOL',
      };
    }

    // Live mode: Verify with facilitator API
    try {
      const response = await fetch(`${this.facilitatorUrl}/verify`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(this.apiKey && { 'Authorization': `Bearer ${this.apiKey}` }),
        },
        body: JSON.stringify({
          payment: paymentHeader,
          jobId,
          expectedAmount,
          currency: 'SOL',
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        logger.error('Facilitator verification failed', {
          status: response.status,
          jobId,
          error: errorData,
        });
        return {
          verified: false,
          error: errorData.message || `Facilitator returned ${response.status}`,
        };
      }

      const result = await response.json();
      return {
        verified: result.verified === true,
        transactionId: result.transactionId,
        amount: result.amount,
        currency: result.currency || 'SOL',
      };
    } catch (error) {
      logger.error('Facilitator API error', error, { jobId });
      return {
        verified: false,
        error: error instanceof Error ? error.message : 'Facilitator API error',
      };
    }
  }

  /**
   * Get payment instructions for 402 response
   */
  getPaymentInstructions(amount: number = 0.003, currency: string = 'SOL'): {
    amount: string;
    currency: string;
    methods: string[];
    facilitator?: {
      url: string;
      name?: string;
    };
  } {
    return {
      amount: amount.toString(),
      currency,
      methods: ['solana'],
      ...(this.facilitatorUrl && {
        facilitator: {
          url: this.facilitatorUrl,
          name: process.env.FACILITATOR_NAME || 'x402 Facilitator',
        },
      }),
    };
  }
}
