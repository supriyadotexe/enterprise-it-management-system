import { asyncHandler } from '../utils/asyncHandler.js';
import * as maintenanceService from '../services/maintenance.service.js';

export const listMaintenance = asyncHandler(async (req, res) => {
  const query = req.validatedQuery ?? {};
  const data = await maintenanceService.listMaintenance(req.user, {
    page: query.page,
    limit: query.limit,
    status: query.status,
    asset_id: query.asset_id,
    request_id: query.request_id,
    technician_id: query.technician_id,
    search: query.search,
  });
  res.status(200).json({ success: true, data });
});

export const createMaintenance = asyncHandler(async (req, res) => {
  const data = await maintenanceService.create(req.user, req.body);
  res.status(201).json({ success: true, data });
});

export const getMaintenance = asyncHandler(async (req, res) => {
  const data = await maintenanceService.getMaintenance(
    Number(req.validatedParams.id),
    req.user,
  );
  res.status(200).json({ success: true, data });
});

export const startMaintenance = asyncHandler(async (req, res) => {
  const data = await maintenanceService.start(
    req.user,
    Number(req.validatedParams.id),
    req.body,
  );
  res.status(200).json({ success: true, data });
});

export const completeMaintenance = asyncHandler(async (req, res) => {
  const data = await maintenanceService.complete(
    req.user,
    Number(req.validatedParams.id),
    req.body,
  );
  res.status(200).json({ success: true, data });
});

export const cancelMaintenance = asyncHandler(async (req, res) => {
  const data = await maintenanceService.cancel(
    req.user,
    Number(req.validatedParams.id),
    req.body,
  );
  res.status(200).json({ success: true, data });
});
