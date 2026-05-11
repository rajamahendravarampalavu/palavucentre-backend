import { StatusCodes } from "http-status-codes";

import { generateToken } from "../middleware/csrf.middleware.js";

export function getCsrfToken(req, res) {
  const csrfToken = generateToken(req, res);

  res.status(StatusCodes.OK).json({
    success: true,
    data: {
      csrfToken,
    },
  });
}
