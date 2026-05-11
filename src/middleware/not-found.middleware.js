import { StatusCodes } from "http-status-codes";

export function notFoundHandler(req, res) {
  res.status(StatusCodes.NOT_FOUND).json({
    success: false,
    message: `Route not found: ${req.method} ${req.originalUrl}`,
  });
}
