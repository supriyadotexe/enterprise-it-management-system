import { Router } from 'express';
import { authenticate, authorize } from '../middleware/authenticate.js';
import { validateBody, validateParams, validateQuery, idParams } from '../validators/common.js';
import { assignmentListQuery, returnBody } from '../validators/asset.validators.js';
import * as assignmentController from '../controllers/assignment.controller.js';

const router = Router();

router.use(authenticate);
router.get('/', authorize('admin'), validateQuery(assignmentListQuery), assignmentController.listAssignments);
router.post('/:id/return', authorize('admin', 'technician'), validateParams(idParams), validateBody(returnBody), assignmentController.returnAssignment);

export default router;
