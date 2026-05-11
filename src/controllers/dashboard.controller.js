import { StatusCodes } from "http-status-codes";

import { getDashboardSnapshot } from "../services/dashboard.service.js";

export async function getDashboard(req, res) {
  const data = await getDashboardSnapshot();

  res.status(StatusCodes.OK).json({
    success: true,
    data,
  });
}
