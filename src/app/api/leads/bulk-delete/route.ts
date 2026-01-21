import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { z } from "zod";
import { isAdminRole, MemberRole } from "@/lib/constants/roles";

const bulkDeleteSchema = z.object({
  lead_ids: z.array(z.string().uuid()).min(1, "삭제할 리드를 선택해주세요"),
});

// POST /api/leads/bulk-delete - 리드 일괄 삭제
export async function POST(request: NextRequest) {
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

    if (!member || !isAdminRole(member.role as MemberRole)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // 요청 데이터 파싱 및 검증
    const body = await request.json();
    const result = bulkDeleteSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json(
        { error: result.error.issues[0].message },
        { status: 400 }
      );
    }

    const { lead_ids } = result.data;

    // 리드 일괄 삭제
    const { error, count } = await supabase
      .from("leads")
      .delete()
      .in("id", lead_ids);

    if (error) {
      console.error("Bulk delete error:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      message: `${count || lead_ids.length}건의 리드가 삭제되었습니다`,
      deletedCount: count || lead_ids.length,
    });
  } catch (error) {
    console.error("Bulk delete API error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
