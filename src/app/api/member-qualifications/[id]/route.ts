import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { z } from "zod";

interface RouteParams {
  params: Promise<{ id: string }>;
}

// 자격 수정 스키마
const updateQualificationSchema = z.object({
  level: z.enum(["trainee", "regular", "senior"]).optional(),
  newbie_test_passed: z.boolean().optional(),
});

// GET: 특정 멤버 자격 조회
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const supabase = await createClient();

    // 인증 확인
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "인증이 필요합니다" }, { status: 401 });
    }

    // 멤버 자격 조회
    const { data: qualification, error } = await supabase
      .from("member_qualifications")
      .select(`
        *,
        member:members(
          id,
          name,
          email,
          phone,
          role,
          is_active,
          team:teams(id, name)
        )
      `)
      .eq("id", id)
      .single();

    if (error) {
      console.error("Member qualification fetch error:", error);
      return NextResponse.json(
        { error: "멤버 자격을 찾을 수 없습니다" },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, data: qualification });
  } catch (error) {
    console.error("Member qualification GET error:", error);
    return NextResponse.json(
      { error: "서버 오류가 발생했습니다" },
      { status: 500 }
    );
  }
}

// PATCH: 멤버 자격 수정
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const supabase = await createClient();

    // 인증 확인
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "인증이 필요합니다" }, { status: 401 });
    }

    // 권한 확인 (시스템 관리자만)
    const { data: currentMember } = await supabase
      .from("members")
      .select("role")
      .eq("user_id", user.id)
      .single();

    if (!currentMember || currentMember.role !== "system_admin") {
      return NextResponse.json(
        { error: "권한이 없습니다" },
        { status: 403 }
      );
    }

    // 기존 자격 조회
    const { data: existingQualification } = await supabase
      .from("member_qualifications")
      .select("id, newbie_test_passed, newbie_test_passed_at")
      .eq("id", id)
      .single();

    if (!existingQualification) {
      return NextResponse.json(
        { error: "멤버 자격을 찾을 수 없습니다" },
        { status: 404 }
      );
    }

    // 요청 데이터 파싱 및 검증
    const body = await request.json();
    const validationResult = updateQualificationSchema.safeParse(body);

    if (!validationResult.success) {
      return NextResponse.json(
        {
          error: "입력값이 올바르지 않습니다",
          details: validationResult.error.flatten().fieldErrors,
        },
        { status: 400 }
      );
    }

    const { level, newbie_test_passed } = validationResult.data;

    const updateData: Record<string, unknown> = {};

    if (level !== undefined) {
      updateData.level = level;
    }

    if (newbie_test_passed !== undefined) {
      updateData.newbie_test_passed = newbie_test_passed;
      // 테스트 통과 시 통과 일시 기록
      if (newbie_test_passed && !existingQualification.newbie_test_passed) {
        updateData.newbie_test_passed_at = new Date().toISOString();
      }
      // 테스트 통과 취소 시 통과 일시 초기화
      if (!newbie_test_passed) {
        updateData.newbie_test_passed_at = null;
      }
    }

    // 멤버 자격 수정
    const { data: qualification, error } = await supabase
      .from("member_qualifications")
      .update(updateData)
      .eq("id", id)
      .select(`
        *,
        member:members(id, name, team:teams(id, name))
      `)
      .single();

    if (error) {
      console.error("Member qualification update error:", error);
      return NextResponse.json(
        { error: "멤버 자격 수정에 실패했습니다" },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, data: qualification });
  } catch (error) {
    console.error("Member qualification PATCH error:", error);
    return NextResponse.json(
      { error: "서버 오류가 발생했습니다" },
      { status: 500 }
    );
  }
}

// DELETE: 멤버 자격 삭제
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const supabase = await createClient();

    // 인증 확인
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "인증이 필요합니다" }, { status: 401 });
    }

    // 권한 확인 (시스템 관리자만)
    const { data: currentMember } = await supabase
      .from("members")
      .select("role")
      .eq("user_id", user.id)
      .single();

    if (!currentMember || currentMember.role !== "system_admin") {
      return NextResponse.json(
        { error: "권한이 없습니다" },
        { status: 403 }
      );
    }

    // 자격 존재 확인
    const { data: qualification } = await supabase
      .from("member_qualifications")
      .select("id")
      .eq("id", id)
      .single();

    if (!qualification) {
      return NextResponse.json(
        { error: "멤버 자격을 찾을 수 없습니다" },
        { status: 404 }
      );
    }

    // 멤버 자격 삭제
    const { error } = await supabase
      .from("member_qualifications")
      .delete()
      .eq("id", id);

    if (error) {
      console.error("Member qualification delete error:", error);
      return NextResponse.json(
        { error: "멤버 자격 삭제에 실패했습니다" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "멤버 자격이 삭제되었습니다",
    });
  } catch (error) {
    console.error("Member qualification DELETE error:", error);
    return NextResponse.json(
      { error: "서버 오류가 발생했습니다" },
      { status: 500 }
    );
  }
}
