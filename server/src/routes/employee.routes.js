import { Router } from 'express';
import { authenticate, authorize } from '../middleware/authenticate.js';
import { validateBody, validateParams, validateQuery, idParams } from '../validators/common.js';
import {
  employeeBody,
  employeeUpdateBody,
  employeeListQuery,
  employeeAssetsQuery,
  employeeRequestsQuery,
  statusBody,
} from '../validators/organization.validators.js';
import * as employeeController from '../controllers/employee.controller.js';

const router = Router();

router.use(authenticate);
router.get('/', authorize('admin'), validateQuery(employeeListQuery), employeeController.listEmployees);
router.post('/', authorize('admin'), validateBody(employeeBody), employeeController.createEmployee);
router.get('/:id', validateParams(idParams), employeeController.getEmployee);
router.patch('/:id', authorize('admin'), validateParams(idParams), validateBody(employeeUpdateBody), employeeController.updateEmployee);
router.patch('/:id/status', authorize('admin'), validateParams(idParams), validateBody(statusBody), employeeController.setEmployeeStatus);
router.get('/:id/assets', validateParams(idParams), validateQuery(employeeAssetsQuery), employeeController.getEmployeeAssets);
router.get('/:id/requests', validateParams(idParams), validateQuery(employeeRequestsQuery), employeeController.getEmployeeRequests);

export default router;
