import { Router } from 'express';
import { authenticate } from '../middleware/authenticate.js';
import * as lookupController from '../controllers/lookup.controller.js';

const router = Router();

router.use(authenticate);
router.get('/', lookupController.getLookups);

export default router;
