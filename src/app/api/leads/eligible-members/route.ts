import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import {
  evaluateQuickEligibility,
  formatPaymentAmount,
  EligibilityThresholds,
} from "@/lib/utils/distribution-eligibility";
import { getPreviousMonth } from "@/lib/utils/commission-calculator";

// 시스템 설정에서 배분 기준값 조회
async function getDistributionThresholds(
  supabase: Awaited<ReturnType<typeof createClient>>
): Promise<EligibilityThresholds> {
  const { data } = await supabase
    .from("system_settings")
    .select("value")
    .eq("key", "distribution_eligibility_thresholds")
    .single();

  if (data?.value) {
    const thresholds = data.value as {
      grade_a_min_payment?: number;
      grade_b_min_payment?: number;
      grade_b_max_payment?: number;
    };
    return {
      grade_a_min_payment: thresholds.grade_a_min_payment ?? 600000,
      grade_b_min_payment: thresholds.grade_b_min_payment ?? 200000,
      grade_b_max_payment: thresholds.grade_b_max_payment ?? 600000,
    };
  }

  // 기본값 반환
  return {
    grade_a_min_payment: 600000,
    grade_b_min_payment: 200000,
    grade_b_max_payment: 600000,
  };
}

// GET: 등급별 자격자 목록 조회
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
    const gradeName = searchParams.get("gradeName");
    const teamId = searchParams.get("teamId");
    const useCurrentMonth = searchParams.get("useCurrentMonth") === "true";

    // 배분 기준값 조회 (DB에서)
    const thresholds = await getDistributionThresholds(supabase);

    // 등급 정보 조회
    let grade = null;
    if (gradeId) {
      const { data } = await supabase
        .from("lead_grades")
        .select("id, name, color, priority")
        .eq("id", gradeId)
        .single();
      grade = data;
    } else if (gradeName) {
      const { data } = await supabase
        .from("lead_grades")
        .select("id, name, color, priority")
        .eq("name", gradeName)
        .single();
      grade = data;
    }

    // 활성 팀장 목록 조회
    let membersQuery = supabase
      .from("members")
      .select(`
        id,
        name,
        email,
        phone,
        role,
        team:teams(id, name)
      `)
      .eq("is_active", true)
      .eq("role", "team_leader");

    if (teamId) {
      membersQuery = membersQuery.eq("team_id", teamId);
    }

    const { data: members, error: membersError } = await membersQuery;

    if (membersError) {
      console.error("Members fetch error:", membersError);
      return NextResponse.json(
        { error: "멤버 목록을 불러오는데 실패했습니다" },
        { status: 500 }
      );
    }

    // 기준 월 결정 (기본: 전월, 옵션: 현재 월)
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth() + 1;

    let targetYear: number;
    let targetMonth: number;

    if (useCurrentMonth) {
      // 현재 월 사용 (테스트용)
      targetYear = currentYear;
      targetMonth = currentMonth;
    } else {
      // 전월 사용 (기본값)
      const { year: prevYear, month: prevMonth } = getPreviousMonth(
        currentYear,
        currentMonth
      );
      targetYear = prevYear;
      targetMonth = prevMonth;
    }

    // 각 멤버의 자격 정보 및 실적 조회
    const memberEligibilities = await Promise.all(
      (members || []).map(async (member) => {
        // 자격 정보 조회
        const { data: qualification } = await supabase
          .from("member_qualifications")
          .select("*")
          .eq("member_id", member.id)
          .single();

        // 기준 월 실적 조회
        const { data: performance } = await supabase
          .from("member_monthly_performance")
          .select("*")
          .eq("member_id", member.id)
          .eq("year", targetYear)
          .eq("month", targetMonth)
          .single();

        const monthlyPayment = performance?.total_monthly_payment || 0;
        const isNewbieTestPassed = qualification?.newbie_test_passed || false;

        // 빠른 자격 평가 (DB에서 조회한 기준값 사용)
        const eligibility = evaluateQuickEligibility(
          monthlyPayment,
          isNewbieTestPassed,
          thresholds
        );

        // 해당 등급 자격 여부
        let isEligibleForGrade = true;
        let eligibilityReason = "";

        if (grade) {
          switch (grade.name) {
            case "A":
              isEligibleForGrade = eligibility.gradeA;
              eligibilityReason = isEligibleForGrade
                ? `월납 ${formatPaymentAmount(monthlyPayment)}`
                : `월납 ${formatPaymentAmount(monthlyPayment)} (${formatPaymentAmount(thresholds.grade_a_min_payment)} 미만)`;
              break;
            case "B":
              isEligibleForGrade = eligibility.gradeB;
              eligibilityReason = isEligibleForGrade
                ? `월납 ${formatPaymentAmount(monthlyPayment)}`
                : eligibility.gradeA
                  ? `A등급 자격자 (월납 ${formatPaymentAmount(monthlyPayment)})`
                  : `월납 ${formatPaymentAmount(monthlyPayment)} (${formatPaymentAmount(thresholds.grade_b_min_payment)} 미만)`;
              break;
            case "C":
              isEligibleForGrade = eligibility.gradeC;
              eligibilityReason = isEligibleForGrade
                ? "신입 TEST 통과"
                : eligibility.gradeA
                  ? "A등급 자격자 제외"
                  : "신입 TEST 미통과";
              break;
            case "D":
              isEligibleForGrade = eligibility.gradeD;
              eligibilityReason = isEligibleForGrade
                ? "테스트 미통과자"
                : "테스트 통과 (상위 등급 대상)";
              break;
          }
        }

        return {
          member: {
            id: member.id,
            name: member.name,
            email: member.email,
            phone: member.phone,
            team: member.team,
          },
          qualification: {
            newbieTestPassed: isNewbieTestPassed,
          },
          performance: {
            year: targetYear,
            month: targetMonth,
            monthlyPayment,
            formattedPayment: formatPaymentAmount(monthlyPayment),
          },
          eligibility: {
            gradeA: eligibility.gradeA,
            gradeB: eligibility.gradeB,
            gradeC: eligibility.gradeC,
            gradeD: eligibility.gradeD,
          },
          isEligibleForGrade,
          eligibilityReason,
        };
      })
    );

    // 자격자/비자격자 분리
    const eligibleMembers = memberEligibilities.filter(
      (m) => m.isEligibleForGrade
    );
    const ineligibleMembers = memberEligibilities.filter(
      (m) => !m.isEligibleForGrade
    );

    // 팀별 그룹핑 (팀명 정렬)
    const groupByTeam = (members: typeof memberEligibilities) => {
      const grouped: Record<
        string,
        {
          team: { id: string; name: string };
          members: typeof memberEligibilities;
        }
      > = {};

      members.forEach((m) => {
        // Supabase returns joined data as array or single object
        const teamData = m.member.team;
        const team = Array.isArray(teamData) ? teamData[0] : teamData;
        const teamId = team?.id || "no-team";
        const teamName = team?.name || "팀 미배정";

        if (!grouped[teamId]) {
          grouped[teamId] = {
            team: { id: teamId, name: teamName },
            members: [],
          };
        }
        grouped[teamId].members.push(m);
      });

      // 팀명으로 정렬하여 반환 (팀 미배정은 맨 뒤로)
      return Object.values(grouped).sort((a, b) => {
        if (a.team.name === "팀 미배정") return 1;
        if (b.team.name === "팀 미배정") return -1;
        return a.team.name.localeCompare(b.team.name, "ko");
      });
    };

    return NextResponse.json({
      success: true,
      data: {
        grade,
        period: {
          year: targetYear,
          month: targetMonth,
          isCurrentMonth: useCurrentMonth,
        },
        summary: {
          totalMembers: memberEligibilities.length,
          eligibleCount: eligibleMembers.length,
          ineligibleCount: ineligibleMembers.length,
        },
        eligibleMembers: groupByTeam(eligibleMembers),
        ineligibleMembers: groupByTeam(ineligibleMembers),
        allMembers: memberEligibilities,
      },
    });
  } catch (error) {
    console.error("Eligible members GET error:", error);
    return NextResponse.json(
      { error: "서버 오류가 발생했습니다" },
      { status: 500 }
    );
  }
}
