import { asyncHandler } from '../utils/asyncHandler.js';
import * as assignmentService from '../services/assignment.service.js';

export const listAssignments = asyncHandler(async (req, res) => {
  const query = req.validatedQuery ?? {};
  const data = await assignmentService.listAssignments({
    asset_id: query.asset_id,
    employee_id: query.employee_id,
    is_open: query.is_open,
    page: query.page,
    limit: query.limit,
  });
  res.status(200).json({ success: true, data });
});

export const returnAssignment = asyncHandler(async (req, res) => {
  const data = await assignmentService.returnAssignment(
    req.user,
    Number(req.validatedParams.id),
    req.body,
  );
  res.status(200).json({ success: true, data });
});
