"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  SelectGroup,
  SelectLabel,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { X, Users, Tag, Trash2, Check, CircleDashed } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";

interface Grade {
  id: string;
  name: string;
  color: string | null;
}

interface Member {
  id: string;
  name: string;
  team: { id: string; name: string } | null;
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
  grade: Grade | null;
  period: { year: number; month: number; isCurrentMonth?: boolean };
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

interface BulkActionBarProps {
  selectedIds: string[];
  selectedGradeName?: string; // 선택된 리드들의 등급명
  onClearSelection: () => void;
  onActionComplete: () => void;
}

export function BulkActionBar({
  selectedIds,
  selectedGradeName,
  onClearSelection,
  onActionComplete,
}: BulkActionBarProps) {
  const [grades, setGrades] = useState<Grade[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [eligibilityData, setEligibilityData] = useState<EligibilityData | null>(null);
  const [isLoadingEligibility, setIsLoadingEligibility] = useState(false);
  const [isAssigning, setIsAssigning] = useState(false);
  const [isChangingGrade, setIsChangingGrade] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // 자격자 목록 로드 함수
  const fetchEligibility = useCallback(async (gradeName: string) => {
    setIsLoadingEligibility(true);
    try {
      const response = await fetch(`/api/leads/eligible-members?gradeName=${gradeName}`);
      const result = await response.json();
      if (response.ok && result.success) {
        setEligibilityData(result.data);
      }
    } catch (error) {
      console.error("Failed to fetch eligibility:", error);
    } finally {
      setIsLoadingEligibility(false);
    }
  }, []);

  // 등급 및 팀장 목록 로드
  useEffect(() => {
    const fetchData = async () => {
      const supabase = createClient();

      const [gradesRes, membersRes] = await Promise.all([
        supabase
          .from("lead_grades")
          .select("id, name, color")
          .eq("is_active", true)
          .order("priority"),
        supabase
          .from("members")
          .select("id, name, team:teams(id, name)")
          .eq("role", "team_leader")
          .eq("is_active", true)
          .order("name"),
      ]);

      setGrades(gradesRes.data || []);
      // Supabase 조인 결과를 Member 타입에 맞게 변환
      const membersData = (membersRes.data || []).map((m) => ({
        id: m.id,
        name: m.name,
        team: Array.isArray(m.team) ? m.team[0] || null : m.team,
      })) as Member[];
      setMembers(membersData);
    };

    fetchData();
  }, []);

  // 선택된 등급명이 변경되면 자격자 목록 다시 로드
  useEffect(() => {
    if (selectedGradeName) {
      fetchEligibility(selectedGradeName);
    } else {
      setEligibilityData(null);
    }
  }, [selectedGradeName, fetchEligibility]);

  // 팀별 멤버 그룹화 (자격 정보 없을 때 fallback)
  // 팀명 1순위로 정렬된 배열 형태로 반환
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

  // 자격 정보가 있을 때 정렬된 데이터 생성
  // 1순위: 자격자/비자격자, 2순위: 팀명, 3순위: 실적(월납) 내림차순
  const sortedEligibilityData = eligibilityData ? {
    ...eligibilityData,
    eligibleMembers: eligibilityData.eligibleMembers
      .slice()
      .sort((a, b) => a.team.name.localeCompare(b.team.name, "ko"))
      .map((teamGroup) => ({
        ...teamGroup,
        members: teamGroup.members.slice().sort((a, b) =>
          b.performance.monthlyPayment - a.performance.monthlyPayment
        ),
      })),
    ineligibleMembers: eligibilityData.ineligibleMembers
      .slice()
      .sort((a, b) => a.team.name.localeCompare(b.team.name, "ko"))
      .map((teamGroup) => ({
        ...teamGroup,
        members: teamGroup.members.slice().sort((a, b) =>
          b.performance.monthlyPayment - a.performance.monthlyPayment
        ),
      })),
  } : null;

  // 일괄 배분
  const handleBulkAssign = async (memberId: string | null) => {
    setIsAssigning(true);

    try {
      const response = await fetch("/api/leads/assign", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          leadIds: selectedIds,
          memberId: memberId === "unassign" ? null : memberId,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "일괄 배분에 실패했습니다");
      }

      toast.success(result.data.message);
      onClearSelection();
      onActionComplete();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "일괄 배분에 실패했습니다"
      );
    } finally {
      setIsAssigning(false);
    }
  };

