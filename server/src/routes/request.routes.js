import { Router } from 'express';
import { authenticate, authorize } from '../middleware/authenticate.js';
import { validateBody, validateParams, validateQuery, idParams } from '../validators/common.js';
import {
  requestBody,
  requestUpdateBody,
  requestListQuery,
  assignRequestBody,
  requestStatusBody,
} from '../validators/request.validators.js';
import * as requestController from '../controllers/request.controller.js';

const router = Router();

router.use(authenticate);
router.get('/', validateQuery(requestListQuery), requestController.listRequests);
router.post('/', authorize('employee', 'admin'), validateBody(requestBody), requestController.createRequest);
router.get('/:id', validateParams(idParams), requestController.getRequest);
router.patch('/:id', validateParams(idParams), validateBody(requestUpdateBody), requestController.updateRequest);
router.post('/:id/assign', authorize('admin'), validateParams(idParams), validateBody(assignRequestBody), requestController.assignRequest);
router.patch('/:id/status', validateParams(idParams), validateBody(requestStatusBody), requestController.transitionRequestStatus);
router.get('/:id/history', validateParams(idParams), requestController.getRequestHistory);

export default router;
