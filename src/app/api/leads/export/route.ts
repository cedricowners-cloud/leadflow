import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import * as XLSX from "xlsx";
import { z } from "zod";

const querySchema = z.object({
  search: z.string().optional(),
  gradeId: z.string().uuid().optional(),
  teamId: z.string().uuid().optional(),
  memberId: z.string().uuid().optional(),
  contactStatusId: z.string().uuid().optional(),
  meetingStatusId: z.string().uuid().optional(),
  contractStatusId: z.string().uuid().optional(),
  assignedStatus: z.enum(["all", "assigned", "unassigned"]).default("all"),
  leadType: z.enum(["all", "sales", "recruit"]).default("sales"),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  sortBy: z.string().default("source_date"),
  sortOrder: z.enum(["asc", "desc"]).default("desc"),
});

// GET /api/leads/export - 리드 엑셀 내보내기
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: member } = await supabase
      .from("members")
      .select("id, role, team_id")
      .eq("user_id", user.id)
      .single();

    if (!member) {
      return NextResponse.json(
        { error: "멤버 정보를 찾을 수 없습니다" },
        { status: 403 }
      );
    }

    // 쿼리 파라미터 파싱
    const searchParams = request.nextUrl.searchParams;
    const result = querySchema.safeParse({
      search: searchParams.get("search") || undefined,
      gradeId: searchParams.get("gradeId") || undefined,
      teamId: searchParams.get("teamId") || undefined,
      memberId: searchParams.get("memberId") || undefined,
      contactStatusId: searchParams.get("contactStatusId") || undefined,
      meetingStatusId: searchParams.get("meetingStatusId") || undefined,
      contractStatusId: searchParams.get("contractStatusId") || undefined,
      assignedStatus: searchParams.get("assignedStatus") || "all",
      leadType: searchParams.get("leadType") || "sales",
      startDate: searchParams.get("startDate") || undefined,
      endDate: searchParams.get("endDate") || undefined,
      sortBy: searchParams.get("sortBy") || "source_date",
      sortOrder: searchParams.get("sortOrder") || "desc",
    });

    if (!result.success) {
      return NextResponse.json(
        { error: "잘못된 파라미터입니다" },
        { status: 400 }
      );
    }

    const params = result.data;

    // 쿼리 구성 (페이지네이션 없이 전체 조회, 최대 10,000건)
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
      `
    );

    // 역할별 필터링
    if (member.role === "team_leader") {
      query = query.eq("assigned_member_id", member.id);
    } else if (member.role === "sales_manager") {
      const { data: managerTeams } = await supabase
        .from("manager_teams")
        .select("team_id")
        .eq("member_id", member.id);

      if (managerTeams && managerTeams.length > 0) {
        const teamIds = managerTeams.map((mt) => mt.team_id);
        const { data: teamMembers } = await supabase
          .from("members")
          .select("id")
          .in("team_id", teamIds);

        if (teamMembers && teamMembers.length > 0) {
          query = query.in(
            "assigned_member_id",
            teamMembers.map((m) => m.id)
          );
        } else {
          // 빈 결과
          return createEmptyExcel(params.leadType);
        }
      }
    }

    // 필터 적용
    if (params.search) {
      query = query.or(
        `company_name.ilike.%${params.search}%,representative_name.ilike.%${params.search}%,phone.ilike.%${params.search}%`
      );
    }
    if (params.gradeId) query = query.eq("grade_id", params.gradeId);
    if (params.teamId && member.role === "system_admin") {
      const { data: teamMembers } = await supabase
        .from("members")
        .select("id")
        .eq("team_id", params.teamId);
      if (teamMembers && teamMembers.length > 0) {
        query = query.in(
          "assigned_member_id",
          teamMembers.map((m) => m.id)
        );
      }
    }
    if (params.memberId) query = query.eq("assigned_member_id", params.memberId);
    if (params.contactStatusId)
      query = query.eq("contact_status_id", params.contactStatusId);
    if (params.meetingStatusId)
      query = query.eq("meeting_status_id", params.meetingStatusId);
    if (params.contractStatusId)
      query = query.eq("contract_status_id", params.contractStatusId);
    if (params.assignedStatus === "assigned")
      query = query.not("assigned_member_id", "is", null);
    else if (params.assignedStatus === "unassigned")
      query = query.is("assigned_member_id", null);
    if (params.leadType !== "all") query = query.eq("lead_type", params.leadType);
    if (params.startDate) query = query.gte("created_at", params.startDate);
    if (params.endDate) query = query.lte("created_at", params.endDate);

    // 정렬
    const validSortColumns = [
      "created_at",
      "updated_at",
      "company_name",
      "representative_name",
      "source_date",
      "assigned_at",
    ];
    const sortColumn = validSortColumns.includes(params.sortBy)
      ? params.sortBy
      : "source_date";
    query = query.order(sortColumn, {
      ascending: params.sortOrder === "asc",
      nullsFirst: false,
    });
    if (sortColumn === "source_date") {
      query = query.order("created_at", {
        ascending: params.sortOrder === "asc",
      });
    }

    // 최대 10,000건 제한
    query = query.limit(10000);

    const { data: leads, error } = await query;

    if (error) {
      console.error("Export query error:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // 엑셀 생성
    const isRecruit = params.leadType === "recruit";
    const rows = (leads || []).map((lead: Record<string, unknown>) =>
      isRecruit ? toRecruitRow(lead) : toSalesRow(lead)
    );

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(rows);

    // 컬럼 너비 설정
    const colWidths = isRecruit
      ? [
          { wch: 10 }, // 이름
          { wch: 15 }, // 연락처
          { wch: 25 }, // 이메일
          { wch: 12 }, // 거주지역
          { wch: 15 }, // 보험 영업 경력
          { wch: 15 }, // 법인 영업 경력
          { wch: 15 }, // 보유 자격
          { wch: 15 }, // 연락 가능 시간
          { wch: 20 }, // 캠페인
          { wch: 12 }, // 담당자
          { wch: 12 }, // 소속 팀
          { wch: 18 }, // 등록일
        ]
      : [
          { wch: 8 },  // 등급
          { wch: 20 }, // 업체명
          { wch: 10 }, // 대표자
          { wch: 15 }, // 연락처
          { wch: 12 }, // 업종
          { wch: 15 }, // 연매출
          { wch: 10 }, // 종업원수
          { wch: 12 }, // 사업자유형
          { wch: 10 }, // 세금체납
          { wch: 15 }, // 연락가능시간
          { wch: 20 }, // 캠페인
          { wch: 12 }, // 담당자
          { wch: 12 }, // 소속 팀
          { wch: 10 }, // 컨택 상태
          { wch: 10 }, // 미팅 상태
          { wch: 10 }, // 계약 상태
          { wch: 18 }, // 등록일
        ];
    ws["!cols"] = colWidths;

    const sheetName = isRecruit ? "채용 리드" : "영업 리드";
    XLSX.utils.book_append_sheet(wb, ws, sheetName);

    const buf = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });

    const today = new Date().toISOString().split("T")[0];
    const fileName = `LeadFlow_${isRecruit ? "채용" : "영업"}_리드_${today}.xlsx`;

    return new NextResponse(buf, {
      headers: {
        "Content-Type":
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename*=UTF-8''${encodeURIComponent(fileName)}`,
      },
    });
  } catch (error) {
    console.error("Export error:", error);
    return NextResponse.json(
      { error: "엑셀 내보내기에 실패했습니다" },
      { status: 500 }
    );
  }
}

