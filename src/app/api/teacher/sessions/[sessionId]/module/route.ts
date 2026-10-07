import { NextRequest, NextResponse } from "next/server";
import { ownedSession, teacherFromRequest } from "@/lib/teacherApiServer";
import { isSupabaseAdminConfigured, requireSupabaseAdmin } from "@/lib/supabaseAdmin";

export const runtime = "nodejs";

type RouteContext = { params: Promise<{ sessionId: string }> };

function errorResponse(status: number, error: string) {
  return NextResponse.json({ error }, { status });
}

export async function POST(request: NextRequest, context: RouteContext) {
  const teacherUsername = teacherFromRequest(request);
  if (!teacherUsername) return errorResponse(401, "Bu işlem için öğretmen yetkisi gerekli.");
  if (!isSupabaseAdminConfigured) return errorResponse(503, "Güvenli veritabanı bağlantısı yapılandırılmamış.");

  const { sessionId } = await context.params;
  const body = await request.json().catch(() => null) as { action?: unknown; moduleId?: unknown } | null;
  const action = body?.action;
  if (action !== "start" && action !== "cancel" && action !== "finish") {
    return errorResponse(400, "Geçerli bir modül işlemi gerekli.");
  }

  try {
    const found = await ownedSession(sessionId, teacherUsername);
    if (!found.session) return errorResponse(404, "Oturum bulunamadı.");
    if (!found.owned) return errorResponse(403, "Bu oturum başka bir öğretmene ait.");

    const client = requireSupabaseAdmin();
    let data: unknown;
    let error: { message: string } | null = null;

    if (action === "start") {
      const moduleId = typeof body?.moduleId === "number" ? body.moduleId : Number(body?.moduleId);
      if (!Number.isInteger(moduleId) || moduleId < 1 || moduleId > 5) {
        return errorResponse(400, "Geçerli bir modül numarası gerekli.");
      }
      ({ data, error } = await client.rpc("start_session_module", {
        target_session_id: sessionId,
        target_module_id: moduleId,
      }));
    } else if (action === "cancel") {
      ({ data, error } = await client.rpc("cancel_session_module_start", { target_session_id: sessionId }));
    } else {
      ({ data, error } = await client.rpc("finish_session_module", { target_session_id: sessionId }));
    }

    if (error) throw error;
    return NextResponse.json({ session: data });
  } catch (error) {
    console.error("Teacher module action failed", error);
    return errorResponse(500, "Modül işlemi tamamlanamadı.");
  }
}
