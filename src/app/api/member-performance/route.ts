import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { z } from "zod";

// 실적 상세 스키마
const performanceDetailSchema = z.object({
  product_id: z.string().uuid("올바른 상품을 선택해주세요").nullish(),
  client_name: z.string().max(200).nullish(),
  monthly_payment: z.number().min(0, "월납 금액은 0 이상이어야 합니다"),
  commission_amount: z.number().min(0, "수수료는 0 이상이어야 합니다"),
  contract_date: z.string().nullish(),
  memo: z.string().max(500).nullish(),
});

// 월별 실적 생성/수정 스키마
const upsertPerformanceSchema = z.object({
  member_id: z.string().uuid("올바른 멤버를 선택해주세요"),
  year: z.number().int().min(2000).max(2100),
  month: z.number().int().min(1).max(12),
  details: z.array(performanceDetailSchema).nullish(),
  notes: z.string().max(1000).nullish(),
});

// GET: 월별 실적 목록 조회
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

    // 현재 사용자 정보 조회
    const { data: currentMember } = await supabase
      .from("members")
      .select("id, role, team_id")
      .eq("user_id", user.id)
      .single();

    if (!currentMember) {
      return NextResponse.json({ error: "멤버 정보를 찾을 수 없습니다" }, { status: 404 });
    }

    // 쿼리 파라미터
    const { searchParams } = new URL(request.url);
    const year = searchParams.get("year");
    const month = searchParams.get("month");
    const memberId = searchParams.get("memberId");
    let teamId = searchParams.get("teamId");

    // 영업 관리자인 경우 담당 팀으로 자동 필터링
    if (currentMember.role === "sales_manager") {
      // manager_teams에서 담당 팀 목록 조회
      const { data: managerTeams } = await supabase
        .from("manager_teams")
        .select("team_id")
        .eq("member_id", currentMember.id);

      const teamIds = managerTeams?.map(t => t.team_id) || [];

      if (teamIds.length === 0) {
        // 담당 팀이 없으면 빈 결과 반환
        return NextResponse.json({ success: true, data: [] });
      }

      // teamId 파라미터가 있으면 담당 팀 중에서만 필터링
      if (teamId && !teamIds.includes(teamId)) {
        return NextResponse.json({ error: "해당 팀에 대한 권한이 없습니다" }, { status: 403 });
      }

      // 담당 팀 멤버들 조회
      let memberQuery = supabase
        .from("members")
        .select("id")
        .eq("role", "team_leader")
        .eq("is_active", true);

      if (teamId) {
        memberQuery = memberQuery.eq("team_id", teamId);
      } else {
        memberQuery = memberQuery.in("team_id", teamIds);
      }

      const { data: teamMembers } = await memberQuery;
      const memberIds = teamMembers?.map(m => m.id) || [];

      if (memberIds.length === 0) {
        return NextResponse.json({ success: true, data: [] });
      }

      // 담당 팀 멤버들의 실적만 조회
      let query = supabase
        .from("member_monthly_performance")
        .select(`
          *,
          member:members!inner(
            id,
            name,
            team:teams(id, name)
          ),
          details:member_performance_details(
            *,
            product:insurance_products(id, name, company, insurer_commission_rate, adjustment_rate)
          )
        `)
        .in("member_id", memberIds)
        .order("year", { ascending: false })
        .order("month", { ascending: false });

      if (year) {
        query = query.eq("year", parseInt(year));
      }
      if (month) {
        query = query.eq("month", parseInt(month));
      }
      if (memberId && memberIds.includes(memberId)) {
        query = query.eq("member_id", memberId);
      }

      const { data: performances, error } = await query;

      if (error) {
        console.error("Member performance fetch error:", error);
        return NextResponse.json(
          { error: "실적 목록을 불러오는데 실패했습니다" },
          { status: 500 }
        );
      }

      return NextResponse.json({ success: true, data: performances });
    }

    // 팀장인 경우 본인 실적만 조회
    if (currentMember.role === "team_leader") {
      let query = supabase
        .from("member_monthly_performance")
        .select(`
          *,
          member:members!inner(
            id,
            name,
            team:teams(id, name)
          ),
          details:member_performance_details(
            *,
            product:insurance_products(id, name, company, insurer_commission_rate, adjustment_rate)
          )
        `)
        .eq("member_id", currentMember.id)
        .order("year", { ascending: false })
        .order("month", { ascending: false });

      if (year) {
        query = query.eq("year", parseInt(year));
      }
      if (month) {
        query = query.eq("month", parseInt(month));
      }

      const { data: performances, error } = await query;

      if (error) {
        console.error("Member performance fetch error:", error);
        return NextResponse.json(
          { error: "실적 목록을 불러오는데 실패했습니다" },
          { status: 500 }
        );
      }

      return NextResponse.json({ success: true, data: performances });
    }

    // 시스템 관리자는 전체 조회 가능
    // 기본 쿼리
    let query = supabase
      .from("member_monthly_performance")
      .select(`
        *,
        member:members!inner(
          id,
          name,
          team:teams(id, name)
        ),
        details:member_performance_details(
          *,
          product:insurance_products(id, name, company, insurer_commission_rate, adjustment_rate)
        )
      `)
      .order("year", { ascending: false })
      .order("month", { ascending: false });

    // 필터 적용
    if (year) {
      query = query.eq("year", parseInt(year));
    }
    if (month) {
      query = query.eq("month", parseInt(month));
    }
    if (memberId) {
      query = query.eq("member_id", memberId);
    }
    if (teamId) {
      query = query.eq("member.team_id", teamId);
    }

    const { data: performances, error } = await query;

    if (error) {
      console.error("Member performance fetch error:", error);
      return NextResponse.json(
        { error: "실적 목록을 불러오는데 실패했습니다" },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, data: performances });
  } catch (error) {
    console.error("Member performance GET error:", error);
    return NextResponse.json(
      { error: "서버 오류가 발생했습니다" },
      { status: 500 }
    );
  }
}

