import { getAuth } from "@clerk/express";
import type { Request } from "express";

export function getUserId(req: Request): string | null {
  const auth = getAuth(req);
  const claimUserId = auth?.sessionClaims?.userId;
  if (typeof claimUserId === "string") return claimUserId;
  return typeof auth?.userId === "string" ? auth.userId : null;
}