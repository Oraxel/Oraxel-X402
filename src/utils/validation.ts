import { z } from 'zod';
import { ValidationError } from './errors';

export const createJobSchema = z.object({
  type: z.enum(['random', 'price', 'webhook'], {
    errorMap: () => ({ message: 'Type must be one of: random, price, webhook' }),
  }),
  parameters: z.object({}).passthrough().refine(
    (params) => {
      // Additional validation based on type will be done in controller
      return typeof params === 'object' && params !== null;
    },
    { message: 'Parameters must be an object' }
  ),
});

export const validateCreateJob = (data: unknown): z.infer<typeof createJobSchema> => {
  try {
    return createJobSchema.parse(data);
  } catch (error) {
    if (error instanceof z.ZodError) {
      throw new ValidationError('Invalid request data', error.errors);
    }
    throw error;
  }
};

export const jobIdSchema = z.string().min(1, 'Job ID is required');

export const validateJobId = (id: unknown): string => {
  try {
    return jobIdSchema.parse(id);
  } catch (error) {
    if (error instanceof z.ZodError) {
      throw new ValidationError('Invalid job ID', error.errors);
    }
    throw error;
  }
};

