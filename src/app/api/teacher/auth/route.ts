import { NextRequest, NextResponse } from "next/server";
import {
  authenticateTeacherLogin,
  createTeacherToken,
  getTeacherAuthConfigurationError,
  getTeacherUsernameFromToken,
  isTeacherAuthConfigured,
  readBearerToken,
} from "@/lib/teacherAuthServer";

export async function POST(request: NextRequest) {
  if (!isTeacherAuthConfigured()) {
    return NextResponse.json({ error: getTeacherAuthConfigurationError() || "Öğretmen girişi henüz yapılandırılmadı." }, { status: 503 });
  }
  const body = await request.json().catch(() => null) as { username?: string; password?: string } | null;
  const username = body ? authenticateTeacherLogin(body.username || "", body.password || "") : null;
  if (!username) {
    return NextResponse.json({ error: "Kullanıcı adı veya şifre hatalı." }, { status: 401 });
  }
  return NextResponse.json({ token: createTeacherToken(username), username });
}

export async function GET(request: NextRequest) {
  if (!isTeacherAuthConfigured()) {
    return NextResponse.json({ authorized: false }, { status: 503 });
  }
  const token = readBearerToken(request.headers.get("authorization"));
  const username = getTeacherUsernameFromToken(token);
  return NextResponse.json({ authorized: Boolean(username), username }, { status: username ? 200 : 401 });
}
