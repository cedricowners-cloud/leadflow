"use client";

import { useState, useEffect, useCallback } from "react";
import { Header } from "@/components/layout/header";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Users,
  TrendingUp,
  Phone,
  Calendar,
  CheckCircle,
  Clock,
  RefreshCw,
  ChevronRight,
} from "lucide-react";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";

interface TeamMemberStats {
  id: string;
  name: string;
  totalLeads: number;
  newLeads: number;
  contactedLeads: number;
  meetingScheduled: number;
  contractSuccess: number;
  contactRate: number;
  meetingRate: number;
  contractRate: number;
}

interface TeamSummary {
  totalMembers: number;
  totalLeads: number;
  newLeadsToday: number;
  totalContacted: number;
  totalMeetings: number;
  totalContracts: number;
  avgContactRate: number;
  avgMeetingRate: number;
  avgContractRate: number;
}

export default function TeamDashboardPage() {
  const [loading, setLoading] = useState(true);
  const [teamName, setTeamName] = useState<string>("");
  const [memberStats, setMemberStats] = useState<TeamMemberStats[]>([]);
  const [summary, setSummary] = useState<TeamSummary>({
    totalMembers: 0,
    totalLeads: 0,
    newLeadsToday: 0,
    totalContacted: 0,
    totalMeetings: 0,
    totalContracts: 0,
    avgContactRate: 0,
    avgMeetingRate: 0,
    avgContractRate: 0,
  });

  const fetchTeamData = useCallback(async () => {
    setLoading(true);
    try {
      const supabase = createClient();

      // 현재 사용자 정보 조회
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        toast.error("로그인이 필요합니다");
        return;
      }

      // 현재 사용자의 멤버 정보와 담당 팀 조회
      const { data: currentMember } = await supabase
        .from("members")
        .select("id, role")
        .eq("user_id", user.id)
        .single();

      if (!currentMember) {
        toast.error("멤버 정보를 찾을 수 없습니다");
        return;
      }

      // 담당 팀 조회 (manager_teams 테이블)
      const { data: managerTeams } = await supabase
        .from("manager_teams")
        .select("team_id, team:teams(id, name)")
        .eq("member_id", currentMember.id);

      if (!managerTeams || managerTeams.length === 0) {
        toast.error("담당 팀이 없습니다");
        setLoading(false);
        return;
      }

      // 첫 번째 담당 팀 사용 (추후 여러 팀 선택 기능 추가 가능)
      // Supabase에서 relation은 배열로 올 수 있으므로 처리
      const teamData = managerTeams[0].team;
      const team = Array.isArray(teamData) ? teamData[0] : teamData;
      if (!team) {
        toast.error("팀 정보를 찾을 수 없습니다");
        setLoading(false);
        return;
      }
      setTeamName(team.name);

      // 팀원(팀장들) 조회
      const { data: teamMembers } = await supabase
        .from("members")
        .select("id, name")
        .eq("team_id", team.id)
        .eq("role", "team_leader")
        .eq("is_active", true);

      if (!teamMembers || teamMembers.length === 0) {
        setMemberStats([]);
        setSummary({
          totalMembers: 0,
          totalLeads: 0,
          newLeadsToday: 0,
          totalContacted: 0,
          totalMeetings: 0,
          totalContracts: 0,
          avgContactRate: 0,
          avgMeetingRate: 0,
          avgContractRate: 0,
        });
        setLoading(false);
        return;
      }

      // 각 팀원별 리드 통계 조회
      const memberIds = teamMembers.map((m) => m.id);
      const today = new Date().toISOString().split("T")[0];

      // 전체 리드 조회
      const { data: leads } = await supabase
        .from("leads")
        .select(
          `
          id,
          assigned_member_id,
          assigned_at,
          contact_status_id,
          meeting_status_id,
          contract_status_id,
          contact_status:lead_statuses!leads_contact_status_id_fkey(name),
          meeting_status:lead_statuses!leads_meeting_status_id_fkey(name),
          contract_status:lead_statuses!leads_contract_status_id_fkey(name)
        `
        )
        .in("assigned_member_id", memberIds);

      // 팀원별 통계 계산
      const stats: TeamMemberStats[] = teamMembers.map((member) => {
        const memberLeads = leads?.filter(
          (l) => l.assigned_member_id === member.id
        ) || [];
        const totalLeads = memberLeads.length;
        const newLeads = memberLeads.filter(
          (l) => l.assigned_at?.startsWith(today)
        ).length;

        // 상태값 추출 헬퍼 함수 (Supabase relation은 배열로 올 수 있음)
        const getStatusName = (status: unknown): string | null => {
          if (!status) return null;
          const statusData = Array.isArray(status) ? status[0] : status;
          return (statusData as { name: string } | null)?.name ?? null;
        };

        // 컨택 완료: contact_status가 '통화 성공' 또는 '연락 거부'인 경우
        const contactedLeads = memberLeads.filter((l) => {
          const status = getStatusName(l.contact_status);
          return status === "통화 성공" || status === "연락 거부";
        }).length;

        // 미팅 예정/완료
        const meetingScheduled = memberLeads.filter((l) => {
          const status = getStatusName(l.meeting_status);
          return status === "미팅 예정" || status === "미팅 완료";
        }).length;

        // 계약 성사
        const contractSuccess = memberLeads.filter((l) => {
          const status = getStatusName(l.contract_status);
          return status === "계약 성사";
        }).length;

        return {
          id: member.id,
          name: member.name,
          totalLeads,
          newLeads,
          contactedLeads,
          meetingScheduled,
          contractSuccess,
          contactRate: totalLeads > 0 ? (contactedLeads / totalLeads) * 100 : 0,
          meetingRate:
            contactedLeads > 0 ? (meetingScheduled / contactedLeads) * 100 : 0,
          contractRate:
            meetingScheduled > 0
              ? (contractSuccess / meetingScheduled) * 100
              : 0,
        };
      });

      setMemberStats(stats);

      // 팀 전체 요약
      const totalLeads = stats.reduce((sum, s) => sum + s.totalLeads, 0);
      const totalContacted = stats.reduce((sum, s) => sum + s.contactedLeads, 0);
      const totalMeetings = stats.reduce((sum, s) => sum + s.meetingScheduled, 0);
      const totalContracts = stats.reduce((sum, s) => sum + s.contractSuccess, 0);

      setSummary({
        totalMembers: stats.length,
        totalLeads,
        newLeadsToday: stats.reduce((sum, s) => sum + s.newLeads, 0),
        totalContacted,
        totalMeetings,
        totalContracts,
        avgContactRate: totalLeads > 0 ? (totalContacted / totalLeads) * 100 : 0,
        avgMeetingRate:
          totalContacted > 0 ? (totalMeetings / totalContacted) * 100 : 0,
        avgContractRate:
          totalMeetings > 0 ? (totalContracts / totalMeetings) * 100 : 0,
      });
    } catch (error) {
      console.error("Error fetching team data:", error);
      toast.error("팀 데이터를 불러오는데 실패했습니다");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTeamData();
  }, [fetchTeamData]);

  return (
    <>
      <Header
        title={teamName ? `${teamName} 대시보드` : "팀 대시보드"}
        description="팀원들의 리드 현황과 성과를 확인하세요."
      />
      <div className="flex flex-1 flex-col gap-4 p-4">
        {/* 팀 요약 카드 */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">팀원 수</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{summary.totalMembers}명</div>
              <p className="text-xs text-muted-foreground">
                활성 팀원
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">전체 리드</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {summary.totalLeads.toLocaleString()}건
              </div>
              <p className="text-xs text-muted-foreground">
                오늘 +{summary.newLeadsToday}건
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">컨택 완료</CardTitle>
              <Phone className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {summary.totalContacted.toLocaleString()}건
              </div>
              <p className="text-xs text-muted-foreground">
                컨택률 {summary.avgContactRate.toFixed(1)}%
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">계약 성사</CardTitle>
              <CheckCircle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{summary.totalContracts}건</div>
              <p className="text-xs text-muted-foreground">
                미팅 {summary.totalMeetings}건 진행
              </p>
            </CardContent>
          </Card>
        </div>

        {/* 팀원별 현황 */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>팀원별 현황</CardTitle>
                <CardDescription>
                  각 팀원의 리드 처리 현황과 성과를 확인하세요
                </CardDescription>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={fetchTeamData}
                disabled={loading}
              >
                <RefreshCw
                  className={`mr-2 h-4 w-4 ${loading ? "animate-spin" : ""}`}
                />
                새로고침
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : memberStats.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
                <Users className="h-12 w-12 mb-4" />
                <p>팀원이 없습니다</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>팀원</TableHead>
                    <TableHead className="text-right">배분 리드</TableHead>
                    <TableHead className="text-right">오늘 신규</TableHead>
                    <TableHead className="text-right">컨택 완료</TableHead>
                    <TableHead className="text-right">컨택률</TableHead>
                    <TableHead className="text-right">미팅</TableHead>
                    <TableHead className="text-right">계약 성사</TableHead>
                    <TableHead className="text-right">계약률</TableHead>
                    <TableHead></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {memberStats.map((member) => (
                    <TableRow key={member.id}>
                      <TableCell className="font-medium">{member.name}</TableCell>
                      <TableCell className="text-right">
                        {member.totalLeads.toLocaleString()}
                      </TableCell>
                      <TableCell className="text-right">
                        {member.newLeads > 0 ? (
                          <Badge variant="secondary">+{member.newLeads}</Badge>
                        ) : (
                          "-"
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        {member.contactedLeads.toLocaleString()}
                      </TableCell>
                      <TableCell className="text-right">
                        <Badge
                          variant={
                            member.contactRate >= 50
                              ? "default"
                              : member.contactRate >= 30
                              ? "secondary"
                              : "outline"
                          }
                        >
                          {member.contactRate.toFixed(1)}%
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        {member.meetingScheduled}
                      </TableCell>
                      <TableCell className="text-right">
                        {member.contractSuccess > 0 ? (
                          <Badge className="bg-green-500">
                            {member.contractSuccess}
                          </Badge>
                        ) : (
                          "-"
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        {member.contractRate.toFixed(1)}%
                      </TableCell>
                      <TableCell>
                        <Button variant="ghost" size="icon">
                          <ChevronRight className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        {/* 미팅 일정 */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              이번 주 미팅 일정
            </CardTitle>
            <CardDescription>
              팀원들의 예정된 미팅을 확인하세요
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-center py-8 text-muted-foreground">
              <Clock className="mr-2 h-5 w-5" />
              <span>미팅 일정 기능은 추후 지원됩니다</span>
            </div>
          </CardContent>
        </Card>
      </div>
    </>
  );
}
