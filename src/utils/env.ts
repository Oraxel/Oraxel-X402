import { logger } from './logger';

interface EnvConfig {
  PORT: number;
  NODE_ENV: string;
  CORS_ORIGIN: string;
  ORAXEL_MODE: 'demo' | 'live';
  X402_API_KEY?: string;
  X402_MERCHANT_ID?: string;
  FACILITATOR_URL?: string;
  FACILITATOR_API_KEY?: string;
  FACILITATOR_NAME?: string;
}

export const validateEnv = (): EnvConfig => {
  const required = {
    PORT: process.env.PORT ? parseInt(process.env.PORT, 10) : 3001,
    NODE_ENV: process.env.NODE_ENV || 'development',
    CORS_ORIGIN: process.env.CORS_ORIGIN || 'http://localhost:3000',
    ORAXEL_MODE: (process.env.ORAXEL_MODE || 'demo') as 'demo' | 'live',
  };

  // Validate PORT
  if (isNaN(required.PORT) || required.PORT < 1 || required.PORT > 65535) {
    logger.warn('Invalid PORT, using default 3001');
    required.PORT = 3001;
  }

  // Validate ORAXEL_MODE
  if (required.ORAXEL_MODE !== 'demo' && required.ORAXEL_MODE !== 'live') {
    logger.warn('Invalid ORAXEL_MODE, defaulting to demo');
    required.ORAXEL_MODE = 'demo';
  }

  // Warn if in live mode without credentials
  if (required.ORAXEL_MODE === 'live') {
    if (!process.env.X402_API_KEY || !process.env.X402_MERCHANT_ID) {
      logger.warn('Live mode enabled but X402 credentials not set');
    }
  }

  return {
    ...required,
    X402_API_KEY: process.env.X402_API_KEY,
    X402_MERCHANT_ID: process.env.X402_MERCHANT_ID,
    FACILITATOR_URL: process.env.FACILITATOR_URL,
    FACILITATOR_API_KEY: process.env.FACILITATOR_API_KEY,
    FACILITATOR_NAME: process.env.FACILITATOR_NAME,
  };
};

export const env = validateEnv();



