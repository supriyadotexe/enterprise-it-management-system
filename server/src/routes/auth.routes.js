import { Router } from 'express';
import { authenticate } from '../middleware/authenticate.js';
import { loginRateLimit } from '../middleware/loginRateLimit.js';
import { validateBody } from '../validators/common.js';
import { loginBody, changePasswordBody } from '../validators/auth.validators.js';
import * as authController from '../controllers/auth.controller.js';

const router = Router();

router.post('/login', loginRateLimit, validateBody(loginBody), authController.login);
router.get('/me', authenticate, authController.me);
router.patch('/password', authenticate, validateBody(changePasswordBody), authController.changePassword);
router.post('/logout', authenticate, authController.logout);

export default router;
