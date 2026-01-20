import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { z } from "zod";

// 테스트 데이터 스키마
const testDataSchema = z.object({
  annual_revenue: z.number().optional(),
  employee_count: z.number().optional(),
  industry: z.string().optional(),
  region: z.string().optional(),
  campaign_name: z.string().optional(),
});

// 조건 타입 정의
interface Condition {
  field: string;
  operator: string;
  value: string | number | (string | number)[];
}

// 평가 로그 타입
interface EvaluationLog {
  gradeId: string;
  gradeName: string;
  gradeColor: string;
  gradePriority: number;
  ruleId: string;
  conditions: string;
  result: boolean;
  details: string;
}

// 조건 평가 함수
function evaluateCondition(
  testData: Record<string, unknown>,
  condition: Condition
): { result: boolean; detail: string } {
  const value = testData[condition.field];
  const fieldLabels: Record<string, string> = {
    annual_revenue: "연매출",
    employee_count: "종업원수",
    industry: "업종",
    region: "지역",
    campaign_name: "광고 캠페인",
  };
  const fieldLabel = fieldLabels[condition.field] || condition.field;

  // 값이 없거나 빈 문자열인 경우
  if (value === undefined || value === null || value === "") {
    return {
      result: false,
      detail: `${fieldLabel} 값이 없음`,
    };
  }

  const numValue = typeof value === "number" ? value : Number(value);

  switch (condition.operator) {
    case "eq":
      if (typeof value === "number" || !isNaN(numValue)) {
        const result = numValue === Number(condition.value);
        return {
          result,
          detail: `${fieldLabel}: ${value} = ${condition.value} → ${result ? "충족" : "미충족"}`,
        };
      }
      const eqResult = String(value) === String(condition.value);
      return {
        result: eqResult,
        detail: `${fieldLabel}: "${value}" = "${condition.value}" → ${eqResult ? "충족" : "미충족"}`,
      };

    case "neq":
      if (typeof value === "number" || !isNaN(numValue)) {
        const result = numValue !== Number(condition.value);
        return {
          result,
          detail: `${fieldLabel}: ${value} ≠ ${condition.value} → ${result ? "충족" : "미충족"}`,
        };
      }
      const neqResult = String(value) !== String(condition.value);
      return {
        result: neqResult,
        detail: `${fieldLabel}: "${value}" ≠ "${condition.value}" → ${neqResult ? "충족" : "미충족"}`,
      };

    case "gt":
      const gtResult = numValue > Number(condition.value);
      return {
        result: gtResult,
        detail: `${fieldLabel}: ${value} > ${condition.value} → ${gtResult ? "충족" : "미충족"}`,
      };

    case "gte":
      const gteResult = numValue >= Number(condition.value);
      return {
        result: gteResult,
        detail: `${fieldLabel}: ${value} ≥ ${condition.value} → ${gteResult ? "충족" : "미충족"}`,
      };

    case "lt":
      const ltResult = numValue < Number(condition.value);
      return {
        result: ltResult,
        detail: `${fieldLabel}: ${value} < ${condition.value} → ${ltResult ? "충족" : "미충족"}`,
      };

    case "lte":
      const lteResult = numValue <= Number(condition.value);
      return {
        result: lteResult,
        detail: `${fieldLabel}: ${value} ≤ ${condition.value} → ${lteResult ? "충족" : "미충족"}`,
      };

    case "between":
      if (Array.isArray(condition.value) && condition.value.length === 2) {
        const [min, max] = condition.value.map(Number);
        const betweenResult = numValue >= min && numValue <= max;
        return {
          result: betweenResult,
          detail: `${fieldLabel}: ${min} ≤ ${value} ≤ ${max} → ${betweenResult ? "충족" : "미충족"}`,
        };
      }
      return { result: false, detail: `${fieldLabel}: 범위 값 형식 오류` };

    case "in":
      if (Array.isArray(condition.value)) {
        const inResult = condition.value
          .map(String)
          .includes(String(value));
        return {
          result: inResult,
          detail: `${fieldLabel}: "${value}" in [${condition.value.join(", ")}] → ${inResult ? "충족" : "미충족"}`,
        };
      }
      return { result: false, detail: `${fieldLabel}: 목록 값 형식 오류` };

    case "contains":
      const containsResult = String(value)
        .toLowerCase()
        .includes(String(condition.value).toLowerCase());
      return {
        result: containsResult,
        detail: `${fieldLabel}: "${value}" contains "${condition.value}" → ${containsResult ? "충족" : "미충족"}`,
      };

    default:
      return { result: false, detail: `알 수 없는 연산자: ${condition.operator}` };
  }
}

