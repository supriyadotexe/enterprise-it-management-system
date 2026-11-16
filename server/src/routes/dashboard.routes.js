import { Router } from 'express';
import { authenticate, authorize } from '../middleware/authenticate.js';
import * as dashboardController from '../controllers/dashboard.controller.js';

const router = Router();

router.use(authenticate);
router.get('/admin', authorize('admin'), dashboardController.adminDashboard);
router.get('/employee', authorize('employee'), dashboardController.employeeDashboard);
router.get('/technician', authorize('technician'), dashboardController.technicianDashboard);

export default router;
