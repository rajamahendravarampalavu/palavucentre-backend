import { StatusCodes } from "http-status-codes";

import {
  createGalleryItem,
  deleteGalleryItem,
  getPublicGallery,
  listAdminGallery,
  updateGalleryItem,
} from "../services/gallery.service.js";

export async function listPublicGallery(req, res) {
  const data = await getPublicGallery(req.query);

  res.status(StatusCodes.OK).json({
    success: true,
    data: {
      items: data,
    },
  });
}

export async function listGallery(req, res) {
  const data = await listAdminGallery(req.query);

  res.status(StatusCodes.OK).json({
    success: true,
    data,
  });
}

export async function createGalleryItemHandler(req, res) {
  const data = await createGalleryItem(req.body);

  res.status(StatusCodes.CREATED).json({
    success: true,
    message: "Gallery item created",
    data,
  });
}

export async function updateGalleryItemHandler(req, res) {
  const data = await updateGalleryItem(req.params.id, req.body);

  res.status(StatusCodes.OK).json({
    success: true,
    message: "Gallery item updated",
    data,
  });
}

export async function deleteGalleryItemHandler(req, res) {
  await deleteGalleryItem(req.params.id);

  res.status(StatusCodes.OK).json({
    success: true,
    message: "Gallery item deleted",
  });
}
