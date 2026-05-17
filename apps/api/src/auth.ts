import type { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";
import type { AuthUser } from "./types.js";

const jwtSecret = process.env.JWT_SECRET ?? "qa-upskill-dev-secret-change-me";
const tokenExpiry = "8h";

const tokenBlacklist = new Set<string>();

type TokenPayload = {
  user: AuthUser;
};

export const issueToken = (user: AuthUser): string =>
  jwt.sign({ user }, jwtSecret, {
    expiresIn: tokenExpiry
  });

export const invalidateToken = (token: string): void => {
  tokenBlacklist.add(token);
};

export const authenticate = (request: Request, response: Response, next: NextFunction) => {
  const authorization = request.header("authorization");

  if (!authorization?.startsWith("Bearer ")) {
    response.status(401).json({ message: "Missing bearer token." });
    return;
  }

  const token = authorization.slice("Bearer ".length).trim();

  if (tokenBlacklist.has(token)) {
    response.status(401).json({ message: "Token has been invalidated." });
    return;
  }

  try {
    const decoded = jwt.verify(token, jwtSecret) as TokenPayload;
    request.authUser = decoded.user;
    next();
  } catch {
    response.status(401).json({ message: "Invalid or expired token." });
  }
};

export const requireAdmin = (request: Request, response: Response, next: NextFunction) => {
  if (!request.authUser) {
    response.status(401).json({ message: "Unauthorized." });
    return;
  }

  if (request.authUser.role !== "Admin") {
    response.status(403).json({ message: "Admin role required." });
    return;
  }

  next();
};

export const requireAdminOrConfigurator = (request: Request, response: Response, next: NextFunction) => {
  if (!request.authUser) {
    response.status(401).json({ message: "Unauthorized." });
    return;
  }

  if (request.authUser.role !== "Admin" && request.authUser.role !== "Configurator") {
    response.status(403).json({ message: "Admin or Configurator role required." });
    return;
  }

  next();
};
