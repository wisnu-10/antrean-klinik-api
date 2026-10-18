function readRaw(name: string): string | undefined {
  return process.env[name];
}

function required(name: string): string {
  const value = readRaw(name);
  if (value === undefined || value.trim() === "") {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

function optional(name: string): string | undefined {
  const value = readRaw(name);
  if (value === undefined || value.trim() === "") {
    return undefined;
  }
  return value;
}

function readNodeEnv(): string {
  return readRaw("NODE_ENV") ?? "development";
}

function readPort(): number {
  const raw = readRaw("PORT") ?? "5000";
  const port = Number.parseInt(raw, 10);
  if (Number.isNaN(port) || port <= 0 || port > 65535) {
    throw new Error(`Invalid PORT value: ${raw}`);
  }
  return port;
}

function readFrontendUrl(): string {
  return readRaw("FRONTEND_URL") ?? "http://localhost:3000";
}

function readPositiveInt(name: string, fallback: number): number {
  const raw = readRaw(name);
  if (raw === undefined || raw.trim() === "") {
    return fallback;
  }
  const value = Number.parseInt(raw, 10);
  if (Number.isNaN(value) || value <= 0) {
    throw new Error(`Invalid ${name} value: ${raw}`);
  }
  return value;
}

function readBoolean(name: string, fallback: boolean): boolean {
  const raw = readRaw(name);
  if (raw === undefined || raw.trim() === "") {
    return fallback;
  }
  return ["1", "true", "yes", "on"].includes(raw.trim().toLowerCase());
}

// Rate limit login: hanya percobaan gagal yang dihitung (lihat middlewares/rateLimit.ts).
const RATE_LIMIT_LOGIN_WINDOW_MS = 15 * 60 * 1000;
const RATE_LIMIT_LOGIN_MAX = 5;

export const env = {
  nodeEnv: readNodeEnv(),
  port: readPort(),
  frontendUrl: readFrontendUrl(),
  cookieDomain: optional("AUTH_COOKIE_DOMAIN"),
  jwtAccessSecret: required("JWT_ACCESS_SECRET"),
  jwtRefreshSecret: required("JWT_REFRESH_SECRET"),
  databaseUrl: readRaw("DATABASE_URL") ?? "",
  rateLimitLoginWindowMs: readPositiveInt("RATE_LIMIT_LOGIN_WINDOW_MS", RATE_LIMIT_LOGIN_WINDOW_MS),
  rateLimitLoginMax: readPositiveInt("RATE_LIMIT_LOGIN_MAX", RATE_LIMIT_LOGIN_MAX),
  trustProxy: readBoolean("TRUST_PROXY", false),
};
