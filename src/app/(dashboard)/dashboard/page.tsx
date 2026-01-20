import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Header } from "@/components/layout/header";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Users, UserPlus, TrendingUp, Calendar, Building2 } from "lucide-react";

interface DashboardStats {
  todayNewLeads: number;
  yesterdayNewLeads: number;
  assignedLeads: number;
  unassignedLeads: number;
  monthContracts: number;
  todayMeetings: number;
  gradeDistribution: { name: string; color: string; count: number }[];
  recentLeads: {
    id: string;
    company_name: string | null;
    representative_name: string | null;
    grade: { name: string; color: string | null } | null;
    created_at: string;
  }[];
}

async function getDashboardStats(supabase: Awaited<ReturnType<typeof createClient>>): Promise<DashboardStats> {
  const today = new Date();
  const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate()).toISOString();
  const yesterdayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate() - 1).toISOString();
  const monthStart = new Date(today.getFullYear(), today.getMonth(), 1).toISOString();

  // 오늘 신규 리드
  const { count: todayNewLeads } = await supabase
    .from("leads")
    .select("*", { count: "exact", head: true })
    .gte("created_at", todayStart);

  // 어제 신규 리드
  const { count: yesterdayNewLeads } = await supabase
    .from("leads")
    .select("*", { count: "exact", head: true })
    .gte("created_at", yesterdayStart)
    .lt("created_at", todayStart);

  // 배분된 리드
  const { count: assignedLeads } = await supabase
    .from("leads")
    .select("*", { count: "exact", head: true })
    .not("assigned_member_id", "is", null);

  // 미배분 리드
  const { count: unassignedLeads } = await supabase
    .from("leads")
    .select("*", { count: "exact", head: true })
    .is("assigned_member_id", null);

  // 이번 달 계약 성사
  const { data: contractStatus } = await supabase
    .from("lead_statuses")
    .select("id")
    .eq("category", "contract")
    .eq("name", "계약 성사")
    .single();

  let monthContracts = 0;
  if (contractStatus) {
    const { count } = await supabase
      .from("leads")
      .select("*", { count: "exact", head: true })
      .eq("contract_status_id", contractStatus.id)
      .gte("updated_at", monthStart);
    monthContracts = count || 0;
  }

  // 오늘 미팅
  const todayEnd = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1).toISOString();
  const { count: todayMeetings } = await supabase
    .from("leads")
    .select("*", { count: "exact", head: true })
    .gte("meeting_date", todayStart)
    .lt("meeting_date", todayEnd);

  // 등급별 분포
  const { data: grades } = await supabase
    .from("lead_grades")
    .select("id, name, color")
    .eq("is_active", true)
    .order("priority");

  const gradeDistribution: { name: string; color: string; count: number }[] = [];
  if (grades) {
    for (const grade of grades) {
      const { count } = await supabase
        .from("leads")
        .select("*", { count: "exact", head: true })
        .eq("grade_id", grade.id);
      gradeDistribution.push({
        name: grade.name,
        color: grade.color || "#6b7280",
        count: count || 0,
      });
    }
  }

  // 최근 리드 10건
  const { data: recentLeads } = await supabase
    .from("leads")
    .select(`
      id,
      company_name,
      representative_name,
      created_at,
      grade:lead_grades(name, color)
    `)
    .order("created_at", { ascending: false })
    .limit(10);

  return {
    todayNewLeads: todayNewLeads || 0,
    yesterdayNewLeads: yesterdayNewLeads || 0,
    assignedLeads: assignedLeads || 0,
    unassignedLeads: unassignedLeads || 0,
    monthContracts,
    todayMeetings: todayMeetings || 0,
    gradeDistribution,
    recentLeads: (recentLeads || []).map((lead) => {
      // Supabase에서 relation은 배열로 올 수 있으므로 처리
      const gradeData = Array.isArray(lead.grade) ? lead.grade[0] : lead.grade;
      return {
        ...lead,
        grade: gradeData as { name: string; color: string | null } | null,
      };
    }),
  };
}

