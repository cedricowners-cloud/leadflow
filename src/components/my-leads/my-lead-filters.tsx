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

interface Status {
  id: string;
  name: string;
  category: string;
}

export interface MyLeadFiltersValue {
  search: string;
  gradeId: string;
  contactStatusId: string;
  meetingStatusId: string;
  contractStatusId: string;
  startDate: Date | undefined;
  endDate: Date | undefined;
}

interface MyLeadFiltersProps {
  value: MyLeadFiltersValue;
  onChange: (value: MyLeadFiltersValue) => void;
  onRefresh: () => void;
  loading?: boolean;
}

export function MyLeadFilters({
  value,
  onChange,
  onRefresh,
  loading,
}: MyLeadFiltersProps) {
  const [grades, setGrades] = useState<Grade[]>([]);
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

      // 상태값 조회
      const { data: statusesData } = await supabase
        .from("lead_statuses")
        .select("id, name, category")
        .eq("is_active", true)
        .order("display_order");

      setGrades(gradesData || []);
      setStatuses(statusesData || []);
    };

    fetchFilterData();
  }, []);

  const handleChange = (key: keyof MyLeadFiltersValue, newValue: unknown) => {
    onChange({ ...value, [key]: newValue });
  };

  const clearFilters = () => {
    onChange({
      search: "",
      gradeId: "",
      contactStatusId: "",
      meetingStatusId: "",
      contractStatusId: "",
      startDate: undefined,
      endDate: undefined,
    });
  };

  // 활성 필터 개수 계산
  const activeFilterCount = [
    value.gradeId,
    value.contactStatusId,
    value.meetingStatusId,
    value.contractStatusId,
    value.startDate,
    value.endDate,
  ].filter(Boolean).length;

  // 카테고리별 상태 분류
  const contactStatuses = statuses.filter((s) => s.category === "contact");
  const meetingStatuses = statuses.filter((s) => s.category === "meeting");
  const contractStatuses = statuses.filter((s) => s.category === "contract");

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

        {/* 컨택 상태 필터 */}
        <Select
          value={value.contactStatusId || "all"}
          onValueChange={(v) =>
            handleChange("contactStatusId", v === "all" ? "" : v)
          }
        >
          <SelectTrigger className="w-[130px]">
            <SelectValue placeholder="컨택 상태" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">전체 컨택</SelectItem>
            {contactStatuses.map((status) => (
              <SelectItem key={status.id} value={status.id}>
                {status.name}
              </SelectItem>
            ))}
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

              {/* 배분일 범위 */}
              <div className="space-y-2">
                <label className="text-sm text-muted-foreground">
                  배분일 범위
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
