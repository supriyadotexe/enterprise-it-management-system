import { Router } from 'express';
import { authenticate, authorize } from '../middleware/authenticate.js';
import { validateBody, validateParams, validateQuery, idParams } from '../validators/common.js';
import {
  maintenanceBody,
  maintenanceStartBody,
  maintenanceCompleteBody,
  maintenanceCancelBody,
  maintenanceListQuery,
} from '../validators/maintenance.validators.js';
import * as maintenanceController from '../controllers/maintenance.controller.js';

const router = Router();

router.use(authenticate);
router.get('/', validateQuery(maintenanceListQuery), maintenanceController.listMaintenance);
router.post('/', authorize('admin', 'technician'), validateBody(maintenanceBody), maintenanceController.createMaintenance);
router.get('/:id', validateParams(idParams), maintenanceController.getMaintenance);
router.patch('/:id/start', validateParams(idParams), validateBody(maintenanceStartBody), maintenanceController.startMaintenance);
router.patch('/:id/complete', validateParams(idParams), validateBody(maintenanceCompleteBody), maintenanceController.completeMaintenance);
router.patch('/:id/cancel', validateParams(idParams), validateBody(maintenanceCancelBody), maintenanceController.cancelMaintenance);

export default router;