export default async function DashboardPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  // 멤버 정보 조회
  const { data: member } = await supabase
    .from("members")
    .select("role")
    .eq("user_id", user.id)
    .single();

  // 팀장은 개인 페이지로, SM은 팀 대시보드로 리다이렉트
  if (member?.role === "team_leader") {
    redirect("/my-leads");
  } else if (member?.role === "sales_manager") {
    redirect("/team-dashboard");
  }

  // 대시보드 통계 조회
  const stats = await getDashboardStats(supabase);

  // 어제 대비 증감률 계산
  const growthRate = stats.yesterdayNewLeads > 0
    ? ((stats.todayNewLeads - stats.yesterdayNewLeads) / stats.yesterdayNewLeads * 100).toFixed(0)
    : stats.todayNewLeads > 0 ? "100" : "0";

  // 전체 리드 수
  const totalLeads = stats.gradeDistribution.reduce((sum, g) => sum + g.count, 0);

  return (
    <>
      <Header title="대시보드" />
      <div className="flex flex-1 flex-col gap-4 p-4">
        {/* 요약 카드 */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                오늘 신규 리드
              </CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.todayNewLeads}</div>
              <p className="text-xs text-muted-foreground">
                어제 대비 {Number(growthRate) >= 0 ? "+" : ""}{growthRate}%
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                배분 완료
              </CardTitle>
              <UserPlus className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.assignedLeads.toLocaleString()}</div>
              <p className="text-xs text-muted-foreground">
                미배분 {stats.unassignedLeads.toLocaleString()}건
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                이번 달 계약
              </CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.monthContracts}건</div>
              <p className="text-xs text-muted-foreground">
                계약 성사 건수
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                오늘 미팅
              </CardTitle>
              <Calendar className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.todayMeetings}건</div>
              <p className="text-xs text-muted-foreground">
                예정된 미팅
              </p>
            </CardContent>
          </Card>
        </div>

        {/* 상세 섹션 영역 */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
          {/* 등급별 리드 분포 */}
          <Card className="col-span-4">
            <CardHeader>
              <CardTitle>등급별 리드 분포</CardTitle>
              <CardDescription>
                전체 {totalLeads.toLocaleString()}건의 리드 현황
              </CardDescription>
            </CardHeader>
            <CardContent>
              {stats.gradeDistribution.length > 0 ? (
                <div className="space-y-4">
                  {stats.gradeDistribution.map((grade) => {
                    const percentage = totalLeads > 0 ? (grade.count / totalLeads * 100) : 0;
                    return (
                      <div key={grade.name} className="space-y-2">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Badge
                              style={{ backgroundColor: grade.color }}
                              className="text-white"
                            >
                              {grade.name}등급
                            </Badge>
                            <span className="text-sm text-muted-foreground">
                              {grade.count.toLocaleString()}건
                            </span>
                          </div>
                          <span className="text-sm font-medium">
                            {percentage.toFixed(1)}%
                          </span>
                        </div>
                        <div className="h-2 w-full rounded-full bg-muted">
                          <div
                            className="h-2 rounded-full transition-all"
                            style={{
                              width: `${percentage}%`,
                              backgroundColor: grade.color,
                            }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="flex h-[200px] items-center justify-center text-muted-foreground">
                  등급 데이터가 없습니다
                </div>
              )}
            </CardContent>
          </Card>

          {/* 최근 리드 */}
          <Card className="col-span-3">
            <CardHeader>
              <CardTitle>최근 리드</CardTitle>
              <CardDescription>
                최근 등록된 리드 목록
              </CardDescription>
            </CardHeader>
            <CardContent>
              {stats.recentLeads.length > 0 ? (
                <div className="space-y-3">
                  {stats.recentLeads.map((lead) => (
                    <div
                      key={lead.id}
                      className="flex items-center justify-between rounded-lg border p-3"
                    >
                      <div className="flex items-center gap-3">
                        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-muted">
                          <Building2 className="h-4 w-4 text-muted-foreground" />
                        </div>
                        <div>
                          <p className="text-sm font-medium">
                            {lead.company_name || "업체명 없음"}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {lead.representative_name || "-"}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {lead.grade && (
                          <Badge
                            style={{ backgroundColor: lead.grade.color || undefined }}
                            className="text-white"
                          >
                            {lead.grade.name}
                          </Badge>
                        )}
                        <span className="text-xs text-muted-foreground">
                          {new Date(lead.created_at).toLocaleDateString("ko-KR", {
                            month: "short",
                            day: "numeric",
                          })}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex h-[200px] items-center justify-center text-muted-foreground">
                  최근 등록된 리드가 없습니다
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </>
  );
}
