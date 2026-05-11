import { StatusCodes } from "http-status-codes";

import {
  createReview,
  deleteReview,
  getPublicReviews,
  listAdminReviews,
  updateReview,
} from "../services/review.service.js";

export async function listPublicReviews(req, res) {
  const data = await getPublicReviews(req.query);

  res.status(StatusCodes.OK).json({
    success: true,
    data: {
      items: data,
    },
  });
}

export async function listReviews(req, res) {
  const data = await listAdminReviews(req.query);

  res.status(StatusCodes.OK).json({
    success: true,
    data,
  });
}

export async function createReviewHandler(req, res) {
  const data = await createReview(req.body);

  res.status(StatusCodes.CREATED).json({
    success: true,
    message: "Review created",
    data,
  });
}

export async function createPublicReviewHandler(req, res) {
  const data = await createReview({
    ...req.body,
    source: "internal",
    visible: false,
    isVisible: false,
  });

  res.status(StatusCodes.CREATED).json({
    success: true,
    message: "Thanks for your rating. It will appear after moderation.",
    data,
  });
}

export async function updateReviewHandler(req, res) {
  const data = await updateReview(req.params.id, req.body);

  res.status(StatusCodes.OK).json({
    success: true,
    message: "Review updated",
    data,
  });
}

export async function deleteReviewHandler(req, res) {
  await deleteReview(req.params.id);

  res.status(StatusCodes.OK).json({
    success: true,
    message: "Review deleted",
  });
}
