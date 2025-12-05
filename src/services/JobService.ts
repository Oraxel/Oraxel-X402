import { nanoid } from 'nanoid';
import { OracleJob, JobType, JobStatus } from '../types';

export class JobService {
  private jobs: Map<string, OracleJob> = new Map();

  createJob(type: JobType, parameters: Record<string, unknown>): OracleJob {
    const now = new Date();
    const job: OracleJob = {
      id: nanoid(),
      type,
      parameters,
      status: 'pending_payment',
      createdAt: now,
      updatedAt: now,
    };

    this.jobs.set(job.id, job);
    return job;
  }

  getJob(id: string): OracleJob | undefined {
    return this.jobs.get(id);
  }

  updateJob(id: string, partialUpdate: Partial<OracleJob>): OracleJob | null {
    const job = this.jobs.get(id);
    if (!job) {
      return null;
    }

    const updated: OracleJob = {
      ...job,
      ...partialUpdate,
      updatedAt: new Date(),
    };

    this.jobs.set(id, updated);
    return updated;
  }

  getAllJobs(): OracleJob[] {
    return Array.from(this.jobs.values());
  }
}


