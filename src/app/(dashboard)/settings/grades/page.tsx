"use client";

import { useEffect, useState, useCallback } from "react";
import {
  Plus,
  Pencil,
  Trash2,
  GripVertical,
  Check,
  Star,
  Settings2,
  FlaskConical,
  X,
  Users,
  ArrowRight,
  RefreshCw,
} from "lucide-react";
import Link from "next/link";
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
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import type { LeadGrade, GradeRule } from "@/types/database.types";

// Types
interface GradeFormData {
  name: string;
  description: string;
  color: string;
  priority: number;
  is_default: boolean;
}

interface Condition {
  field: string;
  operator: string;
  value: string | number | (string | number)[];
}

interface RuleFormData {
  grade_id: string;
  conditions: Condition[];
  logic_operator: "AND" | "OR";
}

interface GradeRuleWithGrade extends GradeRule {
  grade?: {
    id: string;
    name: string;
    color: string | null;
    priority: number;
  };
}

// Constants
const initialGradeFormData: GradeFormData = {
  name: "",
  description: "",
  color: "#6b7280",
  priority: 1,
  is_default: false,
};

const initialRuleFormData: RuleFormData = {
  grade_id: "",
  conditions: [{ field: "annual_revenue", operator: "gte", value: "" }],
  logic_operator: "AND",
};

const colorOptions = [
  { name: "초록", value: "#22c55e" },
  { name: "파랑", value: "#3b82f6" },
  { name: "노랑", value: "#eab308" },
  { name: "회색", value: "#6b7280" },
  { name: "빨강", value: "#ef4444" },
  { name: "보라", value: "#a855f7" },
  { name: "청록", value: "#06b6d4" },
  { name: "주황", value: "#f97316" },
];

