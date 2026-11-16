import { asyncHandler } from '../utils/asyncHandler.js';
import * as authService from '../services/auth.service.js';

export const login = asyncHandler(async (req, res) => {
  const result = await authService.login(req.body);
  res.status(200).json({ success: true, data: result });
});

export const me = asyncHandler(async (req, res) => {
  res.status(200).json({ success: true, data: req.user });
});

export const changePassword = asyncHandler(async (req, res) => {
  const result = await authService.changePassword(req.user.user_id, req.body);
  res.status(200).json({ success: true, data: result });
});

export const logout = asyncHandler(async (req, res) => {
  const result = authService.logout();
  res.status(200).json({ success: true, data: result });
});
