import { StatusCodes } from "http-status-codes";

import { getAdminProfile, loginAdmin } from "../services/admin-auth.service.js";
import { clearAdminAuthCookie, setAdminAuthCookie } from "../utils/cookies.js";

export async function login(req, res) {
  const result = await loginAdmin(req.body);
  setAdminAuthCookie(res, result.token);

  res.status(StatusCodes.OK).json({
    success: true,
    message: "Admin login successful",
    data: {
      admin: result.admin,
    },
  });
}

export async function logout(_req, res) {
  clearAdminAuthCookie(res);

  res.status(StatusCodes.OK).json({
    success: true,
    message: "Admin logout successful",
  });
}

export async function me(req, res) {
  const admin = await getAdminProfile(req.admin.id);

  res.status(StatusCodes.OK).json({
    success: true,
    data: {
      admin,
    },
  });
}
