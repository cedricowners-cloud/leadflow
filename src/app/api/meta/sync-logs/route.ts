import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * GET /api/meta/sync-logs - 동기화 로그 조회
 */
export async function GET() {
  try {
    const supabase = await createClient();

    // 인증 확인
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // 권한 확인 (시스템 관리자만)
    const { data: member } = await supabase
      .from("members")
      .select("role")
      .eq("user_id", user.id)
      .single();

    if (!member || (member.role !== "system_admin" && member.role !== "branch_manager")) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // 최근 동기화 로그 조회 (최대 50개)
    const { data: logs, error } = await supabase
      .from("meta_sync_logs")
      .select(`
        *,
        meta_pages (
          page_name
        )
      `)
      .order("started_at", { ascending: false })
      .limit(50);

    if (error) {
      console.error("Failed to fetch sync logs:", error);
      return NextResponse.json(
        { error: "동기화 로그를 불러오는데 실패했습니다" },
        { status: 500 }
      );
    }

    return NextResponse.json({ data: logs || [] });
  } catch (error) {
    console.error("Meta sync logs API error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
