import { Request, Response, NextFunction } from 'express';
import { AppError } from '../utils/errors';
import { logger } from '../utils/logger';

export const errorHandler = (
  err: Error | AppError,
  req: Request,
  res: Response,
  _next: NextFunction
): void => {
  const requestId = req.requestId;

  if (err instanceof AppError) {
    logger.warn('Application error', err, { requestId, statusCode: err.statusCode });
    res.status(err.statusCode).json({
      message: err.message,
      status: err.statusCode,
      requestId,
      ...(err instanceof Error && err.name === 'ValidationError' && 'details' in err
        ? { details: (err as { details?: unknown }).details }
        : {}),
    });
    return;
  }

  // Unexpected errors
  logger.error('Unexpected error', err, { requestId });
  res.status(500).json({
    message: process.env.NODE_ENV === 'production' 
      ? 'Internal server error' 
      : err.message,
    status: 500,
    requestId,
  });
};

