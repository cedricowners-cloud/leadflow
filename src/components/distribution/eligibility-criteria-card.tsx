"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AlertCircle, Calculator, Loader2, Pencil, Shield } from "lucide-react";
import { toast } from "sonner";

// 등급별 설명 타입
export interface GradeDescription {
  title: string;
  description: string;
  note?: string;
}

// 배분 자격 기준 타입 (확장된 버전)
export interface EligibilityThresholds {
  grade_a_min_payment: number;
  grade_b_min_payment: number;
  grade_b_max_payment: number;
  grade_a_description?: GradeDescription;
  grade_b_description?: GradeDescription;
  grade_c_description?: GradeDescription;
  grade_d_description?: GradeDescription;
  footer_note?: string;
}

// 기본값
const DEFAULT_THRESHOLDS: EligibilityThresholds = {
  grade_a_min_payment: 600000,
  grade_b_min_payment: 200000,
  grade_b_max_payment: 600000,
  grade_a_description: {
    title: "A등급 리드 자격",
    description: "전월 보험 월납 ≥ 60만원",
    note: "+ 신입 테스트 통과 필요",
  },
  grade_b_description: {
    title: "B등급 리드 자격",
    description: "전월 보험 월납 ≥ 20만원 AND < 60만원",
    note: "+ 신입 테스트 통과 필요",
  },
  grade_c_description: {
    title: "C등급 리드 자격",
    description: "신입 테스트 통과자 (A, B등급 자격 미달)",
    note: "",
  },
  grade_d_description: {
    title: "D등급 리드 자격",
    description: "신입 트레이니 (테스트 미통과)",
    note: "",
  },
  footer_note: "* 배분 자격은 소프트 적용됩니다 (자격자/비자격자 표시만, 배분 차단 없음)",
};

// 금액 포맷 (만원 단위)
function formatAmount(amount: number): string {
  if (amount >= 10000) {
    const manWon = amount / 10000;
    return `${manWon.toLocaleString()}만원`;
  }
  return `${amount.toLocaleString()}원`;
}

interface EligibilityCriteriaCardProps {
  /** 카드 제목 */
  title?: string;
  /** 카드 아이콘 */
  icon?: "alert" | "calculator" | "shield";
  /** 수정 가능 여부 */
  editable?: boolean;
  /** 간략한 버전 (2x2 그리드, 색상 없음) */
  compact?: boolean;
  /** 컴포넌트 클래스명 */
  className?: string;
  /** thresholds 변경 시 콜백 */
  onThresholdsChange?: (thresholds: EligibilityThresholds) => void;
}

