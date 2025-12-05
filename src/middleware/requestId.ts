import { Request, Response, NextFunction } from 'express';
import { nanoid } from 'nanoid';

declare global {
  namespace Express {
    interface Request {
      requestId?: string;
    }
  }
}

export const requestIdMiddleware = (req: Request, res: Response, next: NextFunction): void => {
  req.requestId = nanoid();
  res.setHeader('X-Request-ID', req.requestId);
  next();
};

