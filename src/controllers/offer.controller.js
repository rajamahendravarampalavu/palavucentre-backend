import { StatusCodes } from "http-status-codes";

import {
  createOffer,
  deleteOffer,
  getPublicOffers,
  listAdminOffers,
  updateOffer,
} from "../services/offer.service.js";

export async function listPublicOffers(req, res) {
  const data = await getPublicOffers(req.query);

  res.status(StatusCodes.OK).json({
    success: true,
    data: {
      items: data,
    },
  });
}

export async function listOffers(req, res) {
  const data = await listAdminOffers(req.query);

  res.status(StatusCodes.OK).json({
    success: true,
    data,
  });
}

export async function createOfferHandler(req, res) {
  const data = await createOffer(req.body);

  res.status(StatusCodes.CREATED).json({
    success: true,
    message: "Offer created",
    data,
  });
}

export async function updateOfferHandler(req, res) {
  const data = await updateOffer(req.params.id, req.body);

  res.status(StatusCodes.OK).json({
    success: true,
    message: "Offer updated",
    data,
  });
}

export async function deleteOfferHandler(req, res) {
  await deleteOffer(req.params.id);

  res.status(StatusCodes.OK).json({
    success: true,
    message: "Offer deleted",
  });
}
