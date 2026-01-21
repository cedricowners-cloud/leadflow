import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { z } from "zod";
import { isAdminRole, MemberRole } from "@/lib/constants/roles";

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
    z.boolean(),
    z.array(z.union([z.string(), z.number()])),
  ]),
});

// 배분 규칙 생성 스키마
const createRuleSchema = z.object({
  grade_id: z.string().uuid("올바른 등급을 선택해주세요"),
  name: z.string().min(1, "규칙명을 입력해주세요").max(200),
  conditions: z.array(conditionSchema).min(1, "최소 하나의 조건이 필요합니다"),
  logic_operator: z.enum(["AND", "OR"]).default("AND"),
  exclusion_rules: z.array(z.string()).optional(),
  priority: z.number().int().min(0).default(0),
});

// GET: 배분 규칙 목록 조회
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();

    // 인증 확인
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "인증이 필요합니다" }, { status: 401 });
    }

    // 쿼리 파라미터
    const { searchParams } = new URL(request.url);
    const gradeId = searchParams.get("gradeId");

    // 배분 규칙 목록 조회 (등급 정보 포함)
    let query = supabase
      .from("distribution_rules")
      .select(`
        *,
        grade:lead_grades(id, name, color, priority)
      `)
      .eq("is_active", true)
      .order("priority", { ascending: true });

    // 등급 필터
    if (gradeId) {
      query = query.eq("grade_id", gradeId);
    }

    const { data: rules, error } = await query;

    if (error) {
      console.error("Distribution rules fetch error:", error);
      return NextResponse.json(
        { error: "배분 규칙 목록을 불러오는데 실패했습니다" },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, data: rules });
  } catch (error) {
    console.error("Distribution rules GET error:", error);
    return NextResponse.json(
      { error: "서버 오류가 발생했습니다" },
      { status: 500 }
    );
  }
}

// POST: 배분 규칙 생성
export async function POST(request: NextRequest) {
  try {
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

    // 요청 데이터 파싱 및 검증
    const body = await request.json();
    const validationResult = createRuleSchema.safeParse(body);

    if (!validationResult.success) {
      return NextResponse.json(
        {
          error: "입력값이 올바르지 않습니다",
          details: validationResult.error.flatten().fieldErrors,
        },
        { status: 400 }
      );
    }

    const { grade_id, name, conditions, logic_operator, exclusion_rules, priority } =
      validationResult.data;

    // 등급 존재 확인
    const { data: grade } = await supabase
      .from("lead_grades")
      .select("id, is_active")
      .eq("id", grade_id)
      .single();

    if (!grade || !grade.is_active) {
      return NextResponse.json(
        { error: "유효하지 않은 등급입니다" },
        { status: 400 }
      );
    }

    // 배분 규칙 생성
    const { data: rule, error } = await supabase
      .from("distribution_rules")
      .insert({
        grade_id,
        name,
        conditions,
        logic_operator,
        exclusion_rules: exclusion_rules || [],
        priority,
        is_active: true,
      })
      .select(`
        *,
        grade:lead_grades(id, name, color, priority)
      `)
      .single();

    if (error) {
      console.error("Distribution rule create error:", error);
      return NextResponse.json(
        { error: "배분 규칙 생성에 실패했습니다" },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, data: rule }, { status: 201 });
  } catch (error) {
    console.error("Distribution rules POST error:", error);
    return NextResponse.json(
      { error: "서버 오류가 발생했습니다" },
      { status: 500 }
    );
  }
}
