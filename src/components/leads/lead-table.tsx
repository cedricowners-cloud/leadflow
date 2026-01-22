"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  SelectGroup,
  SelectLabel,
} from "@/components/ui/select";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Phone, Building2, User, Calendar, Check, X, Clock, Building, AlertTriangle, CircleDashed } from "lucide-react";
import { toast } from "sonner";

export interface Lead {
  id: string;
  company_name: string | null;
  representative_name: string | null;
  phone: string;
  industry: string | null;
  annual_revenue: number | null;
  annual_revenue_min: number | null;
  annual_revenue_max: number | null;
  employee_count: number | null;
  employee_count_min: number | null;
  employee_count_max: number | null;
  region: string | null;
  available_time: string | null;
  business_type: string | null;
  tax_delinquency: boolean | null;
  grade_id: string | null;
  grade_source: string | null;
  assigned_member_id: string | null;
  assigned_at: string | null;
  contact_status_id: string | null;
  meeting_status_id: string | null;
  contract_status_id: string | null;
  source_date: string | null;
  created_at: string;
  // 광고 관련 필드
  campaign_name: string | null;
  ad_set_name: string | null;
  ad_name: string | null;
  form_name: string | null;
  platform: string | null;
  is_organic: boolean | null;
  grade: {
    id: string;
    name: string;
    color: string | null;
  } | null;
  assigned_member: {
    id: string;
    name: string;
    email: string;
    team: { id: string; name: string } | null;
  } | null;
  contact_status: { id: string; name: string } | null;
  meeting_status: { id: string; name: string } | null;
  contract_status: { id: string; name: string } | null;
}

interface Member {
  id: string;
  name: string;
  team: { id: string; name: string } | null;
  monthly_lead_count?: number;
}

// 자격 정보가 포함된 멤버 타입
interface EligibleMember {
  member: {
    id: string;
    name: string;
    email: string;
    phone: string;
    team: { id: string; name: string } | null;
  };
  qualification: {
    level: string;
    newbieTestPassed: boolean;
  };
  performance: {
    year: number;
    month: number;
    monthlyPayment: number;
    formattedPayment: string;
  };
  eligibility: {
    gradeA: boolean;
    gradeB: boolean;
    gradeC: boolean;
    gradeD: boolean;
  };
  isEligibleForGrade: boolean;
  eligibilityReason: string;
}

interface EligibilityData {
  grade: { id: string; name: string; color: string | null } | null;
  period: { year: number; month: number };
  summary: {
    totalMembers: number;
    eligibleCount: number;
    ineligibleCount: number;
  };
  eligibleMembers: Array<{
    team: { id: string; name: string };
    members: EligibleMember[];
  }>;
  ineligibleMembers: Array<{
    team: { id: string; name: string };
    members: EligibleMember[];
  }>;
  allMembers: EligibleMember[];
}

export interface ColumnSetting {
  id: string;
  column_key: string;
  column_label: string;
  is_visible: boolean;
  display_order: number;
  is_system: boolean;
  column_width: number | null;
}

interface LeadTableProps {
  leads: Lead[];
  loading?: boolean;
  selectedIds: string[];
  onSelectionChange: (ids: string[]) => void;
  onLeadUpdate: () => void;
  columnSettings?: ColumnSetting[];
}

