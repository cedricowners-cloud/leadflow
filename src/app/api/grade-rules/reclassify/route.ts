import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isAdminRole, MemberRole } from "@/lib/constants/roles";
import {
  classifyGrade,
  GradeWithRule,
  Condition,
} from "@/lib/utils/grade-classifier";

/**
 * POST /api/grade-rules/reclassify
 * 기존 리드들을 현재 등급 규칙에 따라 재분류합니다.
 *
 * Body:
 * {
 *   mode: "all" | "auto_only"  // 전체 재분류 또는 자동분류된 것만
 * }
 */
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

    // 요청 데이터 파싱
    const body = await request.json();
    const mode = body.mode || "auto_only"; // 기본값: 자동분류된 것만

    // Admin 클라이언트 사용 (RLS 우회)
    const adminSupabase = createAdminClient();

    // 등급 및 규칙 조회
    const { data: grades } = await adminSupabase
      .from("lead_grades")
      .select("id, name, color, priority, is_default")
      .eq("is_active", true)
      .order("priority");

    const { data: rules } = await adminSupabase
      .from("grade_rules")
      .select("id, grade_id, conditions, logic_operator")
      .eq("is_active", true);

    if (!grades || grades.length === 0) {
      return NextResponse.json(
        { error: "활성화된 등급이 없습니다" },
        { status: 400 }
      );
    }

    // 등급과 규칙 매핑
    const gradesWithRules: GradeWithRule[] = grades.map((grade) => ({
      ...grade,
      rules: (rules || [])
        .filter((rule) => rule.grade_id === grade.id)
        .map((rule) => ({
          id: rule.id,
          grade_id: rule.grade_id,
          conditions: (Array.isArray(rule.conditions)
            ? rule.conditions
            : []) as Condition[],
          logic_operator: (rule.logic_operator as "AND" | "OR") || "AND",
        })),
    }));

    // 재분류 대상 리드 조회
    let leadsQuery = adminSupabase
      .from("leads")
      .select("id, annual_revenue, employee_count, industry, region, business_type, campaign_name, tax_delinquency, grade_id, grade_source");

    // mode가 "auto_only"인 경우 자동분류된 리드만 대상
    if (mode === "auto_only") {
      leadsQuery = leadsQuery.eq("grade_source", "auto");
    }

    const { data: leads, error: leadsError } = await leadsQuery;

    if (leadsError) {
      console.error("Leads fetch error:", leadsError);
      return NextResponse.json(
        { error: "리드 목록을 불러오는데 실패했습니다" },
        { status: 500 }
      );
    }

    if (!leads || leads.length === 0) {
      return NextResponse.json({
        success: true,
        data: {
          totalCount: 0,
          updatedCount: 0,
          gradeSummary: {},
          message: "재분류할 리드가 없습니다",
        },
      });
    }

    // 리드 재분류
    const gradeSummary: Record<string, number> = {};
    const updates: { id: string; grade_id: string }[] = [];
    let updatedCount = 0;

    for (const lead of leads) {
      const classification = classifyGrade(
        {
          annual_revenue: lead.annual_revenue,
          employee_count: lead.employee_count,
          industry: lead.industry,
          region: lead.region,
          business_type: lead.business_type,
          campaign_name: lead.campaign_name,
          tax_delinquency: lead.tax_delinquency,
        },
        gradesWithRules
      );

      // 등급 통계
      gradeSummary[classification.grade_name] =
        (gradeSummary[classification.grade_name] || 0) + 1;

      // 등급이 변경된 경우만 업데이트 대상에 추가
      if (lead.grade_id !== classification.grade_id) {
        updates.push({
          id: lead.id,
          grade_id: classification.grade_id,
        });
        updatedCount++;
      }
    }

    // 일괄 업데이트 (배치 처리)
    if (updates.length > 0) {
      // 등급별로 그룹화하여 업데이트
      const gradeGroups: Record<string, string[]> = {};
      for (const update of updates) {
        if (!gradeGroups[update.grade_id]) {
          gradeGroups[update.grade_id] = [];
        }
        gradeGroups[update.grade_id].push(update.id);
      }

      // 각 등급별로 일괄 업데이트
      for (const [gradeId, leadIds] of Object.entries(gradeGroups)) {
        const { error: updateError } = await adminSupabase
          .from("leads")
          .update({ grade_id: gradeId, grade_source: "auto" })
          .in("id", leadIds);

        if (updateError) {
          console.error("Lead update error:", updateError);
        }
      }
    }

    console.log(`Reclassify completed: ${leads.length} leads processed, ${updatedCount} updated`);

    return NextResponse.json({
      success: true,
      data: {
        totalCount: leads.length,
        updatedCount,
        gradeSummary,
        message: `${leads.length}건의 리드 중 ${updatedCount}건의 등급이 변경되었습니다.`,
      },
    });
  } catch (error) {
    console.error("Reclassify error:", error);
    return NextResponse.json(
      { error: "서버 오류가 발생했습니다" },
      { status: 500 }
    );
  }
}
