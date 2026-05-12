import { Prisma } from "@prisma/client";
import { StatusCodes } from "http-status-codes";
import { ZodError } from "zod";

import { env } from "../config/env.js";
import { alertServerError } from "../services/alertService.js";
import { ApiError } from "../utils/ApiError.js";

function getFieldErrors(error) {
  const flattened = error.flatten();

  return Object.fromEntries(
    Object.entries(flattened.fieldErrors)
      .map(([field, messages]) => [field, messages?.[0]])
      .filter(([, message]) => Boolean(message)),
  );
}

export function errorHandler(error, req, res, _next) {
  let statusCode = StatusCodes.INTERNAL_SERVER_ERROR;
  let message = "Something went wrong";
  let errors = null;
  const errorMessage = String(error?.message || "");

  if (error instanceof ApiError) {
    statusCode = error.statusCode;
    message = error.message;
    errors = error.details || null;
  } else if (error instanceof ZodError) {
    statusCode = StatusCodes.UNPROCESSABLE_ENTITY;
    message = "Validation failed";
    errors = getFieldErrors(error);
  } else if (error instanceof Prisma.PrismaClientKnownRequestError) {
    if (error.code === "P2002") {
      statusCode = StatusCodes.CONFLICT;
      message = "A record with the same unique value already exists";
      errors = error.meta;
    } else if (error.code === "P2025") {
      statusCode = StatusCodes.NOT_FOUND;
      message = "Requested record was not found";
    }
  } else if (error instanceof Prisma.PrismaClientInitializationError) {
    statusCode = StatusCodes.SERVICE_UNAVAILABLE;
    message = "Database is unavailable. Check DATABASE_URL and make sure the database server is reachable.";
    errors = env.isProduction
      ? null
      : {
          prismaMessage: error.message,
        };
  } else if (
    error?.code === "EBADCSRFTOKEN" ||
    errorMessage === "invalid csrf token"
  ) {
    statusCode = StatusCodes.FORBIDDEN;
    message = "Invalid CSRF token";
  } else if (
    errorMessage.includes("Can't reach database server") ||
    errorMessage.includes("can-connect-to-database") ||
    errorMessage.includes("ECONNREFUSED")
  ) {
    statusCode = StatusCodes.SERVICE_UNAVAILABLE;
    message = "Database is unavailable. Check DATABASE_URL and make sure the database server is reachable.";
    errors = env.isProduction
      ? null
      : {
          prismaMessage: errorMessage,
        };
  }

  if (statusCode >= StatusCodes.INTERNAL_SERVER_ERROR) {
    alertServerError(req.originalUrl || req.url || "unknown", error, req.user?.id || req.admin?.id).catch((alertError) => {
      req.log?.warn({ err: alertError }, "Could not send server error alert");
    });
  }

  req.log?.error(
    {
      err: error,
      statusCode,
      errors,
    },
    "Request failed",
  );

  if (env.isProduction) {
    res.status(statusCode).json({
      success: false,
      message: "Something went wrong",
    });
    return;
  }

  res.status(statusCode).json({
    success: false,
    message,
    ...(errors ? { errors } : {}),
    ...(env.NODE_ENV === "development"
      ? {
          details: {
            name: error?.name,
            message: error?.message,
            code: error?.code,
          },
          stack: error?.stack,
        }
      : {}),
  });
}
