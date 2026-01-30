"use client";

import { useState, useEffect, useMemo } from "react";
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
} from "@/components/ui/select";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Phone, User, Calendar, Clock, MapPin, Mail, Briefcase, Award } from "lucide-react";
import { toast } from "sonner";
import { Lead } from "./lead-table";

interface Member {
  id: string;
  name: string;
  role: string;
  team: { id: string; name: string } | null;
  monthly_lead_count?: number;
}

interface RecruitLeadTableProps {
  leads: Lead[];
  loading?: boolean;
  selectedIds: string[];
  onSelectionChange: (ids: string[]) => void;
  onLeadUpdate: () => void;
}

// extra_fields에서 채용 관련 필드 추출
interface RecruitExtraFields {
  email?: string;
  full_name?: string;
  phone_number?: string;
  보유_자격?: string;
  법인_영업_경력?: string;
  보험_영업_경력?: string;
  연락_가능_시간?: string;
  지원자_거주_지역?: string;
}

export function RecruitLeadTable({
  leads,
  loading,
  selectedIds,
  onSelectionChange,
  onLeadUpdate,
}: RecruitLeadTableProps) {
  const [members, setMembers] = useState<Member[]>([]);
  const [assigningLeadId, setAssigningLeadId] = useState<string | null>(null);

  // 팀장 및 관리자 목록 로드 함수 (이번 달 배분 수 포함)
  const fetchMembers = async () => {
    try {
      // 팀장과 관리자(지점장, 부지점장) 모두 가져오기
      const [teamLeaderRes, salesManagerRes, branchManagerRes] = await Promise.all([
        fetch("/api/members?role=team_leader&is_active=true&include_monthly_count=true"),
        fetch("/api/members?role=sales_manager&is_active=true&include_monthly_count=true"),
        fetch("/api/members?role=branch_manager&is_active=true&include_monthly_count=true"),
      ]);

      const [teamLeaderData, salesManagerData, branchManagerData] = await Promise.all([
        teamLeaderRes.json(),
        salesManagerRes.json(),
        branchManagerRes.json(),
      ]);

      const transformMember = (m: { id: string; name: string; role: string; team: { id: string; name: string } | { id: string; name: string }[] | null; monthly_lead_count?: number }) => ({
        id: m.id,
        name: m.name,
        role: m.role,
        team: Array.isArray(m.team) ? m.team[0] || null : m.team,
        monthly_lead_count: m.monthly_lead_count || 0,
      });

      const allMembers: Member[] = [];

      if (teamLeaderData.data) {
        allMembers.push(...teamLeaderData.data.map(transformMember));
      }
      if (salesManagerData.data) {
        allMembers.push(...salesManagerData.data.map(transformMember));
      }
      if (branchManagerData.data) {
        allMembers.push(...branchManagerData.data.map(transformMember));
      }

      setMembers(allMembers);
    } catch (error) {
      console.error("멤버 목록 로드 실패:", error);
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

  // 관리자와 팀장을 분리하여 그룹화
  const { managers, membersByTeamSorted } = useMemo(() => {
    // 관리자 역할 (지점장, 부지점장)
    const managerRoles = ["branch_manager", "sales_manager"];
    const managerList = members.filter((m) => managerRoles.includes(m.role));
    const teamLeaders = members.filter((m) => m.role === "team_leader");

    // 팀장들을 팀별로 그룹화
    const teamMap: Record<string, Member[]> = {};
    teamLeaders.forEach((member) => {
      const teamName = member.team?.name || "미배정";
      if (!teamMap[teamName]) teamMap[teamName] = [];
      teamMap[teamName].push(member);
    });

    const sortedTeams = Object.entries(teamMap)
      .sort(([teamA], [teamB]) => {
        if (teamA === "미배정") return 1;
        if (teamB === "미배정") return -1;
        return teamA.localeCompare(teamB, "ko");
      })
      .map(([teamName, teamMembers]) => ({
        teamName,
        members: teamMembers,
      }));

    // 관리자도 팀명으로 정렬
    const sortedManagers = [...managerList].sort((a, b) => {
      const teamA = a.team?.name || "미배정";
      const teamB = b.team?.name || "미배정";
      if (teamA === "미배정") return 1;
      if (teamB === "미배정") return -1;
      return teamA.localeCompare(teamB, "ko");
    });

    return {
      managers: sortedManagers,
      membersByTeamSorted: sortedTeams,
    };
  }, [members]);

  // extra_fields 파싱
  const getExtraFields = (lead: Lead): RecruitExtraFields => {
    if (!lead.extra_fields || typeof lead.extra_fields !== "object") return {};
    return lead.extra_fields as RecruitExtraFields;
  };

  // 날짜 포맷
  const formatDate = (dateString: string | null): string => {
    if (!dateString) return "-";
    return new Date(dateString).toLocaleDateString("ko-KR");
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
        <Briefcase className="h-12 w-12 mb-4" />
        <p className="text-lg">검색 결과가 없습니다</p>
        <p className="text-sm">필터를 변경하거나 새로운 리드를 업로드해주세요</p>
      </div>
    );
  }

  return (
    <TooltipProvider>
      <div className="rounded-md border overflow-x-auto max-w-full">
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
              <TableHead>이름</TableHead>
              <TableHead>연락처</TableHead>
              <TableHead>이메일</TableHead>
              <TableHead>거주지역</TableHead>
              <TableHead>보험 영업 경력</TableHead>
              <TableHead>법인 영업 경력</TableHead>
              <TableHead>보유 자격</TableHead>
              <TableHead>연락 가능 시간</TableHead>
              <TableHead>캠페인</TableHead>
              <TableHead>담당자</TableHead>
              <TableHead>등록일</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {leads.map((lead) => {
              const extra = getExtraFields(lead);
              return (
                <TableRow
                  key={lead.id}
                  className={selectedIds.includes(lead.id) ? "bg-muted/50" : ""}
                >
                  <TableCell>
                    <Checkbox
                      checked={selectedIds.includes(lead.id)}
                      onCheckedChange={(checked) => handleSelectOne(lead.id, checked as boolean)}
                      aria-label={`${lead.representative_name} 선택`}
                    />
                  </TableCell>

                  {/* 이름 */}
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <User className="h-4 w-4 text-muted-foreground shrink-0" />
                      <span className="truncate max-w-[100px]">
                        {extra.full_name || lead.representative_name || "-"}
                      </span>
                    </div>
                  </TableCell>

                  {/* 연락처 */}
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Phone className="h-4 w-4 text-muted-foreground shrink-0" />
                      <span>{lead.phone}</span>
                    </div>
                  </TableCell>

                  {/* 이메일 */}
                  <TableCell>
                    {extra.email ? (
                      <div className="flex items-center gap-2">
                        <Mail className="h-4 w-4 text-muted-foreground shrink-0" />
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <span className="truncate max-w-[150px] cursor-default">
                              {extra.email}
                            </span>
                          </TooltipTrigger>
                          <TooltipContent>{extra.email}</TooltipContent>
                        </Tooltip>
                      </div>
                    ) : (
                      <span className="text-muted-foreground">-</span>
                    )}
                  </TableCell>

                  {/* 거주지역 */}
                  <TableCell>
                    {extra.지원자_거주_지역 ? (
                      <div className="flex items-center gap-2">
                        <MapPin className="h-4 w-4 text-muted-foreground shrink-0" />
                        <span className="truncate max-w-[80px]">{extra.지원자_거주_지역}</span>
                      </div>
                    ) : (
                      <span className="text-muted-foreground">-</span>
                    )}
                  </TableCell>

                  {/* 보험 영업 경력 */}
                  <TableCell>
                    {extra.보험_영업_경력 ? (
                      <Badge variant="outline" className="text-xs">
                        {extra.보험_영업_경력}
                      </Badge>
                    ) : (
                      <span className="text-muted-foreground">-</span>
                    )}
                  </TableCell>

                  {/* 법인 영업 경력 */}
                  <TableCell>
                    {extra.법인_영업_경력 ? (
                      <Badge variant="outline" className="text-xs">
                        {extra.법인_영업_경력}
                      </Badge>
                    ) : (
                      <span className="text-muted-foreground">-</span>
                    )}
                  </TableCell>

                  {/* 보유 자격 */}
                  <TableCell>
                    {extra.보유_자격 && extra.보유_자격 !== "없음" ? (
                      <div className="flex items-center gap-2">
                        <Award className="h-4 w-4 text-amber-500 shrink-0" />
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <span className="truncate max-w-[100px] cursor-default">
                              {extra.보유_자격}
                            </span>
                          </TooltipTrigger>
                          <TooltipContent>{extra.보유_자격}</TooltipContent>
                        </Tooltip>
                      </div>
                    ) : (
                      <span className="text-muted-foreground">없음</span>
                    )}
                  </TableCell>

                  {/* 연락 가능 시간 */}
                  <TableCell>
                    {(extra.연락_가능_시간 || lead.available_time) ? (
                      <div className="flex items-center gap-2 text-blue-600">
                        <Clock className="h-4 w-4 shrink-0" />
                        <span className="text-sm truncate max-w-[80px]">
                          {extra.연락_가능_시간 || lead.available_time}
                        </span>
                      </div>
                    ) : (
                      <span className="text-muted-foreground">-</span>
                    )}
                  </TableCell>

                  {/* 캠페인 */}
                  <TableCell>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <span className="truncate max-w-[100px] block cursor-default">
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
                  </TableCell>

                  {/* 담당자 */}
                  <TableCell>
                    <Select
                      value={lead.assigned_member_id || "unassigned"}
                      onValueChange={(value) =>
                        handleAssign(lead.id, value === "unassigned" ? "unassign" : value)
                      }
                      disabled={assigningLeadId === lead.id}
                    >
                      <SelectTrigger
                        className={`w-[150px] ${
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
                        {/* 관리자 그룹 (지점장, 부지점장) */}
                        {managers.length > 0 && (
                          <div>
                            <div className="px-2 py-1.5 text-xs font-semibold text-blue-600 bg-blue-50">
                              관리자
                            </div>
                            {managers.map((member) => (
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
                        )}
                        {/* 팀별 팀장 그룹 */}
                        {membersByTeamSorted.map(({ teamName, members: teamMembers }) => (
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
                        ))}
                      </SelectContent>
                    </Select>
                  </TableCell>

                  {/* 등록일 */}
                  <TableCell>
                    <div className="flex items-center gap-1 text-muted-foreground text-sm">
                      <Calendar className="h-3 w-3" />
                      {formatDate(lead.created_at)}
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
    </TooltipProvider>
  );
}