export function EligibilityCriteriaCard({
  title = "배분 자격 기준 안내",
  icon = "alert",
  editable = false,
  compact = false,
  className,
  onThresholdsChange,
}: EligibilityCriteriaCardProps) {
  const [thresholds, setThresholds] = useState<EligibilityThresholds>(DEFAULT_THRESHOLDS);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingThresholds, setEditingThresholds] = useState<EligibilityThresholds>(DEFAULT_THRESHOLDS);
  const [saving, setSaving] = useState(false);

  // 데이터 로드
  useEffect(() => {
    fetchThresholds();
  }, []);

  const fetchThresholds = async () => {
    try {
      const response = await fetch("/api/settings/eligibility-thresholds");
      if (response.ok) {
        const result = await response.json();
        if (result.success && result.data) {
          setThresholds(result.data);
        }
      }
    } catch (error) {
      console.error("Failed to fetch eligibility thresholds:", error);
    } finally {
      setLoading(false);
    }
  };

  // 수정 다이얼로그 열기
  const openEditDialog = () => {
    setEditingThresholds({ ...thresholds });
    setDialogOpen(true);
  };

  // 저장
  const handleSave = async () => {
    // B등급 최대가 A등급 최소와 동일한지 체크
    if (editingThresholds.grade_a_min_payment !== editingThresholds.grade_b_max_payment) {
      toast.error("A등급 최소 금액과 B등급 최대 금액은 동일해야 합니다");
      return;
    }

    if (editingThresholds.grade_b_min_payment >= editingThresholds.grade_b_max_payment) {
      toast.error("B등급 최소 금액은 최대 금액보다 작아야 합니다");
      return;
    }

    setSaving(true);
    try {
      const response = await fetch("/api/settings/eligibility-thresholds", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editingThresholds),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "저장에 실패했습니다");
      }

      toast.success("배분 자격 기준이 저장되었습니다");
      setThresholds(editingThresholds);
      setDialogOpen(false);
      onThresholdsChange?.(editingThresholds);
    } catch (error) {
      console.error("Failed to save thresholds:", error);
      toast.error(error instanceof Error ? error.message : "저장에 실패했습니다");
    } finally {
      setSaving(false);
    }
  };

  // 금액 필드 업데이트
  const updateAmount = (field: keyof EligibilityThresholds, value: string) => {
    const numValue = parseInt(value.replace(/[^0-9]/g, "")) || 0;
    setEditingThresholds((prev) => ({ ...prev, [field]: numValue }));
  };

  // 등급 설명 업데이트
  const updateGradeDescription = (
    grade: "a" | "b" | "c" | "d",
    field: keyof GradeDescription,
    value: string
  ) => {
    const key = `grade_${grade}_description` as keyof EligibilityThresholds;
    setEditingThresholds((prev) => ({
      ...prev,
      [key]: {
        ...(prev[key] as GradeDescription || {}),
        [field]: value,
      },
    }));
  };

  // 아이콘 선택
  const IconComponent = {
    alert: AlertCircle,
    calculator: Calculator,
    shield: Shield,
  }[icon];

  // 로딩 중
  if (loading) {
    return (
      <Card className={className}>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  // Compact 버전 (member-performance 스타일)
  if (compact) {
    return (
      <Card className={className}>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <IconComponent className="h-4 w-4" />
            {title}
          </CardTitle>
          {editable && (
            <Button variant="outline" size="sm" onClick={openEditDialog}>
              <Pencil className="h-4 w-4 mr-2" />
              수정
            </Button>
          )}
        </CardHeader>
        <CardContent>
          <div className="text-sm text-muted-foreground space-y-2">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="p-3 bg-muted rounded-lg">
                <p className="font-medium text-foreground">A등급 자격</p>
                <p>전월 월납 ≥ {formatAmount(thresholds.grade_a_min_payment)}</p>
              </div>
              <div className="p-3 bg-muted rounded-lg">
                <p className="font-medium text-foreground">B등급 자격</p>
                <p>
                  전월 월납 {formatAmount(thresholds.grade_b_min_payment)} ~{" "}
                  {formatAmount(thresholds.grade_b_max_payment)} 미만
                </p>
              </div>
              <div className="p-3 bg-muted rounded-lg">
                <p className="font-medium text-foreground">C등급 자격</p>
                <p>{thresholds.grade_c_description?.description || "신입 TEST 통과자"}</p>
              </div>
              <div className="p-3 bg-muted rounded-lg">
                <p className="font-medium text-foreground">D등급 자격</p>
                <p>{thresholds.grade_d_description?.description || "신입 트레이니"}</p>
              </div>
            </div>
          </div>
        </CardContent>

        {/* Edit Dialog */}
        {renderEditDialog()}
      </Card>
    );
  }

  // Full 버전 (distribution-rules, member-qualifications 스타일)
  return (
    <Card className={className}>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-base flex items-center gap-2">
          <IconComponent className="h-4 w-4" />
          {title}
        </CardTitle>
        {editable && (
          <Button variant="outline" size="sm" onClick={openEditDialog}>
            <Pencil className="h-4 w-4 mr-2" />
            수정
          </Button>
        )}
      </CardHeader>
      <CardContent>
        <div className="text-sm text-muted-foreground space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* A등급 */}
            <div className="bg-green-50 p-3 rounded-lg border border-green-100">
              <p className="font-medium text-green-700 mb-1">
                {thresholds.grade_a_description?.title || "A등급 리드 자격"}
              </p>
              <p className="text-green-600">
                {thresholds.grade_a_description?.description || `전월 보험 월납 ≥ ${formatAmount(thresholds.grade_a_min_payment)}`}
              </p>
              {thresholds.grade_a_description?.note && (
                <p className="text-xs text-green-500 mt-1">{thresholds.grade_a_description.note}</p>
              )}
            </div>

            {/* B등급 */}
            <div className="bg-blue-50 p-3 rounded-lg border border-blue-100">
              <p className="font-medium text-blue-700 mb-1">
                {thresholds.grade_b_description?.title || "B등급 리드 자격"}
              </p>
              <p className="text-blue-600">
                {thresholds.grade_b_description?.description || `전월 보험 월납 ≥ ${formatAmount(thresholds.grade_b_min_payment)} AND < ${formatAmount(thresholds.grade_b_max_payment)}`}
              </p>
              {thresholds.grade_b_description?.note && (
                <p className="text-xs text-blue-500 mt-1">{thresholds.grade_b_description.note}</p>
              )}
            </div>

            {/* C등급 */}
            <div className="bg-yellow-50 p-3 rounded-lg border border-yellow-100">
              <p className="font-medium text-yellow-700 mb-1">
                {thresholds.grade_c_description?.title || "C등급 리드 자격"}
              </p>
              <p className="text-yellow-600">
                {thresholds.grade_c_description?.description || "신입 테스트 통과자 (A, B등급 자격 미달)"}
              </p>
              {thresholds.grade_c_description?.note && (
                <p className="text-xs text-yellow-500 mt-1">{thresholds.grade_c_description.note}</p>
              )}
            </div>

            {/* D등급 */}
            <div className="bg-gray-50 p-3 rounded-lg border border-gray-200">
              <p className="font-medium text-gray-700 mb-1">
                {thresholds.grade_d_description?.title || "D등급 리드 자격"}
              </p>
              <p className="text-gray-600">
                {thresholds.grade_d_description?.description || "신입 트레이니 (테스트 미통과)"}
              </p>
              {thresholds.grade_d_description?.note && (
                <p className="text-xs text-gray-500 mt-1">{thresholds.grade_d_description.note}</p>
              )}
            </div>
          </div>

          {thresholds.footer_note && (
            <p className="text-xs mt-4">{thresholds.footer_note}</p>
          )}
        </div>
      </CardContent>

      {/* Edit Dialog */}
      {renderEditDialog()}
    </Card>
  );

  function renderEditDialog() {
    return (
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>배분 자격 기준 설정</DialogTitle>
            <DialogDescription>
              등급별 리드 배분 자격 기준과 안내 문구를 설정합니다.
            </DialogDescription>
          </DialogHeader>

          <Tabs defaultValue="amounts" className="mt-4">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="amounts">금액 기준</TabsTrigger>
              <TabsTrigger value="descriptions">안내 문구</TabsTrigger>
            </TabsList>

            {/* 금액 기준 탭 */}
            <TabsContent value="amounts" className="space-y-4 mt-4">
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>A등급 최소 월납 (원)</Label>
                    <Input
                      type="text"
                      value={editingThresholds.grade_a_min_payment.toLocaleString()}
                      onChange={(e) => updateAmount("grade_a_min_payment", e.target.value)}
                    />
                    <p className="text-xs text-muted-foreground">
                      {formatAmount(editingThresholds.grade_a_min_payment)} 이상
                    </p>
                  </div>
                  <div className="space-y-2 opacity-50">
                    <Label>B등급 최대 월납 (원)</Label>
                    <Input
                      type="text"
                      value={editingThresholds.grade_a_min_payment.toLocaleString()}
                      disabled
                    />
                    <p className="text-xs text-muted-foreground">
                      A등급 최소값과 동일
                    </p>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>B등급 최소 월납 (원)</Label>
                    <Input
                      type="text"
                      value={editingThresholds.grade_b_min_payment.toLocaleString()}
                      onChange={(e) => updateAmount("grade_b_min_payment", e.target.value)}
                    />
                    <p className="text-xs text-muted-foreground">
                      {formatAmount(editingThresholds.grade_b_min_payment)} 이상 ~{" "}
                      {formatAmount(editingThresholds.grade_a_min_payment)} 미만
                    </p>
                  </div>
                </div>

                <div className="mt-4 p-3 bg-muted/50 rounded-lg text-sm">
                  <p className="font-medium mb-2">자격 기준 요약</p>
                  <ul className="space-y-1 text-muted-foreground">
                    <li>• A등급: {formatAmount(editingThresholds.grade_a_min_payment)} 이상</li>
                    <li>
                      • B등급: {formatAmount(editingThresholds.grade_b_min_payment)} 이상 ~{" "}
                      {formatAmount(editingThresholds.grade_a_min_payment)} 미만
                    </li>
                    <li>• C등급: {editingThresholds.grade_c_description?.description || "신입 테스트 통과자 (A, B등급 자격 미달)"}</li>
                    <li>• D등급: {editingThresholds.grade_d_description?.description || "신입 트레이니 (테스트 미통과)"}</li>
                  </ul>
                </div>
              </div>
            </TabsContent>

            {/* 안내 문구 탭 */}
            <TabsContent value="descriptions" className="space-y-4 mt-4">
              {/* A등급 문구 */}
              <div className="space-y-3 p-4 bg-green-50 rounded-lg border border-green-100">
                <p className="font-medium text-green-700">A등급 문구</p>
                <div className="space-y-2">
                  <Label className="text-xs">제목</Label>
                  <Input
                    value={editingThresholds.grade_a_description?.title || ""}
                    onChange={(e) => updateGradeDescription("a", "title", e.target.value)}
                    placeholder="A등급 리드 자격"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs">설명</Label>
                  <Input
                    value={editingThresholds.grade_a_description?.description || ""}
                    onChange={(e) => updateGradeDescription("a", "description", e.target.value)}
                    placeholder="전월 보험 월납 ≥ 60만원"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs">비고 (선택)</Label>
                  <Input
                    value={editingThresholds.grade_a_description?.note || ""}
                    onChange={(e) => updateGradeDescription("a", "note", e.target.value)}
                    placeholder="+ 신입 테스트 통과 필요"
                  />
                </div>
              </div>

              {/* B등급 문구 */}
              <div className="space-y-3 p-4 bg-blue-50 rounded-lg border border-blue-100">
                <p className="font-medium text-blue-700">B등급 문구</p>
                <div className="space-y-2">
                  <Label className="text-xs">제목</Label>
                  <Input
                    value={editingThresholds.grade_b_description?.title || ""}
                    onChange={(e) => updateGradeDescription("b", "title", e.target.value)}
                    placeholder="B등급 리드 자격"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs">설명</Label>
                  <Input
                    value={editingThresholds.grade_b_description?.description || ""}
                    onChange={(e) => updateGradeDescription("b", "description", e.target.value)}
                    placeholder="전월 보험 월납 ≥ 20만원 AND < 60만원"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs">비고 (선택)</Label>
                  <Input
                    value={editingThresholds.grade_b_description?.note || ""}
                    onChange={(e) => updateGradeDescription("b", "note", e.target.value)}
                    placeholder="+ 신입 테스트 통과 필요"
                  />
                </div>
              </div>

              {/* C등급 문구 */}
              <div className="space-y-3 p-4 bg-yellow-50 rounded-lg border border-yellow-100">
                <p className="font-medium text-yellow-700">C등급 문구</p>
                <div className="space-y-2">
                  <Label className="text-xs">제목</Label>
                  <Input
                    value={editingThresholds.grade_c_description?.title || ""}
                    onChange={(e) => updateGradeDescription("c", "title", e.target.value)}
                    placeholder="C등급 리드 자격"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs">설명</Label>
                  <Input
                    value={editingThresholds.grade_c_description?.description || ""}
                    onChange={(e) => updateGradeDescription("c", "description", e.target.value)}
                    placeholder="신입 테스트 통과자 (A, B등급 자격 미달)"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs">비고 (선택)</Label>
                  <Input
                    value={editingThresholds.grade_c_description?.note || ""}
                    onChange={(e) => updateGradeDescription("c", "note", e.target.value)}
                    placeholder=""
                  />
                </div>
              </div>

              {/* D등급 문구 */}
              <div className="space-y-3 p-4 bg-gray-50 rounded-lg border border-gray-200">
                <p className="font-medium text-gray-700">D등급 문구</p>
                <div className="space-y-2">
                  <Label className="text-xs">제목</Label>
                  <Input
                    value={editingThresholds.grade_d_description?.title || ""}
                    onChange={(e) => updateGradeDescription("d", "title", e.target.value)}
                    placeholder="D등급 리드 자격"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs">설명</Label>
                  <Input
                    value={editingThresholds.grade_d_description?.description || ""}
                    onChange={(e) => updateGradeDescription("d", "description", e.target.value)}
                    placeholder="신입 트레이니 (테스트 미통과)"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs">비고 (선택)</Label>
                  <Input
                    value={editingThresholds.grade_d_description?.note || ""}
                    onChange={(e) => updateGradeDescription("d", "note", e.target.value)}
                    placeholder=""
                  />
                </div>
              </div>

              {/* 하단 안내 문구 */}
              <div className="space-y-2">
                <Label>하단 안내 문구</Label>
                <Textarea
                  value={editingThresholds.footer_note || ""}
                  onChange={(e) =>
                    setEditingThresholds((prev) => ({ ...prev, footer_note: e.target.value }))
                  }
                  placeholder="* 배분 자격은 소프트 적용됩니다 (자격자/비자격자 표시만, 배분 차단 없음)"
                  rows={2}
                />
              </div>
            </TabsContent>
          </Tabs>

          <div className="flex justify-end gap-2 mt-6">
            <Button variant="outline" onClick={() => setDialogOpen(false)} disabled={saving}>
              취소
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              저장
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    );
  }
}

// 타입 export
export type { EligibilityCriteriaCardProps };
