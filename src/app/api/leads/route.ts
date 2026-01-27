import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { z } from "zod";

// 쿼리 파라미터 스키마
const querySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(50),
  search: z.string().optional(),
  gradeId: z.string().uuid().optional(),
  teamId: z.string().uuid().optional(),
  memberId: z.string().uuid().optional(),
  contactStatusId: z.string().uuid().optional(),
  meetingStatusId: z.string().uuid().optional(),
  contractStatusId: z.string().uuid().optional(),
  assignedStatus: z.enum(["all", "assigned", "unassigned"]).default("all"),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  sortBy: z.string().default("source_date"),
  sortOrder: z.enum(["asc", "desc"]).default("desc"),
});

// GET /api/leads - 리드 목록 조회
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

    // 현재 멤버 정보 조회
    const { data: member, error: memberError } = await supabase
      .from("members")
      .select("id, role, team_id")
      .eq("user_id", user.id)
      .single();

    if (memberError || !member) {
      return NextResponse.json(
        { error: "멤버 정보를 찾을 수 없습니다" },
        { status: 403 }
      );
    }

    // 쿼리 파라미터 파싱
    const searchParams = request.nextUrl.searchParams;
    const queryParams = {
      page: searchParams.get("page") || "1",
      limit: searchParams.get("limit") || "50",
      search: searchParams.get("search") || undefined,
      gradeId: searchParams.get("gradeId") || undefined,
      teamId: searchParams.get("teamId") || undefined,
      memberId: searchParams.get("memberId") || undefined,
      contactStatusId: searchParams.get("contactStatusId") || undefined,
      meetingStatusId: searchParams.get("meetingStatusId") || undefined,
      contractStatusId: searchParams.get("contractStatusId") || undefined,
      assignedStatus: searchParams.get("assignedStatus") || "all",
      startDate: searchParams.get("startDate") || undefined,
      endDate: searchParams.get("endDate") || undefined,
      sortBy: searchParams.get("sortBy") || "source_date",
      sortOrder: searchParams.get("sortOrder") || "desc",
    };

    const result = querySchema.safeParse(queryParams);
    if (!result.success) {
      return NextResponse.json(
        { error: "잘못된 쿼리 파라미터입니다", details: result.error.issues },
        { status: 400 }
      );
    }

    const {
      page,
      limit,
      search,
      gradeId,
      teamId,
      memberId,
      contactStatusId,
      meetingStatusId,
      contractStatusId,
      assignedStatus,
      startDate,
      endDate,
      sortBy,
      sortOrder,
    } = result.data;

    // 기본 쿼리 구성
    let query = supabase.from("leads").select(
      `
        *,
        grade:lead_grades(id, name, color),
        assigned_member:members!leads_assigned_member_id_fkey(
          id, name, email,
          team:teams(id, name)
        ),
        contact_status:lead_statuses!leads_contact_status_id_fkey(id, name),
        meeting_status:lead_statuses!leads_meeting_status_id_fkey(id, name),
        contract_status:lead_statuses!leads_contract_status_id_fkey(id, name)
      `,
      { count: "exact" }
    );

    // 역할별 필터링
    if (member.role === "team_leader") {
      // 팀장: 본인에게 배분된 리드만 조회
      query = query.eq("assigned_member_id", member.id);
    } else if (member.role === "sales_manager") {
      // 영업 관리자: 담당 팀의 리드만 조회
      const { data: managerTeams } = await supabase
        .from("manager_teams")
        .select("team_id")
        .eq("member_id", member.id);

      if (managerTeams && managerTeams.length > 0) {
        const teamIds = managerTeams.map((mt) => mt.team_id);

        // 담당 팀 멤버의 리드만 조회
        const { data: teamMembers } = await supabase
          .from("members")
          .select("id")
          .in("team_id", teamIds);

        if (teamMembers && teamMembers.length > 0) {
          const memberIds = teamMembers.map((m) => m.id);
          query = query.in("assigned_member_id", memberIds);
        } else {
          // 담당 팀에 멤버가 없으면 빈 결과 반환
          return NextResponse.json({
            data: {
              leads: [],
              pagination: {
                page,
                limit,
                totalCount: 0,
                totalPages: 0,
              },
            },
          });
        }
      }
    }
    // system_admin은 모든 리드 조회 가능

    // 검색 필터
    if (search) {
      query = query.or(
        `company_name.ilike.%${search}%,representative_name.ilike.%${search}%,phone.ilike.%${search}%`
      );
    }

    // 등급 필터
    if (gradeId) {
      query = query.eq("grade_id", gradeId);
    }

    // 팀 필터 (시스템 관리자용)
    if (teamId && member.role === "system_admin") {
      const { data: teamMembers } = await supabase
        .from("members")
        .select("id")
        .eq("team_id", teamId);

      if (teamMembers && teamMembers.length > 0) {
        const memberIds = teamMembers.map((m) => m.id);
        query = query.in("assigned_member_id", memberIds);
      }
    }

    // 담당자 필터
    if (memberId) {
      query = query.eq("assigned_member_id", memberId);
    }

    // 상태 필터
    if (contactStatusId) {
      query = query.eq("contact_status_id", contactStatusId);
    }
    if (meetingStatusId) {
      query = query.eq("meeting_status_id", meetingStatusId);
    }
    if (contractStatusId) {
      query = query.eq("contract_status_id", contractStatusId);
    }

    // 배분 상태 필터
    if (assignedStatus === "assigned") {
      query = query.not("assigned_member_id", "is", null);
    } else if (assignedStatus === "unassigned") {
      query = query.is("assigned_member_id", null);
    }

    // 날짜 필터
    if (startDate) {
      query = query.gte("created_at", startDate);
    }
    if (endDate) {
      query = query.lte("created_at", endDate);
    }

    // 정렬
    const validSortColumns = [
      "created_at",
      "updated_at",
      "company_name",
      "representative_name",
      "source_date",
      "assigned_at",
    ];
    const sortColumn = validSortColumns.includes(sortBy) ? sortBy : "source_date";
    query = query.order(sortColumn, {
      ascending: sortOrder === "asc",
      nullsFirst: false,
    });
    // source_date 정렬 시 null 대비 보조 정렬
    if (sortColumn === "source_date") {
      query = query.order("created_at", {
        ascending: sortOrder === "asc",
      });
    }

    // 페이지네이션
    const from = (page - 1) * limit;
    const to = from + limit - 1;
    query = query.range(from, to);

    // 쿼리 실행
    const { data: leads, count, error } = await query;

    if (error) {
      console.error("Leads fetch error:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const totalCount = count || 0;
    const totalPages = Math.ceil(totalCount / limit);

    return NextResponse.json({
      data: {
        leads: leads || [],
        pagination: {
          page,
          limit,
          totalCount,
          totalPages,
        },
      },
    });
  } catch (error) {
    console.error("Leads API error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
