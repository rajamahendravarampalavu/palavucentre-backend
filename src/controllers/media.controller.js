import { StatusCodes } from "http-status-codes";

import { uploadLocalImage } from "../services/media.service.js";

export async function uploadImageHandler(req, res) {
  const data = await uploadLocalImage({
    file: req.file,
    folder: req.body.folder,
  });

  res.status(StatusCodes.CREATED).json({
    success: true,
    message: "Image uploaded",
    data,
  });
}
