import { Request, Response, NextFunction } from 'express';
import { JobService } from '../services/JobService';
import { X402Service } from '../services/X402Service';
import { OracleService } from '../services/OracleService';
import { NotFoundError, BadRequestError } from '../utils/errors';
import { validateCreateJob, validateJobId } from '../utils/validation';
import { logger } from '../utils/logger';

export class JobController {
  private jobService: JobService;
  private x402Service: X402Service;
  private oracleService: OracleService;

  constructor() {
    this.jobService = new JobService();
    this.x402Service = new X402Service();
    this.oracleService = new OracleService();
  }

  createJob = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const validated = validateCreateJob(req.body);
      const { type, parameters } = validated;

      // Type-specific parameter validation
      if (type === 'random') {
        const min = parameters.min as number | undefined;
        const max = parameters.max as number | undefined;
        if (typeof min !== 'number' || typeof max !== 'number' || min >= max) {
          throw new BadRequestError('Random job requires valid min and max numbers where min < max');
        }
      } else if (type === 'price') {
        if (!parameters.pair || typeof parameters.pair !== 'string') {
          throw new BadRequestError('Price job requires a pair parameter (string)');
        }
      } else if (type === 'webhook') {
        if (!parameters.url || typeof parameters.url !== 'string') {
          throw new BadRequestError('Webhook job requires a url parameter (string)');
        }
      }

      const job = this.jobService.createJob(type, parameters);
      const paymentRequest = this.x402Service.createPaymentRequest(job);

      logger.info('Job created', { requestId: req.requestId, jobId: job.id, type });

      res.status(201).json({
        jobId: job.id,
        status: job.status,
        paymentRequest,
      });
    } catch (error) {
      next(error);
    }
  };

  confirmPayment = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const id = validateJobId(req.params.id);
      const job = this.jobService.getJob(id);

      if (!job) {
        throw new NotFoundError('Job');
      }

      if (job.status !== 'pending_payment') {
        throw new BadRequestError(
          `Job is not in pending_payment status. Current status: ${job.status}`
        );
      }

      logger.info('Payment confirmation started', { requestId: req.requestId, jobId: id });

      // Simulate payment confirmation
      await this.x402Service.simulatePaymentConfirmation(id);

      // Update job to payment_confirmed
      this.jobService.updateJob(id, { status: 'payment_confirmed' });

      // Immediately start oracle query
      this.jobService.updateJob(id, { status: 'query_in_progress' });

      try {
        const result = await this.oracleService.executeJob(job);
        this.jobService.updateJob(id, {
          status: 'completed',
          result,
        });

        const updatedJob = this.jobService.getJob(id);
        logger.info('Job completed', { requestId: req.requestId, jobId: id, type: job.type });
        res.status(200).json(updatedJob);
      } catch (oracleError) {
        this.jobService.updateJob(id, {
          status: 'failed',
          result: {
            error: oracleError instanceof Error ? oracleError.message : 'Unknown error',
          },
        });

        const updatedJob = this.jobService.getJob(id);
        logger.error('Job failed', oracleError, { requestId: req.requestId, jobId: id });
        res.status(200).json(updatedJob);
      }
    } catch (error) {
      next(error);
    }
  };

  getJob = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const id = validateJobId(req.params.id);
      const job = this.jobService.getJob(id);

      if (!job) {
        throw new NotFoundError('Job');
      }

      res.status(200).json(job);
    } catch (error) {
      next(error);
    }
  };
}


