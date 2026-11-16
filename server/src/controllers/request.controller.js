import { ApiError } from '../utils/ApiError.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import * as requestService from '../services/request.service.js';

export const listRequests = asyncHandler(async (req, res) => {
  const query = req.validatedQuery ?? {};
  const data = await requestService.listRequests(req.user, {
    page: query.page,
    limit: query.limit,
    status: query.status,
    priority: query.priority,
    service_category_id: query.service_category_id,
    employee_id: query.employee_id,
    assigned_technician_id: query.assigned_technician_id,
    search: query.search,
  });
  res.status(200).json({ success: true, data });
});

export const createRequest = asyncHandler(async (req, res) => {
  const data = await requestService.createRequest(req.user, req.body);
  res.status(201).json({ success: true, data });
});

export const getRequest = asyncHandler(async (req, res) => {
  const data = await requestService.getRequest(
    Number(req.validatedParams.id),
    req.user,
  );
  res.status(200).json({ success: true, data });
});

export const updateRequest = asyncHandler(async (req, res) => {
  const data = await requestService.updateRequest(
    req.user,
    Number(req.validatedParams.id),
    req.body,
  );
  res.status(200).json({ success: true, data });
});

export const assignRequest = asyncHandler(async (req, res) => {
  const data = await requestService.assignRequest(
    req.user,
    Number(req.validatedParams.id),
    req.body,
  );
  res.status(200).json({ success: true, data });
});

export const transitionRequestStatus = asyncHandler(async (req, res) => {
  const id = Number(req.validatedParams.id);
  const body = req.body ?? {};
  const target = body.status;

  let data;
  switch (target) {
    case 'assigned':
      data = await requestService.assignRequest(req.user, id, body);
      break;
    case 'in_progress':
      data = await requestService.startRequest(req.user, id, body);
      break;
    case 'resolved':
      data = await requestService.resolveRequest(req.user, id, body);
      break;
    case 'closed':
      data = await requestService.closeRequest(req.user, id, body);
      break;
    case 'cancelled':
      data = await requestService.cancelRequest(req.user, id, body);
      break;
    default:
      throw new ApiError(400, 'INVALID_STATUS_TRANSITION', 'Unsupported request status transition.');
  }

  res.status(200).json({ success: true, data });
});

export const getRequestHistory = asyncHandler(async (req, res) => {
  const data = await requestService.getRequestHistory(
    Number(req.validatedParams.id),
    req.user,
  );
  res.status(200).json({ success: true, data });
});