// 영업 리드 행 변환
function toSalesRow(lead: Record<string, unknown>) {
  const extra = (lead.extra_fields || {}) as Record<string, unknown>;
  const grade = lead.grade as { name?: string } | null;
  const assignedMember = lead.assigned_member as {
    name?: string;
    team?: { name?: string };
  } | null;
  const contactStatus = lead.contact_status as { name?: string } | null;
  const meetingStatus = lead.meeting_status as { name?: string } | null;
  const contractStatus = lead.contract_status as { name?: string } | null;

  return {
    등급: grade?.name || "",
    업체명: (lead.company_name as string) || "",
    대표자: (lead.representative_name as string) || "",
    연락처: (lead.phone as string) || "",
    업종: (lead.industry as string) || "",
    연매출: formatRevenue(lead),
    종업원수: formatEmployeeCount(lead),
    사업자유형: (lead.business_type as string) || "",
    세금체납: lead.tax_delinquency === true ? "있음" : lead.tax_delinquency === false ? "없음" : "",
    연락가능시간: (lead.available_time as string) || (extra["연락_가능_시간"] as string) || "",
    캠페인: (lead.campaign_name as string) || "",
    담당자: assignedMember?.name || "",
    소속팀: assignedMember?.team?.name || "",
    "컨택 상태": contactStatus?.name || "",
    "미팅 상태": meetingStatus?.name || "",
    "계약 상태": contractStatus?.name || "",
    등록일: formatDate(lead.created_at as string),
  };
}

