"use client";

import { useEffect, useState, useCallback } from "react";
import {
  Plus,
  Trash2,
  Calendar,
  Users,
  Building2,
  Receipt,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  Save,
  Package,
  Check,
  ChevronsUpDown,
  User,
} from "lucide-react";
import { EligibilityCriteriaCard } from "@/components/distribution";
import { Header } from "@/components/layout/header";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import {
  calculateCommissionWithProduct,
  formatCurrency,
  formatCommissionRate,
  getEffectiveCommissionRate,
} from "@/lib/utils/commission-calculator";
import { createClient } from "@/lib/supabase/client";

// Types
type MemberRole = "system_admin" | "branch_manager" | "sales_manager" | "team_leader";
interface Team {
  id: string;
  name: string;
}

interface Member {
  id: string;
  name: string;
  role?: MemberRole;
  team: Team | null;
}

interface InsuranceProduct {
  id: string;
  name: string;
  company: string | null;
  insurer_commission_rate: number;
  adjustment_rate: number;
}

interface AssignedLead {
  id: string;
  company_name: string | null;
  representative_name: string | null;
}

interface PerformanceDetail {
  id?: string;
  product_id: string | null;
  product?: InsuranceProduct | null;
  client_name: string;
  monthly_payment: number;
  commission_amount: number;
  contract_date: string;
  memo: string;
}

interface MonthlyPerformance {
  id: string;
  member_id: string;
  member: Member;
  year: number;
  month: number;
  total_monthly_payment: number;
  total_commission: number;
  contract_count: number;
  notes: string | null;
  details: PerformanceDetail[];
}

// Initial empty detail
const createEmptyDetail = (): PerformanceDetail => ({
  product_id: null,
  client_name: "",
  monthly_payment: 0,
  commission_amount: 0,
  contract_date: "",
  memo: "",
});

