import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { z } from "zod";
import { isAdminRole, MemberRole } from "@/lib/constants/roles";

// 등급 생성 스키마
const createGradeSchema = z.object({
  name: z.string().min(1, "등급명을 입력해주세요").max(50),
  description: z.string().max(500).optional(),
  color: z.string().max(20).optional(),
  priority: z.number().int().min(1),
  is_default: z.boolean().optional(),
});

// GET: 등급 목록 조회
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

    // 등급 목록 조회 (우선순위 순)
    const { data: grades, error } = await supabase
      .from("lead_grades")
      .select("*")
      .eq("is_active", true)
      .order("priority", { ascending: true });

    if (error) {
      console.error("Grades fetch error:", error);
      return NextResponse.json(
        { error: "등급 목록을 불러오는데 실패했습니다" },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, data: grades });
  } catch (error) {
    console.error("Grades GET error:", error);
    return NextResponse.json(
      { error: "서버 오류가 발생했습니다" },
      { status: 500 }
    );
  }
}

// POST: 등급 생성
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
    const validationResult = createGradeSchema.safeParse(body);

    if (!validationResult.success) {
      return NextResponse.json(
        {
          error: "입력값이 올바르지 않습니다",
          details: validationResult.error.flatten().fieldErrors,
        },
        { status: 400 }
      );
    }

    const { name, description, color, priority, is_default } =
      validationResult.data;

    // 등급명 중복 체크
    const { data: existingGrade } = await supabase
      .from("lead_grades")
      .select("id")
      .eq("name", name)
      .eq("is_active", true)
      .single();

    if (existingGrade) {
      return NextResponse.json(
        { error: "이미 존재하는 등급명입니다" },
        { status: 400 }
      );
    }

    // 기본 등급 설정 시 기존 기본 등급 해제
    if (is_default) {
      await supabase
        .from("lead_grades")
        .update({ is_default: false })
        .eq("is_default", true);
    }

    // 등급 생성
    const { data: grade, error } = await supabase
      .from("lead_grades")
      .insert({
        name,
        description: description || null,
        color: color || "#6b7280",
        priority,
        is_default: is_default || false,
        is_active: true,
      })
      .select()
      .single();

    if (error) {
      console.error("Grade create error:", error);
      return NextResponse.json(
        { error: "등급 생성에 실패했습니다" },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, data: grade }, { status: 201 });
  } catch (error) {
    console.error("Grades POST error:", error);
    return NextResponse.json(
      { error: "서버 오류가 발생했습니다" },
      { status: 500 }
    );
  }
}
