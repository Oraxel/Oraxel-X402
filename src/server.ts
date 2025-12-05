import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import rateLimit from 'express-rate-limit';
import jobRoutes from './routes/jobRoutes';
import healthRoutes from './routes/healthRoutes';
import { requestIdMiddleware } from './middleware/requestId';
import { errorHandler } from './middleware/errorHandler';
import { logger } from './utils/logger';
import { env } from './utils/env';

// Load environment variables
dotenv.config();

const app = express();

// Middleware
app.use(cors({
  origin: env.CORS_ORIGIN,
  credentials: true,
}));

// Request ID middleware (must be early)
app.use(requestIdMiddleware);

// Body parsing with size limits
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
});

app.use('/api', limiter);

// Request logging middleware
app.use((req: Request, _res: Response, next: NextFunction): void => {
  logger.info(`${req.method} ${req.path}`, { requestId: req.requestId });
  next();
});

// Routes
app.use('/api', jobRoutes);
app.use('/api', healthRoutes);

// 404 handler
app.use((_req: Request, res: Response): void => {
  res.status(404).json({
    message: 'Route not found',
    status: 404,
  });
});

// Error handling middleware (must be last)
app.use(errorHandler);

// Graceful shutdown
const server = app.listen(env.PORT, (): void => {
  logger.info(`Oraxel backend server running on port ${env.PORT}`);
  logger.info(`CORS enabled for origin: ${env.CORS_ORIGIN}`);
  logger.info(`Mode: ${env.ORAXEL_MODE}`);
  logger.info(`Environment: ${env.NODE_ENV}`);
});

// Graceful shutdown handlers
const gracefulShutdown = (signal: string): void => {
  logger.info(`${signal} received, starting graceful shutdown...`);
  
  server.close(() => {
    logger.info('HTTP server closed');
    process.exit(0);
  });

  // Force close after 10 seconds
  setTimeout(() => {
    logger.error('Forced shutdown after timeout');
    process.exit(1);
  }, 10000);
};

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// Handle uncaught exceptions
process.on('uncaughtException', (error: Error) => {
  logger.error('Uncaught exception', error);
  process.exit(1);
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason: unknown) => {
  logger.error('Unhandled rejection', reason);
  process.exit(1);
});

export default app;


