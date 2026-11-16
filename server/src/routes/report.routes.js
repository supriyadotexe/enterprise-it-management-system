import { Router } from 'express';
import { authenticate, authorize } from '../middleware/authenticate.js';
import { validateQuery } from '../validators/common.js';
import { reportRangeQuery } from '../validators/report.validators.js';
import * as reportController from '../controllers/report.controller.js';

const router = Router();

router.use(authenticate, authorize('admin'));
router.get('/assets-by-department', reportController.assetsByDepartment);
router.get('/technician-workload', reportController.technicianWorkload);
router.get('/maintenance-cost', validateQuery(reportRangeQuery), reportController.maintenanceCost);
router.get('/request-summary', validateQuery(reportRangeQuery), reportController.requestSummary);

export default router;
