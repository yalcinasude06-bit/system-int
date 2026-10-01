import "server-only";

import { createHmac, timingSafeEqual } from "node:crypto";

const teacherUsername = process.env.TEACHER_USERNAME?.trim() || "admin";
const teacherPassword = process.env.TEACHER_PASSWORD || "";
const tokenLifetimeMs = 12 * 60 * 60 * 1000;

function signature(payload: string) {
  return createHmac("sha256", teacherPassword).update(payload).digest("base64url");
}

export function isTeacherAuthConfigured() {
  return Boolean(teacherPassword);
}

export function isTeacherLogin(username: string, password: string) {
  return isTeacherAuthConfigured() && username === teacherUsername && password === teacherPassword;
}

export function createTeacherToken() {
  const payload = Buffer.from(
    JSON.stringify({ sub: teacherUsername, exp: Date.now() + tokenLifetimeMs }),
  ).toString("base64url");
  return `${payload}.${signature(payload)}`;
}

export function isValidTeacherToken(token: string) {
  if (!isTeacherAuthConfigured()) return false;
  const [payload, suppliedSignature] = token.split(".");
  if (!payload || !suppliedSignature) return false;

  const expectedSignature = signature(payload);
  const supplied = Buffer.from(suppliedSignature);
  const expected = Buffer.from(expectedSignature);
  if (supplied.length !== expected.length || !timingSafeEqual(supplied, expected)) return false;

  try {
    const parsed = JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as {
      sub?: string;
      exp?: number;
    };
    return parsed.sub === teacherUsername && typeof parsed.exp === "number" && parsed.exp > Date.now();
  } catch {
    return false;
  }
}

export function readBearerToken(authorization: string | null) {
  return authorization?.replace(/^Bearer\s+/i, "") || "";
}
