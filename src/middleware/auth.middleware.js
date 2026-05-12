import jwt from "jsonwebtoken";
import { StatusCodes } from "http-status-codes";

import { env } from "../config/env.js";
import { prisma } from "../config/prisma.js";
import { ApiError } from "../utils/ApiError.js";

export async function requireAdminAuth(req, _res, next) {
  try {
    const token = req.cookies?.[env.COOKIE_NAME] || req.cookies?.[env.USER_COOKIE_NAME];

    if (!token) {
      throw new ApiError(StatusCodes.UNAUTHORIZED, "Admin authentication is required");
    }

    const payload = jwt.verify(token, env.JWT_SECRET);

    if (payload?.role !== "admin") {
      throw new ApiError(StatusCodes.NOT_FOUND, "Not Found");
    }

    const adminId = Number(payload?.sub);

    if (!Number.isInteger(adminId) || adminId <= 0) {
      throw new ApiError(StatusCodes.UNAUTHORIZED, "Invalid admin session");
    }

    const admin = await prisma.admin.findUnique({
      where: { id: adminId },
      select: {
        id: true,
        email: true,
        name: true,
        isActive: true,
      },
    });

    if (!admin || !admin.isActive) {
      throw new ApiError(StatusCodes.UNAUTHORIZED, "Admin session is no longer valid");
    }

    req.admin = admin;
    next();
  } catch (error) {
    next(error instanceof ApiError ? error : new ApiError(StatusCodes.UNAUTHORIZED, "Invalid admin session"));
  }
}
