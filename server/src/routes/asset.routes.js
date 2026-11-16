import { Router } from 'express';
import { authenticate, authorize } from '../middleware/authenticate.js';
import { validateBody, validateParams, validateQuery, idParams } from '../validators/common.js';
import {
  assetBody,
  assetUpdateBody,
  assetListQuery,
  historyQuery,
  assetMaintenanceQuery,
  assignBody,
} from '../validators/asset.validators.js';
import * as assetController from '../controllers/asset.controller.js';

const router = Router();

router.use(authenticate);
router.get('/', validateQuery(assetListQuery), assetController.listAssets);
router.post('/', authorize('admin'), validateBody(assetBody), assetController.createAsset);
router.get('/:id', validateParams(idParams), assetController.getAsset);
router.patch('/:id', authorize('admin'), validateParams(idParams), validateBody(assetUpdateBody), assetController.updateAsset);
router.post('/:id/retire', authorize('admin'), validateParams(idParams), validateBody({}), assetController.retireAsset);
router.get('/:id/history', validateParams(idParams), validateQuery(historyQuery), assetController.getAssetHistory);
router.get('/:id/maintenance', validateParams(idParams), validateQuery(assetMaintenanceQuery), assetController.getAssetMaintenance);
router.post('/:id/assign', authorize('admin'), validateParams(idParams), validateBody(assignBody), assetController.assignAsset);

export default router;
