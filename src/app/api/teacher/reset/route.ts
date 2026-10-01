import { NextRequest, NextResponse } from "next/server";
import { isSupabaseAdminConfigured, requireSupabaseAdmin } from "@/lib/supabaseAdmin";
import { isValidTeacherToken, readBearerToken } from "@/lib/teacherAuthServer";

export const runtime = "nodejs";

const resetTargets = [
  { table: "submissions", key: "id" },
  { table: "students", key: "id" },
  { table: "student_profiles", key: "student_number" },
  { table: "sessions", key: "id" },
] as const;

type ResetTable = (typeof resetTargets)[number]["table"];
type Counts = Record<ResetTable, number>;

async function getCounts() {
  const client = requireSupabaseAdmin();
  const counts = {} as Counts;

  for (const target of resetTargets) {
    const { count, error } = await client
      .from(target.table)
      .select(target.key, { count: "exact", head: true });
    if (error) throw error;
    counts[target.table] = count ?? 0;
  }

  return counts;
}

export async function POST(request: NextRequest) {
  const token = readBearerToken(request.headers.get("authorization"));
  if (!isValidTeacherToken(token)) {
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
    const deleted = await getCounts();

    for (const target of resetTargets) {
      const { error } = await client.from(target.table).delete().not(target.key, "is", null);
      if (error) throw error;
    }

    const remaining = await getCounts();
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
