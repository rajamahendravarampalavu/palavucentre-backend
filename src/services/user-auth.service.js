import bcrypt from "bcryptjs";
import { randomUUID } from "node:crypto";
import { OAuth2Client } from "google-auth-library";
import jwt from "jsonwebtoken";
import { StatusCodes } from "http-status-codes";

import { env } from "../config/env.js";
import { prisma } from "../config/prisma.js";
import { ApiError } from "../utils/ApiError.js";
import { serializeUser } from "../utils/serializers.js";

function normalizeEmail(email) {
  return String(email || "").trim().toLowerCase();
}

function buildUserToken(user) {
  return jwt.sign(
    {
      sub: String(user.id),
      email: user.email,
      role: "user",
    },
    env.JWT_SECRET,
    { expiresIn: env.JWT_EXPIRES_IN },
  );
}

const googleClientIds = String(env.GOOGLE_CLIENT_ID || "")
  .split(",")
  .map((value) => value.trim())
  .filter(Boolean);

const googleOAuthClient = googleClientIds.length > 0 ? new OAuth2Client() : null;

function getGoogleLoginDisplayName(payload, fallbackEmail) {
  const fullName = String(payload?.name || "").trim();
  if (fullName.length >= 2) {
    return fullName;
  }

  const givenName = String(payload?.given_name || "").trim();
  if (givenName.length >= 2) {
    return givenName;
  }

  return String(fallbackEmail || "User").split("@")[0].trim() || "User";
}

export async function signupUser({ name, email, password }) {
  const normalizedEmail = normalizeEmail(email);

  const existingUser = await prisma.user.findUnique({
    where: { email: normalizedEmail },
    select: { id: true },
  });

  if (existingUser) {
    throw new ApiError(StatusCodes.CONFLICT, "An account with this email already exists");
  }

  const passwordHash = await bcrypt.hash(password, 10);
  const user = await prisma.user.create({
    data: {
      name: name.trim(),
      email: normalizedEmail,
      passwordHash,
      isActive: true,
    },
  });

  return {
    token: buildUserToken(user),
    user: serializeUser(user),
  };
}

export async function loginUser({ email, password }) {
  const normalizedEmail = normalizeEmail(email);
  const user = await prisma.user.findUnique({
    where: { email: normalizedEmail },
  });

  if (!user || !user.isActive) {
    throw new ApiError(StatusCodes.UNAUTHORIZED, "Invalid email or password");
  }

  const passwordMatches = await bcrypt.compare(password, user.passwordHash);

  if (!passwordMatches) {
    throw new ApiError(StatusCodes.UNAUTHORIZED, "Invalid email or password");
  }

  const updatedUser = await prisma.user.update({
    where: { id: user.id },
    data: { lastLoginAt: new Date() },
  });

  return {
    token: buildUserToken(updatedUser),
    user: serializeUser(updatedUser),
  };
}

export async function loginUserWithGoogle({ idToken }) {
  if (!googleOAuthClient || googleClientIds.length === 0) {
    throw new ApiError(StatusCodes.SERVICE_UNAVAILABLE, "Google login is not configured on the server");
  }

  let payload;

  try {
    const ticket = await googleOAuthClient.verifyIdToken({
      idToken,
      audience: googleClientIds,
    });
    payload = ticket.getPayload();
  } catch {
    throw new ApiError(StatusCodes.UNAUTHORIZED, "Invalid Google token");
  }

  const googleSub = String(payload?.sub || "").trim();
  const normalizedEmail = normalizeEmail(payload?.email);
  if (!googleSub || !normalizedEmail || payload?.email_verified !== true) {
    throw new ApiError(StatusCodes.UNAUTHORIZED, "Google account email is not verified");
  }

  const linkedGoogleUser = await prisma.user.findUnique({
    where: { googleSub },
  });

  if (linkedGoogleUser && !linkedGoogleUser.isActive) {
    throw new ApiError(StatusCodes.UNAUTHORIZED, "This account is disabled");
  }

  if (linkedGoogleUser) {
    const updatedUser = await prisma.user.update({
      where: { id: linkedGoogleUser.id },
      data: {
        lastLoginAt: new Date(),
        ...(linkedGoogleUser.name?.trim() ? {} : { name: getGoogleLoginDisplayName(payload, normalizedEmail) }),
      },
    });

    return {
      token: buildUserToken(updatedUser),
      user: serializeUser(updatedUser),
    };
  }

  const existingEmailUser = await prisma.user.findUnique({
    where: { email: normalizedEmail },
  });

  if (existingEmailUser && !existingEmailUser.isActive) {
    throw new ApiError(StatusCodes.UNAUTHORIZED, "This account is disabled");
  }

  if (existingEmailUser?.googleSub && existingEmailUser.googleSub !== googleSub) {
    throw new ApiError(StatusCodes.CONFLICT, "This email is already linked to another Google account");
  }

  if (existingEmailUser) {
    const linkedUser = await prisma.user.update({
      where: { id: existingEmailUser.id },
      data: {
        googleSub,
        lastLoginAt: new Date(),
        ...(existingEmailUser.name?.trim() ? {} : { name: getGoogleLoginDisplayName(payload, normalizedEmail) }),
      },
    });

    return {
      token: buildUserToken(linkedUser),
      user: serializeUser(linkedUser),
    };
  }

  const passwordHash = await bcrypt.hash(`google-oauth-${randomUUID()}`, 10);
  const createdUser = await prisma.user.create({
    data: {
      name: getGoogleLoginDisplayName(payload, normalizedEmail),
      email: normalizedEmail,
      googleSub,
      passwordHash,
      isActive: true,
      lastLoginAt: new Date(),
    },
  });

  return {
    token: buildUserToken(createdUser),
    user: serializeUser(createdUser),
  };
}

export async function getUserById(userId) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
  });

  if (!user || !user.isActive) {
    throw new ApiError(StatusCodes.NOT_FOUND, "User not found");
  }

  return serializeUser(user);
}
