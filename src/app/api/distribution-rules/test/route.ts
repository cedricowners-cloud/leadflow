import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { z } from "zod";
import {
  evaluateMemberEligibility,
  evaluateQuickEligibility,
  MemberData,
  DistributionRule,
} from "@/lib/utils/distribution-eligibility";
import { getPreviousMonth } from "@/lib/utils/commission-calculator";

// 테스트 요청 스키마
const testRequestSchema = z.object({
  member_id: z.string().uuid("올바른 멤버를 선택해주세요").optional(),
  // 또는 직접 데이터 입력
  test_data: z
    .object({
      monthly_payment: z.number().min(0).optional(),
      newbie_test_passed: z.boolean().optional(),
    })
    .optional(),
  grade_id: z.string().uuid("올바른 등급을 선택해주세요").optional(),
});

// POST: 배분 규칙 테스트
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

    // 요청 데이터 파싱 및 검증
    const body = await request.json();
    const validationResult = testRequestSchema.safeParse(body);

    if (!validationResult.success) {
      return NextResponse.json(
        {
          error: "입력값이 올바르지 않습니다",
          details: validationResult.error.flatten().fieldErrors,
        },
        { status: 400 }
      );
    }

    const { member_id, test_data, grade_id } = validationResult.data;

    let memberData: MemberData;

    if (member_id) {
      // 실제 멤버 데이터 조회
      const { data: qualification } = await supabase
        .from("member_qualifications")
        .select("*")
        .eq("member_id", member_id)
        .single();

      // 전월 실적 조회
      const now = new Date();
      const { year: prevYear, month: prevMonth } = getPreviousMonth(
        now.getFullYear(),
        now.getMonth() + 1
      );

      const { data: performance } = await supabase
        .from("member_monthly_performance")
        .select("*")
        .eq("member_id", member_id)
        .eq("year", prevYear)
        .eq("month", prevMonth)
        .single();

      memberData = {
        qualification: qualification || null,
        previousMonthPerformance: performance || null,
      };
    } else if (test_data) {
      // 테스트 데이터로 가상 멤버 생성
      memberData = {
        qualification: {
          id: "test",
          member_id: "test",
          newbie_test_passed: test_data.newbie_test_passed || false,
          newbie_test_passed_at: null,
        },
        previousMonthPerformance: {
          id: "test",
          member_id: "test",
          year: 0,
          month: 0,
          total_monthly_payment: test_data.monthly_payment || 0,
          total_commission: 0,
          contract_count: 0,
        },
      };
    } else {
      return NextResponse.json(
        { error: "member_id 또는 test_data가 필요합니다" },
        { status: 400 }
      );
    }

    // 배분 규칙 조회
    let rulesQuery = supabase
      .from("distribution_rules")
      .select(`
        *,
        grade:lead_grades(id, name, color, priority)
      `)
      .eq("is_active", true)
      .order("priority", { ascending: true });

    if (grade_id) {
      rulesQuery = rulesQuery.eq("grade_id", grade_id);
    }

    const { data: rules, error: rulesError } = await rulesQuery;

    if (rulesError) {
      console.error("Distribution rules fetch error:", rulesError);
      return NextResponse.json(
        { error: "배분 규칙을 불러오는데 실패했습니다" },
        { status: 500 }
      );
    }

    // 빠른 자격 평가 (기본 규칙 기반)
    const monthlyPayment =
      memberData.previousMonthPerformance?.total_monthly_payment || 0;
    const isNewbieTestPassed =
      memberData.qualification?.newbie_test_passed || false;

    const quickEligibility = evaluateQuickEligibility(
      monthlyPayment,
      isNewbieTestPassed
    );

    // 등급별 자격 상태 계산 (제외 규칙 평가용)
    const gradeEligibilities = new Map<string, boolean>([
      ["A", quickEligibility.gradeA],
      ["B", quickEligibility.gradeB],
      ["C", quickEligibility.gradeC],
      ["D", quickEligibility.gradeD],
    ]);

    // 상세 규칙 평가
    const eligibilityResult = evaluateMemberEligibility(
      memberData,
      rules as DistributionRule[],
      gradeEligibilities
    );

    // 등급 정보 조회
    const { data: grades } = await supabase
      .from("lead_grades")
      .select("id, name, color, priority")
      .eq("is_active", true)
      .order("priority", { ascending: true });

    // 각 등급별 자격 여부
    const gradeResults = grades?.map((grade) => {
      const gradeRules = rules?.filter((r) => r.grade_id === grade.id) || [];
      const result = evaluateMemberEligibility(
        memberData,
        gradeRules as DistributionRule[],
        gradeEligibilities
      );

      // 빠른 평가 결과 참조
      let quickResult = false;
      if (grade.name === "A") quickResult = quickEligibility.gradeA;
      else if (grade.name === "B") quickResult = quickEligibility.gradeB;
      else if (grade.name === "C") quickResult = quickEligibility.gradeC;
      else if (grade.name === "D") quickResult = quickEligibility.gradeD;

      return {
        grade,
        isEligible: gradeRules.length > 0 ? result.isEligible : quickResult,
        matchedRule: result.matchedRule,
        evaluationLog: result.evaluationLog,
        excludedBy: result.excludedBy,
        quickEligibility: quickResult,
      };
    });

    return NextResponse.json({
      success: true,
      data: {
        memberData: {
          monthlyPayment,
          newbieTestPassed: isNewbieTestPassed,
        },
        quickEligibility,
        gradeResults,
        overallResult: eligibilityResult,
      },
    });
  } catch (error) {
    console.error("Distribution rules test error:", error);
    return NextResponse.json(
      { error: "서버 오류가 발생했습니다" },
      { status: 500 }
    );
  }
}
