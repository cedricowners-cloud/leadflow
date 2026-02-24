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
import { Button } from "@/components/ui/button";
import { MyLeadFilters, MyLeadFiltersValue } from "@/components/my-leads/my-lead-filters";
import { MyLeadTable, MyLead } from "@/components/my-leads/my-lead-table";
import { MyStatsSummary } from "@/components/my-leads/my-stats-summary";
import { ChevronLeft, ChevronRight, Download } from "lucide-react";
import { toast } from "sonner";

interface PaginationInfo {
  page: number;
  limit: number;
  totalCount: number;
  totalPages: number;
}

const initialFilters: MyLeadFiltersValue = {
  search: "",
  gradeId: "",
  contactStatusId: "",
  meetingStatusId: "",
  contractStatusId: "",
  startDate: undefined,
  endDate: undefined,
};

export default function MyLeadsPage() {
  const [leads, setLeads] = useState<MyLead[]>([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState<MyLeadFiltersValue>(initialFilters);
  const [pagination, setPagination] = useState<PaginationInfo>({
    page: 1,
    limit: 50,
    totalCount: 0,
    totalPages: 0,
  });

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
      if (filters.contactStatusId)
        params.set("contactStatusId", filters.contactStatusId);
      if (filters.meetingStatusId)
        params.set("meetingStatusId", filters.meetingStatusId);
      if (filters.contractStatusId)
        params.set("contractStatusId", filters.contractStatusId);
      if (filters.startDate) {
        const d = filters.startDate;
        params.set("startDate", `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`);
      }
      if (filters.endDate) {
        const d = filters.endDate;
        params.set("endDate", `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`);
      }

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
  const handleFiltersChange = (newFilters: MyLeadFiltersValue) => {
    setFilters(newFilters);
    setPagination((prev) => ({ ...prev, page: 1 }));
  };

  // 페이지 변경
  const handlePageChange = (newPage: number) => {
    setPagination((prev) => ({ ...prev, page: newPage }));
  };

  // 새로고침
  const handleRefresh = () => {
    fetchLeads();
  };

  // Excel 내보내기 (추후 구현)
  const handleExport = () => {
    toast.info("Excel 내보내기 기능은 추후 지원됩니다.");
  };

  return (
    <>
      <Header
        title="내 리드"
        description="배분받은 리드를 확인하고 컨택 결과를 입력하세요."
      />
      <div className="flex flex-1 flex-col gap-4 p-4">
        {/* 내 실적 요약 */}
        <MyStatsSummary />

        {/* 필터 */}
        <MyLeadFilters
          value={filters}
          onChange={handleFiltersChange}
          onRefresh={handleRefresh}
          loading={loading}
        />

        {/* 액션 버튼 */}
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={handleExport}>
            <Download className="mr-2 h-4 w-4" />
            내보내기
          </Button>
        </div>

        {/* 리드 테이블 */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>내 리드 목록</CardTitle>
                <CardDescription>
                  총 {pagination.totalCount.toLocaleString()}건의 리드가 배분되어 있습니다
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
            <MyLeadTable
              leads={leads}
              loading={loading}
              onLeadUpdate={handleRefresh}
            />
          </CardContent>
        </Card>
      </div>
    </>
  );
}
