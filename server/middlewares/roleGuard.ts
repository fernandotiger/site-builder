import prisma from '../lib/prisma.js';
import { Request, Response, NextFunction } from "express";

// ─── Types ────────────────────────────────────────────────────────────────────

export type UserRole = "basic" | "pro" | "enterprise";

/**
 * Priority order for roles (higher index = higher privilege).
 * Used for "at least" comparisons.
 */
const ROLE_HIERARCHY: UserRole[] = ["basic", "pro", "enterprise"];

// ─── Core helper ─────────────────────────────────────────────────────────────

/**
 * Resolves the current role of a user based on their latest active paid
 * transaction. Falls back to "basic" if no paid plan is found.
 *
 * @param userId - The authenticated user's ID (already available in controller)
 * @returns The resolved UserRole
 */
export async function getUserRole(userId: string): Promise<UserRole> {
  if (!userId) {
    throw new Error("User Role: userId is required");
  }

  const latestPaidTransaction = await prisma.transaction.findFirst({
    where: {
      userId,
      isPaid: true,
      planId: { in: ROLE_HIERARCHY }, // only recognise valid plan IDs
    },
    orderBy: { createdAt: "desc" },
    select: { planId: true },
  });

  if (!latestPaidTransaction) {
    return "basic"; // free / no active plan
  }

  const planId = latestPaidTransaction.planId as UserRole;

  // Safety: ensure planId is actually a valid role
  if (!ROLE_HIERARCHY.includes(planId)) {
    console.warn(
      `User Role: unknown planId "${planId}" for user ${userId}, defaulting to "basic"`
    );
    return "basic";
  }

  return planId;
}

// ─── Comparison helpers ───────────────────────────────────────────────────────

/**
 * Returns true if the user's role is exactly the given role.
 */
export async function userHasRole(
  userId: string,
  role: UserRole
): Promise<boolean> {
  const userRole = await getUserRole(userId);
  return userRole === role;
}

/**
 * Returns true if the user's role is equal to or higher than the given role.
 * e.g. userHasAtLeastRole(userId, "pro") → true for "pro" and "enterprise"
 */
export async function userHasAtLeastRole(
  userId: string,
  minimumRole: UserRole
): Promise<boolean> {
  const userRole = await getUserRole(userId);
  return ROLE_HIERARCHY.indexOf(userRole) >= ROLE_HIERARCHY.indexOf(minimumRole);
}

// ─── Express middleware factory ───────────────────────────────────────────────

/**
 * How to attach the userId to the request object (better-auth typically
 * populates req.user after its session middleware).
 *
 * Extend this interface to match your actual auth setup.
 */
export interface AuthenticatedRequest extends Request {
  user?: { id: string };
}

/**
 * Express middleware that restricts a route to users with at least the given
 * role. Must be used AFTER your better-auth session middleware so that
 * req.user is already populated.
 *
 * @example
 * router.post("/generate", requireRole("pro"), myController.generate);
 */
export function requireRole(minimumRole: UserRole) {
  return async (
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    const userId = req.user?.id;

    if (!userId) {
      res.status(401).json({ error: "Unauthorized: no active session" });
      return;
    }

    try {
      const allowed = await userHasAtLeastRole(userId, minimumRole);

      if (!allowed) {
        res.status(403).json({
          error: `Forbidden: requires "${minimumRole}" plan or higher`,
        });
        return;
      }

      next();
    } catch (err) {
      console.error("requireRole middleware error:", err);
      res.status(500).json({ error: "Internal server error" });
    }
  };
}