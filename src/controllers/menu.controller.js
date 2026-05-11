import { StatusCodes } from "http-status-codes";

import {
  createCategory,
  createMenuItem,
  deleteCategory,
  deleteMenuItem,
  getPublicMenu,
  listAdminCategories,
  listAdminItems,
  updateCategory,
  updateMenuItem,
} from "../services/menu.service.js";

export async function listPublicMenu(req, res) {
  const data = await getPublicMenu(req.query);

  res.status(StatusCodes.OK).json({
    success: true,
    categories: data.categories,
    categoryMap: data.categoryMap,
    groupedItems: data.groupedItems,
    items: data.items,
    data,
  });
}

export async function listCategories(req, res) {
  const data = await listAdminCategories(req.query);

  res.status(StatusCodes.OK).json({
    success: true,
    data: {
      items: data,
    },
  });
}

export async function createCategoryHandler(req, res) {
  const data = await createCategory(req.body);

  res.status(StatusCodes.CREATED).json({
    success: true,
    message: "Menu category created",
    data,
  });
}

export async function updateCategoryHandler(req, res) {
  const data = await updateCategory(req.params.id, req.body);

  res.status(StatusCodes.OK).json({
    success: true,
    message: "Menu category updated",
    data,
  });
}

export async function deleteCategoryHandler(req, res) {
  await deleteCategory(req.params.id);

  res.status(StatusCodes.OK).json({
    success: true,
    message: "Menu category deleted",
  });
}

export async function listItems(req, res) {
  const data = await listAdminItems(req.query);

  res.status(StatusCodes.OK).json({
    success: true,
    data,
  });
}

export async function createMenuItemHandler(req, res) {
  const data = await createMenuItem(req.body);

  res.status(StatusCodes.CREATED).json({
    success: true,
    message: "Menu item created",
    data,
  });
}

export async function updateMenuItemHandler(req, res) {
  const data = await updateMenuItem(req.params.id, req.body);

  res.status(StatusCodes.OK).json({
    success: true,
    message: "Menu item updated",
    data,
  });
}

export async function deleteMenuItemHandler(req, res) {
  await deleteMenuItem(req.params.id);

  res.status(StatusCodes.OK).json({
    success: true,
    message: "Menu item deleted",
  });
}
