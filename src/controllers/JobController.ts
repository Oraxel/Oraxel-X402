import { Request, Response, NextFunction } from 'express';
import { JobService } from '../services/JobService';
import { X402Service } from '../services/X402Service';
import { QueueService } from '../services/QueueService';
import { FacilitatorService } from '../services/FacilitatorService';
import { NotFoundError, BadRequestError } from '../utils/errors';
import { validateCreateJob, validateJobId } from '../utils/validation';
import { logger } from '../utils/logger';
import { cacheService } from '../services/CacheService';

export class JobController {
  private jobService: JobService;
  private x402Service: X402Service;
  private queueService: QueueService;
  private facilitatorService: FacilitatorService;

  constructor(queueService: QueueService) {
    this.jobService = new JobService();
    this.x402Service = new X402Service();
    this.queueService = queueService;
    this.facilitatorService = new FacilitatorService();
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

      const job = await this.jobService.createJob(type, parameters);
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
      const job = await this.jobService.getJob(id);

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
      await this.jobService.updateJob(id, { status: 'payment_confirmed' });

      // Queue oracle query for background processing
      await this.jobService.updateJob(id, { status: 'query_in_progress' });
      await this.queueService.addJob(job);

      // Invalidate cache
      await cacheService.del(`job:${id}`);

      const updatedJob = await this.jobService.getJob(id);
      logger.info('Job queued for processing', { requestId: req.requestId, jobId: id, type: job.type });
      res.status(200).json(updatedJob);
    } catch (error) {
      next(error);
    }
  };

  getJob = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const id = validateJobId(req.params.id);
      
      // Check for x402 payment header
      const paymentHeader = req.headers['x-402-payment'] as string | undefined;
      
      const job = await this.jobService.getJob(id);

      if (!job) {
        throw new NotFoundError('Job');
      }

      // x402 Protocol: If job needs payment and no payment header provided, return 402
      if (job.status === 'pending_payment' && !paymentHeader) {
        const paymentInstructions = this.facilitatorService.getPaymentInstructions();
        
        logger.info('Returning 402 Payment Required', { 
          requestId: req.requestId, 
          jobId: id 
        });
        
        return res.status(402).json({
          payment: paymentInstructions,
          jobId: id,
          message: 'Payment required to access this resource',
        });
      }

      // x402 Protocol: If payment header provided, verify payment
      if (paymentHeader && job.status === 'pending_payment') {
        logger.info('Verifying payment via facilitator', { 
          requestId: req.requestId, 
          jobId: id 
        });

        const verification = await this.facilitatorService.verifyPayment(
          paymentHeader,
          id,
          0.003 // Expected amount in SOL
        );

        if (!verification.verified) {
          logger.warn('Payment verification failed', { 
            requestId: req.requestId, 
            jobId: id,
            error: verification.error 
          });

          const paymentInstructions = this.facilitatorService.getPaymentInstructions();
          return res.status(402).json({
            error: verification.error || 'Payment verification failed',
            payment: paymentInstructions,
            jobId: id,
          });
        }

        // Payment verified - update job and trigger oracle
        logger.info('Payment verified, processing job', { 
          requestId: req.requestId, 
          jobId: id,
          transactionId: verification.transactionId 
        });

        await this.jobService.updateJob(id, { 
          status: 'payment_confirmed' 
        });
        await this.jobService.updateJob(id, { 
          status: 'query_in_progress' 
        });
        await this.queueService.addJob(job);

        // Invalidate cache
        await cacheService.del(`job:${id}`);

        // Return updated job (may be in progress)
        const updatedJob = await this.jobService.getJob(id);
        return res.status(200).json(updatedJob);
      }

      // Job already paid or completed - return normally
      // Try cache first
      const cacheKey = `job:${id}`;
      const cached = await cacheService.get<any>(cacheKey);
      if (cached) {
        return res.status(200).json(cached);
      }

      // Get fresh job data
      const currentJob = await this.jobService.getJob(id);
      if (!currentJob) {
        throw new NotFoundError('Job');
      }

      // Cache for 1 minute
      await cacheService.set(cacheKey, currentJob, 60);

      res.status(200).json(currentJob);
    } catch (error) {
      next(error);
    }
  };

  listJobs = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const limit = parseInt(req.query.limit as string, 10) || 50;
      const offset = parseInt(req.query.offset as string, 10) || 0;
      const status = req.query.status as string | undefined;
      const type = req.query.type as string | undefined;

      const filters: { status?: any; type?: any } = {};
      if (status) filters.status = status;
      if (type) filters.type = type;

      const result = await this.jobService.getAllJobs(limit, offset, filters);

      res.status(200).json({
        jobs: result.jobs,
        pagination: {
          limit,
          offset,
          total: result.total,
          hasMore: offset + limit < result.total,
        },
      });
    } catch (error) {
      next(error);
    }
  };
}


