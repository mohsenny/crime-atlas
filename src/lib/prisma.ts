import { PrismaClient } from "@prisma/client";

declare global {
  var __crimeAtlasPrisma__: PrismaClient | undefined;
}

export const prisma =
  global.__crimeAtlasPrisma__ ??
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") {
  global.__crimeAtlasPrisma__ = prisma;
}
