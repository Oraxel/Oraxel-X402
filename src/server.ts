import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import jobRoutes from './routes/jobRoutes';
import healthRoutes from './routes/healthRoutes';

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;
const CORS_ORIGIN = process.env.CORS_ORIGIN || 'http://localhost:3000';

// Middleware
app.use(cors({
  origin: CORS_ORIGIN,
  credentials: true,
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Logging helper
const log = (message: string, ...args: unknown[]): void => {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] ${message}`, ...args);
};

// Request logging middleware
app.use((req: Request, _res: Response, next: NextFunction): void => {
  log(`${req.method} ${req.path}`);
  next();
});

// Routes
app.use('/api', jobRoutes);
app.use('/api', healthRoutes);

// Error handling middleware
app.use((err: Error, _req: Request, res: Response, _next: NextFunction): void => {
  log('Error:', err.message);
  res.status(500).json({
    message: err.message || 'Internal server error',
    status: 500,
  });
});

// 404 handler
app.use((_req: Request, res: Response): void => {
  res.status(404).json({
    message: 'Route not found',
    status: 404,
  });
});

// Start server
app.listen(PORT, (): void => {
  log(`Oraxel backend server running on port ${PORT}`);
  log(`CORS enabled for origin: ${CORS_ORIGIN}`);
  log(`Mode: ${process.env.ORAXEL_MODE || 'demo'}`);
});

export default app;