// 기본 컬럼 설정 (API에서 로드되지 않았을 때 사용)
const DEFAULT_COLUMNS: ColumnSetting[] = [
  { id: "1", column_key: "grade", column_label: "등급", is_visible: true, display_order: 1, is_system: true, column_width: null },
  { id: "2", column_key: "company_name", column_label: "업체명", is_visible: true, display_order: 2, is_system: true, column_width: null },
  { id: "3", column_key: "representative_name", column_label: "대표자", is_visible: true, display_order: 3, is_system: true, column_width: null },
  { id: "4", column_key: "phone", column_label: "연락처", is_visible: true, display_order: 4, is_system: true, column_width: null },
  { id: "5", column_key: "industry", column_label: "업종", is_visible: true, display_order: 5, is_system: false, column_width: null },
  { id: "6", column_key: "campaign_name", column_label: "캠페인", is_visible: true, display_order: 6, is_system: false, column_width: null },
  { id: "7", column_key: "annual_revenue", column_label: "연매출", is_visible: true, display_order: 7, is_system: false, column_width: null },
  { id: "8", column_key: "employee_count", column_label: "종업원수", is_visible: true, display_order: 8, is_system: false, column_width: null },
  { id: "9", column_key: "business_type", column_label: "사업자유형", is_visible: false, display_order: 9, is_system: false, column_width: null },
  { id: "10", column_key: "tax_delinquency", column_label: "세금체납", is_visible: false, display_order: 10, is_system: false, column_width: null },
  { id: "11", column_key: "available_time", column_label: "연락가능시간", is_visible: false, display_order: 11, is_system: false, column_width: null },
  { id: "12", column_key: "assigned_member", column_label: "담당자", is_visible: true, display_order: 12, is_system: false, column_width: null },
  { id: "13", column_key: "contact_status", column_label: "컨택", is_visible: true, display_order: 13, is_system: false, column_width: null },
  { id: "14", column_key: "meeting_status", column_label: "미팅", is_visible: true, display_order: 14, is_system: false, column_width: null },
  { id: "15", column_key: "contract_status", column_label: "계약", is_visible: true, display_order: 15, is_system: false, column_width: null },
  { id: "16", column_key: "created_at", column_label: "등록일", is_visible: true, display_order: 16, is_system: false, column_width: null },
];

