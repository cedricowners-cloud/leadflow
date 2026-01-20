"use client";

import { useEffect, useState, useCallback } from "react";
import {
  Plus,
  Pencil,
  Trash2,
  Settings2,
  FlaskConical,
  X,
  Shield,
  Users,
  CheckCircle,
  XCircle,
  AlertCircle,
} from "lucide-react";
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";

// Types
interface LeadGrade {
  id: string;
  name: string;
  color: string | null;
  priority: number;
}

interface Condition {
  field: string;
  operator: string;
  value: string | number | boolean | (string | number)[];
}

interface DistributionRule {
  id: string;
  grade_id: string;
  name: string;
  conditions: Condition[];
  logic_operator: "AND" | "OR";
  exclusion_rules: string[];
  priority: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  grade?: LeadGrade;
}

interface Team {
  id: string;
  name: string;
}

interface Member {
  id: string;
  name: string;
  email: string;
  team: Team | null;
}

interface MemberQualification {
  id: string;
  member_id: string;
  level: "trainee" | "regular" | "senior";
  newbie_test_passed: boolean;
  member: Member;
}

interface MonthlyPerformance {
  id: string;
  member_id: string;
  year: number;
  month: number;
  insurance_monthly_payment: number;
  member: Member;
}

interface EligibleMember {
  member: Member;
  qualification: MemberQualification | null;
  previousMonthPerformance: MonthlyPerformance | null;
  isEligible: boolean;
  reason: string;
}

// Constants
const initialFormData = {
  grade_id: "",
  name: "",
  conditions: [{ field: "insurance_monthly_payment", operator: "gte", value: "" }] as Condition[],
  logic_operator: "AND" as "AND" | "OR",
  exclusion_rules: [] as string[],
  priority: 0,
};

// 배분 규칙용 필드 옵션
const fieldOptions = [
  { value: "insurance_monthly_payment", label: "전월 보험 월납 (원)", type: "number" },
  { value: "level", label: "멤버 레벨", type: "enum", options: ["trainee", "regular", "senior"] },
  { value: "newbie_test_passed", label: "신입 테스트 통과 여부", type: "boolean" },
];

// 숫자 필드용 연산자
const numberOperatorOptions = [
  { value: "eq", label: "= (같음)" },
  { value: "neq", label: "≠ (다름)" },
  { value: "gt", label: "> (초과)" },
  { value: "gte", label: "≥ (이상)" },
  { value: "lt", label: "< (미만)" },
  { value: "lte", label: "≤ (이하)" },
  { value: "between", label: "범위" },
];

// enum 필드용 연산자
const enumOperatorOptions = [
  { value: "eq", label: "= (같음)" },
  { value: "neq", label: "≠ (다름)" },
  { value: "in", label: "포함" },
];

// boolean 필드용 연산자
const booleanOperatorOptions = [
  { value: "eq", label: "= (같음)" },
];

// 제외 규칙 옵션
const exclusionRuleOptions = [
  { value: "grade_a_eligible", label: "A등급 자격자 제외" },
  { value: "grade_b_eligible", label: "B등급 자격자 제외" },
];

// 필드 타입에 따른 연산자 옵션 반환
const getOperatorOptionsForField = (field: string) => {
  const fieldDef = fieldOptions.find((f) => f.value === field);
  if (fieldDef?.type === "number") return numberOperatorOptions;
  if (fieldDef?.type === "enum") return enumOperatorOptions;
  if (fieldDef?.type === "boolean") return booleanOperatorOptions;
  return numberOperatorOptions;
};

const getOperatorLabel = (op: string) => {
  const all = [...numberOperatorOptions, ...enumOperatorOptions, ...booleanOperatorOptions];
  return all.find((o) => o.value === op)?.label || op;
};

const getFieldLabel = (field: string) => {
  return fieldOptions.find((f) => f.value === field)?.label || field;
};

// 레벨 라벨
const levelLabels: Record<string, string> = {
  trainee: "신입 트레이니",
  regular: "정규 멤버",
  senior: "시니어 멤버",
};

// 금액 포맷
const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat("ko-KR").format(amount) + "원";
};

