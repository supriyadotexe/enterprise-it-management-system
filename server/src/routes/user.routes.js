import { Router } from 'express';
import { authenticate, authorize } from '../middleware/authenticate.js';
import { validateBody, validateParams, idParams } from '../validators/common.js';
import { userBody, userUpdateBody, resetPasswordBody } from '../validators/organization.validators.js';
import * as userController from '../controllers/user.controller.js';

const router = Router();

router.use(authenticate, authorize('admin'));
router.post('/', validateBody(userBody), userController.createUser);
router.patch('/:id', validateParams(idParams), validateBody(userUpdateBody), userController.updateUser);
router.post('/:id/reset-password', validateParams(idParams), validateBody(resetPasswordBody), userController.resetPassword);

export default router;