export function LeadTable({
  leads,
  loading,
  selectedIds,
  onSelectionChange,
  onLeadUpdate,
  columnSettings,
}: LeadTableProps) {
  const [members, setMembers] = useState<Member[]>([]);
  const [assigningLeadId, setAssigningLeadId] = useState<string | null>(null);

  // 리드별 자격 정보 캐시 (등급명 -> 자격 데이터)
  const [eligibilityCache, setEligibilityCache] = useState<Record<string, EligibilityData>>({});
  const [loadingEligibility, setLoadingEligibility] = useState<string | null>(null);

  // 표시할 컬럼 계산
  const visibleColumns = useMemo(() => {
    const cols = columnSettings && columnSettings.length > 0 ? columnSettings : DEFAULT_COLUMNS;
    return cols
      .filter((col) => col.is_visible)
      .sort((a, b) => a.display_order - b.display_order);
  }, [columnSettings]);

  // 팀장 목록 로드 함수 (이번 달 배분 수 포함)
  const fetchMembers = async () => {
    try {
      const response = await fetch("/api/members?role=team_leader&is_active=true&include_monthly_count=true");
      const result = await response.json();

      if (result.data) {
        const transformedData = result.data.map((m: { id: string; name: string; team: { id: string; name: string } | { id: string; name: string }[] | null; monthly_lead_count?: number }) => ({
          id: m.id,
          name: m.name,
          team: Array.isArray(m.team) ? m.team[0] || null : m.team,
          monthly_lead_count: m.monthly_lead_count || 0,
        })) as Member[];
        setMembers(transformedData);
      }
    } catch (error) {
      console.error("팀장 목록 로드 실패:", error);
    }
  };

  // 초기 로드
  useEffect(() => {
    fetchMembers();
  }, []);

  // 전체 선택/해제
  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      onSelectionChange(leads.map((lead) => lead.id));
    } else {
      onSelectionChange([]);
    }
  };

  // 개별 선택
  const handleSelectOne = (leadId: string, checked: boolean) => {
    if (checked) {
      onSelectionChange([...selectedIds, leadId]);
    } else {
      onSelectionChange(selectedIds.filter((id) => id !== leadId));
    }
  };

  // 팀장 배분
  const handleAssign = async (leadId: string, memberId: string | null) => {
    setAssigningLeadId(leadId);

    try {
      const response = await fetch("/api/leads/assign", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          leadId,
          memberId: memberId === "unassign" ? null : memberId,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "배분에 실패했습니다");
      }

      toast.success(
        memberId === "unassign" ? "배분이 해제되었습니다" : "배분되었습니다"
      );
      onLeadUpdate();
      // 멤버 목록 다시 로드하여 배분 수 갱신
      fetchMembers();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "배분에 실패했습니다"
      );
    } finally {
      setAssigningLeadId(null);
    }
  };

  // 팀별 멤버 그룹화 (팀명 정렬)
  const membersByTeamSorted = useMemo(() => {
    // 1. 팀별로 그룹화
    const teamMap: Record<string, Member[]> = {};
    members.forEach((member) => {
      const teamName = member.team?.name || "미배정";
      if (!teamMap[teamName]) teamMap[teamName] = [];
      teamMap[teamName].push(member);
    });

    // 2. 팀명으로 정렬된 배열로 변환
    return Object.entries(teamMap)
      .sort(([teamA], [teamB]) => {
        // "미배정"은 맨 뒤로
        if (teamA === "미배정") return 1;
        if (teamB === "미배정") return -1;
        return teamA.localeCompare(teamB, "ko");
      })
      .map(([teamName, teamMembers]) => ({
        teamName,
        members: teamMembers,
      }));
  }, [members]);

  // 등급별 자격자 목록 로드 함수
  const fetchEligibility = useCallback(async (gradeName: string) => {
    // 이미 캐시에 있으면 스킵
    if (eligibilityCache[gradeName]) return;

    setLoadingEligibility(gradeName);
    try {
      const response = await fetch(`/api/leads/eligible-members?gradeName=${gradeName}`);
      const result = await response.json();
      if (response.ok && result.success) {
        setEligibilityCache(prev => ({ ...prev, [gradeName]: result.data }));
      }
    } catch (error) {
      console.error("Failed to fetch eligibility:", error);
    } finally {
      setLoadingEligibility(null);
    }
  }, [eligibilityCache]);

  // 유틸리티 함수들
  const formatRevenue = (min: number | null, max: number | null): string => {
    if (min === null && max === null) return "-";
    if (min !== null && max !== null) {
      if (min === max) return `${min}억원`;
      return `${min}~${max}억원`;
    }
    if (min !== null) return `${min}억원 이상`;
    if (max !== null) return `${max}억원 미만`;
    return "-";
  };

  const formatEmployeeCount = (min: number | null, max: number | null): string => {
    if (min === null && max === null) return "-";
    if (min !== null && max !== null) {
      if (min === max) return `${min}명`;
      return `${min}~${max}명`;
    }
    if (min !== null) return `${min}명 이상`;
    if (max !== null) return `${max}명 미만`;
    return "-";
  };

  const formatDate = (dateString: string | null): string => {
    if (!dateString) return "-";
    return new Date(dateString).toLocaleDateString("ko-KR");
  };

  const getGradeColor = (color: string | null): string => {
    const colorMap: Record<string, string> = {
      "#22c55e": "bg-green-100 text-green-800 border-green-200",
      "#3b82f6": "bg-blue-100 text-blue-800 border-blue-200",
      "#eab308": "bg-yellow-100 text-yellow-800 border-yellow-200",
      "#6b7280": "bg-gray-100 text-gray-800 border-gray-200",
    };
    return colorMap[color || ""] || "bg-gray-100 text-gray-800 border-gray-200";
  };

  // 컬럼별 셀 렌더링
  const renderCell = (lead: Lead, columnKey: string) => {
    switch (columnKey) {
      case "grade":
        return lead.grade ? (
          <Tooltip>
            <TooltipTrigger>
              <Badge className={getGradeColor(lead.grade.color)} variant="outline">
                {lead.grade.name}
              </Badge>
            </TooltipTrigger>
            <TooltipContent>
              {lead.grade_source === "manual" ? "수동 변경됨" : "자동 분류"}
            </TooltipContent>
          </Tooltip>
        ) : (
          <Badge variant="outline">미분류</Badge>
        );

      case "company_name":
        return (
          <div className="flex items-center gap-2">
            <Building2 className="h-4 w-4 text-muted-foreground shrink-0" />
            <span className="truncate max-w-[150px]">{lead.company_name || "-"}</span>
          </div>
        );

      case "representative_name":
        return (
          <div className="flex items-center gap-2">
            <User className="h-4 w-4 text-muted-foreground shrink-0" />
            <span className="truncate max-w-[100px]">{lead.representative_name || "-"}</span>
          </div>
        );

      case "phone":
        return (
          <div className="flex items-center gap-2">
            <Phone className="h-4 w-4 text-muted-foreground shrink-0" />
            <span>{lead.phone}</span>
          </div>
        );

      case "industry":
        return <span className="truncate max-w-[80px]">{lead.industry || "-"}</span>;

      case "region":
        return <span className="truncate max-w-[80px]">{lead.region || "-"}</span>;

      case "business_type":
        return lead.business_type ? (
          <div className="flex items-center gap-1.5">
            <Building className="h-3.5 w-3.5 text-muted-foreground" />
            <span className="truncate max-w-[80px]">{lead.business_type}</span>
          </div>
        ) : (
          <span className="text-muted-foreground">-</span>
        );

      case "tax_delinquency":
        return lead.tax_delinquency === true ? (
          <Badge variant="destructive" className="text-xs">
            <AlertTriangle className="h-3 w-3 mr-1" />
            체납
          </Badge>
        ) : lead.tax_delinquency === false ? (
          <Badge variant="outline" className="text-xs text-green-600 border-green-300">
            정상
          </Badge>
        ) : (
          <span className="text-muted-foreground">-</span>
        );

      case "available_time":
        return lead.available_time ? (
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="flex items-center gap-1.5 text-blue-600 max-w-[120px]">
                <Clock className="h-3.5 w-3.5 flex-shrink-0" />
                <span className="text-sm truncate">{lead.available_time}</span>
              </div>
            </TooltipTrigger>
            <TooltipContent>
              <span className="text-xs">{lead.available_time}</span>
            </TooltipContent>
          </Tooltip>
        ) : (
          <span className="text-muted-foreground">-</span>
        );

      case "campaign_name":
        return (
          <Tooltip>
            <TooltipTrigger asChild>
              <span className="truncate max-w-[120px] block cursor-default">
                {lead.campaign_name || "-"}
              </span>
            </TooltipTrigger>
            {(lead.campaign_name || lead.ad_set_name || lead.ad_name) && (
              <TooltipContent>
                <div className="text-xs space-y-1">
                  {lead.campaign_name && <div>캠페인: {lead.campaign_name}</div>}
                  {lead.ad_set_name && <div>광고세트: {lead.ad_set_name}</div>}
                  {lead.ad_name && <div>광고: {lead.ad_name}</div>}
                </div>
              </TooltipContent>
            )}
          </Tooltip>
        );

      case "ad_set_name":
        return <span className="truncate max-w-[100px]">{lead.ad_set_name || "-"}</span>;

      case "ad_name":
        return <span className="truncate max-w-[100px]">{lead.ad_name || "-"}</span>;

      case "form_name":
        return <span className="truncate max-w-[100px]">{lead.form_name || "-"}</span>;

      case "platform":
        return <span>{lead.platform || "-"}</span>;

      case "is_organic":
        return lead.is_organic ? (
          <Check className="h-4 w-4 text-green-600" />
        ) : (
          <X className="h-4 w-4 text-muted-foreground" />
        );

      case "annual_revenue":
        return (
          <span className="text-right block">
            {formatRevenue(lead.annual_revenue_min, lead.annual_revenue_max)}
          </span>
        );

      case "employee_count":
        return (
          <span className="text-right block">
            {formatEmployeeCount(lead.employee_count_min, lead.employee_count_max)}
          </span>
        );

      case "assigned_member": {
        const gradeName = lead.grade?.name;
        const eligibilityData = gradeName ? eligibilityCache[gradeName] : null;
        const isLoadingThisGrade = gradeName && loadingEligibility === gradeName;

        return (
          <Select
            value={lead.assigned_member_id || "unassigned"}
            onValueChange={(value) =>
              handleAssign(lead.id, value === "unassigned" ? "unassign" : value)
            }
            disabled={assigningLeadId === lead.id}
            onOpenChange={(open) => {
              // 드롭다운 열릴 때 등급이 있으면 자격 정보 로드
              if (open && gradeName) {
                fetchEligibility(gradeName);
              }
            }}
          >
            <SelectTrigger
              className={`w-[180px] ${
                !lead.assigned_member_id ? "text-muted-foreground border-dashed" : ""
              }`}
            >
              <SelectValue>
                {assigningLeadId === lead.id
                  ? "배분 중..."
                  : lead.assigned_member?.name || "미배분"}
              </SelectValue>
            </SelectTrigger>
            <SelectContent className="max-h-[400px]">
              <SelectItem value="unassigned">
                <span className="text-muted-foreground">미배분</span>
              </SelectItem>

              {/* 등급이 있고 자격 정보가 로드된 경우: 자격자/비자격자로 그룹화 */}
              {gradeName && eligibilityData ? (
                <>
                  {/* 자격자 그룹 */}
                  {eligibilityData.eligibleMembers.length > 0 && (
                    <SelectGroup>
                      <SelectLabel className="flex items-center gap-2 text-green-600 bg-green-50">
                        <Check className="w-3 h-3" />
                        {gradeName}등급 자격자 ({eligibilityData.summary.eligibleCount}명)
                      </SelectLabel>
                      {eligibilityData.eligibleMembers.map((teamGroup) => (
                        <div key={teamGroup.team.id}>
                          <div className="px-2 py-1 text-xs text-muted-foreground bg-muted/30 pl-4">
                            {teamGroup.team.name}
                          </div>
                          {teamGroup.members.map((em) => {
                            const memberData = members.find(m => m.id === em.member.id);
                            const leadCount = memberData?.monthly_lead_count || 0;
                            return (
                              <SelectItem
                                key={em.member.id}
                                value={em.member.id}
                                className="pl-6"
                              >
                                <div className="flex items-center gap-2">
                                  <Check className="w-3 h-3 text-green-500" />
                                  <span>{em.member.name}</span>
                                  <span className="text-xs text-muted-foreground">
                                    ({leadCount})
                                  </span>
                                  <span className="text-xs text-muted-foreground">
                                    - {em.eligibilityReason}
                                  </span>
                                </div>
                              </SelectItem>
                            );
                          })}
                        </div>
                      ))}
                    </SelectGroup>
                  )}

                  {/* 비자격자 그룹 */}
                  {eligibilityData.ineligibleMembers.length > 0 && (
                    <SelectGroup>
                      <SelectLabel className="flex items-center gap-2 text-orange-600 bg-orange-50">
                        <CircleDashed className="w-3 h-3" />
                        비자격자 ({eligibilityData.summary.ineligibleCount}명)
                      </SelectLabel>
                      {eligibilityData.ineligibleMembers.map((teamGroup) => (
                        <div key={teamGroup.team.id}>
                          <div className="px-2 py-1 text-xs text-muted-foreground bg-muted/30 pl-4">
                            {teamGroup.team.name}
                          </div>
                          {teamGroup.members.map((em) => {
                            const memberData = members.find(m => m.id === em.member.id);
                            const leadCount = memberData?.monthly_lead_count || 0;
                            return (
                              <SelectItem
                                key={em.member.id}
                                value={em.member.id}
                                className="pl-6"
                              >
                                <div className="flex items-center gap-2">
                                  <CircleDashed className="w-3 h-3 text-orange-400" />
                                  <span className="text-muted-foreground">{em.member.name}</span>
                                  <span className="text-xs text-muted-foreground">
                                    ({leadCount})
                                  </span>
                                  <span className="text-xs text-orange-500">
                                    - {em.eligibilityReason}
                                  </span>
                                </div>
                              </SelectItem>
                            );
                          })}
                        </div>
                      ))}
                    </SelectGroup>
                  )}
                </>
              ) : isLoadingThisGrade ? (
                /* 로딩 중 */
                <div className="px-2 py-4 text-center text-sm text-muted-foreground">
                  자격 정보 로딩 중...
                </div>
              ) : (
                /* 등급이 없거나 자격 정보가 없는 경우: 기존 팀별 그룹화 (팀명 정렬) */
                membersByTeamSorted.map(({ teamName, members: teamMembers }) => (
                  <div key={teamName}>
                    <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground bg-muted/50">
                      {teamName}
                    </div>
                    {teamMembers.map((member) => (
                      <SelectItem key={member.id} value={member.id}>
                        <span className="flex items-center justify-between w-full gap-2">
                          <span>{member.name}</span>
                          <span className="text-xs text-muted-foreground">
                            ({member.monthly_lead_count || 0})
                          </span>
                        </span>
                      </SelectItem>
                    ))}
                  </div>
                ))
              )}
            </SelectContent>
          </Select>
        );
      }

      case "contact_status":
        return lead.contact_status ? (
          <Badge variant="outline" className="text-xs">
            {lead.contact_status.name}
          </Badge>
        ) : (
          <span className="text-muted-foreground text-xs">-</span>
        );

      case "meeting_status":
        return lead.meeting_status && lead.meeting_status.name !== "해당없음" ? (
          <Badge variant="outline" className="text-xs">
            {lead.meeting_status.name}
          </Badge>
        ) : (
          <span className="text-muted-foreground text-xs">-</span>
        );

      case "contract_status":
        return lead.contract_status && lead.contract_status.name !== "해당없음" ? (
          <Badge
            variant={lead.contract_status.name === "계약 성사" ? "default" : "outline"}
            className={`text-xs ${
              lead.contract_status.name === "계약 성사"
                ? "bg-green-500"
                : lead.contract_status.name === "계약 실패"
                  ? "border-red-300 text-red-600"
                  : ""
            }`}
          >
            {lead.contract_status.name}
          </Badge>
        ) : (
          <span className="text-muted-foreground text-xs">-</span>
        );

      case "source_date":
        return (
          <div className="flex items-center gap-1 text-muted-foreground text-sm">
            <Calendar className="h-3 w-3" />
            {formatDate(lead.source_date)}
          </div>
        );

      case "created_at":
        return (
          <div className="flex items-center gap-1 text-muted-foreground text-sm">
            <Calendar className="h-3 w-3" />
            {formatDate(lead.created_at)}
          </div>
        );

      default:
        return "-";
    }
  };

  const isAllSelected = leads.length > 0 && selectedIds.length === leads.length;
  const isSomeSelected = selectedIds.length > 0 && !isAllSelected;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (leads.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-muted-foreground">
        <Building2 className="h-12 w-12 mb-4" />
        <p className="text-lg">검색 결과가 없습니다</p>
        <p className="text-sm">필터를 변경하거나 새로운 리드를 업로드해주세요</p>
      </div>
    );
  }

  return (
    <TooltipProvider>
      <div className="rounded-md border overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[50px]">
                <Checkbox
                  checked={isAllSelected}
                  ref={(el) => {
                    if (el) {
                      (el as unknown as HTMLInputElement).indeterminate = isSomeSelected;
                    }
                  }}
                  onCheckedChange={handleSelectAll}
                  aria-label="전체 선택"
                />
              </TableHead>
              {visibleColumns.map((col) => (
                <TableHead
                  key={col.column_key}
                  className={
                    col.column_key === "annual_revenue" || col.column_key === "employee_count"
                      ? "text-right"
                      : ""
                  }
                >
                  {col.column_label}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {leads.map((lead) => (
              <TableRow
                key={lead.id}
                className={selectedIds.includes(lead.id) ? "bg-muted/50" : ""}
              >
                <TableCell>
                  <Checkbox
                    checked={selectedIds.includes(lead.id)}
                    onCheckedChange={(checked) => handleSelectOne(lead.id, checked as boolean)}
                    aria-label={`${lead.company_name || lead.representative_name} 선택`}
                  />
                </TableCell>
                {visibleColumns.map((col) => (
                  <TableCell key={col.column_key}>{renderCell(lead, col.column_key)}</TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </TooltipProvider>
  );
}
