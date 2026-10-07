import { NextRequest, NextResponse } from "next/server";
import { isSupabaseAdminConfigured, requireSupabaseAdmin } from "@/lib/supabaseAdmin";
import { getTeacherUsernameFromToken, readBearerToken } from "@/lib/teacherAuthServer";

export const runtime = "nodejs";

async function getCounts(teacherUsername: string) {
  const client = requireSupabaseAdmin();
  const { data: sessions, error: sessionLookupError } = await client
    .from("sessions")
    .select("id")
    .eq("teacher_username", teacherUsername);
  if (sessionLookupError) throw sessionLookupError;
  const sessionIds = (sessions || []).map((session) => session.id);

  const [sessionCount, profileCount, studentCount, submissionCount] = await Promise.all([
    client.from("sessions").select("id", { count: "exact", head: true }).eq("teacher_username", teacherUsername),
    client.from("student_profiles").select("student_number", { count: "exact", head: true }).eq("teacher_username", teacherUsername),
    sessionIds.length > 0
      ? client.from("students").select("id", { count: "exact", head: true }).in("session_id", sessionIds)
      : Promise.resolve({ count: 0, error: null }),
    sessionIds.length > 0
      ? client.from("submissions").select("id", { count: "exact", head: true }).in("session_id", sessionIds)
      : Promise.resolve({ count: 0, error: null }),
  ]);
  for (const result of [sessionCount, profileCount, studentCount, submissionCount]) {
    if (result.error) throw result.error;
  }
  return {
    sessions: sessionCount.count ?? 0,
    student_profiles: profileCount.count ?? 0,
    students: studentCount.count ?? 0,
    submissions: submissionCount.count ?? 0,
  };
}

export async function POST(request: NextRequest) {
  if (process.env.ENABLE_DATA_RESET !== "true") {
    return NextResponse.json({ error: "Veri sıfırlama devre dışı." }, { status: 403 });
  }
  const token = readBearerToken(request.headers.get("authorization"));
  const teacherUsername = getTeacherUsernameFromToken(token);
  if (!teacherUsername) {
    return NextResponse.json({ error: "Bu işlem için öğretmen yetkisi gerekli." }, { status: 401 });
  }
  if (!isSupabaseAdminConfigured) {
    return NextResponse.json({ error: "Güvenli veritabanı bağlantısı yapılandırılmamış." }, { status: 503 });
  }

  const body = await request.json().catch(() => null) as { confirmation?: string } | null;
  if (body?.confirmation !== "SIFIRLA") {
    return NextResponse.json({ error: "İşlemi onaylamak için SIFIRLA yazın." }, { status: 400 });
  }

  try {
    const client = requireSupabaseAdmin();
    const deleted = await getCounts(teacherUsername);

    // Deleting the teacher's sessions cascades to their students and submissions only.
    const { error: sessionDeleteError } = await client.from("sessions").delete().eq("teacher_username", teacherUsername);
    if (sessionDeleteError) throw sessionDeleteError;
    const { error: profileDeleteError } = await client.from("student_profiles").delete().eq("teacher_username", teacherUsername);
    if (profileDeleteError) throw profileDeleteError;

    const remaining = await getCounts(teacherUsername);
    if (Object.values(remaining).some((count) => count !== 0)) {
      throw new Error("Sıfırlama sonrasında bazı kayıtlar kaldı.");
    }

    return NextResponse.json(
      { success: true, deleted, remaining },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    console.error("Teacher database reset failed", error);
    return NextResponse.json(
      { error: "Veriler sıfırlanamadı. Lütfen tekrar deneyin." },
      { status: 500 },
    );
  }
}
