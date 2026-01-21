import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { z } from "zod";
import { isAdminRole, MemberRole } from "@/lib/constants/roles";

// 멤버 생성 스키마
const createMemberSchema = z.object({
  name: z.string().min(1, "이름을 입력해주세요").max(100),
  email: z.string().email("올바른 이메일 형식을 입력해주세요"),
  phone: z.string().max(20).optional(),
  role: z.enum(["system_admin", "branch_manager", "sales_manager", "team_leader"], {
    message: "올바른 역할을 선택해주세요",
  }),
  team_id: z.string().uuid().optional().nullable(),
  password: z.string().min(4, "비밀번호는 4자 이상이어야 합니다"),
});

// GET /api/members - 멤버 목록 조회
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();

    // 인증 확인
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // 쿼리 파라미터
    const searchParams = request.nextUrl.searchParams;
    const role = searchParams.get("role");
    const teamId = searchParams.get("team_id");
    const isActive = searchParams.get("is_active");
    const includeMonthlyCount = searchParams.get("include_monthly_count") === "true";

    // 멤버 목록 조회 (팀 정보 포함)
    let query = supabase
      .from("members")
      .select(
        `
        *,
        team:teams(id, name)
      `
      )
      .order("created_at", { ascending: true });

    // 필터 적용
    if (role) {
      query = query.eq("role", role);
    }

    if (teamId) {
      query = query.eq("team_id", teamId);
    }

    if (isActive !== null) {
      query = query.eq("is_active", isActive === "true");
    } else {
      // 기본적으로 활성 멤버만 조회
      query = query.eq("is_active", true);
    }

    const { data: members, error } = await query;

    if (error) {
      console.error("Members fetch error:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // 이번 달 배분 수 조회 (옵션)
    if (includeMonthlyCount && members && members.length > 0) {
      // 이번 달의 시작일과 종료일 계산
      const now = new Date();
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);

      // 팀장 ID 목록
      const memberIds = members.map((m) => m.id);

      // 이번 달에 배분된 리드 수 조회 (assigned_at 기준)
      const { data: leadCounts, error: countError } = await supabase
        .from("leads")
        .select("assigned_member_id")
        .in("assigned_member_id", memberIds)
        .gte("assigned_at", startOfMonth.toISOString())
        .lte("assigned_at", endOfMonth.toISOString());

      if (countError) {
        console.error("Lead count fetch error:", countError);
      } else {
        // 멤버별 배분 수 집계
        const countMap: Record<string, number> = {};
        leadCounts?.forEach((lead) => {
          if (lead.assigned_member_id) {
            countMap[lead.assigned_member_id] = (countMap[lead.assigned_member_id] || 0) + 1;
          }
        });

        // 멤버 데이터에 배분 수 추가
        members.forEach((member) => {
          (member as typeof member & { monthly_lead_count: number }).monthly_lead_count = countMap[member.id] || 0;
        });
      }
    }

    return NextResponse.json({ data: members });
  } catch (error) {
    console.error("Members API error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// POST /api/members - 멤버 생성
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();

    // 인증 확인
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // 권한 확인 (시스템 관리자만)
    const { data: currentMember } = await supabase
      .from("members")
      .select("role")
      .eq("user_id", user.id)
      .single();

    if (!currentMember || !isAdminRole(currentMember.role as MemberRole)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // 요청 데이터 파싱 및 검증
    const body = await request.json();
    const result = createMemberSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json(
        { error: result.error.issues[0].message },
        { status: 400 }
      );
    }

    const { name, email, phone, role, team_id, password } = result.data;

    // 이메일 중복 체크
    const { data: existingMember } = await supabase
      .from("members")
      .select("id")
      .eq("email", email)
      .single();

    if (existingMember) {
      return NextResponse.json(
        { error: "이미 존재하는 이메일입니다" },
        { status: 400 }
      );
    }

    // team_leader는 반드시 팀에 소속되어야 함
    if (role === "team_leader" && !team_id) {
      return NextResponse.json(
        { error: "팀장은 소속 팀을 지정해야 합니다" },
        { status: 400 }
      );
    }

    // Admin 클라이언트 생성 (service_role key 필요)
    const adminClient = createAdminClient();

    // Supabase Auth 사용자 생성 (admin 클라이언트 사용)
    const { data: authData, error: authError } =
      await adminClient.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
      });

    if (authError) {
      console.error("Auth user create error:", authError);
      return NextResponse.json(
        { error: "사용자 계정 생성에 실패했습니다: " + authError.message },
        { status: 500 }
      );
    }

    // 멤버 정보 저장 (admin 클라이언트로 RLS 우회)
    const { data: member, error: memberError } = await adminClient
      .from("members")
      .insert({
        user_id: authData.user.id,
        name,
        email,
        phone,
        role,
        team_id: team_id || null,
        must_change_password: true, // 최초 로그인 시 비밀번호 변경 필요
      })
      .select(
        `
        *,
        team:teams(id, name)
      `
      )
      .single();

    if (memberError) {
      // 멤버 생성 실패 시 Auth 사용자 삭제
      await adminClient.auth.admin.deleteUser(authData.user.id);
      console.error("Member create error:", memberError);
      return NextResponse.json({ error: memberError.message }, { status: 500 });
    }

    // 영업 관리자(sales_manager)인 경우 manager_teams 테이블에도 추가
    if (role === "sales_manager" && team_id) {
      const { error: managerTeamError } = await adminClient
        .from("manager_teams")
        .insert({
          member_id: member.id,
          team_id: team_id,
        });

      if (managerTeamError) {
        console.error("Manager teams insert error:", managerTeamError);
        // manager_teams 추가 실패 시에도 멤버 생성은 성공으로 처리
        // 추후 수정을 통해 팀 할당 가능
      }
    }

    return NextResponse.json({ data: member }, { status: 201 });
  } catch (error) {
    console.error("Members API error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
