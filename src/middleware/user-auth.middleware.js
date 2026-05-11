import jwt from "jsonwebtoken";
import { StatusCodes } from "http-status-codes";

import { env } from "../config/env.js";
import { prisma } from "../config/prisma.js";
import { ApiError } from "../utils/ApiError.js";

function readToken(req) {
  return req.cookies?.[env.USER_COOKIE_NAME] || null;
}

async function resolveUserFromRequest(req) {
  const token = readToken(req);

  if (!token) {
    return null;
  }

  const payload = jwt.verify(token, env.JWT_SECRET);

  if (payload.role !== "user") {
    throw new ApiError(StatusCodes.UNAUTHORIZED, "Invalid user session");
  }

  const user = await prisma.user.findUnique({
    where: { id: Number(payload.sub) },
    select: {
      id: true,
      email: true,
      name: true,
      isActive: true,
      lastLoginAt: true,
      createdAt: true,
    },
  });

  if (!user || !user.isActive) {
    throw new ApiError(StatusCodes.UNAUTHORIZED, "User session is no longer valid");
  }

  return user;
}

export async function requireUserAuth(req, _res, next) {
  try {
    const user = await resolveUserFromRequest(req);

    if (!user) {
      throw new ApiError(StatusCodes.UNAUTHORIZED, "User authentication is required");
    }

    req.user = user;
    next();
  } catch (error) {
    next(error instanceof ApiError ? error : new ApiError(StatusCodes.UNAUTHORIZED, "Invalid user session"));
  }
}

export async function attachOptionalUser(req, _res, next) {
  try {
    const user = await resolveUserFromRequest(req);
    if (user) {
      req.user = user;
    }
  } catch {
    // Guest checkout should still work even if the stored user cookie is stale.
  }

  next();
}
