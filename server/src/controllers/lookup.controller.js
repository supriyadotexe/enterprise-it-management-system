import { asyncHandler } from '../utils/asyncHandler.js';
import * as lookupService from '../services/lookup.service.js';

export const getLookups = asyncHandler(async (req, res) => {
  res.status(200).json({ success: true, data: await lookupService.getLookups() });
});
