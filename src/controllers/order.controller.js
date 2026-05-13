import { StatusCodes } from "http-status-codes";

import { createOrder, getOrderById, listOrders, updateOrder } from "../services/order.service.js";
import { emitToAdmin, emitToUser } from "../config/socket.js";
import { prisma } from "../config/prisma.js";

export async function createOrderHandler(req, res) {
  const data = await createOrder(req.body, { user: req.user });

  emitToAdmin("new-order", { orderNumber: data.order?.orderNumber });

  res.status(StatusCodes.CREATED).json({
    success: true,
    message: "Order created",
    data,
  });
}

export async function listOrdersHandler(req, res) {
  const data = await listOrders(req.query);

  res.status(StatusCodes.OK).json({
    success: true,
    data,
  });
}

export async function getOrderHandler(req, res) {
  const data = await getOrderById(req.params.id);

  res.status(StatusCodes.OK).json({
    success: true,
    data,
  });
}

export async function updateOrderHandler(req, res) {
  const data = await updateOrder(req.params.id, req.body);

  emitToAdmin("order-updated", { id: req.params.id, orderStatus: data.orderStatus, paymentStatus: data.paymentStatus });

  const rawOrder = await prisma.order.findUnique({ where: { id: req.params.id }, select: { userId: true, orderNumber: true } });
  if (rawOrder?.userId) {
    emitToUser(rawOrder.userId, "order-status-changed", { orderNumber: rawOrder.orderNumber, orderStatus: data.orderStatus, paymentStatus: data.paymentStatus });
  }

  res.status(StatusCodes.OK).json({
    success: true,
    message: "Order updated",
    data,
  });
}