// POST: 월별 실적 생성 또는 수정 (Upsert)
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

    // 권한 확인
    const { data: member } = await supabase
      .from("members")
      .select("id, role")
      .eq("user_id", user.id)
      .single();

    if (!member) {
      return NextResponse.json(
        { error: "멤버 정보를 찾을 수 없습니다" },
        { status: 404 }
      );
    }

    // 요청 데이터 파싱 및 검증
    const body = await request.json();
    const validationResult = upsertPerformanceSchema.safeParse(body);

    if (!validationResult.success) {
      return NextResponse.json(
        {
          error: "입력값이 올바르지 않습니다",
          details: validationResult.error.flatten().fieldErrors,
        },
        { status: 400 }
      );
    }

    const { member_id, year, month, details, notes } = validationResult.data;

    // 권한 검증:
    // - system_admin: 모든 멤버의 실적 입력 가능
    // - sales_manager, team_leader: 본인 실적만 입력 가능
    const isSystemAdmin = member.role === "system_admin";
    const isSelfEntry = member.id === member_id;
    const canEditSelf = member.role === "sales_manager" || member.role === "team_leader";

    if (!isSystemAdmin && !(canEditSelf && isSelfEntry)) {
      return NextResponse.json(
        { error: "권한이 없습니다" },
        { status: 403 }
      );
    }

    // 멤버 존재 확인
    const { data: targetMember } = await supabase
      .from("members")
      .select("id, is_active")
      .eq("id", member_id)
      .single();

    if (!targetMember || !targetMember.is_active) {
      return NextResponse.json(
        { error: "멤버를 찾을 수 없습니다" },
        { status: 404 }
      );
    }

    // 기존 실적 확인
    const { data: existingPerformance } = await supabase
      .from("member_monthly_performance")
      .select("id")
      .eq("member_id", member_id)
      .eq("year", year)
      .eq("month", month)
      .single();

    let performanceId: string;

    // 상세 실적에서 합계 계산
    let totalMonthlyPayment = 0;
    let totalCommission = 0;
    let contractCount = 0;

    if (details && details.length > 0) {
      totalMonthlyPayment = details.reduce((sum, d) => sum + d.monthly_payment, 0);
      totalCommission = details.reduce((sum, d) => sum + d.commission_amount, 0);
      contractCount = details.length;
    }

    if (existingPerformance) {
      // 기존 실적 업데이트
      performanceId = existingPerformance.id;

      const { error: updateError } = await supabase
        .from("member_monthly_performance")
        .update({
          total_monthly_payment: totalMonthlyPayment,
          total_commission: totalCommission,
          contract_count: contractCount,
          notes: notes || null,
        })
        .eq("id", performanceId);

      if (updateError) {
        console.error("Performance update error:", updateError);
        return NextResponse.json(
          { error: "실적 수정에 실패했습니다" },
          { status: 500 }
        );
      }

      // 기존 상세 실적 삭제
      await supabase
        .from("member_performance_details")
        .delete()
        .eq("performance_id", performanceId);
    } else {
      // 새 실적 생성
      const { data: newPerformance, error: insertError } = await supabase
        .from("member_monthly_performance")
        .insert({
          member_id,
          year,
          month,
          total_monthly_payment: totalMonthlyPayment,
          total_commission: totalCommission,
          contract_count: contractCount,
          notes: notes || null,
        })
        .select()
        .single();

      if (insertError || !newPerformance) {
        console.error("Performance insert error:", insertError);
        return NextResponse.json(
          { error: "실적 생성에 실패했습니다" },
          { status: 500 }
        );
      }

      performanceId = newPerformance.id;
    }

    // 상세 실적 추가
    if (details && details.length > 0) {
      const detailsToInsert = details.map((detail) => ({
        performance_id: performanceId,
        product_id: detail.product_id || null,
        client_name: detail.client_name || null,
        monthly_payment: detail.monthly_payment,
        commission_amount: detail.commission_amount,
        contract_date: detail.contract_date || null,
        memo: detail.memo || null,
      }));

      const { error: detailsError } = await supabase
        .from("member_performance_details")
        .insert(detailsToInsert);

      if (detailsError) {
        console.error("Performance details insert error:", detailsError);
        return NextResponse.json(
          { error: "실적 상세 저장에 실패했습니다" },
          { status: 500 }
        );
      }
    }

    // 저장된 실적 조회하여 반환
    const { data: savedPerformance, error: fetchError } = await supabase
      .from("member_monthly_performance")
      .select(`
        *,
        member:members(id, name),
        details:member_performance_details(
          *,
          product:insurance_products(id, name, company, insurer_commission_rate, adjustment_rate)
        )
      `)
      .eq("id", performanceId)
      .single();

    if (fetchError) {
      console.error("Saved performance fetch error:", fetchError);
    }

    return NextResponse.json(
      { success: true, data: savedPerformance },
      { status: existingPerformance ? 200 : 201 }
    );
  } catch (error) {
    console.error("Member performance POST error:", error);
    return NextResponse.json(
      { error: "서버 오류가 발생했습니다" },
      { status: 500 }
    );
  }
}
