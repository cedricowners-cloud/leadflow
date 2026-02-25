import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import * as XLSX from "xlsx";
import { z } from "zod";

interface ColumnSetting {
  column_key: string;
  column_label: string;
  is_visible: boolean;
  display_order: number;
}

const querySchema = z.object({
  ids: z.string().optional(), // 쉼표 구분 UUID 목록 (선택 내보내기)
  search: z.string().optional(),
  gradeId: z.string().uuid().optional(),
  teamId: z.string().uuid().optional(),
  memberId: z.string().uuid().optional(),
  contactStatusId: z.string().uuid().optional(),
  meetingStatusId: z.string().uuid().optional(),
  contractStatusId: z.string().uuid().optional(),
  assignedStatus: z.enum(["all", "assigned", "unassigned"]).default("all"),
  leadType: z.enum(["all", "sales", "recruit"]).default("sales"),
  dateFilterType: z.enum(["source_date", "created_at"]).default("source_date"),
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
      ids: searchParams.get("ids") || undefined,
      search: searchParams.get("search") || undefined,
      gradeId: searchParams.get("gradeId") || undefined,
      teamId: searchParams.get("teamId") || undefined,
      memberId: searchParams.get("memberId") || undefined,
      contactStatusId: searchParams.get("contactStatusId") || undefined,
      meetingStatusId: searchParams.get("meetingStatusId") || undefined,
      contractStatusId: searchParams.get("contractStatusId") || undefined,
      assignedStatus: searchParams.get("assignedStatus") || "all",
      leadType: searchParams.get("leadType") || "sales",
      dateFilterType: searchParams.get("dateFilterType") || "source_date",
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

    // 컬럼 설정 조회
    const { data: columnSettings } = await supabase
      .from("lead_column_settings")
      .select("column_key, column_label, is_visible, display_order")
      .eq("is_visible", true)
      .order("display_order");

    const visibleColumns: ColumnSetting[] =
      columnSettings && columnSettings.length > 0
        ? columnSettings
        : DEFAULT_COLUMNS;

    // 선택된 ID 파싱
    const selectedIds = params.ids
      ? params.ids.split(",").filter((id) => id.trim())
      : [];

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

    // 선택 내보내기: ID 목록이 있으면 해당 리드만 조회
    if (selectedIds.length > 0) {
      query = query.in("id", selectedIds);
    }

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
          return createEmptyExcel(params.leadType, visibleColumns);
        }
      }
    }

    // 필터 적용 (선택 내보내기가 아닌 경우에만)
    if (selectedIds.length === 0) {
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
      const dateColumn = params.dateFilterType === "created_at" ? "created_at" : "source_date";
      if (params.startDate) {
        const kstStart = `${params.startDate}T00:00:00+09:00`;
        query = query.gte(dateColumn, kstStart);
      }
      if (params.endDate) {
        const kstEnd = `${params.endDate}T23:59:59+09:00`;
        query = query.lte(dateColumn, kstEnd);
      }
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

    // 동적 컬럼 기반 엑셀 행 생성
    const rows = (leads || []).map((lead: Record<string, unknown>) => {
      const row: Record<string, string> = {};
      for (const col of visibleColumns) {
        row[col.column_label] = getExportCellValue(lead, col.column_key);
      }
      return row;
    });

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(rows);

    // 컬럼 너비 동적 설정
    ws["!cols"] = visibleColumns.map((col) => ({
      wch: getColumnWidth(col.column_key),
    }));

    const isRecruit = params.leadType === "recruit";
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

// column_key에 따라 리드 데이터에서 텍스트 값 추출
function getExportCellValue(lead: Record<string, unknown>, columnKey: string): string {
  const extra = (lead.extra_fields || {}) as Record<string, unknown>;
  const grade = lead.grade as { name?: string } | null;
  const assignedMember = lead.assigned_member as {
    name?: string;
    team?: { name?: string };
  } | null;
  const contactStatus = lead.contact_status as { name?: string } | null;
  const meetingStatus = lead.meeting_status as { name?: string } | null;
  const contractStatus = lead.contract_status as { name?: string } | null;

  switch (columnKey) {
    case "grade":
      return grade?.name || "";

    case "company_name":
      return (lead.company_name as string) || "";

    case "representative_name":
      return (lead.representative_name as string) || "";

    case "phone":
      return (lead.phone as string) || "";

    case "industry":
      return (lead.industry as string) || "";

    case "region":
      return (lead.region as string) || "";

    case "business_type":
      return (lead.business_type as string) || "";

    case "tax_delinquency":
      return lead.tax_delinquency === true
        ? "체납"
        : lead.tax_delinquency === false
          ? "정상"
          : "";

    case "available_time":
      return (lead.available_time as string) || (extra["연락_가능_시간"] as string) || "";

    case "campaign_name":
      return (lead.campaign_name as string) || "";

    case "ad_set_name":
      return (lead.ad_set_name as string) || "";

    case "ad_name":
      return (lead.ad_name as string) || "";

    case "form_name":
      return (lead.form_name as string) || "";

    case "platform":
      return (lead.platform as string) || "";

    case "is_organic":
      return lead.is_organic === true ? "Y" : lead.is_organic === false ? "N" : "";

    case "annual_revenue":
      return formatRevenue(lead);

    case "employee_count":
      return formatEmployeeCount(lead);

    case "assigned_member":
      if (!assignedMember?.name) return "";
      return assignedMember.team?.name
        ? `${assignedMember.name} (${assignedMember.team.name})`
        : assignedMember.name;

    case "contact_status":
      return contactStatus?.name || "";

    case "meeting_status":
      return meetingStatus?.name || "";

    case "contract_status":
      return contractStatus?.name || "";

    case "source_date":
      return formatDate(lead.source_date as string);

    case "created_at":
      return formatDate(lead.created_at as string);

    default:
      // extra_fields에서 찾기 (동적 필드)
      if (extra[columnKey] != null) {
        return String(extra[columnKey]);
      }
      // 직접 필드에서 찾기
      if (lead[columnKey] != null) {
        return String(lead[columnKey]);
      }
      return "";
  }
}

// column_key별 추천 너비
function getColumnWidth(columnKey: string): number {
  const widthMap: Record<string, number> = {
    grade: 8,
    company_name: 20,
    representative_name: 12,
    phone: 15,
    industry: 12,
    region: 12,
    business_type: 12,
    tax_delinquency: 10,
    available_time: 15,
    campaign_name: 20,
    ad_set_name: 18,
    ad_name: 18,
    form_name: 18,
    platform: 10,
    is_organic: 8,
    annual_revenue: 15,
    employee_count: 12,
    assigned_member: 18,
    contact_status: 12,
    meeting_status: 12,
    contract_status: 12,
    source_date: 18,
    created_at: 18,
  };
  return widthMap[columnKey] || 15;
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

// DB에서 컬럼 설정을 불러오지 못했을 때 사용하는 기본 컬럼
const DEFAULT_COLUMNS: ColumnSetting[] = [
  { column_key: "grade", column_label: "등급", is_visible: true, display_order: 1 },
  { column_key: "company_name", column_label: "업체명", is_visible: true, display_order: 2 },
  { column_key: "representative_name", column_label: "대표자", is_visible: true, display_order: 3 },
  { column_key: "phone", column_label: "연락처", is_visible: true, display_order: 4 },
  { column_key: "industry", column_label: "업종", is_visible: true, display_order: 5 },
  { column_key: "annual_revenue", column_label: "연매출", is_visible: true, display_order: 6 },
  { column_key: "assigned_member", column_label: "담당자", is_visible: true, display_order: 7 },
  { column_key: "contact_status", column_label: "컨택상태", is_visible: true, display_order: 8 },
  { column_key: "meeting_status", column_label: "미팅상태", is_visible: true, display_order: 9 },
  { column_key: "contract_status", column_label: "계약상태", is_visible: true, display_order: 10 },
  { column_key: "source_date", column_label: "신청일시", is_visible: true, display_order: 11 },
  { column_key: "created_at", column_label: "등록일", is_visible: true, display_order: 12 },
];

function createEmptyExcel(leadType: string, columns: ColumnSetting[]) {
  const wb = XLSX.utils.book_new();
  // 헤더만 있는 빈 시트 생성
  const headers = columns.map((col) => col.column_label);
  const ws = XLSX.utils.aoa_to_sheet([headers]);
  ws["!cols"] = columns.map((col) => ({ wch: getColumnWidth(col.column_key) }));

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
