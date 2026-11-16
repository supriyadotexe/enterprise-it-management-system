import { Router } from 'express';
import { env } from '../config/env.js';

const router = Router();

router.get('/', (req, res) => {
  res.set('Cache-Control', 'no-store');
  res.status(200).json({
    success: true,
    data: {
      status: 'ok',
      service: env.serviceName,
      version: env.version,
      environment: env.nodeEnv,
      timezone: env.appTimezone,
      timestamp: new Date().toISOString(),
    },
  });
});

export default router;
