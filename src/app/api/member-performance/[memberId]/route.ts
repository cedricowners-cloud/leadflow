import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { isAdminRole, MemberRole } from "@/lib/constants/roles";

interface RouteParams {
  params: Promise<{ memberId: string }>;
}

// GET: 특정 멤버의 실적 조회
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { memberId } = await params;
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
    const year = searchParams.get("year");
    const month = searchParams.get("month");

    // 멤버 존재 확인
    const { data: member } = await supabase
      .from("members")
      .select("id, name, team:teams(id, name)")
      .eq("id", memberId)
      .single();

    if (!member) {
      return NextResponse.json(
        { error: "멤버를 찾을 수 없습니다" },
        { status: 404 }
      );
    }

    // 실적 조회 쿼리
    let query = supabase
      .from("member_monthly_performance")
      .select(`
        *,
        details:member_performance_details(
          *,
          product:insurance_products(id, name, company, commission_rate)
        )
      `)
      .eq("member_id", memberId)
      .order("year", { ascending: false })
      .order("month", { ascending: false });

    // 특정 년월 필터
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
        { error: "실적을 불러오는데 실패했습니다" },
        { status: 500 }
      );
    }

    // 총 합계 계산
    const summary = {
      totalMonthlyPayment: performances?.reduce(
        (sum, p) => sum + Number(p.total_monthly_payment || 0),
        0
      ) || 0,
      totalCommission: performances?.reduce(
        (sum, p) => sum + Number(p.total_commission || 0),
        0
      ) || 0,
      totalContracts: performances?.reduce(
        (sum, p) => sum + (p.contract_count || 0),
        0
      ) || 0,
    };

    return NextResponse.json({
      success: true,
      data: {
        member,
        performances,
        summary,
      },
    });
  } catch (error) {
    console.error("Member performance GET error:", error);
    return NextResponse.json(
      { error: "서버 오류가 발생했습니다" },
      { status: 500 }
    );
  }
}

// DELETE: 특정 멤버의 특정 월 실적 삭제
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const { memberId } = await params;
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

    // 쿼리 파라미터에서 year, month 가져오기
    const { searchParams } = new URL(request.url);
    const year = searchParams.get("year");
    const month = searchParams.get("month");

    if (!year || !month) {
      return NextResponse.json(
        { error: "년도와 월을 지정해주세요" },
        { status: 400 }
      );
    }

    // 실적 존재 확인
    const { data: performance } = await supabase
      .from("member_monthly_performance")
      .select("id")
      .eq("member_id", memberId)
      .eq("year", parseInt(year))
      .eq("month", parseInt(month))
      .single();

    if (!performance) {
      return NextResponse.json(
        { error: "해당 월 실적을 찾을 수 없습니다" },
        { status: 404 }
      );
    }

    // 상세 실적 먼저 삭제 (CASCADE로 자동 삭제되지만 명시적으로)
    await supabase
      .from("member_performance_details")
      .delete()
      .eq("performance_id", performance.id);

    // 월별 실적 삭제
    const { error: deleteError } = await supabase
      .from("member_monthly_performance")
      .delete()
      .eq("id", performance.id);

    if (deleteError) {
      console.error("Performance delete error:", deleteError);
      return NextResponse.json(
        { error: "실적 삭제에 실패했습니다" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: `${year}년 ${month}월 실적이 삭제되었습니다`,
    });
  } catch (error) {
    console.error("Member performance DELETE error:", error);
    return NextResponse.json(
      { error: "서버 오류가 발생했습니다" },
      { status: 500 }
    );
  }
}