  // 일괄 등급 변경
  const handleBulkGradeChange = async (gradeId: string) => {
    setIsChangingGrade(true);

    try {
      const response = await fetch("/api/leads/assign", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "bulk_grade_change",
          leadIds: selectedIds,
          gradeId,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "등급 변경에 실패했습니다");
      }

      toast.success(result.data.message);
      onClearSelection();
      onActionComplete();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "등급 변경에 실패했습니다"
      );
    } finally {
      setIsChangingGrade(false);
    }
  };

  // 일괄 삭제
  const handleBulkDelete = async () => {
    setIsDeleting(true);

    try {
      const response = await fetch("/api/leads/bulk-delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          lead_ids: selectedIds,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "일괄 삭제에 실패했습니다");
      }

      toast.success(result.message);
      onClearSelection();
      onActionComplete();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "일괄 삭제에 실패했습니다"
      );
    } finally {
      setIsDeleting(false);
    }
  };

  if (selectedIds.length === 0) {
    return null;
  }

  return (
    <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50">
      <div className="flex items-center gap-4 bg-background border rounded-lg shadow-lg px-4 py-3">
        <Badge variant="secondary" className="font-medium">
          {selectedIds.length}건 선택됨
        </Badge>

        {/* 일괄 등급 변경 */}
        <Select
          onValueChange={handleBulkGradeChange}
          disabled={isChangingGrade || isAssigning}
        >
          <SelectTrigger className="w-[160px]">
            <Tag className="w-4 h-4 mr-2" />
            <SelectValue
              placeholder={isChangingGrade ? "변경 중..." : "등급 변경"}
            />
          </SelectTrigger>
          <SelectContent>
            {grades.map((grade) => (
              <SelectItem key={grade.id} value={grade.id}>
                {grade.name}등급
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* 일괄 배분 */}
        <Select
          onValueChange={handleBulkAssign}
          disabled={isAssigning || isChangingGrade || isLoadingEligibility}
        >
          <SelectTrigger className="w-[220px]">
            <Users className="w-4 h-4 mr-2" />
            <SelectValue
              placeholder={
                isAssigning
                  ? "배분 중..."
                  : isLoadingEligibility
                    ? "로딩 중..."
                    : "일괄 배분"
              }
            />
          </SelectTrigger>
          <SelectContent className="max-h-[400px]">
            <SelectItem value="unassign">
              <span className="text-muted-foreground">배분 해제</span>
            </SelectItem>

            {/* 자격 정보가 있는 경우: 자격자/비자격자로 그룹화 */}
            {sortedEligibilityData && selectedGradeName ? (
              <>
                {/* 기준 월 표시 */}
                <div className="px-2 py-2 text-xs text-center border-b bg-blue-50 text-blue-700">
                  <span className="font-medium">
                    {sortedEligibilityData.period.year}년 {sortedEligibilityData.period.month}월 실적 기준
                  </span>
                  {sortedEligibilityData.period.isCurrentMonth && (
                    <span className="ml-1 text-blue-500">(현재 월)</span>
                  )}
                </div>

                {/* 자격자 그룹 */}
                {sortedEligibilityData.eligibleMembers.length > 0 && (
                  <SelectGroup>
                    <SelectLabel className="flex items-center gap-2 text-green-600 bg-green-50">
                      <Check className="w-3 h-3" />
                      {selectedGradeName}등급 자격자 ({sortedEligibilityData.summary.eligibleCount}명)
                    </SelectLabel>
                    {sortedEligibilityData.eligibleMembers.map((teamGroup) => (
                      <div key={teamGroup.team.id}>
                        <div className="px-2 py-1 text-xs text-muted-foreground bg-muted/30 pl-4">
                          {teamGroup.team.name}
                        </div>
                        {teamGroup.members.map((em) => (
                          <SelectItem
                            key={em.member.id}
                            value={em.member.id}
                            className="pl-6"
                          >
                            <div className="flex items-center gap-2">
                              <Check className="w-3 h-3 text-green-500" />
                              <span>{em.member.name}</span>
                              <span className="text-xs text-muted-foreground">
                                - {em.eligibilityReason}
                              </span>
                            </div>
                          </SelectItem>
                        ))}
                      </div>
                    ))}
                  </SelectGroup>
                )}

                {/* 비자격자 그룹 */}
                {sortedEligibilityData.ineligibleMembers.length > 0 && (
                  <SelectGroup>
                    <SelectLabel className="flex items-center gap-2 text-orange-600 bg-orange-50">
                      <CircleDashed className="w-3 h-3" />
                      비자격자 ({sortedEligibilityData.summary.ineligibleCount}명)
                    </SelectLabel>
                    {sortedEligibilityData.ineligibleMembers.map((teamGroup) => (
                      <div key={teamGroup.team.id}>
                        <div className="px-2 py-1 text-xs text-muted-foreground bg-muted/30 pl-4">
                          {teamGroup.team.name}
                        </div>
                        {teamGroup.members.map((em) => (
                          <SelectItem
                            key={em.member.id}
                            value={em.member.id}
                            className="pl-6"
                          >
                            <div className="flex items-center gap-2">
                              <CircleDashed className="w-3 h-3 text-orange-400" />
                              <span className="text-muted-foreground">{em.member.name}</span>
                              <span className="text-xs text-orange-500">
                                - {em.eligibilityReason}
                              </span>
                            </div>
                          </SelectItem>
                        ))}
                      </div>
                    ))}
                  </SelectGroup>
                )}
              </>
            ) : (
              /* 자격 정보가 없는 경우: 팀별 그룹화 (팀명 정렬) */
              membersByTeamSorted.map(({ teamName, members: teamMembers }) => (
                <div key={teamName}>
                  <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground bg-muted/50">
                    {teamName}
                  </div>
                  {teamMembers.map((member) => (
                    <SelectItem key={member.id} value={member.id}>
                      {member.name}
                    </SelectItem>
                  ))}
                </div>
              ))
            )}
          </SelectContent>
        </Select>

        {/* 일괄 삭제 */}
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button
              variant="destructive"
              size="sm"
              disabled={isDeleting || isAssigning || isChangingGrade}
            >
              <Trash2 className="w-4 h-4 mr-1" />
              {isDeleting ? "삭제 중..." : "삭제"}
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>리드 삭제</AlertDialogTitle>
              <AlertDialogDescription>
                선택한 {selectedIds.length}건의 리드를 삭제하시겠습니까?
                <br />
                이 작업은 되돌릴 수 없습니다.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>취소</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleBulkDelete}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                삭제
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* 선택 해제 */}
        <Button
          variant="ghost"
          size="sm"
          onClick={onClearSelection}
          disabled={isAssigning || isChangingGrade || isDeleting}
        >
          <X className="w-4 h-4 mr-1" />
          선택 해제
        </Button>
      </div>
    </div>
  );
}