const fieldOptions = [
  { value: "annual_revenue", label: "연매출 (억원)", type: "number" },
  { value: "employee_count", label: "종업원수 (명)", type: "number" },
  { value: "industry", label: "업종", type: "text" },
  { value: "region", label: "지역", type: "text" },
  { value: "campaign_name", label: "광고 캠페인", type: "text" },
  { value: "business_type", label: "사업자 유형", type: "text" },
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

// 텍스트 필드용 연산자
const textOperatorOptions = [
  { value: "eq", label: "= (같음)" },
  { value: "neq", label: "≠ (다름)" },
  { value: "contains", label: "포함" },
];

// 모든 연산자 (레이블 조회용)
const allOperatorOptions = [
  { value: "eq", label: "= (같음)" },
  { value: "neq", label: "≠ (다름)" },
  { value: "gt", label: "> (초과)" },
  { value: "gte", label: "≥ (이상)" },
  { value: "lt", label: "< (미만)" },
  { value: "lte", label: "≤ (이하)" },
  { value: "between", label: "범위" },
  { value: "contains", label: "포함" },
];

// 필드 타입에 따른 연산자 옵션 반환
const getOperatorOptionsForField = (field: string) => {
  const fieldDef = fieldOptions.find((f) => f.value === field);
  return fieldDef?.type === "number" ? numberOperatorOptions : textOperatorOptions;
};

const getOperatorLabel = (op: string) => {
  return allOperatorOptions.find((o) => o.value === op)?.label || op;
};

const getFieldLabel = (field: string) => {
  return fieldOptions.find((f) => f.value === field)?.label || field;
};

export default function GradesSettingsPage() {
  const [activeTab, setActiveTab] = useState("grades");

  // Grades state
  const [grades, setGrades] = useState<LeadGrade[]>([]);
  const [gradesLoading, setGradesLoading] = useState(true);
  const [gradeDialogOpen, setGradeDialogOpen] = useState(false);
  const [deleteGradeDialogOpen, setDeleteGradeDialogOpen] = useState(false);
  const [editingGrade, setEditingGrade] = useState<LeadGrade | null>(null);
  const [deletingGrade, setDeletingGrade] = useState<LeadGrade | null>(null);
  const [gradeFormData, setGradeFormData] = useState<GradeFormData>(initialGradeFormData);

  // Rules state
  const [rules, setRules] = useState<GradeRuleWithGrade[]>([]);
  const [rulesLoading, setRulesLoading] = useState(true);
  const [ruleDialogOpen, setRuleDialogOpen] = useState(false);
  const [deleteRuleDialogOpen, setDeleteRuleDialogOpen] = useState(false);
  const [editingRule, setEditingRule] = useState<GradeRuleWithGrade | null>(null);
  const [deletingRule, setDeletingRule] = useState<GradeRuleWithGrade | null>(null);
  const [ruleFormData, setRuleFormData] = useState<RuleFormData>(initialRuleFormData);

  // Test state
  const [testData, setTestData] = useState({
    annual_revenue: "",
    employee_count: "",
    industry: "",
    region: "",
    business_type: "",
  });
  const [testResult, setTestResult] = useState<{
    grade: { id: string; name: string; color: string } | null;
    matchedRule: GradeRule | null;
    evaluationLog: { grade: string; result: boolean; details: string }[];
  } | null>(null);
  const [testing, setTesting] = useState(false);

  const [submitting, setSubmitting] = useState(false);

  // Reclassify state
  const [reclassifying, setReclassifying] = useState(false);
  const [reclassifyDialogOpen, setReclassifyDialogOpen] = useState(false);
  const [reclassifyMode, setReclassifyMode] = useState<"auto_only" | "all">("auto_only");

  // Fetch grades
  const fetchGrades = useCallback(async () => {
    try {
      const response = await fetch("/api/grades");
      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error);
      }

      setGrades(result.data);
    } catch (error) {
      toast.error("등급 목록을 불러오는데 실패했습니다");
      console.error(error);
    } finally {
      setGradesLoading(false);
    }
  }, []);

  // Fetch rules
  const fetchRules = useCallback(async () => {
    try {
      const response = await fetch("/api/grade-rules");
      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error);
      }

      setRules(result.data);
    } catch (error) {
      toast.error("규칙 목록을 불러오는데 실패했습니다");
      console.error(error);
    } finally {
      setRulesLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchGrades();
    fetchRules();
  }, [fetchGrades, fetchRules]);

  // Reclassify handler
  const handleReclassify = async () => {
    setReclassifying(true);
    try {
      const response = await fetch("/api/grade-rules/reclassify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode: reclassifyMode }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "재분류에 실패했습니다");
      }

      // 결과 표시
      const { totalCount, updatedCount, gradeSummary } = result.data;
      const summaryText = Object.entries(gradeSummary)
        .map(([grade, count]) => `${grade}: ${count}건`)
        .join(", ");

      toast.success(
        `재분류 완료: ${totalCount}건 중 ${updatedCount}건 변경됨`,
        {
          description: summaryText,
          duration: 5000,
        }
      );

      setReclassifyDialogOpen(false);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "재분류에 실패했습니다"
      );
    } finally {
      setReclassifying(false);
    }
  };

  // Grade dialog handlers
  const openGradeDialog = (grade?: LeadGrade) => {
    if (grade) {
      setEditingGrade(grade);
      setGradeFormData({
        name: grade.name,
        description: grade.description || "",
        color: grade.color || "#6b7280",
        priority: grade.priority,
        is_default: grade.is_default || false,
      });
    } else {
      setEditingGrade(null);
      const maxPriority = grades.reduce(
        (max, g) => Math.max(max, g.priority),
        0
      );
      setGradeFormData({
        ...initialGradeFormData,
        priority: maxPriority + 1,
      });
    }
    setGradeDialogOpen(true);
  };

  const handleGradeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      const url = editingGrade
        ? `/api/grades/${editingGrade.id}`
        : "/api/grades";
      const method = editingGrade ? "PATCH" : "POST";

      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(gradeFormData),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error);
      }

      toast.success(
        editingGrade ? "등급이 수정되었습니다" : "등급이 생성되었습니다"
      );
      setGradeDialogOpen(false);
      fetchGrades();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "요청에 실패했습니다"
      );
    } finally {
      setSubmitting(false);
    }
  };

  const handleGradeDelete = async () => {
    if (!deletingGrade) return;
    setSubmitting(true);

    try {
      const response = await fetch(`/api/grades/${deletingGrade.id}`, {
        method: "DELETE",
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error);
      }

      toast.success("등급이 삭제되었습니다");
      setDeleteGradeDialogOpen(false);
      setDeletingGrade(null);
      fetchGrades();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "삭제에 실패했습니다"
      );
    } finally {
      setSubmitting(false);
    }
  };

  // Rule dialog handlers
  const openRuleDialog = (rule?: GradeRuleWithGrade) => {
    if (rule) {
      setEditingRule(rule);
      const conditions = Array.isArray(rule.conditions)
        ? (rule.conditions as unknown as Condition[])
        : [];

      // Convert symbol operators to text operators for compatibility with Zod schema
      const operatorMap: Record<string, string> = {
        "=": "eq",
        "!=": "neq",
        ">": "gt",
        ">=": "gte",
        "<": "lt",
        "<=": "lte",
      };

      const convertedConditions = conditions.map((c) => ({
        ...c,
        operator: operatorMap[c.operator] || c.operator,
      }));

      setRuleFormData({
        grade_id: rule.grade_id,
        conditions: convertedConditions.length > 0 ? convertedConditions : [{ field: "annual_revenue", operator: "gte", value: "" }],
        logic_operator: (rule.logic_operator as "AND" | "OR") || "AND",
      });
    } else {
      setEditingRule(null);
      setRuleFormData(initialRuleFormData);
    }
    setRuleDialogOpen(true);
  };

  const handleRuleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      // Validate conditions - check for non-empty values (allow 0 for numbers)
      const validConditions = ruleFormData.conditions.filter(
        (c) => c.field && c.operator && (c.value !== "" && c.value !== null && c.value !== undefined)
      );

      console.log("Original conditions:", JSON.stringify(ruleFormData.conditions, null, 2));
      console.log("Valid conditions after filter:", JSON.stringify(validConditions, null, 2));

      if (validConditions.length === 0) {
        throw new Error("최소 하나의 유효한 조건이 필요합니다");
      }

      // Convert values to appropriate types
      const processedConditions = validConditions.map((c) => {
        const fieldDef = fieldOptions.find((f) => f.value === c.field);
        let processedValue: string | number | (string | number)[] = c.value;

        // Convert numeric fields to numbers
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
        } else {
          // 텍스트 필드는 문자열로 유지
          processedValue = String(c.value).trim();
        }

        return {
          field: c.field,
          operator: c.operator,
          value: processedValue,
        };
      });

      const url = editingRule
        ? `/api/grade-rules/${editingRule.id}`
        : "/api/grade-rules";
      const method = editingRule ? "PATCH" : "POST";

      const requestBody = {
        grade_id: ruleFormData.grade_id,
        conditions: processedConditions,
        logic_operator: ruleFormData.logic_operator,
      };

      console.log("Submitting rule:", requestBody);
      console.log("Processed conditions detail:", JSON.stringify(processedConditions, null, 2));

      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(requestBody),
      });

      const result = await response.json();

      console.log("Response:", result);
      if (result.details) {
        console.log("Validation details:", JSON.stringify(result.details, null, 2));
      }
      if (result.issues) {
        console.log("Validation issues:", JSON.stringify(result.issues, null, 2));
      }

      if (!response.ok) {
        throw new Error(result.error || JSON.stringify(result.details));
      }

      toast.success(
        editingRule ? "규칙이 수정되었습니다" : "규칙이 생성되었습니다"
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

  const handleRuleDelete = async () => {
    if (!deletingRule) return;
    setSubmitting(true);

    try {
      const response = await fetch(`/api/grade-rules/${deletingRule.id}`, {
        method: "DELETE",
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error);
      }

      toast.success("규칙이 삭제되었습니다");
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
    setRuleFormData({
      ...ruleFormData,
      conditions: [
        ...ruleFormData.conditions,
        { field: "annual_revenue", operator: "gte", value: "" },
      ],
    });
  };

  const removeCondition = (index: number) => {
    if (ruleFormData.conditions.length <= 1) return;
    setRuleFormData({
      ...ruleFormData,
      conditions: ruleFormData.conditions.filter((_, i) => i !== index),
    });
  };

  const updateCondition = (index: number, field: keyof Condition, value: string | number | (string | number)[]) => {
    const newConditions = [...ruleFormData.conditions];
    newConditions[index] = { ...newConditions[index], [field]: value };

    // 필드가 변경될 때, 해당 필드 타입에 맞지 않는 연산자라면 기본 연산자로 변경
    if (field === "field") {
      const fieldDef = fieldOptions.find((f) => f.value === value);
      const validOperators = fieldDef?.type === "number" ? numberOperatorOptions : textOperatorOptions;
      const currentOperator = newConditions[index].operator;

      // 현재 연산자가 유효한지 확인
      if (!validOperators.find((op) => op.value === currentOperator)) {
        newConditions[index].operator = "eq"; // 기본 연산자로 변경
        // between 연산자에서 다른 연산자로 변경될 때 value도 초기화
        if (currentOperator === "between") {
          newConditions[index].value = "";
        }
      }
    }

    setRuleFormData({ ...ruleFormData, conditions: newConditions });
  };

  // Test handler
  const handleTest = async () => {
    setTesting(true);
    setTestResult(null);

    try {
      const response = await fetch("/api/grade-rules/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          annual_revenue: testData.annual_revenue ? parseFloat(testData.annual_revenue) : undefined,
          employee_count: testData.employee_count ? parseInt(testData.employee_count) : undefined,
          industry: testData.industry || undefined,
          region: testData.region || undefined,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error);
      }

      setTestResult(result.data);
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
            className="w-20"
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
            className="w-20"
          />
        </div>
      );
    }

    return (
      <Input
        placeholder="값"
        value={String(condition.value || "")}
        onChange={(e) => updateCondition(index, "value", e.target.value)}
        className="w-32"
      />
    );
  };

  return (
    <>
      <Header title="등급 설정" />
      <div className="flex flex-1 flex-col gap-4 p-4">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-3 max-w-md">
            <TabsTrigger value="grades" className="flex items-center gap-2">
              <Star className="h-4 w-4" />
              등급 정의
            </TabsTrigger>
            <TabsTrigger value="rules" className="flex items-center gap-2">
              <Settings2 className="h-4 w-4" />
              분류 규칙
            </TabsTrigger>
            <TabsTrigger value="test" className="flex items-center gap-2">
              <FlaskConical className="h-4 w-4" />
              규칙 테스트
            </TabsTrigger>
          </TabsList>

          {/* 배분 규칙 링크 배너 */}
          <Card className="mt-4 bg-blue-50 border-blue-200">
            <CardContent className="py-3 px-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Users className="h-5 w-5 text-blue-600" />
                  <div>
                    <p className="text-sm font-medium text-blue-900">
                      등급별 배분 자격 규칙 설정
                    </p>
                    <p className="text-xs text-blue-700">
                      각 등급의 리드를 받을 수 있는 멤버 자격 조건을 설정하세요
                    </p>
                  </div>
                </div>
                <Link href="/settings/distribution-rules">
                  <Button variant="outline" size="sm" className="border-blue-300 text-blue-700 hover:bg-blue-100">
                    배분 규칙 설정
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>

          {/* 등급 정의 탭 */}
          <TabsContent value="grades">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Star className="h-5 w-5" />
                    등급 목록
                  </CardTitle>
                  <CardDescription>
                    리드 자동 분류에 사용되는 등급을 관리합니다. 우선순위가 낮을수록
                    높은 등급입니다.
                  </CardDescription>
                </div>
                <Button onClick={() => openGradeDialog()}>
                  <Plus className="mr-2 h-4 w-4" />
                  등급 추가
                </Button>
              </CardHeader>
              <CardContent>
                {gradesLoading ? (
                  <div className="flex items-center justify-center h-32 text-muted-foreground">
                    로딩 중...
                  </div>
                ) : grades.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-32 text-muted-foreground">
                    <Star className="h-8 w-8 mb-2" />
                    <p>등록된 등급이 없습니다</p>
                    <Button
                      variant="link"
                      className="mt-2"
                      onClick={() => openGradeDialog()}
                    >
                      첫 번째 등급 추가하기
                    </Button>
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-[50px]">순서</TableHead>
                        <TableHead>등급명</TableHead>
                        <TableHead>설명</TableHead>
                        <TableHead>색상</TableHead>
                        <TableHead className="text-center">기본값</TableHead>
                        <TableHead className="text-right">액션</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {grades.map((grade) => (
                        <TableRow key={grade.id}>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <GripVertical className="h-4 w-4 text-muted-foreground" />
                              {grade.priority}
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge
                              style={{
                                backgroundColor: grade.color || "#6b7280",
                                color: "#fff",
                              }}
                              className="font-semibold"
                            >
                              {grade.name}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-muted-foreground max-w-[300px] truncate">
                            {grade.description || "-"}
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <div
                                className="w-6 h-6 rounded border"
                                style={{ backgroundColor: grade.color || "#6b7280" }}
                              />
                              <span className="text-sm text-muted-foreground">
                                {grade.color || "#6b7280"}
                              </span>
                            </div>
                          </TableCell>
                          <TableCell className="text-center">
                            {grade.is_default ? (
                              <Check className="h-5 w-5 mx-auto text-green-500" />
                            ) : (
                              <span className="text-muted-foreground">-</span>
                            )}
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-2">
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => openGradeDialog(grade)}
                              >
                                <Pencil className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => {
                                  setDeletingGrade(grade);
                                  setDeleteGradeDialogOpen(true);
                                }}
                                disabled={grade.is_default || false}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* 분류 규칙 탭 */}
          <TabsContent value="rules">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Settings2 className="h-5 w-5" />
                    분류 규칙
                  </CardTitle>
                  <CardDescription>
                    CSV 업로드 시 리드를 자동으로 등급 분류하기 위한 규칙을 설정합니다.
                    규칙은 등급 우선순위 순서대로 평가됩니다.
                  </CardDescription>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    onClick={() => setReclassifyDialogOpen(true)}
                    disabled={rules.length === 0}
                  >
                    <RefreshCw className="mr-2 h-4 w-4" />
                    기존 리드 재분류
                  </Button>
                  <Button onClick={() => openRuleDialog()} disabled={grades.length === 0}>
                    <Plus className="mr-2 h-4 w-4" />
                    규칙 추가
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {rulesLoading ? (
                  <div className="flex items-center justify-center h-32 text-muted-foreground">
                    로딩 중...
                  </div>
                ) : grades.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-32 text-muted-foreground">
                    <Settings2 className="h-8 w-8 mb-2" />
                    <p>먼저 등급을 추가해주세요</p>
                    <Button
                      variant="link"
                      className="mt-2"
                      onClick={() => setActiveTab("grades")}
                    >
                      등급 정의로 이동
                    </Button>
                  </div>
                ) : rules.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-32 text-muted-foreground">
                    <Settings2 className="h-8 w-8 mb-2" />
                    <p>등록된 분류 규칙이 없습니다</p>
                    <Button
                      variant="link"
                      className="mt-2"
                      onClick={() => openRuleDialog()}
                    >
                      첫 번째 규칙 추가하기
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {rules.map((rule) => {
                      const conditions = Array.isArray(rule.conditions)
                        ? (rule.conditions as unknown as Condition[])
                        : [];

                      return (
                        <Card key={rule.id} className="border">
                          <CardHeader className="py-3">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-3">
                                <Badge
                                  style={{
                                    backgroundColor: rule.grade?.color || "#6b7280",
                                    color: "#fff",
                                  }}
                                  className="font-semibold"
                                >
                                  {rule.grade?.name || "알 수 없음"}
                                </Badge>
                                <span className="text-sm text-muted-foreground">
                                  우선순위: {rule.grade?.priority}
                                </span>
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
                                      {Array.isArray(condition.value)
                                        ? condition.value.join(" ~ ")
                                        : String(condition.value)}
                                    </span>
                                  </span>
                                </div>
                              ))}
                            </div>
                          </CardContent>
                        </Card>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* 규칙 테스트 탭 */}
          <TabsContent value="test">
            <div className="grid gap-4 md:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <FlaskConical className="h-5 w-5" />
                    테스트 데이터 입력
                  </CardTitle>
                  <CardDescription>
                    설정한 규칙이 올바르게 작동하는지 테스트합니다.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="test_revenue">연매출 (억원)</Label>
                    <Input
                      id="test_revenue"
                      type="number"
                      placeholder="예: 12"
                      value={testData.annual_revenue}
                      onChange={(e) =>
                        setTestData({ ...testData, annual_revenue: e.target.value })
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="test_employee">종업원수 (명)</Label>
                    <Input
                      id="test_employee"
                      type="number"
                      placeholder="예: 35"
                      value={testData.employee_count}
                      onChange={(e) =>
                        setTestData({ ...testData, employee_count: e.target.value })
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="test_industry">업종</Label>
                    <Input
                      id="test_industry"
                      placeholder="예: 제조업"
                      value={testData.industry}
                      onChange={(e) =>
                        setTestData({ ...testData, industry: e.target.value })
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="test_region">지역</Label>
                    <Input
                      id="test_region"
                      placeholder="예: 서울"
                      value={testData.region}
                      onChange={(e) =>
                        setTestData({ ...testData, region: e.target.value })
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="test_business_type">사업자 유형</Label>
                    <Input
                      id="test_business_type"
                      placeholder="예: 법인, 개인"
                      value={testData.business_type}
                      onChange={(e) =>
                        setTestData({ ...testData, business_type: e.target.value })
                      }
                    />
                  </div>
                  <Button
                    className="w-full"
                    onClick={handleTest}
                    disabled={testing || rules.length === 0}
                  >
                    {testing ? "테스트 중..." : "테스트 실행"}
                  </Button>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>테스트 결과</CardTitle>
                </CardHeader>
                <CardContent>
                  {!testResult ? (
                    <div className="flex flex-col items-center justify-center h-48 text-muted-foreground">
                      <FlaskConical className="h-8 w-8 mb-2" />
                      <p>테스트 데이터를 입력하고 실행하세요</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <div className="flex items-center gap-3 p-4 bg-muted rounded-lg">
                        <span className="text-sm font-medium">결과 등급:</span>
                        {testResult.grade ? (
                          <Badge
                            style={{
                              backgroundColor: testResult.grade.color || "#6b7280",
                              color: "#fff",
                            }}
                            className="font-semibold text-base px-3 py-1"
                          >
                            {testResult.grade.name}
                          </Badge>
                        ) : (
                          <span className="text-muted-foreground">기본 등급</span>
                        )}
                      </div>

                      <div className="space-y-2">
                        <p className="text-sm font-medium">평가 로그:</p>
                        <div className="space-y-2 text-sm">
                          {testResult.evaluationLog.map((log, idx) => (
                            <div
                              key={idx}
                              className={`flex items-start gap-2 p-2 rounded ${
                                log.result ? "bg-green-50" : "bg-gray-50"
                              }`}
                            >
                              {log.result ? (
                                <Check className="h-4 w-4 text-green-500 mt-0.5" />
                              ) : (
                                <X className="h-4 w-4 text-gray-400 mt-0.5" />
                              )}
                              <div>
                                <span className="font-medium">{log.grade}등급:</span>{" "}
                                <span className="text-muted-foreground">
                                  {log.details}
                                </span>
                              </div>
                            </div>
                          ))}
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

      {/* 등급 생성/수정 다이얼로그 */}
      <Dialog open={gradeDialogOpen} onOpenChange={setGradeDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>
              {editingGrade ? "등급 수정" : "새 등급 추가"}
            </DialogTitle>
            <DialogDescription>
              {editingGrade
                ? "등급 정보를 수정합니다."
                : "새로운 등급을 추가합니다."}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleGradeSubmit}>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="name">등급명</Label>
                <Input
                  id="name"
                  placeholder="A"
                  value={gradeFormData.name}
                  onChange={(e) =>
                    setGradeFormData({ ...gradeFormData, name: e.target.value })
                  }
                  required
                  maxLength={50}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="description">설명</Label>
                <Textarea
                  id="description"
                  placeholder="고매출 대규모 업체"
                  value={gradeFormData.description}
                  onChange={(e) =>
                    setGradeFormData({ ...gradeFormData, description: e.target.value })
                  }
                  rows={2}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="priority">우선순위</Label>
                <Input
                  id="priority"
                  type="number"
                  min={1}
                  value={gradeFormData.priority}
                  onChange={(e) =>
                    setGradeFormData({
                      ...gradeFormData,
                      priority: parseInt(e.target.value) || 1,
                    })
                  }
                  required
                />
                <p className="text-xs text-muted-foreground">
                  숫자가 낮을수록 높은 등급입니다 (1이 가장 높음)
                </p>
              </div>
              <div className="space-y-2">
                <Label>색상</Label>
                <div className="flex flex-wrap gap-2">
                  {colorOptions.map((option) => (
                    <button
                      key={option.value}
                      type="button"
                      className={`w-8 h-8 rounded border-2 transition-all ${
                        gradeFormData.color === option.value
                          ? "border-primary scale-110"
                          : "border-transparent"
                      }`}
                      style={{ backgroundColor: option.value }}
                      onClick={() =>
                        setGradeFormData({ ...gradeFormData, color: option.value })
                      }
                      title={option.name}
                    />
                  ))}
                </div>
                <Input
                  type="color"
                  value={gradeFormData.color}
                  onChange={(e) =>
                    setGradeFormData({ ...gradeFormData, color: e.target.value })
                  }
                  className="w-full h-10 mt-2"
                />
              </div>
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="is_default">기본 등급</Label>
                  <p className="text-xs text-muted-foreground">
                    규칙에 해당하지 않는 리드에 부여됩니다
                  </p>
                </div>
                <Switch
                  id="is_default"
                  checked={gradeFormData.is_default}
                  onCheckedChange={(checked) =>
                    setGradeFormData({ ...gradeFormData, is_default: checked })
                  }
                />
              </div>
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setGradeDialogOpen(false)}
              >
                취소
              </Button>
              <Button type="submit" disabled={submitting}>
                {submitting ? "저장 중..." : editingGrade ? "수정" : "생성"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* 등급 삭제 확인 다이얼로그 */}
      <AlertDialog open={deleteGradeDialogOpen} onOpenChange={setDeleteGradeDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>등급 삭제</AlertDialogTitle>
            <AlertDialogDescription>
              정말로 &quot;{deletingGrade?.name}&quot; 등급을 삭제하시겠습니까?
              해당 등급을 사용 중인 리드가 있으면 삭제할 수 없습니다.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>취소</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleGradeDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {submitting ? "삭제 중..." : "삭제"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* 규칙 생성/수정 다이얼로그 */}
      <Dialog open={ruleDialogOpen} onOpenChange={setRuleDialogOpen}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>
              {editingRule ? "규칙 수정" : "새 분류 규칙 추가"}
            </DialogTitle>
            <DialogDescription>
              {editingRule
                ? "분류 규칙을 수정합니다."
                : "새로운 분류 규칙을 추가합니다."}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleRuleSubmit}>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="grade">적용 등급</Label>
                <Select
                  value={ruleFormData.grade_id}
                  onValueChange={(value) =>
                    setRuleFormData({ ...ruleFormData, grade_id: value })
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
                          {grade.name} (우선순위: {grade.priority})
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>조건 연산자</Label>
                <Select
                  value={ruleFormData.logic_operator}
                  onValueChange={(value: "AND" | "OR") =>
                    setRuleFormData({ ...ruleFormData, logic_operator: value })
                  }
                >
                  <SelectTrigger className="w-32">
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
                  <Label>조건 목록</Label>
                  <Button type="button" variant="outline" size="sm" onClick={addCondition}>
                    <Plus className="h-4 w-4 mr-1" />
                    조건 추가
                  </Button>
                </div>

                {ruleFormData.conditions.map((condition, index) => (
                  <div
                    key={index}
                    className="flex items-center gap-2 p-3 border rounded-lg bg-muted/30"
                  >
                    <div className="flex-1 flex items-center gap-2 flex-wrap">
                      <Select
                        value={condition.field}
                        onValueChange={(value) => updateCondition(index, "field", value)}
                      >
                        <SelectTrigger className="w-36">
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
                      disabled={ruleFormData.conditions.length <= 1}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
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
              <Button type="submit" disabled={submitting || !ruleFormData.grade_id}>
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
            <AlertDialogTitle>규칙 삭제</AlertDialogTitle>
            <AlertDialogDescription>
              정말로 이 분류 규칙을 삭제하시겠습니까?
              삭제된 규칙은 복구할 수 없습니다.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>취소</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleRuleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {submitting ? "삭제 중..." : "삭제"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* 기존 리드 재분류 확인 다이얼로그 */}
      <AlertDialog open={reclassifyDialogOpen} onOpenChange={setReclassifyDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>기존 리드 재분류</AlertDialogTitle>
            <AlertDialogDescription>
              현재 등급 규칙을 기존 리드에 적용하여 등급을 다시 분류합니다.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="py-4 space-y-4">
            <div className="space-y-2">
              <Label>재분류 대상</Label>
              <Select
                value={reclassifyMode}
                onValueChange={(value: "auto_only" | "all") => setReclassifyMode(value)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="auto_only">
                    자동 분류된 리드만 (수동 변경 유지)
                  </SelectItem>
                  <SelectItem value="all">
                    전체 리드 (수동 변경 포함)
                  </SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                {reclassifyMode === "auto_only"
                  ? "수동으로 변경한 등급은 유지되고, 자동 분류된 리드만 재분류됩니다."
                  : "모든 리드의 등급이 현재 규칙에 따라 재분류됩니다."}
              </p>
            </div>
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={reclassifying}>취소</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleReclassify}
              disabled={reclassifying}
            >
              {reclassifying ? (
                <>
                  <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                  재분류 중...
                </>
              ) : (
                "재분류 실행"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