export default function DistributionRulesPage() {
  const [activeTab, setActiveTab] = useState("rules");

  // Grades state
  const [grades, setGrades] = useState<LeadGrade[]>([]);
  const [gradesLoading, setGradesLoading] = useState(true);

  // Rules state
  const [rules, setRules] = useState<DistributionRule[]>([]);
  const [rulesLoading, setRulesLoading] = useState(true);
  const [ruleDialogOpen, setRuleDialogOpen] = useState(false);
  const [deleteRuleDialogOpen, setDeleteRuleDialogOpen] = useState(false);
  const [editingRule, setEditingRule] = useState<DistributionRule | null>(null);
  const [deletingRule, setDeletingRule] = useState<DistributionRule | null>(null);
  const [formData, setFormData] = useState(initialFormData);
  const [submitting, setSubmitting] = useState(false);

  // Test state
  const [selectedGradeForTest, setSelectedGradeForTest] = useState<string>("");
  const [eligibleMembers, setEligibleMembers] = useState<EligibleMember[]>([]);
  const [testing, setTesting] = useState(false);

  // Fetch grades
  const fetchGrades = useCallback(async () => {
    try {
      const response = await fetch("/api/grades");
      const result = await response.json();

      if (response.ok) {
        setGrades(result.data || []);
      }
    } catch (error) {
      console.error("Failed to fetch grades:", error);
    } finally {
      setGradesLoading(false);
    }
  }, []);

  // Fetch distribution rules
  const fetchRules = useCallback(async () => {
    try {
      const response = await fetch("/api/distribution-rules");
      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error);
      }

      setRules(result.data || []);
    } catch (error) {
      toast.error("배분 규칙 목록을 불러오는데 실패했습니다");
      console.error(error);
    } finally {
      setRulesLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchGrades();
    fetchRules();
  }, [fetchGrades, fetchRules]);

  // Open rule dialog
  const openRuleDialog = (rule?: DistributionRule) => {
    if (rule) {
      setEditingRule(rule);
      const conditions = Array.isArray(rule.conditions)
        ? (rule.conditions as Condition[])
        : [];

      setFormData({
        grade_id: rule.grade_id,
        name: rule.name,
        conditions: conditions.length > 0 ? conditions : [{ field: "insurance_monthly_payment", operator: "gte", value: "" }],
        logic_operator: rule.logic_operator || "AND",
        exclusion_rules: rule.exclusion_rules || [],
        priority: rule.priority,
      });
    } else {
      setEditingRule(null);
      setFormData(initialFormData);
    }
    setRuleDialogOpen(true);
  };

  // Handle submit
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      // Validate conditions
      const validConditions = formData.conditions.filter(
        (c) => c.field && c.operator && (c.value !== "" && c.value !== null && c.value !== undefined)
      );

      if (validConditions.length === 0) {
        throw new Error("최소 하나의 유효한 조건이 필요합니다");
      }

      // Process conditions
      const processedConditions = validConditions.map((c) => {
        const fieldDef = fieldOptions.find((f) => f.value === c.field);
        let processedValue: string | number | boolean | (string | number)[] = c.value;

        if (fieldDef?.type === "number") {
          if (c.operator === "between" && typeof c.value === "string") {
            const parts = c.value.split(",").map((v) => {
              const num = parseFloat(v.trim());
              return isNaN(num) ? 0 : num;
            });
            processedValue = parts;
          } else {
            const num = parseFloat(String(c.value));
            processedValue = isNaN(num) ? 0 : num;
          }
        } else if (fieldDef?.type === "boolean") {
          processedValue = c.value === "true" || c.value === true;
        }

        return {
          field: c.field,
          operator: c.operator,
          value: processedValue,
        };
      });

      const url = editingRule
        ? `/api/distribution-rules/${editingRule.id}`
        : "/api/distribution-rules";
      const method = editingRule ? "PATCH" : "POST";

      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          grade_id: formData.grade_id,
          name: formData.name,
          conditions: processedConditions,
          logic_operator: formData.logic_operator,
          exclusion_rules: formData.exclusion_rules,
          priority: formData.priority,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "요청에 실패했습니다");
      }

      toast.success(
        editingRule ? "배분 규칙이 수정되었습니다" : "배분 규칙이 생성되었습니다"
      );
      setRuleDialogOpen(false);
      fetchRules();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "요청에 실패했습니다"
      );
    } finally {
      setSubmitting(false);
    }
  };

  // Handle delete
  const handleDelete = async () => {
    if (!deletingRule) return;
    setSubmitting(true);

    try {
      const response = await fetch(`/api/distribution-rules/${deletingRule.id}`, {
        method: "DELETE",
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error);
      }

      toast.success("배분 규칙이 삭제되었습니다");
      setDeleteRuleDialogOpen(false);
      setDeletingRule(null);
      fetchRules();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "삭제에 실패했습니다"
      );
    } finally {
      setSubmitting(false);
    }
  };

  // Condition handlers
  const addCondition = () => {
    setFormData({
      ...formData,
      conditions: [
        ...formData.conditions,
        { field: "insurance_monthly_payment", operator: "gte", value: "" },
      ],
    });
  };

  const removeCondition = (index: number) => {
    if (formData.conditions.length <= 1) return;
    setFormData({
      ...formData,
      conditions: formData.conditions.filter((_, i) => i !== index),
    });
  };

  const updateCondition = (index: number, field: keyof Condition, value: string | number | boolean | (string | number)[]) => {
    const newConditions = [...formData.conditions];
    newConditions[index] = { ...newConditions[index], [field]: value };

    // 필드 변경 시 연산자 리셋
    if (field === "field") {
      const fieldDef = fieldOptions.find((f) => f.value === value);
      if (fieldDef?.type === "boolean") {
        newConditions[index].operator = "eq";
        newConditions[index].value = "true";
      } else if (fieldDef?.type === "enum") {
        newConditions[index].operator = "eq";
        newConditions[index].value = "";
      } else {
        newConditions[index].operator = "gte";
        newConditions[index].value = "";
      }
    }

    setFormData({ ...formData, conditions: newConditions });
  };

  // Test eligible members
  const handleTest = async () => {
    if (!selectedGradeForTest) {
      toast.error("등급을 선택해주세요");
      return;
    }

    setTesting(true);
    setEligibleMembers([]);

    try {
      // Use the eligible-members API which accepts gradeId
      const response = await fetch(`/api/leads/eligible-members?gradeId=${selectedGradeForTest}`);

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error);
      }

      // Transform the response to match the expected format
      const allMembers = result.data?.allMembers || [];
      setEligibleMembers(allMembers);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "테스트에 실패했습니다"
      );
    } finally {
      setTesting(false);
    }
  };

  // Render condition value input
  const renderConditionValueInput = (condition: Condition, index: number) => {
    const fieldDef = fieldOptions.find((f) => f.value === condition.field);

    if (fieldDef?.type === "boolean") {
      return (
        <Select
          value={String(condition.value)}
          onValueChange={(value) => updateCondition(index, "value", value)}
        >
          <SelectTrigger className="w-32">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="true">통과</SelectItem>
            <SelectItem value="false">미통과</SelectItem>
          </SelectContent>
        </Select>
      );
    }

    if (fieldDef?.type === "enum" && fieldDef.options) {
      return (
        <Select
          value={String(condition.value)}
          onValueChange={(value) => updateCondition(index, "value", value)}
        >
          <SelectTrigger className="w-36">
            <SelectValue placeholder="선택..." />
          </SelectTrigger>
          <SelectContent>
            {fieldDef.options.map((opt) => (
              <SelectItem key={opt} value={opt}>
                {levelLabels[opt] || opt}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      );
    }

    if (condition.operator === "between") {
      return (
        <div className="flex items-center gap-1">
          <Input
            placeholder="최소"
            value={typeof condition.value === "string" ? condition.value.split(",")[0] || "" : ""}
            onChange={(e) => {
              const currentValue = String(condition.value || "");
              const parts = currentValue.split(",");
              parts[0] = e.target.value;
              updateCondition(index, "value", parts.join(","));
            }}
            className="w-24"
          />
          <span className="text-muted-foreground">~</span>
          <Input
            placeholder="최대"
            value={typeof condition.value === "string" ? condition.value.split(",")[1] || "" : ""}
            onChange={(e) => {
              const currentValue = String(condition.value || "");
              const parts = currentValue.split(",");
              parts[1] = e.target.value;
              updateCondition(index, "value", parts.join(","));
            }}
            className="w-24"
          />
        </div>
      );
    }

    return (
      <Input
        type="number"
        placeholder="값"
        value={String(condition.value || "")}
        onChange={(e) => updateCondition(index, "value", e.target.value)}
        className="w-32"
      />
    );
  };

  // Format condition value for display
  const formatConditionValue = (condition: Condition) => {
    const fieldDef = fieldOptions.find((f) => f.value === condition.field);

    if (fieldDef?.type === "boolean") {
      return condition.value === true || condition.value === "true" ? "통과" : "미통과";
    }

    if (fieldDef?.type === "enum") {
      return levelLabels[String(condition.value)] || String(condition.value);
    }

    if (fieldDef?.type === "number") {
      if (Array.isArray(condition.value)) {
        return condition.value.map((v) => formatCurrency(Number(v))).join(" ~ ");
      }
      return formatCurrency(Number(condition.value));
    }

    return String(condition.value);
  };

  // Get rules grouped by grade
  const getRulesByGrade = () => {
    const grouped: Record<string, DistributionRule[]> = {};
    rules.forEach((rule) => {
      const gradeId = rule.grade_id;
      if (!grouped[gradeId]) {
        grouped[gradeId] = [];
      }
      grouped[gradeId].push(rule);
    });
    return grouped;
  };

  const rulesByGrade = getRulesByGrade();

  return (
    <>
      <Header title="배분 규칙 설정" />
      <div className="flex flex-1 flex-col gap-4 p-4">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-2 max-w-md">
            <TabsTrigger value="rules" className="flex items-center gap-2">
              <Settings2 className="h-4 w-4" />
              배분 규칙
            </TabsTrigger>
            <TabsTrigger value="test" className="flex items-center gap-2">
              <FlaskConical className="h-4 w-4" />
              자격자 조회
            </TabsTrigger>
          </TabsList>

          {/* 배분 규칙 탭 */}
          <TabsContent value="rules">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Shield className="h-5 w-5" />
                    배분 자격 규칙
                  </CardTitle>
                  <CardDescription>
                    각 등급의 리드를 받을 수 있는 멤버 자격 조건을 설정합니다.
                    멤버의 실적, 레벨, 테스트 통과 여부 등을 기준으로 합니다.
                  </CardDescription>
                </div>
                <Button onClick={() => openRuleDialog()} disabled={grades.length === 0}>
                  <Plus className="mr-2 h-4 w-4" />
                  규칙 추가
                </Button>
              </CardHeader>
              <CardContent>
                {rulesLoading || gradesLoading ? (
                  <div className="flex items-center justify-center h-32 text-muted-foreground">
                    로딩 중...
                  </div>
                ) : grades.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-32 text-muted-foreground">
                    <Settings2 className="h-8 w-8 mb-2" />
                    <p>먼저 등급을 추가해주세요</p>
                  </div>
                ) : rules.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-32 text-muted-foreground">
                    <Shield className="h-8 w-8 mb-2" />
                    <p>등록된 배분 규칙이 없습니다</p>
                    <Button
                      variant="link"
                      className="mt-2"
                      onClick={() => openRuleDialog()}
                    >
                      첫 번째 규칙 추가하기
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-6">
                    {grades.map((grade) => {
                      const gradeRules = rulesByGrade[grade.id] || [];

                      return (
                        <div key={grade.id}>
                          <div className="flex items-center gap-3 mb-3">
                            <Badge
                              style={{
                                backgroundColor: grade.color || "#6b7280",
                                color: "#fff",
                              }}
                              className="font-semibold"
                            >
                              {grade.name}등급
                            </Badge>
                            <span className="text-sm text-muted-foreground">
                              {gradeRules.length}개 규칙
                            </span>
                          </div>

                          {gradeRules.length === 0 ? (
                            <Card className="border-dashed">
                              <CardContent className="py-6 text-center text-muted-foreground">
                                <p className="text-sm">등록된 규칙이 없습니다</p>
                                <Button
                                  variant="link"
                                  size="sm"
                                  onClick={() => {
                                    setFormData({ ...initialFormData, grade_id: grade.id });
                                    setRuleDialogOpen(true);
                                  }}
                                >
                                  규칙 추가하기
                                </Button>
                              </CardContent>
                            </Card>
                          ) : (
                            <div className="space-y-2">
                              {gradeRules.map((rule) => {
                                const conditions = Array.isArray(rule.conditions)
                                  ? (rule.conditions as Condition[])
                                  : [];

                                return (
                                  <Card key={rule.id} className="border">
                                    <CardHeader className="py-3">
                                      <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-3">
                                          <span className="font-medium">{rule.name}</span>
                                          {rule.exclusion_rules && rule.exclusion_rules.length > 0 && (
                                            <Badge variant="outline" className="text-xs">
                                              제외 규칙 있음
                                            </Badge>
                                          )}
                                        </div>
                                        <div className="flex items-center gap-2">
                                          <Button
                                            variant="ghost"
                                            size="icon"
                                            onClick={() => openRuleDialog(rule)}
                                          >
                                            <Pencil className="h-4 w-4" />
                                          </Button>
                                          <Button
                                            variant="ghost"
                                            size="icon"
                                            onClick={() => {
                                              setDeletingRule(rule);
                                              setDeleteRuleDialogOpen(true);
                                            }}
                                          >
                                            <Trash2 className="h-4 w-4" />
                                          </Button>
                                        </div>
                                      </div>
                                    </CardHeader>
                                    <CardContent className="py-3 pt-0">
                                      <div className="text-sm space-y-1">
                                        {conditions.map((condition, idx) => (
                                          <div key={idx} className="flex items-center gap-2">
                                            {idx > 0 && (
                                              <Badge variant="outline" className="text-xs">
                                                {rule.logic_operator}
                                              </Badge>
                                            )}
                                            <span className="text-muted-foreground">
                                              {getFieldLabel(condition.field)}{" "}
                                              <span className="font-medium text-foreground">
                                                {getOperatorLabel(condition.operator)}
                                              </span>{" "}
                                              <span className="font-medium text-foreground">
                                                {formatConditionValue(condition)}
                                              </span>
                                            </span>
                                          </div>
                                        ))}
                                        {rule.exclusion_rules && rule.exclusion_rules.length > 0 && (
                                          <div className="mt-2 pt-2 border-t">
                                            <span className="text-xs text-muted-foreground">
                                              제외: {rule.exclusion_rules.map((r) =>
                                                exclusionRuleOptions.find((o) => o.value === r)?.label || r
                                              ).join(", ")}
                                            </span>
                                          </div>
                                        )}
                                      </div>
                                    </CardContent>
                                  </Card>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* 기본 규칙 안내 카드 */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <AlertCircle className="h-4 w-4" />
                  기본 배분 자격 기준 안내
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-sm text-muted-foreground space-y-3">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="bg-green-50 p-3 rounded-lg border border-green-100">
                      <p className="font-medium text-green-700 mb-1">A등급 리드 자격</p>
                      <p className="text-green-600">전월 보험 월납 ≥ 600,000원</p>
                    </div>
                    <div className="bg-blue-50 p-3 rounded-lg border border-blue-100">
                      <p className="font-medium text-blue-700 mb-1">B등급 리드 자격</p>
                      <p className="text-blue-600">전월 보험 월납 ≥ 200,000원 AND &lt; 600,000원</p>
                    </div>
                    <div className="bg-yellow-50 p-3 rounded-lg border border-yellow-100">
                      <p className="font-medium text-yellow-700 mb-1">C등급 리드 자격</p>
                      <p className="text-yellow-600">신입 테스트 통과자 (A등급 자격자 제외)</p>
                    </div>
                    <div className="bg-gray-50 p-3 rounded-lg border border-gray-200">
                      <p className="font-medium text-gray-700 mb-1">D등급 리드 자격</p>
                      <p className="text-gray-600">신입 트레이니 (레벨: trainee)</p>
                    </div>
                  </div>
                  <p className="text-xs mt-4">
                    * 배분 자격은 소프트 적용됩니다 (자격자/비자격자 표시만, 배분 차단 없음)
                  </p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* 자격자 조회 탭 */}
          <TabsContent value="test">
            <div className="grid gap-4 md:grid-cols-3">
              <Card className="md:col-span-1">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <FlaskConical className="h-5 w-5" />
                    등급 선택
                  </CardTitle>
                  <CardDescription>
                    조회할 등급을 선택하면 해당 등급의 리드를 받을 수 있는 자격자 목록이 표시됩니다.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label>리드 등급</Label>
                    <Select
                      value={selectedGradeForTest}
                      onValueChange={setSelectedGradeForTest}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="등급 선택..." />
                      </SelectTrigger>
                      <SelectContent>
                        {grades.map((grade) => (
                          <SelectItem key={grade.id} value={grade.id}>
                            <div className="flex items-center gap-2">
                              <div
                                className="w-3 h-3 rounded"
                                style={{ backgroundColor: grade.color || "#6b7280" }}
                              />
                              {grade.name}등급
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <Button
                    className="w-full"
                    onClick={handleTest}
                    disabled={testing || !selectedGradeForTest}
                  >
                    {testing ? "조회 중..." : "자격자 조회"}
                  </Button>
                </CardContent>
              </Card>

              <Card className="md:col-span-2">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Users className="h-5 w-5" />
                    자격자 목록
                    {eligibleMembers.length > 0 && (
                      <Badge variant="secondary">
                        {eligibleMembers.filter((m) => m.isEligible).length}명 자격
                      </Badge>
                    )}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {eligibleMembers.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-48 text-muted-foreground">
                      <Users className="h-8 w-8 mb-2" />
                      <p>등급을 선택하고 조회하세요</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {/* 자격자 */}
                      <div>
                        <h4 className="font-medium text-green-700 mb-2 flex items-center gap-2">
                          <CheckCircle className="h-4 w-4" />
                          자격자 ({eligibleMembers.filter((m) => m.isEligible).length}명)
                        </h4>
                        <div className="space-y-2">
                          {eligibleMembers
                            .filter((m) => m.isEligible)
                            .map((item, idx) => (
                              <div
                                key={idx}
                                className="flex items-center justify-between p-3 bg-green-50 rounded-lg border border-green-100"
                              >
                                <div>
                                  <p className="font-medium">{item.member.name}</p>
                                  <p className="text-sm text-muted-foreground">
                                    {item.member.team?.name || "팀 미지정"}
                                  </p>
                                </div>
                                <div className="text-right text-sm">
                                  <p className="text-green-600">{item.reason}</p>
                                  {item.previousMonthPerformance && (
                                    <p className="text-muted-foreground">
                                      전월 월납: {formatCurrency(item.previousMonthPerformance.insurance_monthly_payment)}
                                    </p>
                                  )}
                                </div>
                              </div>
                            ))}
                          {eligibleMembers.filter((m) => m.isEligible).length === 0 && (
                            <p className="text-sm text-muted-foreground py-2">
                              자격자가 없습니다
                            </p>
                          )}
                        </div>
                      </div>

                      {/* 비자격자 */}
                      <div>
                        <h4 className="font-medium text-gray-500 mb-2 flex items-center gap-2">
                          <XCircle className="h-4 w-4" />
                          비자격자 ({eligibleMembers.filter((m) => !m.isEligible).length}명)
                        </h4>
                        <div className="space-y-2">
                          {eligibleMembers
                            .filter((m) => !m.isEligible)
                            .map((item, idx) => (
                              <div
                                key={idx}
                                className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border"
                              >
                                <div>
                                  <p className="font-medium text-gray-600">{item.member.name}</p>
                                  <p className="text-sm text-muted-foreground">
                                    {item.member.team?.name || "팀 미지정"}
                                  </p>
                                </div>
                                <div className="text-right text-sm">
                                  <p className="text-gray-500">{item.reason}</p>
                                  {item.previousMonthPerformance && (
                                    <p className="text-muted-foreground">
                                      전월 월납: {formatCurrency(item.previousMonthPerformance.insurance_monthly_payment)}
                                    </p>
                                  )}
                                </div>
                              </div>
                            ))}
                          {eligibleMembers.filter((m) => !m.isEligible).length === 0 && (
                            <p className="text-sm text-muted-foreground py-2">
                              모든 멤버가 자격을 갖추고 있습니다
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>

      {/* 규칙 생성/수정 다이얼로그 */}
      <Dialog open={ruleDialogOpen} onOpenChange={setRuleDialogOpen}>
        <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingRule ? "배분 규칙 수정" : "새 배분 규칙 추가"}
            </DialogTitle>
            <DialogDescription>
              {editingRule
                ? "배분 규칙을 수정합니다."
                : "새로운 배분 자격 규칙을 추가합니다."}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit}>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="name">규칙명 <span className="text-destructive">*</span></Label>
                <Input
                  id="name"
                  placeholder="예: A등급 자격 - 월납 60만원 이상"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                  maxLength={200}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="grade">적용 등급 <span className="text-destructive">*</span></Label>
                <Select
                  value={formData.grade_id}
                  onValueChange={(value) =>
                    setFormData({ ...formData, grade_id: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="등급 선택" />
                  </SelectTrigger>
                  <SelectContent>
                    {grades.map((grade) => (
                      <SelectItem key={grade.id} value={grade.id}>
                        <div className="flex items-center gap-2">
                          <div
                            className="w-3 h-3 rounded"
                            style={{ backgroundColor: grade.color || "#6b7280" }}
                          />
                          {grade.name}등급 (우선순위: {grade.priority})
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>조건 연산자</Label>
                <Select
                  value={formData.logic_operator}
                  onValueChange={(value: "AND" | "OR") =>
                    setFormData({ ...formData, logic_operator: value })
                  }
                >
                  <SelectTrigger className="w-40">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="AND">AND (모두 충족)</SelectItem>
                    <SelectItem value="OR">OR (하나라도)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label>자격 조건</Label>
                  <Button type="button" variant="outline" size="sm" onClick={addCondition}>
                    <Plus className="h-4 w-4 mr-1" />
                    조건 추가
                  </Button>
                </div>

                {formData.conditions.map((condition, index) => (
                  <div
                    key={index}
                    className="flex items-center gap-2 p-3 border rounded-lg bg-muted/30"
                  >
                    <div className="flex-1 flex items-center gap-2 flex-wrap">
                      <Select
                        value={condition.field}
                        onValueChange={(value) => updateCondition(index, "field", value)}
                      >
                        <SelectTrigger className="w-44">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {fieldOptions.map((option) => (
                            <SelectItem key={option.value} value={option.value}>
                              {option.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>

                      <Select
                        value={condition.operator}
                        onValueChange={(value) => updateCondition(index, "operator", value)}
                      >
                        <SelectTrigger className="w-28">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {getOperatorOptionsForField(condition.field).map((option) => (
                            <SelectItem key={option.value} value={option.value}>
                              {option.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>

                      {renderConditionValueInput(condition, index)}
                    </div>

                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => removeCondition(index)}
                      disabled={formData.conditions.length <= 1}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>

              <div className="space-y-2">
                <Label>제외 규칙 (선택)</Label>
                <div className="space-y-2">
                  {exclusionRuleOptions.map((option) => (
                    <div key={option.value} className="flex items-center space-x-2">
                      <Checkbox
                        id={option.value}
                        checked={formData.exclusion_rules.includes(option.value)}
                        onCheckedChange={(checked) => {
                          if (checked) {
                            setFormData({
                              ...formData,
                              exclusion_rules: [...formData.exclusion_rules, option.value],
                            });
                          } else {
                            setFormData({
                              ...formData,
                              exclusion_rules: formData.exclusion_rules.filter((r) => r !== option.value),
                            });
                          }
                        }}
                      />
                      <label
                        htmlFor={option.value}
                        className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                      >
                        {option.label}
                      </label>
                    </div>
                  ))}
                </div>
                <p className="text-xs text-muted-foreground">
                  선택된 제외 규칙에 해당하는 멤버는 이 등급의 리드를 받을 수 없습니다.
                </p>
              </div>
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setRuleDialogOpen(false)}
              >
                취소
              </Button>
              <Button type="submit" disabled={submitting || !formData.grade_id || !formData.name}>
                {submitting ? "저장 중..." : editingRule ? "수정" : "생성"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* 규칙 삭제 확인 다이얼로그 */}
      <AlertDialog open={deleteRuleDialogOpen} onOpenChange={setDeleteRuleDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>배분 규칙 삭제</AlertDialogTitle>
            <AlertDialogDescription>
              정말로 &quot;{deletingRule?.name}&quot; 규칙을 삭제하시겠습니까?
              삭제된 규칙은 복구할 수 없습니다.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>취소</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {submitting ? "삭제 중..." : "삭제"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
