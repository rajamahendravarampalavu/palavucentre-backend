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

function serializeInquiry(type, item) {
  return {
    ...item,
    type,
    uid: `${type}:${item.id}`,
  };
}

function parseInquiryId(rawId) {
  const value = String(rawId || "").trim();
  const typedMatch = value.match(/^(contact|franchise|catering):(\d+)$/);

  if (typedMatch) {
    return {
      type: typedMatch[1],
      id: Number(typedMatch[2]),
      uid: value,
    };
  }

  const numericId = Number(value);

  if (Number.isInteger(numericId) && numericId > 0) {
    return {
      type: null,
      id: numericId,
      uid: value,
    };
  }

  throw new ApiError(StatusCodes.BAD_REQUEST, "Invalid inquiry id");
}

async function resolveInquiryTarget(rawId) {
  const parsed = parseInquiryId(rawId);

  if (parsed.type) {
    return parsed;
  }

  for (const type of Object.keys(inquiryModels)) {
    const existing = await inquiryModels[type].findFirst({
      where: {
        id: parsed.id,
        deletedAt: null,
      },
      select: {
        id: true,
      },
    });

    if (existing) {
      return {
        ...parsed,
        type,
      };
    }
  }

  return parsed;
}

function buildAuditLog({ adminId, target }) {
  return {
    adminId: adminId || null,
    action: "DELETE_INQUIRY",
    targetId: target.uid || `${target.type}:${target.id}`,
    targetType: "Inquiry",
    metadata: {
      inquiryType: target.type,
    },
  };
}

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
      OR: [
        ...common,
        { email: { contains: search, mode: "insensitive" } },
        { subject: { contains: search, mode: "insensitive" } },
        { message: { contains: search, mode: "insensitive" } },
      ],
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
    deletedAt: null,
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
    items: items.map((item) => serializeInquiry(type, item)),
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

  if (!existing || existing.deletedAt) {
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

export async function deleteInquiry(rawId, { adminId } = {}) {
  const target = await resolveInquiryTarget(rawId);
  const model = target.type ? inquiryModels[target.type] : null;

  if (!model) {
    throw new ApiError(StatusCodes.NOT_FOUND, "Inquiry not found");
  }

  const existing = await model.findFirst({
    where: {
      id: target.id,
      deletedAt: null,
    },
    select: {
      id: true,
    },
  });

  if (!existing) {
    throw new ApiError(StatusCodes.NOT_FOUND, "Inquiry not found");
  }

  await prisma.$transaction([
    model.update({
      where: {
        id: target.id,
      },
      data: {
        deletedAt: new Date(),
      },
    }),
    prisma.adminAuditLog.create({
      data: buildAuditLog({
        adminId,
        target: {
          ...target,
          uid: `${target.type}:${target.id}`,
        },
      }),
    }),
  ]);

  return {
    success: true,
  };
}

export async function bulkDeleteInquiries(ids, { adminId } = {}) {
  const uniqueTargets = new Map();

  for (const rawId of ids) {
    const target = await resolveInquiryTarget(rawId);

    if (target.type) {
      uniqueTargets.set(`${target.type}:${target.id}`, {
        ...target,
        uid: `${target.type}:${target.id}`,
      });
    }
  }

  if (uniqueTargets.size === 0) {
    return {
      success: true,
      deleted: 0,
    };
  }

  const targetsByType = Array.from(uniqueTargets.values()).reduce((groups, target) => {
    groups[target.type] = groups[target.type] || [];
    groups[target.type].push(target);
    return groups;
  }, {});

  const operations = Object.entries(targetsByType).map(([type, targets]) =>
    inquiryModels[type].updateMany({
      where: {
        id: {
          in: targets.map((target) => target.id),
        },
        deletedAt: null,
      },
      data: {
        deletedAt: new Date(),
      },
    }),
  );

  const auditOperations = Array.from(uniqueTargets.values()).map((target) =>
    prisma.adminAuditLog.create({
      data: buildAuditLog({ adminId, target }),
    }),
  );

  const results = await prisma.$transaction([...operations, ...auditOperations]);
  const deleted = results
    .slice(0, operations.length)
    .reduce((total, result) => total + Number(result.count || 0), 0);

  return {
    success: true,
    deleted,
  };
}