export default function MemberPerformancePage() {
  // 현재 날짜 기준 연월
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth() + 1;

  // State
  const [year, setYear] = useState(currentYear);
  const [month, setMonth] = useState(currentMonth);
  const [performances, setPerformances] = useState<MonthlyPerformance[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [products, setProducts] = useState<InsuranceProduct[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTeamId, setSelectedTeamId] = useState<string>("all");
  const [currentRole, setCurrentRole] = useState<MemberRole | null>(null);
  const [currentMemberId, setCurrentMemberId] = useState<string | null>(null);
  const [currentMemberName, setCurrentMemberName] = useState<string | null>(null);
  const [currentMemberTeam, setCurrentMemberTeam] = useState<Team | null>(null);
  const [managerTeams, setManagerTeams] = useState<Team[]>([]); // 영업 관리자가 담당하는 팀 목록

  // Dialog state
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingMember, setEditingMember] = useState<Member | null>(null);
  const [editingDetails, setEditingDetails] = useState<PerformanceDetail[]>([]);
  const [editingNotes, setEditingNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [assignedLeads, setAssignedLeads] = useState<AssignedLead[]>([]);
  const [loadingLeads, setLoadingLeads] = useState(false);
  const [openClientPopover, setOpenClientPopover] = useState<number | null>(null);

  // Fetch current user info
  const fetchCurrentUser = useCallback(async () => {
    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: member } = await supabase
          .from("members")
          .select("id, role, name, team:teams(id, name)")
          .eq("user_id", user.id)
          .single();
        if (member) {
          setCurrentRole(member.role as MemberRole);
          setCurrentMemberId(member.id);
          setCurrentMemberName(member.name);
          // team can be an array due to Supabase's response format
          const team = Array.isArray(member.team) ? member.team[0] : member.team;
          setCurrentMemberTeam(team as Team | null);

          // 영업 관리자인 경우 manager_teams에서 담당 팀 조회
          if (member.role === "sales_manager") {
            const { data: managerTeamsData } = await supabase
              .from("manager_teams")
              .select("team:teams(id, name)")
              .eq("member_id", member.id);

            if (managerTeamsData && managerTeamsData.length > 0) {
              const teams = managerTeamsData
                .map((mt) => (Array.isArray(mt.team) ? mt.team[0] : mt.team))
                .filter((t): t is Team => t !== null);
              setManagerTeams(teams);
              // 첫 번째 담당 팀을 기본 선택
              if (teams.length > 0) {
                setSelectedTeamId(teams[0].id);
              }
            }
          }
        }
      }
    } catch (error) {
      console.error("Current user fetch error:", error);
    }
  }, []);

  // Fetch teams
  const fetchTeams = useCallback(async () => {
    try {
      const response = await fetch("/api/teams");
      const result = await response.json();
      if (result.data) {
        setTeams(result.data);
      }
    } catch (error) {
      console.error("Teams fetch error:", error);
    }
  }, []);

  // Fetch members (team leaders and sales managers for system_admin)
  const fetchMembers = useCallback(async () => {
    try {
      // 시스템 관리자인 경우 팀장과 영업 관리자 모두 조회
      // 영업 관리자인 경우 팀장만 조회
      const [teamLeadersRes, salesManagersRes] = await Promise.all([
        fetch("/api/members?role=team_leader&is_active=true"),
        currentRole === "system_admin"
          ? fetch("/api/members?role=sales_manager&is_active=true")
          : Promise.resolve(null),
      ]);

      const teamLeadersResult = await teamLeadersRes.json();
      const teamLeaders = teamLeadersResult.data || [];

      let allMembers = [...teamLeaders];

      // 시스템 관리자인 경우 영업 관리자도 추가
      if (salesManagersRes) {
        const salesManagersResult = await salesManagersRes.json();
        const salesManagers = salesManagersResult.data || [];
        allMembers = [...salesManagers, ...teamLeaders]; // 영업 관리자를 앞에 배치
      }

      setMembers(allMembers);
    } catch (error) {
      console.error("Members fetch error:", error);
    }
  }, [currentRole]);

  // Fetch products
  const fetchProducts = useCallback(async () => {
    try {
      const response = await fetch("/api/insurance-products");
      const result = await response.json();
      if (result.data) {
        setProducts(result.data.filter((p: InsuranceProduct & { is_active: boolean }) => p.is_active));
      }
    } catch (error) {
      console.error("Products fetch error:", error);
    }
  }, []);

  // Fetch assigned leads for a member
  const fetchAssignedLeads = useCallback(async (memberId: string) => {
    try {
      setLoadingLeads(true);
      const response = await fetch(`/api/leads?memberId=${memberId}&limit=100`);
      const result = await response.json();
      if (result.data?.leads) {
        setAssignedLeads(
          result.data.leads.map((lead: { id: string; company_name: string | null; representative_name: string | null }) => ({
            id: lead.id,
            company_name: lead.company_name,
            representative_name: lead.representative_name,
          }))
        );
      } else {
        setAssignedLeads([]);
      }
    } catch (error) {
      console.error("Assigned leads fetch error:", error);
      setAssignedLeads([]);
    } finally {
      setLoadingLeads(false);
    }
  }, []);

  // Fetch performances for selected year/month
  const fetchPerformances = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        year: year.toString(),
        month: month.toString(),
      });
      const response = await fetch(`/api/member-performance?${params}`);
      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error);
      }

      setPerformances(result.data || []);
    } catch (error) {
      toast.error("실적 데이터를 불러오는데 실패했습니다");
      console.error(error);
    } finally {
      setLoading(false);
    }
  }, [year, month]);

  useEffect(() => {
    fetchCurrentUser();
    fetchTeams();
    fetchMembers();
    fetchProducts();
  }, [fetchCurrentUser, fetchTeams, fetchMembers, fetchProducts]);

  useEffect(() => {
    fetchPerformances();
  }, [fetchPerformances]);

  // Navigate month
  const goToPreviousMonth = () => {
    if (month === 1) {
      setYear(year - 1);
      setMonth(12);
    } else {
      setMonth(month - 1);
    }
  };

  const goToNextMonth = () => {
    if (month === 12) {
      setYear(year + 1);
      setMonth(1);
    } else {
      setMonth(month + 1);
    }
  };

  // Get performance for a member
  const getPerformanceForMember = (memberId: string): MonthlyPerformance | undefined => {
    return performances.find((p) => p.member_id === memberId);
  };

  // Open dialog for editing
  const openEditDialog = (member: Member) => {
    const existingPerformance = getPerformanceForMember(member.id);
    setEditingMember(member);
    setEditingNotes(existingPerformance?.notes || "");

    if (existingPerformance && existingPerformance.details.length > 0) {
      setEditingDetails(
        existingPerformance.details.map((d) => ({
          ...d,
          product_id: d.product_id || null,
          client_name: d.client_name || "",
          monthly_payment: d.monthly_payment || 0,
          commission_amount: d.commission_amount || 0,
          contract_date: d.contract_date || "",
          memo: d.memo || "",
        }))
      );
    } else {
      setEditingDetails([createEmptyDetail()]);
    }

    // Fetch assigned leads for this member
    fetchAssignedLeads(member.id);
    setOpenClientPopover(null);
    setDialogOpen(true);
  };

  // Add detail row
  const addDetailRow = () => {
    setEditingDetails([...editingDetails, createEmptyDetail()]);
  };

  // Remove detail row
  const removeDetailRow = (index: number) => {
    setEditingDetails(editingDetails.filter((_, i) => i !== index));
  };

  // Update detail row
  const updateDetailRow = (
    index: number,
    field: keyof PerformanceDetail,
    value: string | number | null
  ) => {
    const newDetails = [...editingDetails];
    const detail = { ...newDetails[index] };

    if (field === "product_id") {
      detail.product_id = value as string | null;
      // Auto-calculate commission when product changes
      const product = products.find((p) => p.id === value);
      if (product && detail.monthly_payment > 0) {
        detail.commission_amount = calculateCommissionWithProduct(
          detail.monthly_payment,
          product
        );
      }
    } else if (field === "monthly_payment") {
      detail.monthly_payment = value as number;
      // Auto-calculate commission when payment changes
      if (detail.product_id) {
        const product = products.find((p) => p.id === detail.product_id);
        if (product) {
          detail.commission_amount = calculateCommissionWithProduct(
            value as number,
            product
          );
        }
      }
    } else {
      (detail as Record<string, unknown>)[field] = value;
    }

    newDetails[index] = detail;
    setEditingDetails(newDetails);
  };

  // Calculate totals
  const calculateTotals = () => {
    const totalPayment = editingDetails.reduce(
      (sum, d) => sum + (d.monthly_payment || 0),
      0
    );
    const totalCommission = editingDetails.reduce(
      (sum, d) => sum + (d.commission_amount || 0),
      0
    );
    return { totalPayment, totalCommission };
  };

  // Save performance
  const handleSave = async () => {
    if (!editingMember) return;
    setSubmitting(true);

    try {
      const validDetails = editingDetails.filter(
        (d) => d.monthly_payment > 0 || d.product_id
      );

      const response = await fetch("/api/member-performance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          member_id: editingMember.id,
          year,
          month,
          details: validDetails.map((d) => ({
            product_id: d.product_id || null,
            client_name: d.client_name || null,
            monthly_payment: d.monthly_payment,
            commission_amount: d.commission_amount,
            contract_date: d.contract_date || null,
            memo: d.memo || null,
          })),
          notes: editingNotes || null,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error);
      }

      toast.success("실적이 저장되었습니다");
      setDialogOpen(false);
      fetchPerformances();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "저장에 실패했습니다"
      );
    } finally {
      setSubmitting(false);
    }
  };

  // Filter members by team
  const filteredMembersByTeam = selectedTeamId === "all"
    ? members
    : members.filter((m) => m.team?.id === selectedTeamId);

  // Sort members: managers (branch_manager, sales_manager) keep current order, team_leaders sorted by total_commission (highest first)
  const filteredMembers = [...filteredMembersByTeam].sort((a, b) => {
    const isAManager = a.role === "branch_manager" || a.role === "sales_manager";
    const isBManager = b.role === "branch_manager" || b.role === "sales_manager";

    // Managers stay at the top in their original order
    if (isAManager && isBManager) return 0;
    if (isAManager) return -1;
    if (isBManager) return 1;

    // Team leaders sorted by total_commission (highest first)
    const perfA = getPerformanceForMember(a.id);
    const perfB = getPerformanceForMember(b.id);
    const commissionA = perfA?.total_commission || 0;
    const commissionB = perfB?.total_commission || 0;

    // If commissions are different, sort by commission (highest first)
    if (commissionA !== commissionB) {
      return commissionB - commissionA;
    }

    // If commissions are equal (both 0 or same value), sort by team name
    const teamNameA = a.team?.name || "";
    const teamNameB = b.team?.name || "";
    return teamNameA.localeCompare(teamNameB, "ko");
  });

  // Check if current user can edit (system_admin or branch_manager can edit all members)
  const canEdit = currentRole === "system_admin" || currentRole === "branch_manager";

  // Check if current user can edit their own performance (sales_manager or team_leader)
  const canEditSelf = currentRole === "sales_manager" || currentRole === "team_leader";

  // Get current user's performance
  const getMyPerformance = (): MonthlyPerformance | undefined => {
    if (!currentMemberId) return undefined;
    return performances.find((p) => p.member_id === currentMemberId);
  };

  // Open dialog for editing own performance
  const openSelfEditDialog = () => {
    if (!currentMemberId || !currentMemberName) return;

    const myMember: Member = {
      id: currentMemberId,
      name: currentMemberName,
      team: currentMemberTeam,
    };

    openEditDialog(myMember);
  };

  // Calculate summary stats
  const summaryStats = {
    totalMembers: filteredMembers.length,
    membersWithPerformance: filteredMembers.filter((m) =>
      getPerformanceForMember(m.id)
    ).length,
    totalPayment: performances
      .filter((p) =>
        selectedTeamId === "all" ||
        filteredMembers.some((m) => m.id === p.member_id)
      )
      .reduce((sum, p) => sum + (p.total_monthly_payment || 0), 0),
    totalCommission: performances
      .filter((p) =>
        selectedTeamId === "all" ||
        filteredMembers.some((m) => m.id === p.member_id)
      )
      .reduce((sum, p) => sum + (p.total_commission || 0), 0),
  };

  // Get page title based on role (sales_manager = 부지점장, shows team view)
  const pageTitle = currentRole === "sales_manager" ? "팀 실적 현황" : "멤버 실적 관리";

  return (
    <>
      <Header title={pageTitle} />
      <div className="flex flex-1 flex-col gap-4 p-4">
        {/* Period Selector */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                기간 선택
              </CardTitle>
              <CardDescription>
                실적을 입력하거나 조회할 년월을 선택하세요
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="icon" onClick={goToPreviousMonth}>
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <div className="flex items-center gap-2 min-w-[140px] justify-center">
                <span className="text-lg font-semibold">
                  {year}년 {month}월
                </span>
              </div>
              <Button variant="outline" size="icon" onClick={goToNextMonth}>
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </CardHeader>
        </Card>

        {/* Summary Cards */}
        <div className="grid gap-4 md:grid-cols-2">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                총 월납
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {formatCurrency(summaryStats.totalPayment)}
              </div>
              <p className="text-xs text-muted-foreground">선택 기간 합계</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                총 수수료
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {formatCurrency(summaryStats.totalCommission)}
              </div>
              <p className="text-xs text-muted-foreground">선택 기간 합계</p>
            </CardContent>
          </Card>
        </div>

        {/* My Performance Card - for sales_manager and team_leader */}
        {canEditSelf && currentMemberId && (
          <Card className="border-primary/30 bg-primary/5">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Package className="h-5 w-5 text-primary" />
                  내 실적 입력
                </CardTitle>
                <CardDescription>
                  {year}년 {month}월 본인 실적을 입력하세요
                </CardDescription>
              </div>
              <Button onClick={openSelfEditDialog}>
                <Plus className="h-4 w-4 mr-2" />
                입력하기
              </Button>
            </CardHeader>
            <CardContent>
              {(() => {
                const myPerf = getMyPerformance();
                return myPerf ? (
                  <div className="grid grid-cols-3 gap-4">
                    <div className="p-3 bg-background rounded-lg">
                      <p className="text-sm text-muted-foreground">계약 건수</p>
                      <p className="text-xl font-bold">{myPerf.contract_count}건</p>
                    </div>
                    <div className="p-3 bg-background rounded-lg">
                      <p className="text-sm text-muted-foreground">총 월납</p>
                      <p className="text-xl font-bold">{formatCurrency(myPerf.total_monthly_payment)}</p>
                    </div>
                    <div className="p-3 bg-background rounded-lg">
                      <p className="text-sm text-muted-foreground">총 수수료</p>
                      <p className="text-xl font-bold text-primary">{formatCurrency(myPerf.total_commission)}</p>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center justify-center h-20 text-muted-foreground">
                    아직 입력된 실적이 없습니다
                  </div>
                );
              })()}
            </CardContent>
          </Card>
        )}

        {/* Member Performance Table - system_admin과 sales_manager만 표시 */}
        {(canEdit || currentRole === "sales_manager") && (
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Receipt className="h-5 w-5" />
                  {canEdit ? "멤버별 실적" : "팀장별 실적"}
                </CardTitle>
                <CardDescription>
                  {canEdit ? "멤버를 클릭하여 실적을 입력하세요" : "담당 팀원들의 실적을 조회합니다"}
                </CardDescription>
              </div>
              <Select value={selectedTeamId} onValueChange={setSelectedTeamId}>
                <SelectTrigger className="w-[180px]">
                  <Building2 className="h-4 w-4 mr-2" />
                  <SelectValue placeholder="팀 필터" />
                </SelectTrigger>
                <SelectContent>
                  {/* 영업 관리자인 경우 담당 팀을 먼저 표시 */}
                  {currentRole === "sales_manager" && managerTeams.length > 0 && (
                    <>
                      {managerTeams.map((team) => (
                        <SelectItem key={team.id} value={team.id}>
                          {team.name} (담당)
                        </SelectItem>
                      ))}
                      <div className="h-px bg-border my-1" />
                    </>
                  )}
                  <SelectItem value="all">전체 팀</SelectItem>
                  {/* 영업 관리자인 경우 담당 팀은 제외하고 나머지 팀 표시 */}
                  {currentRole === "sales_manager"
                    ? teams.filter(t => !managerTeams.some(mt => mt.id === t.id)).map((team) => (
                        <SelectItem key={team.id} value={team.id}>
                          {team.name}
                        </SelectItem>
                      ))
                    : teams.map((team) => (
                        <SelectItem key={team.id} value={team.id}>
                          {team.name}
                        </SelectItem>
                      ))
                  }
                </SelectContent>
              </Select>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="flex items-center justify-center h-32 text-muted-foreground">
                  로딩 중...
                </div>
              ) : filteredMembers.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-32 text-muted-foreground">
                  <Users className="h-8 w-8 mb-2" />
                  <p>{canEdit ? "등록된 멤버가 없습니다" : "등록된 팀장이 없습니다"}</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{canEdit ? "멤버명" : "팀장명"}</TableHead>
                      {canEdit && <TableHead>역할</TableHead>}
                      <TableHead>소속 팀</TableHead>
                      <TableHead className="text-right">계약 건수</TableHead>
                      <TableHead className="text-right">총 월납</TableHead>
                      <TableHead className="text-right">총 수수료</TableHead>
                      {canEdit && <TableHead className="text-right">액션</TableHead>}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredMembers.map((member) => {
                      const perf = getPerformanceForMember(member.id);
                      return (
                        <TableRow
                          key={member.id}
                          className={canEdit ? "cursor-pointer hover:bg-muted/50" : "hover:bg-muted/50"}
                          onClick={canEdit ? () => openEditDialog(member) : undefined}
                        >
                          <TableCell className="font-medium">
                            {member.name}
                          </TableCell>
                          {canEdit && (
                            <TableCell>
                              {member.role === "branch_manager" ? (
                                <Badge variant="secondary" className="bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300">
                                  지점장
                                </Badge>
                              ) : member.role === "sales_manager" ? (
                                <Badge variant="secondary" className="bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300">
                                  부지점장
                                </Badge>
                              ) : (
                                <Badge variant="outline">팀장</Badge>
                              )}
                            </TableCell>
                          )}
                          <TableCell>
                            {member.team ? (
                              <div className="flex items-center gap-1">
                                <Building2 className="h-3 w-3 text-muted-foreground" />
                                {member.team.name}
                              </div>
                            ) : (
                              <span className="text-muted-foreground">-</span>
                            )}
                          </TableCell>
                          <TableCell className="text-right">
                            {perf?.contract_count || 0}건
                          </TableCell>
                          <TableCell className="text-right font-medium">
                            {formatCurrency(perf?.total_monthly_payment || 0)}
                          </TableCell>
                          <TableCell className="text-right text-primary font-medium">
                            {formatCurrency(perf?.total_commission || 0)}
                          </TableCell>
                          {canEdit && (
                            <TableCell className="text-right">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  openEditDialog(member);
                                }}
                              >
                                입력
                              </Button>
                            </TableCell>
                          )}
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        )}

        {/* 자격 기준 안내 */}
        <EligibilityCriteriaCard
          title="등급별 배분 자격 기준"
          icon="calculator"
          editable={canEdit}
          compact={true}
        />
      </div>

      {/* Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingMember?.name} - {year}년 {month}월 실적 입력
            </DialogTitle>
            <DialogDescription>
              보험 상품을 선택하고 월납 금액을 입력하면 수수료가 자동 계산됩니다.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {/* Detail rows */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label className="text-base font-semibold">계약 내역</Label>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={addDetailRow}
                >
                  <Plus className="h-4 w-4 mr-1" />
                  계약 추가
                </Button>
              </div>

              {/* Contracts Accordion */}
              <div className="space-y-2">
                {editingDetails.map((detail, index) => {
                  const product = products.find((p) => p.id === detail.product_id);
                  const productName = product?.name || "상품 미선택";
                  const summaryText = detail.monthly_payment
                    ? `${formatCurrency(detail.monthly_payment)} / 수수료 ${formatCurrency(detail.commission_amount)}`
                    : "미입력";

                  return (
                    <Collapsible key={index} defaultOpen={index === editingDetails.length - 1}>
                      <div className="border rounded-lg overflow-hidden">
                        <div className="flex items-center justify-between p-3 bg-muted/30 hover:bg-muted/50 transition-colors">
                          <CollapsibleTrigger asChild>
                            <div className="flex items-center gap-3 flex-1 cursor-pointer">
                              <span className="flex items-center justify-center w-6 h-6 rounded-full bg-primary/10 text-primary text-sm font-medium">
                                {index + 1}
                              </span>
                              <div className="text-left">
                                <div className="font-medium text-sm">
                                  {detail.client_name || "고객명 미입력"}
                                </div>
                                <div className="text-xs text-muted-foreground">
                                  {productName} · {summaryText}
                                </div>
                              </div>
                              <ChevronDown className="h-4 w-4 text-muted-foreground transition-transform duration-200 ml-auto [[data-state=open]_&]:rotate-180" />
                            </div>
                          </CollapsibleTrigger>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 ml-2"
                            onClick={() => removeDetailRow(index)}
                          >
                            <Trash2 className="h-4 w-4 text-muted-foreground hover:text-destructive" />
                          </Button>
                        </div>
                        <CollapsibleContent>
                          <div className="p-4 space-y-4 border-t bg-background">
                            {/* 상품 선택 */}
                            <div className="space-y-2">
                              <Label>보험 상품</Label>
                              <Select
                                value={detail.product_id || "none"}
                                onValueChange={(value) =>
                                  updateDetailRow(
                                    index,
                                    "product_id",
                                    value === "none" ? null : value
                                  )
                                }
                              >
                                <SelectTrigger>
                                  <SelectValue placeholder="상품 선택" />
                                </SelectTrigger>
                                <SelectContent className="max-w-[400px]">
                                  <SelectItem value="none">선택 안함</SelectItem>
                                  {products.map((product) => (
                                    <SelectItem key={product.id} value={product.id}>
                                      <div className="flex items-center justify-between gap-2 w-full">
                                        <span className="truncate">{product.name}</span>
                                        <span className="text-muted-foreground text-xs shrink-0">
                                          {formatCommissionRate(getEffectiveCommissionRate(product.insurer_commission_rate, product.adjustment_rate))}
                                        </span>
                                      </div>
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>

                            {/* 고객명 */}
                            <div className="space-y-2">
                              <Label>고객명</Label>
                              <Popover
                                open={openClientPopover === index}
                                onOpenChange={(open) =>
                                  setOpenClientPopover(open ? index : null)
                                }
                              >
                                <PopoverTrigger asChild>
                                  <Button
                                    variant="outline"
                                    role="combobox"
                                    aria-expanded={openClientPopover === index}
                                    className="w-full justify-between font-normal"
                                  >
                                    {detail.client_name || "고객 선택 또는 입력..."}
                                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                  </Button>
                                </PopoverTrigger>
                                <PopoverContent className="w-[350px] p-0" align="start">
                                  <Command>
                                    <CommandInput
                                      placeholder="고객명 검색 또는 입력..."
                                      onValueChange={(value) => {
                                        // 검색어를 직접 입력값으로 설정할 수 있도록
                                        if (value && !assignedLeads.some(
                                          (lead) =>
                                            (lead.company_name || lead.representative_name || "") === value
                                        )) {
                                          updateDetailRow(index, "client_name", value);
                                        }
                                      }}
                                    />
                                    <CommandList>
                                      {loadingLeads ? (
                                        <div className="py-6 text-center text-sm text-muted-foreground">
                                          리드 불러오는 중...
                                        </div>
                                      ) : (
                                        <>
                                          {assignedLeads.length > 0 ? (
                                            <CommandGroup heading="배분받은 리드">
                                              {assignedLeads.map((lead) => {
                                                const displayName =
                                                  lead.company_name ||
                                                  lead.representative_name ||
                                                  "(이름 없음)";
                                                const subText =
                                                  lead.company_name && lead.representative_name
                                                    ? lead.representative_name
                                                    : null;
                                                return (
                                                  <CommandItem
                                                    key={lead.id}
                                                    value={displayName}
                                                    onSelect={() => {
                                                      updateDetailRow(index, "client_name", displayName);
                                                      setOpenClientPopover(null);
                                                    }}
                                                  >
                                                    <Check
                                                      className={cn(
                                                        "mr-2 h-4 w-4",
                                                        detail.client_name === displayName
                                                          ? "opacity-100"
                                                          : "opacity-0"
                                                      )}
                                                    />
                                                    <div className="flex flex-col">
                                                      <span>{displayName}</span>
                                                      {subText && (
                                                        <span className="text-xs text-muted-foreground">
                                                          대표: {subText}
                                                        </span>
                                                      )}
                                                    </div>
                                                  </CommandItem>
                                                );
                                              })}
                                            </CommandGroup>
                                          ) : (
                                            <div className="py-3 px-2 text-sm text-muted-foreground">
                                              <div className="flex items-center gap-2">
                                                <User className="h-4 w-4" />
                                                <span>배분받은 리드가 없습니다</span>
                                              </div>
                                            </div>
                                          )}
                                          <CommandEmpty>
                                            <div className="py-2 text-center">
                                              <p className="text-sm text-muted-foreground mb-2">
                                                검색 결과가 없습니다
                                              </p>
                                              <Button
                                                variant="outline"
                                                size="sm"
                                                onClick={() => {
                                                  setOpenClientPopover(null);
                                                }}
                                              >
                                                직접 입력으로 사용
                                              </Button>
                                            </div>
                                          </CommandEmpty>
                                        </>
                                      )}
                                    </CommandList>
                                  </Command>
                                  {/* 직접 입력 필드 */}
                                  <div className="border-t p-2">
                                    <div className="flex gap-2">
                                      <Input
                                        placeholder="고객명 직접 입력"
                                        value={detail.client_name}
                                        onChange={(e) =>
                                          updateDetailRow(index, "client_name", e.target.value)
                                        }
                                        maxLength={200}
                                        className="flex-1"
                                      />
                                      <Button
                                        size="sm"
                                        variant="secondary"
                                        onClick={() => setOpenClientPopover(null)}
                                      >
                                        확인
                                      </Button>
                                    </div>
                                  </div>
                                </PopoverContent>
                              </Popover>
                            </div>

                            {/* 월납 금액 & 수수료 */}
                            <div className="grid grid-cols-2 gap-4">
                              <div className="space-y-2">
                                <Label>월납 금액 *</Label>
                                <div className="relative">
                                  <Input
                                    type="text"
                                    inputMode="numeric"
                                    placeholder="0"
                                    value={detail.monthly_payment ? detail.monthly_payment.toLocaleString() : ""}
                                    onChange={(e) => {
                                      const value = e.target.value.replace(/,/g, "");
                                      const numValue = parseFloat(value) || 0;
                                      updateDetailRow(index, "monthly_payment", numValue);
                                    }}
                                    className="pr-8"
                                  />
                                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">
                                    원
                                  </span>
                                </div>
                              </div>
                              <div className="space-y-2">
                                <Label>수수료</Label>
                                <div className="relative">
                                  <Input
                                    type="text"
                                    inputMode="numeric"
                                    value={detail.commission_amount ? detail.commission_amount.toLocaleString() : ""}
                                    onChange={(e) => {
                                      const value = e.target.value.replace(/,/g, "");
                                      const numValue = parseFloat(value) || 0;
                                      updateDetailRow(index, "commission_amount", numValue);
                                    }}
                                    className="pr-8 bg-muted/30"
                                  />
                                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">
                                    원
                                  </span>
                                </div>
                              </div>
                            </div>

                            {/* 계약일 & 메모 */}
                            <div className="grid grid-cols-2 gap-4">
                              <div className="space-y-2">
                                <Label>계약일</Label>
                                <Input
                                  type="date"
                                  value={detail.contract_date}
                                  onChange={(e) =>
                                    updateDetailRow(index, "contract_date", e.target.value)
                                  }
                                />
                              </div>
                              <div className="space-y-2">
                                <Label>메모</Label>
                                <Input
                                  placeholder="메모 입력"
                                  value={detail.memo}
                                  onChange={(e) =>
                                    updateDetailRow(index, "memo", e.target.value)
                                  }
                                  maxLength={500}
                                />
                              </div>
                            </div>
                          </div>
                        </CollapsibleContent>
                      </div>
                    </Collapsible>
                  );
                })}
              </div>
            </div>

            {/* Totals */}
            <div className="p-4 bg-primary/5 border border-primary/20 rounded-lg">
              <div className="flex justify-between items-center">
                <span className="font-medium">합계</span>
                <div className="text-right">
                  <div className="text-lg font-bold">
                    월납: {formatCurrency(calculateTotals().totalPayment)}
                  </div>
                  <div className="text-lg font-bold text-primary">
                    수수료: {formatCurrency(calculateTotals().totalCommission)}
                  </div>
                </div>
              </div>
            </div>

            {/* Notes */}
            <div className="space-y-2">
              <Label>비고</Label>
              <Textarea
                placeholder="추가 메모사항"
                value={editingNotes}
                onChange={(e) => setEditingNotes(e.target.value)}
                rows={2}
                maxLength={1000}
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setDialogOpen(false)}
            >
              취소
            </Button>
            <Button onClick={handleSave} disabled={submitting}>
              <Save className="h-4 w-4 mr-2" />
              {submitting ? "저장 중..." : "저장"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
