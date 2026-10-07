import { NextRequest, NextResponse } from "next/server";
import { ownedSession, teacherFromRequest } from "@/lib/teacherApiServer";
import { isSupabaseAdminConfigured, requireSupabaseAdmin } from "@/lib/supabaseAdmin";

export const runtime = "nodejs";

type RouteContext = { params: Promise<{ sessionId: string }> };

const allowedFields = new Set([
  "selected_week", "current_module", "module_stage", "is_module_started", "module_started_at", "fault_injected", "is_active",
]);

function errorResponse(status: number, error: string) {
  return NextResponse.json({ error }, { status });
}

export async function PATCH(request: NextRequest, context: RouteContext) {
  const teacherUsername = teacherFromRequest(request);
  if (!teacherUsername) return errorResponse(401, "Bu işlem için öğretmen yetkisi gerekli.");
  if (!isSupabaseAdminConfigured) return errorResponse(503, "Güvenli veritabanı bağlantısı yapılandırılmamış.");

  const { sessionId } = await context.params;
  const body = await request.json().catch(() => null) as { patch?: Record<string, unknown> } | null;
  const patch = body?.patch;
  if (!patch || typeof patch !== "object") return errorResponse(400, "Geçerli bir oturum güncellemesi gerekli.");
  const entries = Object.entries(patch).filter(([field]) => allowedFields.has(field));
  if (entries.length === 0 || entries.length !== Object.keys(patch).length) return errorResponse(400, "Geçersiz oturum güncellemesi.");

  try {
    const found = await ownedSession(sessionId, teacherUsername);
    if (!found.session) return errorResponse(404, "Oturum bulunamadı.");
    if (!found.owned) return errorResponse(403, "Bu oturum başka bir öğretmene ait.");

    const { data, error } = await requireSupabaseAdmin()
      .from("sessions")
      .update(Object.fromEntries(entries))
      .eq("id", sessionId)
      .eq("teacher_username", teacherUsername)
      .select()
      .single();
    if (error) throw error;
    return NextResponse.json({ session: data });
  } catch (error) {
    console.error("Teacher session update failed", error);
    return errorResponse(500, "Güncelleme başarısız.");
  }
}
