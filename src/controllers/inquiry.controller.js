import { StatusCodes } from "http-status-codes";

import {
  createCateringInquiry,
  createContactInquiry,
  createFranchiseInquiry,
  listInquiries,
  updateInquiryStatus,
} from "../services/inquiry.service.js";

export async function submitContactInquiry(req, res) {
  const data = await createContactInquiry(req.body);

  res.status(StatusCodes.CREATED).json({
    success: true,
    message: "Contact inquiry submitted",
    data,
  });
}

export async function submitFranchiseInquiry(req, res) {
  const data = await createFranchiseInquiry(req.body);

  res.status(StatusCodes.CREATED).json({
    success: true,
    message: "Franchise inquiry submitted",
    data,
  });
}

export async function submitCateringInquiry(req, res) {
  const data = await createCateringInquiry(req.body);

  res.status(StatusCodes.CREATED).json({
    success: true,
    message: "Catering inquiry submitted",
    data,
  });
}

export async function listInquiryRecords(req, res) {
  const data = await listInquiries(req.query);

  res.status(StatusCodes.OK).json({
    success: true,
    data,
  });
}

export async function updateInquiryStatusHandler(req, res) {
  const data = await updateInquiryStatus(req.params.type, req.params.id, req.body.status);

  res.status(StatusCodes.OK).json({
    success: true,
    message: "Inquiry status updated",
    data,
  });
}
