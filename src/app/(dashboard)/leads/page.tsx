"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import Link from "next/link";
import { useSearchParams, useRouter } from "next/navigation";
import { Header } from "@/components/layout/header";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { LeadFilters, LeadFiltersValue } from "@/components/leads/lead-filters";
import { LeadTable, Lead } from "@/components/leads/lead-table";
import { BulkActionBar } from "@/components/leads/bulk-action-bar";
import { Upload, Download } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
  PaginationFirst,
  PaginationLast,
} from "@/components/ui/pagination";
import { toast } from "sonner";
import {
  ColumnSettingsDialog,
  ColumnSetting,
} from "@/components/leads/column-settings-dialog";
import { createClient } from "@/lib/supabase/client";

interface PaginationInfo {
  page: number;
  limit: number;
  totalCount: number;
  totalPages: number;
}

const initialFilters: LeadFiltersValue = {
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
};

export default function LeadsPage() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState<LeadFiltersValue>(initialFilters);
  const [pagination, setPagination] = useState<PaginationInfo>({
    page: 1,
    limit: 50,
    totalCount: 0,
    totalPages: 0,
  });
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [columnSettings, setColumnSettings] = useState<ColumnSetting[]>([]);
  const [currentRole, setCurrentRole] = useState<string | null>(null);

  // 현재 사용자 role 조회
  useEffect(() => {
    const fetchCurrentUser = async () => {
      try {
        const supabase = createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const { data: member } = await supabase
            .from("members")
            .select("role")
            .eq("user_id", user.id)
            .single();
          if (member) {
            setCurrentRole(member.role);
          }
        }
      } catch (error) {
        console.error("Error fetching current user:", error);
      }
    };
    fetchCurrentUser();
  }, []);

  // URL 파라미터로 컬럼 설정 다이얼로그 열기 상태 관리
  const isColumnSettingsOpen = searchParams.get("openColumnSettings") === "true";

  const handleColumnSettingsOpenChange = (open: boolean) => {
    if (open) {
      router.push("/leads?openColumnSettings=true");
    } else {
      // 다이얼로그 닫을 때 URL 파라미터 제거
      router.push("/leads");
    }
  };

  // 컬럼 설정 조회
  const fetchColumnSettings = useCallback(async () => {
    try {
      const response = await fetch("/api/settings/lead-columns");
      const result = await response.json();
      if (result.success) {
        setColumnSettings(result.data);
      }
    } catch (error) {
      console.error("Error fetching column settings:", error);
    }
  }, []);

  // 초기 컬럼 설정 로드
  useEffect(() => {
    fetchColumnSettings();
  }, [fetchColumnSettings]);

  // 리드 목록 조회
  const fetchLeads = useCallback(async () => {
    setLoading(true);

    try {
      const params = new URLSearchParams({
        page: pagination.page.toString(),
        limit: pagination.limit.toString(),
      });

      // 필터 적용
      if (filters.search) params.set("search", filters.search);
      if (filters.gradeId) params.set("gradeId", filters.gradeId);
      if (filters.teamId) params.set("teamId", filters.teamId);
      if (filters.memberId) params.set("memberId", filters.memberId);
      if (filters.contactStatusId)
        params.set("contactStatusId", filters.contactStatusId);
      if (filters.meetingStatusId)
        params.set("meetingStatusId", filters.meetingStatusId);
      if (filters.contractStatusId)
        params.set("contractStatusId", filters.contractStatusId);
      if (filters.assignedStatus !== "all")
        params.set("assignedStatus", filters.assignedStatus);
      if (filters.startDate)
        params.set("startDate", filters.startDate.toISOString().split("T")[0]);
      if (filters.endDate)
        params.set("endDate", filters.endDate.toISOString().split("T")[0]);

      const response = await fetch(`/api/leads?${params.toString()}`);
      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "리드 목록을 불러오는데 실패했습니다");
      }

      setLeads(result.data.leads);
      setPagination((prev) => ({
        ...prev,
        totalCount: result.data.pagination.totalCount,
        totalPages: result.data.pagination.totalPages,
      }));
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "리드 목록을 불러오는데 실패했습니다"
      );
      setLeads([]);
    } finally {
      setLoading(false);
    }
  }, [pagination.page, pagination.limit, filters]);

  // 초기 로드 및 필터 변경 시 재조회
  useEffect(() => {
    const debounce = setTimeout(() => {
      fetchLeads();
    }, 300);

    return () => clearTimeout(debounce);
  }, [fetchLeads]);

  // 필터 변경 시 페이지 초기화
  const handleFiltersChange = (newFilters: LeadFiltersValue) => {
    setFilters(newFilters);
    setPagination((prev) => ({ ...prev, page: 1 }));
    setSelectedIds([]);
  };

  // 페이지 변경
  const handlePageChange = (newPage: number) => {
    setPagination((prev) => ({ ...prev, page: newPage }));
    setSelectedIds([]);
  };

  // 새로고침
  const handleRefresh = () => {
    setSelectedIds([]);
    fetchLeads();
  };

  // 선택 변경
  const handleSelectionChange = (ids: string[]) => {
    setSelectedIds(ids);
  };

  // 선택된 리드들의 공통 등급명 계산
  const selectedGradeName = useMemo(() => {
    if (selectedIds.length === 0) return undefined;

    const selectedLeads = leads.filter((lead) => selectedIds.includes(lead.id));
    if (selectedLeads.length === 0) return undefined;

    // 첫 번째 선택된 리드의 등급
    const firstGrade = selectedLeads[0]?.grade?.name;
    if (!firstGrade) return undefined;

    // 모든 선택된 리드가 같은 등급인지 확인
    const allSameGrade = selectedLeads.every(
      (lead) => lead.grade?.name === firstGrade
    );

    return allSameGrade ? firstGrade : undefined;
  }, [selectedIds, leads]);

  // 액션 완료 후 새로고침
  const handleActionComplete = () => {
    fetchLeads();
  };

  // 선택 해제
  const handleClearSelection = () => {
    setSelectedIds([]);
  };

  // Excel 내보내기 (추후 구현)
  const handleExport = () => {
    toast.info("Excel 내보내기 기능은 추후 지원됩니다.");
  };

  return (
    <>
      <Header
        title="리드 관리"
        description="업로드된 리드를 조회하고 팀장에게 배분합니다."
      />
      <div className="flex flex-1 flex-col gap-4 p-4">
        {/* 필터 */}
        <LeadFilters
          value={filters}
          onChange={handleFiltersChange}
          onRefresh={handleRefresh}
          loading={loading}
        />

        {/* 액션 버튼 */}
        <div className="flex items-center gap-2">
          <ColumnSettingsDialog
              open={isColumnSettingsOpen}
              onOpenChange={handleColumnSettingsOpenChange}
              onSettingsChange={setColumnSettings}
            />
          <Button variant="outline" onClick={handleExport}>
            <Download className="mr-2 h-4 w-4" />
            내보내기
          </Button>
          {/* 시스템 관리자만 업로드 버튼 표시 */}
          {currentRole === "system_admin" && (
            <Link href="/leads/upload">
              <Button>
                <Upload className="mr-2 h-4 w-4" />
                업로드
              </Button>
            </Link>
          )}
        </div>

        {/* 리드 테이블 */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>리드 목록</CardTitle>
                <CardDescription>
                  총 {pagination.totalCount.toLocaleString()}건의 리드
                  {selectedIds.length > 0 && (
                    <span className="ml-2 text-primary">
                      ({selectedIds.length}건 선택됨)
                    </span>
                  )}
                </CardDescription>
              </div>
{/* 페이지당 표시 건수 */}
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">표시:</span>
                <Select
                  value={pagination.limit.toString()}
                  onValueChange={(value) => {
                    setPagination((prev) => ({
                      ...prev,
                      limit: parseInt(value),
                      page: 1,
                    }));
                  }}
                >
                  <SelectTrigger className="w-[80px] h-8">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="25">25</SelectItem>
                    <SelectItem value="50">50</SelectItem>
                    <SelectItem value="100">100</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <LeadTable
              leads={leads}
              loading={loading}
              selectedIds={selectedIds}
              onSelectionChange={handleSelectionChange}
              onLeadUpdate={handleActionComplete}
              columnSettings={columnSettings}
            />

            {/* 페이지네이션 */}
            {pagination.totalPages > 1 && (
              <div className="mt-4 flex items-center justify-between">
                <div className="text-sm text-muted-foreground">
                  {((pagination.page - 1) * pagination.limit + 1).toLocaleString()}
                  {" - "}
                  {Math.min(
                    pagination.page * pagination.limit,
                    pagination.totalCount
                  ).toLocaleString()}
                  {" / "}
                  {pagination.totalCount.toLocaleString()}건
                </div>
                <Pagination>
                  <PaginationContent>
                    <PaginationItem>
                      <PaginationFirst
                        onClick={() => handlePageChange(1)}
                        disabled={pagination.page === 1 || loading}
                      />
                    </PaginationItem>
                    <PaginationItem>
                      <PaginationPrevious
                        onClick={() => handlePageChange(pagination.page - 1)}
                        disabled={pagination.page === 1 || loading}
                      />
                    </PaginationItem>

                    {/* 페이지 번호들 */}
                    {(() => {
                      const pages: (number | "ellipsis")[] = [];
                      const current = pagination.page;
                      const total = pagination.totalPages;

                      if (total <= 7) {
                        // 7페이지 이하면 모두 표시
                        for (let i = 1; i <= total; i++) {
                          pages.push(i);
                        }
                      } else {
                        // 항상 첫 페이지
                        pages.push(1);

                        if (current > 3) {
                          pages.push("ellipsis");
                        }

                        // 현재 페이지 주변
                        const start = Math.max(2, current - 1);
                        const end = Math.min(total - 1, current + 1);

                        for (let i = start; i <= end; i++) {
                          pages.push(i);
                        }

                        if (current < total - 2) {
                          pages.push("ellipsis");
                        }

                        // 항상 마지막 페이지
                        pages.push(total);
                      }

                      return pages.map((page, index) =>
                        page === "ellipsis" ? (
                          <PaginationItem key={`ellipsis-${index}`}>
                            <PaginationEllipsis />
                          </PaginationItem>
                        ) : (
                          <PaginationItem key={page}>
                            <PaginationLink
                              onClick={() => handlePageChange(page)}
                              isActive={page === current}
                              disabled={loading}
                            >
                              {page}
                            </PaginationLink>
                          </PaginationItem>
                        )
                      );
                    })()}

                    <PaginationItem>
                      <PaginationNext
                        onClick={() => handlePageChange(pagination.page + 1)}
                        disabled={pagination.page === pagination.totalPages || loading}
                      />
                    </PaginationItem>
                    <PaginationItem>
                      <PaginationLast
                        onClick={() => handlePageChange(pagination.totalPages)}
                        disabled={pagination.page === pagination.totalPages || loading}
                      />
                    </PaginationItem>
                  </PaginationContent>
                </Pagination>
              </div>
            )}
          </CardContent>
        </Card>

        {/* 일괄 작업 바 */}
        <BulkActionBar
          selectedIds={selectedIds}
          selectedGradeName={selectedGradeName}
          onClearSelection={handleClearSelection}
          onActionComplete={handleActionComplete}
        />
      </div>
    </>
  );
}
