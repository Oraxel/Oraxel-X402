import { Request, Response, NextFunction } from 'express';
import { JobService } from '../services/JobService';
import { X402Service } from '../services/X402Service';
import { OracleService } from '../services/OracleService';
import { CreateJobRequest } from '../types';

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
      const { type, parameters }: CreateJobRequest = req.body;

      if (!type || !['random', 'price', 'webhook'].includes(type)) {
        res.status(400).json({
          message: 'Invalid job type. Must be one of: random, price, webhook',
        });
        return;
      }

      if (!parameters || typeof parameters !== 'object') {
        res.status(400).json({
          message: 'Invalid parameters. Must be an object',
        });
        return;
      }

      const job = this.jobService.createJob(type, parameters);
      const paymentRequest = this.x402Service.createPaymentRequest(job);

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
      const { id } = req.params;
      const job = this.jobService.getJob(id);

      if (!job) {
        res.status(404).json({
          message: 'Job not found',
        });
        return;
      }

      if (job.status !== 'pending_payment') {
        res.status(400).json({
          message: `Job is not in pending_payment status. Current status: ${job.status}`,
        });
        return;
      }

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
        res.status(200).json(updatedJob);
      } catch (oracleError) {
        this.jobService.updateJob(id, {
          status: 'failed',
          result: {
            error: oracleError instanceof Error ? oracleError.message : 'Unknown error',
          },
        });

        const updatedJob = this.jobService.getJob(id);
        res.status(200).json(updatedJob);
      }
    } catch (error) {
      next(error);
    }
  };

  getJob = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { id } = req.params;
      const job = this.jobService.getJob(id);

      if (!job) {
        res.status(404).json({
          message: 'Job not found',
        });
        return;
      }

      res.status(200).json(job);
    } catch (error) {
      next(error);
    }
  };
}


