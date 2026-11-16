import { asyncHandler } from '../utils/asyncHandler.js';
import * as employeeService from '../services/employee.service.js';

export const listEmployees = asyncHandler(async (req, res) => {
  const query = req.validatedQuery ?? {};
  const data = await employeeService.listEmployees({
    department_id: query.department_id,
    is_active: query.is_active,
    search: query.search,
    page: query.page,
    limit: query.limit,
  });
  res.status(200).json({ success: true, data });
});

export const createEmployee = asyncHandler(async (req, res) => {
  const data = await employeeService.createEmployee(req.body);
  res.status(201).json({ success: true, data });
});

export const getEmployee = asyncHandler(async (req, res) => {
  const data = await employeeService.getEmployee(
    Number(req.validatedParams.id),
    req.user,
  );
  res.status(200).json({ success: true, data });
});

export const updateEmployee = asyncHandler(async (req, res) => {
  const data = await employeeService.updateEmployee(
    Number(req.validatedParams.id),
    req.body,
  );
  res.status(200).json({ success: true, data });
});

export const setEmployeeStatus = asyncHandler(async (req, res) => {
  const data = await employeeService.setEmployeeStatus(
    Number(req.validatedParams.id),
    req.body.is_active,
  );
  res.status(200).json({ success: true, data });
});

export const getEmployeeAssets = asyncHandler(async (req, res) => {
  const query = req.validatedQuery ?? {};
  const data = await employeeService.getEmployeeAssets(
    Number(req.validatedParams.id),
    req.user,
    {
      includeReturned: query.include_returned,
      page: query.page,
      limit: query.limit,
    },
  );
  res.status(200).json({ success: true, data });
});

export const getEmployeeRequests = asyncHandler(async (req, res) => {
  const query = req.validatedQuery ?? {};
  const data = await employeeService.getEmployeeRequests(
    Number(req.validatedParams.id),
    req.user,
    {
      status: query.status,
      page: query.page,
      limit: query.limit,
    },
  );
  res.status(200).json({ success: true, data });
});
