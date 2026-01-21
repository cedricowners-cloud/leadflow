import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { z } from "zod";
import { isAdminRole, MemberRole } from "@/lib/constants/roles";

interface RouteParams {
  params: Promise<{ id: string }>;
}

// 조건 스키마
const conditionSchema = z.object({
  field: z.string().min(1),
  operator: z.enum([
    "eq",
    "neq",
    "gt",
    "gte",
    "lt",
    "lte",
    "between",
    "in",
    "contains",
  ]),
  value: z.union([
    z.string(),
    z.number(),
    z.array(z.union([z.string(), z.number()])),
  ]),
});

// 등급 규칙 수정 스키마
const updateRuleSchema = z.object({
  grade_id: z.string().uuid().optional(),
  conditions: z.array(conditionSchema).min(1).optional(),
  logic_operator: z.enum(["AND", "OR"]).optional(),
});

// GET: 등급 규칙 상세 조회
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

    // 등급 규칙 조회
    const { data: rule, error } = await supabase
      .from("grade_rules")
      .select(`
        *,
        grade:lead_grades(id, name, color, priority)
      `)
      .eq("id", id)
      .single();

    if (error) {
      console.error("Grade rule fetch error:", error);
      return NextResponse.json(
        { error: "등급 규칙을 찾을 수 없습니다" },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, data: rule });
  } catch (error) {
    console.error("Grade rule GET error:", error);
    return NextResponse.json(
      { error: "서버 오류가 발생했습니다" },
      { status: 500 }
    );
  }
}

// PATCH: 등급 규칙 수정
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

    if (!member || !isAdminRole(member.role as MemberRole)) {
      return NextResponse.json(
        { error: "권한이 없습니다" },
        { status: 403 }
      );
    }

    // 등급 규칙 존재 확인
    const { data: existingRule } = await supabase
      .from("grade_rules")
      .select("id, is_active")
      .eq("id", id)
      .single();

    if (!existingRule || !existingRule.is_active) {
      return NextResponse.json(
        { error: "등급 규칙을 찾을 수 없습니다" },
        { status: 404 }
      );
    }

    // 요청 데이터 파싱 및 검증
    const body = await request.json();
    console.log("Received body:", JSON.stringify(body, null, 2));

    const validationResult = updateRuleSchema.safeParse(body);

    if (!validationResult.success) {
      console.log("Validation errors:", JSON.stringify(validationResult.error.issues, null, 2));
      return NextResponse.json(
        {
          error: "입력값이 올바르지 않습니다",
          details: validationResult.error.flatten().fieldErrors,
          issues: validationResult.error.issues,
        },
        { status: 400 }
      );
    }

    const updateData = validationResult.data;

    // 등급 변경 시 등급 존재 확인
    if (updateData.grade_id) {
      const { data: grade } = await supabase
        .from("lead_grades")
        .select("id, is_active")
        .eq("id", updateData.grade_id)
        .single();

      if (!grade || !grade.is_active) {
        return NextResponse.json(
          { error: "유효하지 않은 등급입니다" },
          { status: 400 }
        );
      }
    }

    // 등급 규칙 수정
    const { data: rule, error } = await supabase
      .from("grade_rules")
      .update(updateData)
      .eq("id", id)
      .select(`
        *,
        grade:lead_grades(id, name, color, priority)
      `)
      .single();

    if (error) {
      console.error("Grade rule update error:", error);
      return NextResponse.json(
        { error: "등급 규칙 수정에 실패했습니다" },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, data: rule });
  } catch (error) {
    console.error("Grade rule PATCH error:", error);
    return NextResponse.json(
      { error: "서버 오류가 발생했습니다" },
      { status: 500 }
    );
  }
}

// DELETE: 등급 규칙 삭제 (soft delete)
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

    if (!member || !isAdminRole(member.role as MemberRole)) {
      return NextResponse.json(
        { error: "권한이 없습니다" },
        { status: 403 }
      );
    }

    // 등급 규칙 존재 확인
    const { data: rule } = await supabase
      .from("grade_rules")
      .select("id, is_active")
      .eq("id", id)
      .single();

    if (!rule || !rule.is_active) {
      return NextResponse.json(
        { error: "등급 규칙을 찾을 수 없습니다" },
        { status: 404 }
      );
    }

    // 등급 규칙 비활성화 (soft delete)
    const { error } = await supabase
      .from("grade_rules")
      .update({ is_active: false })
      .eq("id", id);

    if (error) {
      console.error("Grade rule delete error:", error);
      return NextResponse.json(
        { error: "등급 규칙 삭제에 실패했습니다" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "등급 규칙이 삭제되었습니다",
    });
  } catch (error) {
    console.error("Grade rule DELETE error:", error);
    return NextResponse.json(
      { error: "서버 오류가 발생했습니다" },
      { status: 500 }
    );
  }
}
