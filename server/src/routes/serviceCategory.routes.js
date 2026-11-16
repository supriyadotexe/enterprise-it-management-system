import { Router } from 'express';
import { authenticate, authorize } from '../middleware/authenticate.js';
import { validateBody, validateParams, validateQuery, idParams } from '../validators/common.js';
import { categoryBody, categoryUpdateBody, categoryListQuery } from '../validators/organization.validators.js';
import { listCategories, createCategory, updateCategory } from '../controllers/category.controller.js';

const router = Router();
const list = listCategories('service');
const create = createCategory('service');
const update = updateCategory('service');

router.use(authenticate);
router.get('/', validateQuery(categoryListQuery), list);
router.post('/', authorize('admin'), validateBody(categoryBody), create);
router.patch('/:id', authorize('admin'), validateParams(idParams), validateBody(categoryUpdateBody), update);

export default router;
