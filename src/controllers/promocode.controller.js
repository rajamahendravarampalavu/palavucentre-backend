import { StatusCodes } from "http-status-codes";

import {
  applyPromoCodePreview,
  createPromoCode,
  deletePromoCode,
  listAdminPromoCodes,
  updatePromoCode,
} from "../services/promocode.service.js";

export async function applyPromoCode(req, res) {
  const data = await applyPromoCodePreview(req.body);

  res.status(StatusCodes.OK).json({
    success: true,
    message: "Promo code applied",
    data,
  });
}

export async function listPromoCodes(req, res) {
  const data = await listAdminPromoCodes(req.query);

  res.status(StatusCodes.OK).json({
    success: true,
    data,
  });
}

export async function createPromoCodeHandler(req, res) {
  const data = await createPromoCode(req.body);

  res.status(StatusCodes.CREATED).json({
    success: true,
    message: "Promo code created",
    data,
  });
}

export async function updatePromoCodeHandler(req, res) {
  const data = await updatePromoCode(req.params.id, req.body);

  res.status(StatusCodes.OK).json({
    success: true,
    message: "Promo code updated",
    data,
  });
}

export async function deletePromoCodeHandler(req, res) {
  await deletePromoCode(req.params.id);

  res.status(StatusCodes.OK).json({
    success: true,
    message: "Promo code deleted",
  });
}
