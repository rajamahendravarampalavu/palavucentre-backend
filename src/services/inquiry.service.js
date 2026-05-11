import { InquiryStatus } from "@prisma/client";
import { StatusCodes } from "http-status-codes";

import { prisma } from "../config/prisma.js";
import { ApiError } from "../utils/ApiError.js";
import { getPagination } from "../utils/pagination.js";

const inquiryModels = {
  contact: prisma.contactInquiry,
  franchise: prisma.franchiseInquiry,
  catering: prisma.cateringInquiry,
};

function buildInquirySearch(type, search) {
  if (!search) {
    return {};
  }

  const common = [
    { name: { contains: search, mode: "insensitive" } },
    { phone: { contains: search, mode: "insensitive" } },
  ];

  if (type === "contact") {
    return {
      OR: [...common, { email: { contains: search, mode: "insensitive" } }, { message: { contains: search, mode: "insensitive" } }],
    };
  }

  if (type === "franchise") {
    return {
      OR: [...common, { city: { contains: search, mode: "insensitive" } }, { email: { contains: search, mode: "insensitive" } }],
    };
  }

  return {
    OR: [...common, { eventType: { contains: search, mode: "insensitive" } }, { message: { contains: search, mode: "insensitive" } }],
  };
}

export async function createContactInquiry(payload) {
  return prisma.contactInquiry.create({
    data: payload,
  });
}

export async function createFranchiseInquiry(payload) {
  return prisma.franchiseInquiry.create({
    data: payload,
  });
}

export async function createCateringInquiry(payload) {
  return prisma.cateringInquiry.create({
    data: {
      name: payload.name,
      eventType: payload.eventType,
      eventDate: new Date(payload.eventDate || payload.date),
      guestCount: payload.guestCount || payload.guests,
      phone: payload.phone,
      email: payload.email,
      message: payload.message,
    },
  });
}

async function listSingleInquiryType(type, { status, search, page, limit } = {}) {
  const model = inquiryModels[type];
  const { page: currentPage, limit: pageSize, skip } = getPagination({ page, limit });
  const where = {
    ...(status ? { status } : {}),
    ...buildInquirySearch(type, search),
  };

  const [items, total] = await Promise.all([
    model.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip,
      take: pageSize,
    }),
    model.count({ where }),
  ]);

  return {
    type,
    items,
    pagination: {
      page: currentPage,
      limit: pageSize,
      total,
      totalPages: Math.ceil(total / pageSize) || 1,
    },
  };
}

export async function listInquiries({ type, status, search, page = 1, limit = 20 }) {
  if (type) {
    return listSingleInquiryType(type, { status, search, page, limit });
  }

  const [contact, franchise, catering] = await Promise.all([
    listSingleInquiryType("contact", { status, search, page: 1, limit: 10 }),
    listSingleInquiryType("franchise", { status, search, page: 1, limit: 10 }),
    listSingleInquiryType("catering", { status, search, page: 1, limit: 10 }),
  ]);

  return {
    contact,
    franchise,
    catering,
  };
}

export async function updateInquiryStatus(type, id, status) {
  const model = inquiryModels[type];

  if (!model) {
    throw new ApiError(StatusCodes.BAD_REQUEST, "Unsupported inquiry type");
  }

  const existing = await model.findUnique({
    where: { id },
  });

  if (!existing) {
    throw new ApiError(StatusCodes.NOT_FOUND, "Inquiry not found");
  }

  return model.update({
    where: { id },
    data: {
      status,
      contactedAt: status === InquiryStatus.contacted ? new Date() : existing.contactedAt,
    },
  });
}
