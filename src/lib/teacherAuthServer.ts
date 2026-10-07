import "server-only";

import { createHmac, timingSafeEqual } from "node:crypto";

type TeacherAccount = { username: string; password: string };
type TeacherConfiguration = {
  accounts: TeacherAccount[];
  tokenSecret: string;
  error: string | null;
};

const tokenLifetimeMs = 12 * 60 * 60 * 1000;
let cachedConfiguration: TeacherConfiguration | null = null;
let configurationErrorLogged = false;

function readConfiguration(): TeacherConfiguration {
  if (cachedConfiguration) return cachedConfiguration;

  const configuredAccounts = process.env.TEACHER_ACCOUNTS?.trim();
  let accounts: TeacherAccount[] = [];
  let error: string | null = null;

  if (configuredAccounts) {
    try {
      const parsed = JSON.parse(configuredAccounts) as unknown;
      if (!Array.isArray(parsed) || parsed.length === 0) throw new Error("TEACHER_ACCOUNTS must be a non-empty JSON array.");
      accounts = parsed.map((entry) => {
        if (!entry || typeof entry !== "object") throw new Error("Every TEACHER_ACCOUNTS entry must be an object.");
        const { username, password } = entry as { username?: unknown; password?: unknown };
        if (typeof username !== "string" || !username.trim() || typeof password !== "string" || !password) {
          throw new Error("Every TEACHER_ACCOUNTS entry requires a non-empty username and password.");
        }
        return { username: username.trim(), password };
      });
      const usernames = new Set<string>();
      for (const account of accounts) {
        if (usernames.has(account.username)) throw new Error(`Duplicate teacher username: ${account.username}`);
        usernames.add(account.username);
      }
    } catch (caught) {
      accounts = [];
      error = caught instanceof Error ? caught.message : "TEACHER_ACCOUNTS could not be parsed.";
    }
  } else {
    const username = process.env.TEACHER_USERNAME?.trim() || "admin";
    const password = process.env.TEACHER_PASSWORD || "";
    if (password) accounts = [{ username, password }];
  }

  const tokenSecret = process.env.TEACHER_TOKEN_SECRET || process.env.TEACHER_PASSWORD || "";
  if (!error && accounts.length > 0 && !tokenSecret) error = "TEACHER_TOKEN_SECRET is required when TEACHER_ACCOUNTS is configured.";
  cachedConfiguration = { accounts, tokenSecret, error };

  if (error && !configurationErrorLogged) {
    configurationErrorLogged = true;
    console.error("Teacher authentication configuration error:", error);
  }
  return cachedConfiguration;
}

function signature(payload: string, tokenSecret: string) {
  return createHmac("sha256", tokenSecret).update(payload).digest("base64url");
}

function sameValue(left: string, right: string) {
  const leftBuffer = Buffer.from(left);
  const rightBuffer = Buffer.from(right);
  return leftBuffer.length === rightBuffer.length && timingSafeEqual(leftBuffer, rightBuffer);
}

export function isTeacherAuthConfigured() {
  const configuration = readConfiguration();
  return !configuration.error && configuration.accounts.length > 0 && Boolean(configuration.tokenSecret);
}

export function getTeacherAuthConfigurationError() {
  const configuration = readConfiguration();
  return configuration.error || (isTeacherAuthConfigured() ? null : "Teacher sign-in has not been configured.");
}

export function authenticateTeacherLogin(username: string, password: string) {
  if (!isTeacherAuthConfigured()) return null;
  const normalizedUsername = username.trim();
  const account = readConfiguration().accounts.find((candidate) => sameValue(candidate.username, normalizedUsername));
  return account && sameValue(account.password, password) ? account.username : null;
}

export function createTeacherToken(username: string) {
  const configuration = readConfiguration();
  const payload = Buffer.from(
    JSON.stringify({ sub: username, exp: Date.now() + tokenLifetimeMs }),
  ).toString("base64url");
  return `${payload}.${signature(payload, configuration.tokenSecret)}`;
}

export function getTeacherUsernameFromToken(token: string) {
  if (!isTeacherAuthConfigured()) return null;
  const [payload, suppliedSignature] = token.split(".");
  if (!payload || !suppliedSignature) return null;

  const configuration = readConfiguration();
  if (!sameValue(suppliedSignature, signature(payload, configuration.tokenSecret))) return null;

  try {
    const parsed = JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as { sub?: unknown; exp?: unknown };
    const subject = parsed.sub;
    if (typeof subject !== "string" || typeof parsed.exp !== "number" || parsed.exp <= Date.now()) return null;
    return configuration.accounts.some((account) => sameValue(account.username, subject)) ? subject : null;
  } catch {
    return null;
  }
}

export function isValidTeacherToken(token: string) {
  return Boolean(getTeacherUsernameFromToken(token));
}

export function readBearerToken(authorization: string | null) {
  return authorization?.replace(/^Bearer\s+/i, "") || "";
}
