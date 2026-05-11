import multer from "multer";
import { StatusCodes } from "http-status-codes";

import { env } from "../config/env.js";
import { ApiError } from "../utils/ApiError.js";

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: env.MAX_UPLOAD_SOURCE_FILE_SIZE_MB * 1024 * 1024,
    files: 1,
  },
  fileFilter(_req, file, callback) {
    if (!file.mimetype?.startsWith("image/") || file.mimetype === "image/svg+xml") {
      callback(
        new ApiError(StatusCodes.BAD_REQUEST, "File validation error", {
          reason: file.mimetype === "image/svg+xml" ? "SVG uploads are not supported" : "Only image uploads are supported",
        }),
      );
      return;
    }

    callback(null, true);
  },
});

export function uploadSingleImage(req, res, next) {
  upload.single("file")(req, res, (error) => {
    if (!error) {
      next();
      return;
    }

    if (error instanceof ApiError) {
      next(error);
      return;
    }

    if (error instanceof multer.MulterError) {
      if (error.code === "LIMIT_FILE_SIZE") {
        next(
          new ApiError(
            StatusCodes.BAD_REQUEST,
            `Source image must be ${env.MAX_UPLOAD_SOURCE_FILE_SIZE_MB}MB or less before optimization`,
          ),
        );
        return;
      }

      next(new ApiError(StatusCodes.BAD_REQUEST, error.message));
      return;
    }

    next(error);
  });
}
