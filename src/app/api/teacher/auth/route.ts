import { createHmac, timingSafeEqual } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";

const username = process.env.TEACHER_USERNAME?.trim() || "admin";
const password = process.env.TEACHER_PASSWORD || "";
const isAuthConfigured = Boolean(password);
const tokenLifetimeMs = 12 * 60 * 60 * 1000;

function signature(payload: string) {
  return createHmac("sha256", password).update(payload).digest("base64url");
}

function createToken() {
  const payload = Buffer.from(JSON.stringify({ sub: username, exp: Date.now() + tokenLifetimeMs })).toString("base64url");
  return `${payload}.${signature(payload)}`;
}

function isValidToken(token: string) {
  const [payload, suppliedSignature] = token.split(".");
  if (!payload || !suppliedSignature) return false;
  const expectedSignature = signature(payload);
  const supplied = Buffer.from(suppliedSignature);
  const expected = Buffer.from(expectedSignature);
  if (supplied.length !== expected.length || !timingSafeEqual(supplied, expected)) return false;
  try {
    const parsed = JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as { sub?: string; exp?: number };
    return parsed.sub === username && typeof parsed.exp === "number" && parsed.exp > Date.now();
  } catch {
    return false;
  }
}

export async function POST(request: NextRequest) {
  if (!isAuthConfigured) {
    return NextResponse.json({ error: "Öğretmen girişi henüz yapılandırılmadı." }, { status: 503 });
  }
  const body = await request.json().catch(() => null) as { username?: string; password?: string } | null;
  if (!body || body.username !== username || body.password !== password) {
    return NextResponse.json({ error: "Kullanıcı adı veya şifre hatalı." }, { status: 401 });
  }
  return NextResponse.json({ token: createToken() });
}

export async function GET(request: NextRequest) {
  if (!isAuthConfigured) {
    return NextResponse.json({ authorized: false }, { status: 503 });
  }
  const token = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "") || "";
  return NextResponse.json({ authorized: isValidToken(token) }, { status: isValidToken(token) ? 200 : 401 });
}
