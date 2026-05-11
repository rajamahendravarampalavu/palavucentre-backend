import { StatusCodes } from "http-status-codes";

import { createOrder, getOrderById, listOrders, updateOrder } from "../services/order.service.js";

export async function createOrderHandler(req, res) {
  const data = await createOrder(req.body, { user: req.user });

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

  res.status(StatusCodes.OK).json({
    success: true,
    message: "Order updated",
    data,
  });
}