// 규칙 평가 함수
function evaluateRule(
  testData: Record<string, unknown>,
  conditions: Condition[],
  logicOperator: string
): { result: boolean; details: string[] } {
  const evaluations = conditions.map((cond) =>
    evaluateCondition(testData, cond)
  );
  const details = evaluations.map((e) => e.detail);

  if (logicOperator === "AND") {
    const result = evaluations.every((e) => e.result);
    return { result, details };
  } else {
    const result = evaluations.some((e) => e.result);
    return { result, details };
  }
}

// 조건을 읽기 좋은 문자열로 변환
function conditionsToString(conditions: Condition[], logicOperator: string): string {
  const fieldLabels: Record<string, string> = {
    annual_revenue: "연매출",
    employee_count: "종업원수",
    industry: "업종",
    region: "지역",
    campaign_name: "캠페인",
  };

  const operatorLabels: Record<string, string> = {
    eq: "=",
    neq: "≠",
    gt: ">",
    gte: "≥",
    lt: "<",
    lte: "≤",
    between: "범위",
    in: "포함",
    contains: "텍스트포함",
  };

  const parts = conditions.map((cond) => {
    const field = fieldLabels[cond.field] || cond.field;
    const op = operatorLabels[cond.operator] || cond.operator;

    if (cond.operator === "between" && Array.isArray(cond.value)) {
      return `${field} ${cond.value[0]}~${cond.value[1]}`;
    }
    if (cond.operator === "in" && Array.isArray(cond.value)) {
      return `${field} in [${cond.value.join(",")}]`;
    }
    return `${field} ${op} ${cond.value}`;
  });

  return parts.join(` ${logicOperator} `);
}

// POST: 등급 규칙 테스트
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();

    // 인증 확인
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "인증이 필요합니다" }, { status: 401 });
    }

    // 요청 데이터 파싱 및 검증
    const body = await request.json();
    const validationResult = testDataSchema.safeParse(body);

    if (!validationResult.success) {
      return NextResponse.json(
        {
          error: "입력값이 올바르지 않습니다",
          details: validationResult.error.flatten().fieldErrors,
        },
        { status: 400 }
      );
    }

    const testData = validationResult.data as Record<string, unknown>;

    // 활성화된 등급 규칙 조회 (우선순위 순)
    const { data: rules, error: rulesError } = await supabase
      .from("grade_rules")
      .select(
        `
        *,
        grade:lead_grades(id, name, color, priority)
      `
      )
      .eq("is_active", true)
      .order("created_at", { ascending: true });

    if (rulesError) {
      console.error("Grade rules fetch error:", rulesError);
      return NextResponse.json(
        { error: "등급 규칙을 불러오는데 실패했습니다" },
        { status: 500 }
      );
    }

    // 등급 우선순위 순으로 정렬
    const sortedRules = (rules || []).sort((a, b) => {
      const priorityA = a.grade?.priority ?? 999;
      const priorityB = b.grade?.priority ?? 999;
      return priorityA - priorityB;
    });

    // 기본 등급 조회
    const { data: defaultGrade } = await supabase
      .from("lead_grades")
      .select("id, name, color, priority")
      .eq("is_default", true)
      .eq("is_active", true)
      .single();

    // 평가 로그 수집
    const evaluationLog: EvaluationLog[] = [];
    let resultGrade = defaultGrade;

    for (const rule of sortedRules) {
      const conditions = Array.isArray(rule.conditions)
        ? (rule.conditions as unknown as Condition[])
        : [];

      if (conditions.length === 0) continue;

      const { result, details } = evaluateRule(
        testData,
        conditions,
        rule.logic_operator || "AND"
      );

      evaluationLog.push({
        gradeId: rule.grade?.id || "",
        gradeName: rule.grade?.name || "알 수 없음",
        gradeColor: rule.grade?.color || "#6b7280",
        gradePriority: rule.grade?.priority ?? 999,
        ruleId: rule.id,
        conditions: conditionsToString(conditions, rule.logic_operator || "AND"),
        result,
        details: details.join(" | "),
      });

      // 첫 번째 매칭 등급 사용
      if (result && !resultGrade?.id) {
        resultGrade = rule.grade;
      }

      // 결과 찾으면 이미 로그에 추가했으므로 계속 진행 (모든 규칙 평가)
      if (result && resultGrade?.id === rule.grade?.id) {
        // 이미 결과 등급을 찾았지만 로그를 위해 계속 평가
      }
    }

    // 매칭된 규칙이 없으면 기본 등급
    if (!resultGrade) {
      resultGrade = defaultGrade;
    }

    return NextResponse.json({
      success: true,
      data: {
        resultGrade: resultGrade
          ? {
              id: resultGrade.id,
              name: resultGrade.name,
              color: resultGrade.color,
              priority: resultGrade.priority,
            }
          : null,
        evaluationLog,
        testData,
      },
    });
  } catch (error) {
    console.error("Grade rule test error:", error);
    return NextResponse.json(
      { error: "서버 오류가 발생했습니다" },
      { status: 500 }
    );
  }
}
