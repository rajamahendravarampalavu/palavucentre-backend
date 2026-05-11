import { StatusCodes } from "http-status-codes";

import {
  getAdminSiteSettings,
  getPublicSiteSettings,
  updateSiteSettings,
} from "../services/site-settings.service.js";

export async function getPublicSettings(req, res) {
  const data = await getPublicSiteSettings();

  res.status(StatusCodes.OK).json({
    success: true,
    data,
  });
}

export async function getAdminSettings(req, res) {
  const data = await getAdminSiteSettings();

  res.status(StatusCodes.OK).json({
    success: true,
    data,
  });
}

export async function updateSettings(req, res) {
  const data = await updateSiteSettings(req.body);

  res.status(StatusCodes.OK).json({
    success: true,
    message: "Site settings updated",
    data,
  });
}
