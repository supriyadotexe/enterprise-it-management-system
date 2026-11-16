import { asyncHandler } from '../utils/asyncHandler.js';
import * as assetService from '../services/asset.service.js';
import * as assetLifecycleService from '../services/assetLifecycle.service.js';
import * as assignmentService from '../services/assignment.service.js';

export const listAssets = asyncHandler(async (req, res) => {
  const query = req.validatedQuery ?? {};
  const data = await assetService.listAssets(req.user, {
    page: query.page,
    limit: query.limit,
    status: query.status,
    category_id: query.category_id,
    assigned_employee_id: query.assigned_employee_id,
    search: query.search,
  });
  res.status(200).json({ success: true, data });
});

export const createAsset = asyncHandler(async (req, res) => {
  const data = await assetLifecycleService.createAsset(req.user.user_id, req.body);
  res.status(201).json({ success: true, data });
});

export const getAsset = asyncHandler(async (req, res) => {
  const data = await assetService.getAsset(
    Number(req.validatedParams.id),
    req.user,
  );
  res.status(200).json({ success: true, data });
});

export const updateAsset = asyncHandler(async (req, res) => {
  const data = await assetLifecycleService.updateAsset(
    req.user.user_id,
    Number(req.validatedParams.id),
    req.body,
  );
  res.status(200).json({ success: true, data });
});

export const retireAsset = asyncHandler(async (req, res) => {
  const data = await assetLifecycleService.retireAsset(
    req.user.user_id,
    Number(req.validatedParams.id),
  );
  res.status(200).json({ success: true, data });
});

export const getAssetHistory = asyncHandler(async (req, res) => {
  const query = req.validatedQuery ?? {};
  const data = await assetService.getAssetHistory(
    Number(req.validatedParams.id),
    req.user,
    { page: query.page, limit: query.limit },
  );
  res.status(200).json({ success: true, data });
});

export const getAssetMaintenance = asyncHandler(async (req, res) => {
  const query = req.validatedQuery ?? {};
  const data = await assetService.getAssetMaintenance(
    Number(req.validatedParams.id),
    req.user,
    { page: query.page, limit: query.limit, status: query.status },
  );
  res.status(200).json({ success: true, data });
});

export const assignAsset = asyncHandler(async (req, res) => {
  const data = await assignmentService.assignAsset(
    req.user,
    Number(req.validatedParams.id),
    req.body,
  );
  res.status(201).json({ success: true, data });
});
