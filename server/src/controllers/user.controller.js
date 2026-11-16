import { asyncHandler } from '../utils/asyncHandler.js';
import * as userService from '../services/user.service.js';

export const createUser = asyncHandler(async (req, res) => {
  const data = await userService.createUser(req.body);
  res.status(201).json({ success: true, data });
});

export const updateUser = asyncHandler(async (req, res) => {
  const data = await userService.updateUser(Number(req.validatedParams.id), req.body);
  res.status(200).json({ success: true, data });
});

export const resetPassword = asyncHandler(async (req, res) => {
  const data = await userService.resetPassword(
    Number(req.validatedParams.id),
    req.body,
  );
  res.status(200).json({ success: true, data });
});
