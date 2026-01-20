import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { z } from "zod";

// 비밀번호 변경 스키마
const changePasswordSchema = z.object({
  newPassword: z
    .string()
    .min(8, "비밀번호는 8자 이상이어야 합니다")
    .regex(/[A-Za-z]/, "영문자를 포함해야 합니다")
    .regex(/[0-9]/, "숫자를 포함해야 합니다")
    .refine(
      (val) => val !== "1234" && val !== "12345678",
      "초기 비밀번호와 동일한 비밀번호는 사용할 수 없습니다"
    ),
});

// POST /api/auth/change-password - 비밀번호 변경
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();

    // 현재 로그인한 사용자 확인
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "인증이 필요합니다" }, { status: 401 });
    }

    // 요청 데이터 파싱 및 검증
    const body = await request.json();
    const result = changePasswordSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json(
        { error: result.error.issues[0].message },
        { status: 400 }
      );
    }

    const { newPassword } = result.data;

    // Admin 클라이언트로 비밀번호 변경
    const adminClient = createAdminClient();

    const { error: updateError } = await adminClient.auth.admin.updateUserById(
      user.id,
      { password: newPassword }
    );

    if (updateError) {
      console.error("Password update error:", updateError);
      return NextResponse.json(
        { error: "비밀번호 변경에 실패했습니다" },
        { status: 500 }
      );
    }

    // members 테이블의 must_change_password를 false로 업데이트
    const { error: memberError } = await adminClient
      .from("members")
      .update({ must_change_password: false })
      .eq("user_id", user.id);

    if (memberError) {
      console.error("Member update error:", memberError);
      // 비밀번호는 변경되었으니 에러 로그만 남기고 진행
    }

    return NextResponse.json({
      success: true,
      message: "비밀번호가 변경되었습니다",
    });
  } catch (error) {
    console.error("Change password API error:", error);
    return NextResponse.json(
      { error: "서버 오류가 발생했습니다" },
      { status: 500 }
    );
  }
}
