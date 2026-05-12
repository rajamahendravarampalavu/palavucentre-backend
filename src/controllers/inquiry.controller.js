import { StatusCodes } from "http-status-codes";

import {
  createCateringInquiry,
  createContactInquiry,
  bulkDeleteInquiries,
  createFranchiseInquiry,
  deleteInquiry,
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

export async function deleteInquiryHandler(req, res) {
  await deleteInquiry(req.params.id, { adminId: req.admin?.id });

  res.status(StatusCodes.OK).json({
    success: true,
    data: {
      success: true,
    },
  });
}

export async function bulkDeleteInquiriesHandler(req, res) {
  const data = await bulkDeleteInquiries(req.body.ids, { adminId: req.admin?.id });

  res.status(StatusCodes.OK).json({
    success: true,
    deleted: data.deleted,
    data,
  });
}
