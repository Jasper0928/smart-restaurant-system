import type { CreateExpressContextOptions } from "@trpc/server/adapters/express";
import type { User } from "../../drizzle/schema";
import jwt from "jsonwebtoken";
import { COOKIE_NAME } from "../../shared/const";
import { ENV } from "./env";

export type TrpcContext = {
  req: CreateExpressContextOptions["req"];
  res: CreateExpressContextOptions["res"];
  user: User | null;
};

export async function createContext(
  opts: CreateExpressContextOptions
): Promise<TrpcContext> {
  let user: User | null = null;

  try {
    const sessionToken = opts.req.cookies?.[COOKIE_NAME];
    if (sessionToken && ENV.cookieSecret) {
      const payload = jwt.verify(sessionToken, ENV.cookieSecret) as any;
      if (payload?.role === "admin") {
        user = {
          id: payload.id ?? 1,
          openId: "admin",
          name: payload.name ?? "Admin",
          email: payload.email ?? "",
          loginMethod: "password",
          role: "admin",
          createdAt: new Date(),
          updatedAt: new Date(),
          lastSignedIn: new Date(),
        };
      }
    }
  } catch {
    // Invalid or expired token — user remains null
  }

  return {
    req: opts.req,
    res: opts.res,
    user,
  };
}
