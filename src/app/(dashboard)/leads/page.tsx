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
import { Upload, Download, ChevronLeft, ChevronRight } from "lucide-react";
import { toast } from "sonner";
import {
  ColumnSettingsDialog,
  ColumnSetting,
} from "@/components/leads/column-settings-dialog";

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
          <Link href="/leads/upload">
            <Button>
              <Upload className="mr-2 h-4 w-4" />
              업로드
            </Button>
          </Link>
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
              {/* 페이지네이션 */}
              {pagination.totalPages > 1 && (
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">
                    {pagination.page} / {pagination.totalPages} 페이지
                  </span>
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => handlePageChange(pagination.page - 1)}
                    disabled={pagination.page === 1 || loading}
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => handlePageChange(pagination.page + 1)}
                    disabled={
                      pagination.page === pagination.totalPages || loading
                    }
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              )}
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
