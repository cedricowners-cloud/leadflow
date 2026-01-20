import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { z } from "zod";

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

// 등급 규칙 생성 스키마
const createRuleSchema = z.object({
  grade_id: z.string().uuid("올바른 등급을 선택해주세요"),
  conditions: z.array(conditionSchema).min(1, "최소 하나의 조건이 필요합니다"),
  logic_operator: z.enum(["AND", "OR"]).default("AND"),
});

// GET: 등급 규칙 목록 조회
export async function GET() {
  try {
    const supabase = await createClient();

    // 인증 확인
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "인증이 필요합니다" }, { status: 401 });
    }

    // 등급 규칙 목록 조회 (등급 정보 포함)
    const { data: rules, error } = await supabase
      .from("grade_rules")
      .select(`
        *,
        grade:lead_grades(id, name, color, priority)
      `)
      .eq("is_active", true)
      .order("created_at", { ascending: true });

    if (error) {
      console.error("Grade rules fetch error:", error);
      return NextResponse.json(
        { error: "등급 규칙 목록을 불러오는데 실패했습니다" },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, data: rules });
  } catch (error) {
    console.error("Grade rules GET error:", error);
    return NextResponse.json(
      { error: "서버 오류가 발생했습니다" },
      { status: 500 }
    );
  }
}

// POST: 등급 규칙 생성
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

    if (!member || member.role !== "system_admin") {
      return NextResponse.json(
        { error: "권한이 없습니다" },
        { status: 403 }
      );
    }

    // 요청 데이터 파싱 및 검증
    const body = await request.json();
    console.log("Received body:", JSON.stringify(body, null, 2));

    const validationResult = createRuleSchema.safeParse(body);

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

    const { grade_id, conditions, logic_operator } = validationResult.data;

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

    // 등급 규칙 생성
    const { data: rule, error } = await supabase
      .from("grade_rules")
      .insert({
        grade_id,
        conditions,
        logic_operator,
        is_active: true,
      })
      .select(`
        *,
        grade:lead_grades(id, name, color, priority)
      `)
      .single();

    if (error) {
      console.error("Grade rule create error:", error);
      return NextResponse.json(
        { error: "등급 규칙 생성에 실패했습니다" },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, data: rule }, { status: 201 });
  } catch (error) {
    console.error("Grade rules POST error:", error);
    return NextResponse.json(
      { error: "서버 오류가 발생했습니다" },
      { status: 500 }
    );
  }
}
