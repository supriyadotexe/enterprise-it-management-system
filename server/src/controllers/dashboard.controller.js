import { asyncHandler } from '../utils/asyncHandler.js';
import * as dashboardService from '../services/dashboard.service.js';

export const adminDashboard = asyncHandler(async (req, res) => {
  res.status(200).json({ success: true, data: await dashboardService.getAdminDashboard() });
});

export const employeeDashboard = asyncHandler(async (req, res) => {
  res.status(200).json({ success: true, data: await dashboardService.getEmployeeDashboard(req.user) });
});

export const technicianDashboard = asyncHandler(async (req, res) => {
  res.status(200).json({ success: true, data: await dashboardService.getTechnicianDashboard(req.user) });
});