// 채용 리드 행 변환
function toRecruitRow(lead: Record<string, unknown>) {
  const extra = (lead.extra_fields || {}) as Record<string, unknown>;
  const assignedMember = lead.assigned_member as {
    name?: string;
    team?: { name?: string };
  } | null;

  return {
    이름:
      (extra["full_name"] as string) ||
      (lead.representative_name as string) ||
      "",
    연락처: (lead.phone as string) || "",
    이메일: (extra["email"] as string) || "",
    거주지역: (extra["지원자_거주_지역"] as string) || "",
    "보험 영업 경력": (extra["보험_영업_경력"] as string) || "",
    "법인 영업 경력": (extra["법인_영업_경력"] as string) || "",
    "보유 자격": (extra["보유_자격"] as string) || "",
    "연락 가능 시간":
      (extra["연락_가능_시간"] as string) ||
      (lead.available_time as string) ||
      "",
    캠페인: (lead.campaign_name as string) || "",
    담당자: assignedMember?.name || "",
    소속팀: assignedMember?.team?.name || "",
    등록일: formatDate(lead.created_at as string),
  };
}

function formatRevenue(lead: Record<string, unknown>): string {
  const min = lead.annual_revenue_min as number | null;
  const max = lead.annual_revenue_max as number | null;
  const value = lead.annual_revenue as number | null;

  if (min != null && max != null) return `${min}~${max}억`;
  if (min != null) return `${min}억 이상`;
  if (max != null) return `${max}억 이하`;
  if (value != null) return `${value}억`;
  return "";
}

function formatEmployeeCount(lead: Record<string, unknown>): string {
  const min = lead.employee_count_min as number | null;
  const max = lead.employee_count_max as number | null;
  const value = lead.employee_count as number | null;

  if (min != null && max != null) return `${min}~${max}명`;
  if (min != null) return `${min}명 이상`;
  if (max != null) return `${max}명 이하`;
  if (value != null) return `${value}명`;
  return "";
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return "";
  const d = new Date(dateStr);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")} ${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

function createEmptyExcel(leadType: string) {
  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.json_to_sheet([]);
  const sheetName = leadType === "recruit" ? "채용 리드" : "영업 리드";
  XLSX.utils.book_append_sheet(wb, ws, sheetName);
  const buf = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });
  const today = new Date().toISOString().split("T")[0];
  const fileName = `LeadFlow_${leadType === "recruit" ? "채용" : "영업"}_리드_${today}.xlsx`;

  return new NextResponse(buf, {
    headers: {
      "Content-Type":
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename*=UTF-8''${encodeURIComponent(fileName)}`,
    },
  });
}
