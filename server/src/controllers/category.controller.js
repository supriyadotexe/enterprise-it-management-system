import { asyncHandler } from '../utils/asyncHandler.js';
import * as categoryService from '../services/category.service.js';

export function listCategories(type) {
  return asyncHandler(async (req, res) => {
    const query = req.validatedQuery ?? {};
    const includeInactive =
      Boolean(query.include_inactive) && req.user.role === 'admin';
    const data = await categoryService.listCategories(type, { includeInactive });
    res.status(200).json({ success: true, data });
  });
}

export function createCategory(type) {
  return asyncHandler(async (req, res) => {
    const data = await categoryService.createCategory(type, req.body);
    res.status(201).json({ success: true, data });
  });
}

export function updateCategory(type) {
  return asyncHandler(async (req, res) => {
    const data = await categoryService.updateCategory(
      type,
      Number(req.validatedParams.id),
      req.body,
    );
    res.status(200).json({ success: true, data });
  });
}
