"use client";

import { useEffect, useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Badge } from "@/components/ui/badge";
import {
  Search,
  Filter,
  Calendar as CalendarIcon,
  X,
  RefreshCw,
} from "lucide-react";
import { format } from "date-fns";
import { ko } from "date-fns/locale";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";

interface Grade {
  id: string;
  name: string;
  color: string | null;
}

interface Team {
  id: string;
  name: string;
}

interface Member {
  id: string;
  name: string;
  team: { id: string; name: string } | null;
}

interface Status {
  id: string;
  name: string;
  category: string;
}

export interface LeadFiltersValue {
  search: string;
  gradeId: string;
  teamId: string;
  memberId: string;
  contactStatusId: string;
  meetingStatusId: string;
  contractStatusId: string;
  assignedStatus: "all" | "assigned" | "unassigned";
  startDate: Date | undefined;
  endDate: Date | undefined;
}

interface LeadFiltersProps {
  value: LeadFiltersValue;
  onChange: (value: LeadFiltersValue) => void;
  onRefresh: () => void;
  loading?: boolean;
}

export function LeadFilters({
  value,
  onChange,
  onRefresh,
  loading,
}: LeadFiltersProps) {
  const [grades, setGrades] = useState<Grade[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [statuses, setStatuses] = useState<Status[]>([]);

  // 필터 데이터 로드
  useEffect(() => {
    const fetchFilterData = async () => {
      const supabase = createClient();

      // 등급 조회
      const { data: gradesData } = await supabase
        .from("lead_grades")
        .select("id, name, color")
        .eq("is_active", true)
        .order("priority");

      // 팀 조회
      const { data: teamsData } = await supabase
        .from("teams")
        .select("id, name")
        .eq("is_active", true)
        .order("name");

      // 팀장 멤버 조회
      const { data: membersData } = await supabase
        .from("members")
        .select("id, name, team:teams(id, name)")
        .eq("role", "team_leader")
        .eq("is_active", true)
        .order("name");

      // 상태값 조회
      const { data: statusesData } = await supabase
        .from("lead_statuses")
        .select("id, name, category")
        .eq("is_active", true)
        .order("display_order");

      setGrades(gradesData || []);
      setTeams(teamsData || []);
      // Supabase 조인 결과를 Member 타입에 맞게 변환
      const transformedMembers = (membersData || []).map((m) => ({
        id: m.id,
        name: m.name,
        team: Array.isArray(m.team) ? m.team[0] || null : m.team,
      })) as Member[];
      setMembers(transformedMembers);
      setStatuses(statusesData || []);
    };

    fetchFilterData();
  }, []);

  const handleChange = (key: keyof LeadFiltersValue, newValue: unknown) => {
    onChange({ ...value, [key]: newValue });
  };

  const clearFilters = () => {
    onChange({
      search: "",
      gradeId: "",
      teamId: "",
      memberId: "",
      contactStatusId: "",
      meetingStatusId: "",
      contractStatusId: "",
      assignedStatus: "all",
      startDate: undefined,
      endDate: undefined,
    });
  };

  // 활성 필터 개수 계산
  const activeFilterCount = [
    value.gradeId,
    value.teamId,
    value.memberId,
    value.contactStatusId,
    value.meetingStatusId,
    value.contractStatusId,
    value.assignedStatus !== "all" ? value.assignedStatus : "",
    value.startDate,
    value.endDate,
  ].filter(Boolean).length;

  // 카테고리별 상태 분류
  const contactStatuses = statuses.filter((s) => s.category === "contact");
  const meetingStatuses = statuses.filter((s) => s.category === "meeting");
  const contractStatuses = statuses.filter((s) => s.category === "contract");

  // 팀별 멤버 그룹화
  const membersByTeam = members.reduce(
    (acc, member) => {
      const teamName = member.team?.name || "미배정";
      if (!acc[teamName]) acc[teamName] = [];
      acc[teamName].push(member);
      return acc;
    },
    {} as Record<string, Member[]>
  );

  return (
    <div className="space-y-4">
      {/* 검색 및 기본 필터 */}
      <div className="flex flex-wrap items-center gap-2">
        {/* 검색 */}
        <div className="relative flex-1 min-w-[200px] max-w-[300px]">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="업체명, 대표자, 연락처 검색..."
            value={value.search}
            onChange={(e) => handleChange("search", e.target.value)}
            className="pl-9"
          />
        </div>

        {/* 등급 필터 */}
        <Select
          value={value.gradeId || "all"}
          onValueChange={(v) => handleChange("gradeId", v === "all" ? "" : v)}
        >
          <SelectTrigger className="w-[130px]">
            <SelectValue placeholder="등급" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">전체 등급</SelectItem>
            {grades.map((grade) => (
              <SelectItem key={grade.id} value={grade.id}>
                {grade.name}등급
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* 팀 필터 */}
        <Select
          value={value.teamId || "all"}
          onValueChange={(v) => handleChange("teamId", v === "all" ? "" : v)}
        >
          <SelectTrigger className="w-[130px]">
            <SelectValue placeholder="팀" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">전체 팀</SelectItem>
            {teams.map((team) => (
              <SelectItem key={team.id} value={team.id}>
                {team.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* 담당자 필터 */}
        <Select
          value={value.memberId || "all"}
          onValueChange={(v) => handleChange("memberId", v === "all" ? "" : v)}
        >
          <SelectTrigger className="w-[150px]">
            <SelectValue placeholder="담당자" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">전체 담당자</SelectItem>
            {Object.entries(membersByTeam).map(([teamName, teamMembers]) => (
              <div key={teamName}>
                <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground">
                  {teamName}
                </div>
                {teamMembers.map((member) => (
                  <SelectItem key={member.id} value={member.id}>
                    {member.name}
                  </SelectItem>
                ))}
              </div>
            ))}
          </SelectContent>
        </Select>

        {/* 배분 상태 */}
        <Select
          value={value.assignedStatus}
          onValueChange={(v) =>
            handleChange(
              "assignedStatus",
              v as "all" | "assigned" | "unassigned"
            )
          }
        >
          <SelectTrigger className="w-[130px]">
            <SelectValue placeholder="배분 상태" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">전체</SelectItem>
            <SelectItem value="assigned">배분 완료</SelectItem>
            <SelectItem value="unassigned">미배분</SelectItem>
          </SelectContent>
        </Select>

        {/* 상세 필터 팝오버 */}
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" className="relative">
              <Filter className="h-4 w-4 mr-2" />
              상세 필터
              {activeFilterCount > 0 && (
                <Badge
                  variant="secondary"
                  className="ml-2 h-5 w-5 rounded-full p-0 flex items-center justify-center"
                >
                  {activeFilterCount}
                </Badge>
              )}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-80" align="start">
            <div className="space-y-4">
              <h4 className="font-medium">상세 필터</h4>

              {/* 컨택 상태 */}
              <div className="space-y-2">
                <label className="text-sm text-muted-foreground">
                  컨택 상태
                </label>
                <Select
                  value={value.contactStatusId || "all"}
                  onValueChange={(v) =>
                    handleChange("contactStatusId", v === "all" ? "" : v)
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="선택" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">전체</SelectItem>
                    {contactStatuses.map((status) => (
                      <SelectItem key={status.id} value={status.id}>
                        {status.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* 미팅 상태 */}
              <div className="space-y-2">
                <label className="text-sm text-muted-foreground">
                  미팅 상태
                </label>
                <Select
                  value={value.meetingStatusId || "all"}
                  onValueChange={(v) =>
                    handleChange("meetingStatusId", v === "all" ? "" : v)
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="선택" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">전체</SelectItem>
                    {meetingStatuses.map((status) => (
                      <SelectItem key={status.id} value={status.id}>
                        {status.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* 계약 상태 */}
              <div className="space-y-2">
                <label className="text-sm text-muted-foreground">
                  계약 상태
                </label>
                <Select
                  value={value.contractStatusId || "all"}
                  onValueChange={(v) =>
                    handleChange("contractStatusId", v === "all" ? "" : v)
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="선택" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">전체</SelectItem>
                    {contractStatuses.map((status) => (
                      <SelectItem key={status.id} value={status.id}>
                        {status.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* 등록일 범위 */}
              <div className="space-y-2">
                <label className="text-sm text-muted-foreground">
                  등록일 범위
                </label>
                <div className="flex gap-2">
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          "w-full justify-start text-left font-normal",
                          !value.startDate && "text-muted-foreground"
                        )}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {value.startDate
                          ? format(value.startDate, "yyyy-MM-dd")
                          : "시작일"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={value.startDate}
                        onSelect={(date) => handleChange("startDate", date)}
                        locale={ko}
                      />
                    </PopoverContent>
                  </Popover>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          "w-full justify-start text-left font-normal",
                          !value.endDate && "text-muted-foreground"
                        )}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {value.endDate
                          ? format(value.endDate, "yyyy-MM-dd")
                          : "종료일"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={value.endDate}
                        onSelect={(date) => handleChange("endDate", date)}
                        locale={ko}
                      />
                    </PopoverContent>
                  </Popover>
                </div>
              </div>
            </div>
          </PopoverContent>
        </Popover>

        {/* 필터 초기화 */}
        {activeFilterCount > 0 && (
          <Button variant="ghost" size="sm" onClick={clearFilters}>
            <X className="h-4 w-4 mr-1" />
            초기화
          </Button>
        )}

        {/* 새로고침 */}
        <Button
          variant="outline"
          size="icon"
          onClick={onRefresh}
          disabled={loading}
        >
          <RefreshCw className={cn("h-4 w-4", loading && "animate-spin")} />
        </Button>
      </div>
    </div>
  );
}
