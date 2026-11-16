import { Router } from 'express';
import { authenticate, authorize } from '../middleware/authenticate.js';
import { validateBody, validateParams, validateQuery, idParams } from '../validators/common.js';
import { departmentBody, departmentUpdateBody, statusBody, departmentListQuery } from '../validators/organization.validators.js';
import * as departmentController from '../controllers/department.controller.js';

const router = Router();

router.use(authenticate);
router.get('/', validateQuery(departmentListQuery), departmentController.listDepartments);
router.post('/', authorize('admin'), validateBody(departmentBody), departmentController.createDepartment);
router.patch('/:id', authorize('admin'), validateParams(idParams), validateBody(departmentUpdateBody), departmentController.updateDepartment);
router.patch('/:id/status', authorize('admin'), validateParams(idParams), validateBody(statusBody), departmentController.setDepartmentStatus);

export default router;
