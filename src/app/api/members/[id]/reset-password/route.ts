import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

interface RouteParams {
  params: Promise<{ id: string }>;
}

// POST /api/members/[id]/reset-password - 비밀번호 초기화
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const supabase = await createClient();

    // 인증 확인
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // 권한 확인 (시스템 관리자만)
    const { data: currentMember } = await supabase
      .from("members")
      .select("role")
      .eq("user_id", user.id)
      .single();

    if (!currentMember || currentMember.role !== "system_admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // 대상 멤버 조회
    const { data: targetMember } = await supabase
      .from("members")
      .select("user_id, name, email")
      .eq("id", id)
      .single();

    if (!targetMember) {
      return NextResponse.json(
        { error: "멤버를 찾을 수 없습니다" },
        { status: 404 }
      );
    }

    // Admin 클라이언트로 비밀번호 초기화
    const adminClient = createAdminClient();
    const defaultPassword = "1234";

    const { error: updateError } = await adminClient.auth.admin.updateUserById(
      targetMember.user_id,
      { password: defaultPassword }
    );

    if (updateError) {
      console.error("Password reset error:", updateError);
      return NextResponse.json(
        { error: "비밀번호 초기화에 실패했습니다: " + updateError.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: `${targetMember.name}님의 비밀번호가 초기화되었습니다.`,
      defaultPassword,
    });
  } catch (error) {
    console.error("Password reset API error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
