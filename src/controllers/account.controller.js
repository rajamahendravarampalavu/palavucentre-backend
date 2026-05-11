import { StatusCodes } from "http-status-codes";

import {
  createUserAddress,
  deleteUserAddress,
  getAccountProfile,
  listUserAddresses,
  listUserOrders,
  updateUserAddress,
} from "../services/account.service.js";
import { getUserById, loginUser, loginUserWithGoogle, signupUser } from "../services/user-auth.service.js";
import { clearUserAuthCookie, setUserAuthCookie } from "../utils/cookies.js";

export async function signup(req, res) {
  const result = await signupUser(req.body);
  setUserAuthCookie(res, result.token);

  res.status(StatusCodes.CREATED).json({
    success: true,
    message: "Account created successfully",
    data: {
      user: result.user,
    },
  });
}

export async function login(req, res) {
  const result = await loginUser(req.body);
  setUserAuthCookie(res, result.token);

  res.status(StatusCodes.OK).json({
    success: true,
    message: "Login successful",
    data: {
      user: result.user,
    },
  });
}

export async function googleLogin(req, res) {
  const result = await loginUserWithGoogle(req.body);
  setUserAuthCookie(res, result.token);

  res.status(StatusCodes.OK).json({
    success: true,
    message: "Google login successful",
    data: {
      user: result.user,
    },
  });
}

export async function logout(_req, res) {
  clearUserAuthCookie(res);

  res.status(StatusCodes.OK).json({
    success: true,
    message: "Logout successful",
  });
}

export async function me(req, res) {
  const user = await getUserById(req.user.id);

  res.status(StatusCodes.OK).json({
    success: true,
    data: {
      user,
    },
  });
}

export async function getProfile(req, res) {
  const data = await getAccountProfile(req.user.id);

  res.status(StatusCodes.OK).json({
    success: true,
    data,
  });
}

export async function getOrders(req, res) {
  const data = await listUserOrders(req.user.id, { email: req.user.email });

  res.status(StatusCodes.OK).json({
    success: true,
    data: {
      items: data,
    },
  });
}

export async function getAddresses(req, res) {
  const data = await listUserAddresses(req.user.id);

  res.status(StatusCodes.OK).json({
    success: true,
    data: {
      items: data,
    },
  });
}

export async function createAddress(req, res) {
  const data = await createUserAddress(req.user.id, req.body);

  res.status(StatusCodes.CREATED).json({
    success: true,
    message: "Address added",
    data,
  });
}

export async function updateAddress(req, res) {
  const data = await updateUserAddress(req.user.id, req.params.id, req.body);

  res.status(StatusCodes.OK).json({
    success: true,
    message: "Address updated",
    data,
  });
}

export async function deleteAddress(req, res) {
  await deleteUserAddress(req.user.id, req.params.id);

  res.status(StatusCodes.OK).json({
    success: true,
    message: "Address deleted",
  });
}
