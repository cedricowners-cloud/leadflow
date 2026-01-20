"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Header } from "@/components/layout/header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
import { Badge } from "@/components/ui/badge";
import {
  Plus,
  Trash2,
  GripVertical,
  Save,
  RotateCcw,
  AlertCircle,
  Lightbulb,
} from "lucide-react";
import { toast } from "sonner";
import { CORE_FIELDS } from "@/lib/constants/lead-fields";

interface CsvMapping {
  id?: string;
  csv_column: string;
  system_field: string;
  is_required: boolean;
  is_core_field?: boolean;
  field_type?: string;
  field_label?: string;
  field_description?: string;
  display_order: number;
  is_visible_in_list?: boolean;
}

// CORE_FIELDS를 시스템 필드 목록으로 변환
const SYSTEM_FIELDS = CORE_FIELDS.map((field) => ({
  value: field.systemField,
  label: field.label,
  description: field.description || "",
  fieldType: field.fieldType,
  isRequired: field.isRequired,
  defaultCsvColumn: field.defaultCsvColumn,
}));

export default function CsvMappingPage() {
  const [mappings, setMappings] = useState<CsvMapping[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [newMapping, setNewMapping] = useState<CsvMapping>({
    csv_column: "",
    system_field: "",
    is_required: false,
    display_order: 0,
  });
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);

  // 매핑 목록 조회
  const fetchMappings = async () => {
    try {
      const res = await fetch("/api/csv-mappings");
      const data = await res.json();

      if (res.ok) {
        setMappings(data.data || []);
      } else {
        toast.error(data.error || "매핑 목록을 불러오는데 실패했습니다.");
      }
    } catch {
      toast.error("서버 연결에 실패했습니다.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMappings();
  }, []);

  // 매핑 추가
  const handleAddMapping = () => {
    if (!newMapping.csv_column || !newMapping.system_field) {
      toast.error("CSV 컬럼명과 시스템 필드를 모두 입력해주세요.");
      return;
    }

    // 중복 체크
    if (mappings.some((m) => m.system_field === newMapping.system_field)) {
      toast.error("이미 매핑된 시스템 필드입니다.");
      return;
    }

    // 선택된 시스템 필드 정보 가져오기
    const selectedField = SYSTEM_FIELDS.find(
      (f) => f.value === newMapping.system_field
    );

    setMappings([
      ...mappings,
      {
        ...newMapping,
        is_core_field: true,
        field_type: selectedField?.fieldType || "text",
        field_label: selectedField?.label,
        field_description: selectedField?.description,
        display_order: mappings.length,
        is_visible_in_list: false,
      },
    ]);

    setNewMapping({
      csv_column: "",
      system_field: "",
      is_required: false,
      display_order: 0,
    });
    setIsAddDialogOpen(false);

    toast.success("매핑이 추가되었습니다. 저장을 눌러 변경사항을 적용하세요.");
  };

  // 매핑 삭제
  const handleDeleteMapping = (index: number) => {
    const updated = mappings.filter((_, i) => i !== index);
    // display_order 재정렬
    updated.forEach((m, i) => (m.display_order = i));
    setMappings(updated);

    toast.success("매핑이 삭제되었습니다. 저장을 눌러 변경사항을 적용하세요.");
  };

  // 필수 여부 토글
  const handleToggleRequired = (index: number) => {
    const updated = [...mappings];
    updated[index].is_required = !updated[index].is_required;
    setMappings(updated);
  };

  // CSV 컬럼명 수정
  const handleColumnNameChange = (index: number, value: string) => {
    const updated = [...mappings];
    updated[index].csv_column = value;
    setMappings(updated);
  };

  // 드래그 앤 드롭
  const handleDragStart = (index: number) => {
    setDraggedIndex(index);
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (draggedIndex === null || draggedIndex === index) return;

    const updated = [...mappings];
    const [removed] = updated.splice(draggedIndex, 1);
    updated.splice(index, 0, removed);
    updated.forEach((m, i) => (m.display_order = i));

    setMappings(updated);
    setDraggedIndex(index);
  };

  const handleDragEnd = () => {
    setDraggedIndex(null);
  };

  // 저장
  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await fetch("/api/csv-mappings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mappings }),
      });

      const data = await res.json();

      if (res.ok) {
        setMappings(data.data || []);
        toast.success("CSV 매핑 설정이 저장되었습니다.");
      } else {
        toast.error(data.error || "저장 중 오류가 발생했습니다.");
      }
    } catch {
      toast.error("서버 연결에 실패했습니다.");
    } finally {
      setSaving(false);
    }
  };

  // 기본값 복원 (CORE_FIELDS 기반)
  const handleReset = () => {
    const defaultMappings: CsvMapping[] = CORE_FIELDS
      .filter((field) => field.defaultCsvColumn) // 기본 CSV 컬럼명이 있는 필드만
      .map((field, index) => ({
        csv_column: field.defaultCsvColumn!,
        system_field: field.systemField,
        is_required: field.isRequired,
        is_core_field: true,
        field_type: field.fieldType,
        field_label: field.label,
        field_description: field.description,
        display_order: index,
        is_visible_in_list: field.defaultVisible,
      }));
    setMappings(defaultMappings);
    toast.success("기본 매핑으로 초기화되었습니다. 저장을 눌러 적용하세요.");
  };

  // 사용되지 않은 시스템 필드
  const usedFields = new Set(mappings.map((m) => m.system_field));
  const availableFields = SYSTEM_FIELDS.filter((f) => !usedFields.has(f.value));

  const getFieldLabel = (value: string) => {
    return SYSTEM_FIELDS.find((f) => f.value === value)?.label || value;
  };

  if (loading) {
    return (
      <>
        <Header title="CSV 매핑 설정" description="CSV 파일 컬럼과 시스템 필드 간의 매핑을 설정합니다" />
        <div className="flex-1 p-6">
          <div className="text-center py-12 text-muted-foreground">
            로딩 중...
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <Header title="CSV 매핑 설정" description="CSV 파일 컬럼과 시스템 필드 간의 매핑을 설정합니다" />
      <div className="flex-1 space-y-6 p-6">
        {/* 안내 카드 */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <AlertCircle className="h-4 w-4 text-blue-500" />
              CSV 매핑 안내
            </CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground space-y-2">
            <p>• CSV 파일의 컬럼명과 시스템의 필드를 연결합니다.</p>
            <p>• <strong>한글, 영어 등 어떤 컬럼명이든</strong> 자유롭게 매핑할 수 있습니다. (예: &quot;업체명&quot;, &quot;company_name&quot;, &quot;회사명&quot; 등)</p>
            <p>• 여기서 설정하지 않은 컬럼은 시스템 기본 매핑(한글/영어)으로 자동 인식됩니다.</p>
            <p>• 드래그하여 순서를 변경할 수 있습니다.</p>
            <p>• <Badge variant="destructive" className="text-xs">필수</Badge> 표시된 필드는 CSV 파일에 반드시 포함되어야 합니다.</p>
            <p>• 변경 후 반드시 <strong>저장</strong> 버튼을 눌러주세요.</p>
            <div className="pt-2 border-t mt-2 flex items-start gap-2">
              <Lightbulb className="h-4 w-4 mt-0.5 text-amber-500 flex-shrink-0" />
              <p>
                <strong>참고:</strong> 현재 {mappings.length}개 필드가 매핑되어 있습니다 (매핑 가능한 필드: {SYSTEM_FIELDS.length}개).
                등급, 담당자, 상태 등은 시스템에서 자동 생성되므로 CSV 매핑 대상이 아닙니다.
                리드 목록의 컬럼 표시/숨기기는 <Link href="/leads?openColumnSettings=true" className="text-primary underline">리드 컬럼 설정</Link>에서 관리하세요.
              </p>
            </div>
          </CardContent>
        </Card>

        {/* 매핑 테이블 */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>컬럼 매핑</CardTitle>
                <CardDescription>
                  총 {mappings.length}개의 매핑이 설정되어 있습니다
                </CardDescription>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={handleReset}>
                  <RotateCcw className="h-4 w-4 mr-2" />
                  기본값 복원
                </Button>
                <Button size="sm" onClick={() => setIsAddDialogOpen(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  매핑 추가
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {mappings.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <p>설정된 매핑이 없습니다.</p>
                <p className="text-sm mt-2">기본값 복원 또는 매핑 추가를 눌러 시작하세요.</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-10"></TableHead>
                    <TableHead className="w-10">순서</TableHead>
                    <TableHead>CSV 컬럼명</TableHead>
                    <TableHead>시스템 필드</TableHead>
                    <TableHead className="w-24 text-center">필수</TableHead>
                    <TableHead className="w-20"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {mappings.map((mapping, index) => (
                    <TableRow
                      key={index}
                      draggable
                      onDragStart={() => handleDragStart(index)}
                      onDragOver={(e) => handleDragOver(e, index)}
                      onDragEnd={handleDragEnd}
                      className={draggedIndex === index ? "opacity-50" : ""}
                    >
                      <TableCell>
                        <GripVertical className="h-4 w-4 text-muted-foreground cursor-grab" />
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {index + 1}
                      </TableCell>
                      <TableCell>
                        <Input
                          value={mapping.csv_column}
                          onChange={(e) => handleColumnNameChange(index, e.target.value)}
                          className="h-8"
                          placeholder="CSV 컬럼명"
                        />
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">
                          {getFieldLabel(mapping.system_field)}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-center">
                        <Switch
                          checked={mapping.is_required}
                          onCheckedChange={() => handleToggleRequired(index)}
                        />
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDeleteMapping(index)}
                          className="h-8 w-8 text-destructive hover:text-destructive"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        {/* 저장 버튼 */}
        <div className="flex justify-end">
          <Button onClick={handleSave} disabled={saving}>
            <Save className="h-4 w-4 mr-2" />
            {saving ? "저장 중..." : "변경사항 저장"}
          </Button>
        </div>

        {/* 매핑 추가 다이얼로그 */}
        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>매핑 추가</DialogTitle>
              <DialogDescription>
                CSV 컬럼과 시스템 필드를 연결합니다.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="csv_column">CSV 컬럼명</Label>
                <Input
                  id="csv_column"
                  value={newMapping.csv_column}
                  onChange={(e) =>
                    setNewMapping({ ...newMapping, csv_column: e.target.value })
                  }
                  placeholder="예: 업체명, company_name, 회사명"
                />
                <p className="text-xs text-muted-foreground">
                  CSV 파일의 첫 번째 행(헤더)에 있는 컬럼명을 입력하세요. 한글, 영어 모두 가능합니다.
                </p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="system_field">시스템 필드</Label>
                <Select
                  value={newMapping.system_field}
                  onValueChange={(value) =>
                    setNewMapping({ ...newMapping, system_field: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="필드 선택" />
                  </SelectTrigger>
                  <SelectContent>
                    {availableFields.map((field) => (
                      <SelectItem key={field.value} value={field.value}>
                        <div className="flex flex-col">
                          <span>{field.label}</span>
                          <span className="text-xs text-muted-foreground">
                            {field.description}
                          </span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {availableFields.length === 0 && (
                  <p className="text-xs text-amber-600">
                    모든 시스템 필드가 이미 매핑되어 있습니다.
                  </p>
                )}
              </div>
              <div className="flex items-center space-x-2">
                <Switch
                  id="is_required"
                  checked={newMapping.is_required}
                  onCheckedChange={(checked) =>
                    setNewMapping({ ...newMapping, is_required: checked })
                  }
                />
                <Label htmlFor="is_required">필수 필드로 지정</Label>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>
                취소
              </Button>
              <Button onClick={handleAddMapping} disabled={availableFields.length === 0}>
                추가
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </>
  );
}
