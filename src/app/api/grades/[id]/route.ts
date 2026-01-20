import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { z } from "zod";

interface RouteParams {
  params: Promise<{ id: string }>;
}

// 등급 수정 스키마
const updateGradeSchema = z.object({
  name: z.string().min(1, "등급명을 입력해주세요").max(50).optional(),
  description: z.string().max(500).optional().nullable(),
  color: z.string().max(20).optional(),
  priority: z.number().int().min(1).optional(),
  is_default: z.boolean().optional(),
});

// GET: 등급 상세 조회
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

    // 등급 조회 (규칙 포함)
    const { data: grade, error } = await supabase
      .from("lead_grades")
      .select(`
        *,
        grade_rules(*)
      `)
      .eq("id", id)
      .single();

    if (error) {
      console.error("Grade fetch error:", error);
      return NextResponse.json(
        { error: "등급을 찾을 수 없습니다" },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, data: grade });
  } catch (error) {
    console.error("Grade GET error:", error);
    return NextResponse.json(
      { error: "서버 오류가 발생했습니다" },
      { status: 500 }
    );
  }
}

// PATCH: 등급 수정
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
    const { data: member } = await supabase
      .from("members")
      .select("role")
      .eq("user_id", user.id)
      .single();

    if (!member || member.role !== "system_admin") {
      return NextResponse.json(
        { error: "권한이 없습니다" },
        { status: 403 }
      );
    }

    // 등급 존재 확인
    const { data: existingGrade } = await supabase
      .from("lead_grades")
      .select("id, is_active")
      .eq("id", id)
      .single();

    if (!existingGrade || !existingGrade.is_active) {
      return NextResponse.json(
        { error: "등급을 찾을 수 없습니다" },
        { status: 404 }
      );
    }

    // 요청 데이터 파싱 및 검증
    const body = await request.json();
    const validationResult = updateGradeSchema.safeParse(body);

    if (!validationResult.success) {
      return NextResponse.json(
        {
          error: "입력값이 올바르지 않습니다",
          details: validationResult.error.flatten().fieldErrors,
        },
        { status: 400 }
      );
    }

    const updateData = validationResult.data;

    // 등급명 중복 체크 (본인 제외)
    if (updateData.name) {
      const { data: duplicateGrade } = await supabase
        .from("lead_grades")
        .select("id")
        .eq("name", updateData.name)
        .eq("is_active", true)
        .neq("id", id)
        .single();

      if (duplicateGrade) {
        return NextResponse.json(
          { error: "이미 존재하는 등급명입니다" },
          { status: 400 }
        );
      }
    }

    // 기본 등급 설정 시 기존 기본 등급 해제
    if (updateData.is_default === true) {
      await supabase
        .from("lead_grades")
        .update({ is_default: false })
        .eq("is_default", true)
        .neq("id", id);
    }

    // 등급 수정
    const { data: grade, error } = await supabase
      .from("lead_grades")
      .update(updateData)
      .eq("id", id)
      .select()
      .single();

    if (error) {
      console.error("Grade update error:", error);
      return NextResponse.json(
        { error: "등급 수정에 실패했습니다" },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, data: grade });
  } catch (error) {
    console.error("Grade PATCH error:", error);
    return NextResponse.json(
      { error: "서버 오류가 발생했습니다" },
      { status: 500 }
    );
  }
}

// DELETE: 등급 삭제 (soft delete)
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
    const { data: member } = await supabase
      .from("members")
      .select("role")
      .eq("user_id", user.id)
      .single();

    if (!member || member.role !== "system_admin") {
      return NextResponse.json(
        { error: "권한이 없습니다" },
        { status: 403 }
      );
    }

    // 등급 존재 확인
    const { data: grade } = await supabase
      .from("lead_grades")
      .select("id, is_active, is_default")
      .eq("id", id)
      .single();

    if (!grade || !grade.is_active) {
      return NextResponse.json(
        { error: "등급을 찾을 수 없습니다" },
        { status: 404 }
      );
    }

    // 기본 등급은 삭제 불가
    if (grade.is_default) {
      return NextResponse.json(
        { error: "기본 등급은 삭제할 수 없습니다" },
        { status: 400 }
      );
    }

    // 해당 등급을 사용하는 리드가 있는지 확인
    const { count: leadCount } = await supabase
      .from("leads")
      .select("*", { count: "exact", head: true })
      .eq("grade_id", id);

    if (leadCount && leadCount > 0) {
      return NextResponse.json(
        {
          error: `해당 등급을 사용 중인 리드가 ${leadCount}건 있습니다. 먼저 리드의 등급을 변경해주세요.`,
        },
        { status: 400 }
      );
    }

    // 등급 비활성화 (soft delete)
    const { error } = await supabase
      .from("lead_grades")
      .update({ is_active: false })
      .eq("id", id);

    if (error) {
      console.error("Grade delete error:", error);
      return NextResponse.json(
        { error: "등급 삭제에 실패했습니다" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "등급이 삭제되었습니다",
    });
  } catch (error) {
    console.error("Grade DELETE error:", error);
    return NextResponse.json(
      { error: "서버 오류가 발생했습니다" },
      { status: 500 }
    );
  }
}
