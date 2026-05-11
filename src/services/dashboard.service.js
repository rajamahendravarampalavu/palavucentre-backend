import { prisma, withReadDbRetry } from "../config/prisma.js";
import { paiseToRupees } from "../utils/amounts.js";
import { serializeOrder } from "../utils/serializers.js";

export async function getDashboardSnapshot() {
  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  const [
    totalOrders,
    pendingOrders,
    todayOrders,
    newContactInquiries,
    newFranchiseInquiries,
    newCateringInquiries,
    totalMenuItems,
    activeOffers,
    visibleReviews,
    paidRevenue,
    recentOrders,
    recentContact,
    recentFranchise,
    recentCatering,
  ] = await Promise.all([
    withReadDbRetry(() => prisma.order.count()),
    withReadDbRetry(() => prisma.order.count({ where: { orderStatus: "pending" } })),
    withReadDbRetry(() => prisma.order.count({ where: { createdAt: { gte: startOfToday } } })),
    withReadDbRetry(() => prisma.contactInquiry.count({ where: { status: "new" } })),
    withReadDbRetry(() => prisma.franchiseInquiry.count({ where: { status: "new" } })),
    withReadDbRetry(() => prisma.cateringInquiry.count({ where: { status: "new" } })),
    withReadDbRetry(() => prisma.menuItem.count()),
    withReadDbRetry(() => prisma.offer.count({ where: { status: "active" } })),
    withReadDbRetry(() => prisma.review.count({ where: { isVisible: true, isDeleted: false } })),
    withReadDbRetry(() =>
      prisma.payment.aggregate({
        _sum: {
          amountPaise: true,
        },
        where: {
          status: "paid",
        },
      }),
    ),
    withReadDbRetry(() =>
      prisma.order.findMany({
        include: {
          user: true,
          address: true,
          promoCodeRef: true,
          items: true,
          payments: {
            orderBy: { createdAt: "desc" },
          },
        },
        orderBy: { createdAt: "desc" },
        take: 5,
      }),
    ),
    withReadDbRetry(() =>
      prisma.contactInquiry.findMany({
        orderBy: { createdAt: "desc" },
        take: 5,
      }),
    ),
    withReadDbRetry(() =>
      prisma.franchiseInquiry.findMany({
        orderBy: { createdAt: "desc" },
        take: 5,
      }),
    ),
    withReadDbRetry(() =>
      prisma.cateringInquiry.findMany({
        orderBy: { createdAt: "desc" },
        take: 5,
      }),
    ),
  ]);

  const recentInquiries = [
    ...recentContact.map((item) => ({ type: "contact", ...item })),
    ...recentFranchise.map((item) => ({ type: "franchise", ...item })),
    ...recentCatering.map((item) => ({ type: "catering", ...item })),
  ]
    .sort((left, right) => new Date(right.createdAt) - new Date(left.createdAt))
    .slice(0, 8);

  return {
    stats: {
      totalOrders,
      pendingOrders,
      todayOrders,
      totalMenuItems,
      activeOffers,
      visibleReviews,
      newInquiries: newContactInquiries + newFranchiseInquiries + newCateringInquiries,
      revenue: paiseToRupees(paidRevenue._sum.amountPaise || 0),
    },
    recentOrders: recentOrders.map(serializeOrder),
    recentInquiries,
  };
}
