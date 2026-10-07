import { NextRequest, NextResponse } from "next/server";
import { teacherFromRequest, ownedSessionByPin } from "@/lib/teacherApiServer";
import { isSupabaseAdminConfigured, requireSupabaseAdmin } from "@/lib/supabaseAdmin";

export const runtime = "nodejs";

function unauthorized() {
  return NextResponse.json({ error: "Bu işlem için öğretmen yetkisi gerekli." }, { status: 401 });
}

function unavailable() {
  return NextResponse.json({ error: "Güvenli veritabanı bağlantısı yapılandırılmamış." }, { status: 503 });
}

function createPin() {
  return String(Math.floor(100000 + Math.random() * 900000));
}

export async function GET(request: NextRequest) {
  const teacherUsername = teacherFromRequest(request);
  if (!teacherUsername) return unauthorized();
  if (!isSupabaseAdminConfigured) return unavailable();

  try {
    const pin = request.nextUrl.searchParams.get("pin")?.replace(/\D/g, "").slice(0, 6);
    const client = requireSupabaseAdmin();
    if (!pin) {
      const { data, error } = await client
        .from("sessions")
        .select("id, pin_code, title, is_active, created_at, selected_week, current_module, module_stage, is_module_started")
        .eq("teacher_username", teacherUsername)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return NextResponse.json({ sessions: data || [] }, { headers: { "Cache-Control": "no-store" } });
    }

    const found = await ownedSessionByPin(pin, teacherUsername);
    if (!found.session) return NextResponse.json({ error: "Oturum bulunamadı." }, { status: 404 });
    if (!found.owned) return NextResponse.json({ error: "Bu oturum başka bir öğretmene ait." }, { status: 403 });

    const [{ data: students, error: studentsError }, { data: profiles, error: profilesError }, { data: submissions, error: submissionsError }] = await Promise.all([
      client.from("students").select("*").eq("session_id", found.session.id).order("session_score", { ascending: false }),
      client.from("student_profiles").select("*").eq("teacher_username", teacherUsername).order("total_score", { ascending: false }),
      client.from("submissions").select("*").eq("session_id", found.session.id).eq("is_submitted", true),
    ]);
    if (studentsError) throw studentsError;
    if (profilesError) throw profilesError;
    if (submissionsError) throw submissionsError;
    return NextResponse.json({ session: found.session, students: students || [], profiles: profiles || [], submissions: submissions || [] }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    console.error("Teacher session load failed", error);
    return NextResponse.json({ error: "Oturum yüklenemedi." }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const teacherUsername = teacherFromRequest(request);
  if (!teacherUsername) return unauthorized();
  if (!isSupabaseAdminConfigured) return unavailable();
  const body = await request.json().catch(() => null) as { title?: unknown } | null;
  const title = typeof body?.title === "string" ? body.title.trim().slice(0, 120) : "";
  const client = requireSupabaseAdmin();

  try {
    for (let attempt = 0; attempt < 7; attempt += 1) {
      const { data, error } = await client
        .from("sessions")
        .insert({ title: title || "Sistem Analizi Dersi", pin_code: createPin(), teacher_username: teacherUsername })
        .select()
        .single();
      if (data && !error) return NextResponse.json({ session: data }, { status: 201 });
      if (error?.code !== "23505") throw error;
    }
    return NextResponse.json({ error: "Benzersiz PIN üretilemedi. Lütfen tekrar deneyin." }, { status: 503 });
  } catch (error) {
    console.error("Teacher session create failed", error);
    return NextResponse.json({ error: "Oturum oluşturulamadı. Lütfen tekrar deneyin." }, { status: 500 });
  }
}
