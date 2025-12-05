import { Router, Request, Response } from 'express';

const router = Router();
const startTime = Date.now();

router.get('/health', (_req: Request, res: Response): void => {
  const uptime = Math.floor((Date.now() - startTime) / 1000);
  res.status(200).json({
    status: 'ok',
    uptime,
    timestamp: new Date().toISOString(),
  });
});

export default router;


