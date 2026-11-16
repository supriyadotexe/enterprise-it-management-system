import { asyncHandler } from '../utils/asyncHandler.js';
import * as reportService from '../services/report.service.js';

export const assetsByDepartment = asyncHandler(async (req, res) => {
  res.status(200).json({ success: true, data: await reportService.assetsByDepartment() });
});

export const technicianWorkload = asyncHandler(async (req, res) => {
  res.status(200).json({ success: true, data: await reportService.technicianWorkload() });
});

export const maintenanceCost = asyncHandler(async (req, res) => {
  const query = req.validatedQuery ?? {};
  res.status(200).json({
    success: true,
    data: await reportService.maintenanceCost({ from: query.from, to: query.to }),
  });
});

export const requestSummary = asyncHandler(async (req, res) => {
  const query = req.validatedQuery ?? {};
  res.status(200).json({
    success: true,
    data: await reportService.requestSummary({ from: query.from, to: query.to }),
  });
});
