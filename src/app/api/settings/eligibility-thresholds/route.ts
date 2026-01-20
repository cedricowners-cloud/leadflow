import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { z } from "zod";

// 등급별 설명 문구 스키마
const gradeDescriptionSchema = z.object({
  title: z.string().max(100, "제목은 100자 이내여야 합니다"),
  description: z.string().max(200, "설명은 200자 이내여야 합니다"),
  note: z.string().max(200, "비고는 200자 이내여야 합니다").optional(),
});

// 배분 자격 기준 스키마 (금액 + 문구 포함)
const eligibilityThresholdsSchema = z.object({
  // 금액 기준
  grade_a_min_payment: z.number().min(0, "A등급 최소 금액은 0 이상이어야 합니다"),
  grade_b_min_payment: z.number().min(0, "B등급 최소 금액은 0 이상이어야 합니다"),
  grade_b_max_payment: z.number().min(0, "B등급 최대 금액은 0 이상이어야 합니다"),
  // 등급별 설명 문구
  grade_a_description: gradeDescriptionSchema.optional(),
  grade_b_description: gradeDescriptionSchema.optional(),
  grade_c_description: gradeDescriptionSchema.optional(),
  grade_d_description: gradeDescriptionSchema.optional(),
  // 하단 안내 문구
  footer_note: z.string().max(500, "하단 안내는 500자 이내여야 합니다").optional(),
});

export type GradeDescription = z.infer<typeof gradeDescriptionSchema>;
export type EligibilityThresholds = z.infer<typeof eligibilityThresholdsSchema>;

// 기본값
const DEFAULT_THRESHOLDS: EligibilityThresholds = {
  grade_a_min_payment: 600000, // 60만원
  grade_b_min_payment: 200000, // 20만원
  grade_b_max_payment: 600000, // 60만원
  grade_a_description: {
    title: "A등급 리드 자격",
    description: "전월 보험 월납 ≥ 60만원",
    note: "+ 신입 테스트 통과 필요",
  },
  grade_b_description: {
    title: "B등급 리드 자격",
    description: "전월 보험 월납 ≥ 20만원 AND < 60만원",
    note: "+ 신입 테스트 통과 필요",
  },
  grade_c_description: {
    title: "C등급 리드 자격",
    description: "신입 테스트 통과자 (A, B등급 자격 미달)",
    note: "",
  },
  grade_d_description: {
    title: "D등급 리드 자격",
    description: "신입 트레이니 (테스트 미통과)",
    note: "",
  },
  footer_note: "* 배분 자격은 소프트 적용됩니다 (자격자/비자격자 표시만, 배분 차단 없음)",
};

// GET: 배분 자격 기준 조회
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

    // 설정 조회
    const { data, error } = await supabase
      .from("system_settings")
      .select("value")
      .eq("key", "distribution_eligibility_thresholds")
      .single();

    if (error || !data) {
      // 설정이 없으면 기본값 반환
      return NextResponse.json({ success: true, data: DEFAULT_THRESHOLDS });
    }

    // value가 이미 객체인 경우 그대로 사용
    const thresholds = typeof data.value === 'string'
      ? JSON.parse(data.value)
      : data.value;

    return NextResponse.json({
      success: true,
      data: { ...DEFAULT_THRESHOLDS, ...thresholds }
    });
  } catch (error) {
    console.error("Eligibility thresholds GET error:", error);
    return NextResponse.json(
      { error: "서버 오류가 발생했습니다" },
      { status: 500 }
    );
  }
}

// PATCH: 배분 자격 기준 수정
export async function PATCH(request: NextRequest) {
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
        { error: "시스템 관리자만 설정을 변경할 수 있습니다" },
        { status: 403 }
      );
    }

    // 요청 데이터 파싱 및 검증
    const body = await request.json();
    const validationResult = eligibilityThresholdsSchema.safeParse(body);

    if (!validationResult.success) {
      return NextResponse.json(
        {
          error: "입력값이 올바르지 않습니다",
          details: validationResult.error.flatten().fieldErrors,
        },
        { status: 400 }
      );
    }

    const thresholds = validationResult.data;

    // B등급 범위 검증
    if (thresholds.grade_b_min_payment >= thresholds.grade_b_max_payment) {
      return NextResponse.json(
        { error: "B등급 최소 금액은 최대 금액보다 작아야 합니다" },
        { status: 400 }
      );
    }

    // A등급과 B등급 최대 금액이 동일해야 함
    if (thresholds.grade_a_min_payment !== thresholds.grade_b_max_payment) {
      return NextResponse.json(
        { error: "A등급 최소 금액과 B등급 최대 금액은 동일해야 합니다" },
        { status: 400 }
      );
    }

    // 설정 업데이트 (upsert)
    const { error: updateError } = await supabase
      .from("system_settings")
      .upsert(
        {
          key: "distribution_eligibility_thresholds",
          value: thresholds,
          description: "등급별 배분 자격 기준 (원 단위). grade_a_min_payment: A등급 최소 월납, grade_b_min_payment: B등급 최소 월납, grade_b_max_payment: B등급 최대 월납",
          updated_at: new Date().toISOString(),
        },
        { onConflict: "key" }
      );

    if (updateError) {
      console.error("Settings update error:", updateError);
      return NextResponse.json(
        { error: "설정 저장에 실패했습니다" },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, data: thresholds });
  } catch (error) {
    console.error("Eligibility thresholds PATCH error:", error);
    return NextResponse.json(
      { error: "서버 오류가 발생했습니다" },
      { status: 500 }
    );
  }
}
