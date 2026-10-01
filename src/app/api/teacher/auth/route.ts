import { NextRequest, NextResponse } from "next/server";
import {
  createTeacherToken,
  isTeacherAuthConfigured,
  isTeacherLogin,
  isValidTeacherToken,
  readBearerToken,
} from "@/lib/teacherAuthServer";

export async function POST(request: NextRequest) {
  if (!isTeacherAuthConfigured()) {
    return NextResponse.json({ error: "Öğretmen girişi henüz yapılandırılmadı." }, { status: 503 });
  }
  const body = await request.json().catch(() => null) as { username?: string; password?: string } | null;
  if (!body || !isTeacherLogin(body.username || "", body.password || "")) {
    return NextResponse.json({ error: "Kullanıcı adı veya şifre hatalı." }, { status: 401 });
  }
  return NextResponse.json({ token: createTeacherToken() });
}

export async function GET(request: NextRequest) {
  if (!isTeacherAuthConfigured()) {
    return NextResponse.json({ authorized: false }, { status: 503 });
  }
  const token = readBearerToken(request.headers.get("authorization"));
  const authorized = isValidTeacherToken(token);
  return NextResponse.json({ authorized }, { status: authorized ? 200 : 401 });
}
