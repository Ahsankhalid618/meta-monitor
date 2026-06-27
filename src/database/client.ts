import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../generated/prisma/client.js";
import { config } from "../config/index.js";

/**
 * When we manage SSL via the adapter's `ssl` option, strip `sslmode` from the
 * URL. Otherwise node-postgres builds its own SSL config from the query param
 * (with cert verification on) which overrides our `ssl` object and fails
 * against Railway/Heroku self-signed cert chains.
 */
function buildConnectionString(): string {
  if (!config.DATABASE_SSL) return config.DATABASE_URL;
  const url = new URL(config.DATABASE_URL);
  url.searchParams.delete("sslmode");
  return url.toString();
}

const adapter = new PrismaPg({
  connectionString: buildConnectionString(),
  // Railway/Heroku managed Postgres serve a self-signed cert chain over TLS.
  // Enabling SSL while not rejecting the cert is the standard way to connect.
  ...(config.DATABASE_SSL ? { ssl: { rejectUnauthorized: false } } : {}),
});

export const prisma = new PrismaClient({
  adapter,
  log: config.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
});

export async function disconnectPrisma(): Promise<void> {
  await prisma.$disconnect();
}
