import { asyncHandler } from '../utils/asyncHandler.js';
import * as departmentService from '../services/department.service.js';

export const listDepartments = asyncHandler(async (req, res) => {
  const query = req.validatedQuery ?? {};
  const includeInactive =
    Boolean(query.include_inactive) && req.user.role === 'admin';
  const data = await departmentService.listDepartments({
    includeInactive,
    search: query.search,
  });
  res.status(200).json({ success: true, data });
});

export const createDepartment = asyncHandler(async (req, res) => {
  const data = await departmentService.createDepartment(req.body);
  res.status(201).json({ success: true, data });
});

export const updateDepartment = asyncHandler(async (req, res) => {
  const data = await departmentService.updateDepartment(
    Number(req.validatedParams.id),
    req.body,
  );
  res.status(200).json({ success: true, data });
});

export const setDepartmentStatus = asyncHandler(async (req, res) => {
  const data = await departmentService.setDepartmentStatus(
    Number(req.validatedParams.id),
    req.body.is_active,
  );
  res.status(200).json({ success: true, data });
});
