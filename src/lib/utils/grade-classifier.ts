import { Json } from "@/types/database.types";

export interface Condition {
  field: string;
  operator: string;
  value: string | number | [number, number];
}

export interface GradeRule {
  id: string;
  grade_id: string;
  conditions: Condition[];
  logic_operator: "AND" | "OR";
}

export interface GradeWithRule {
  id: string;
  name: string;
  color: string | null;
  priority: number;
  is_default: boolean | null;
  rules: GradeRule[];
}

export interface LeadData {
  annual_revenue?: number | null;
  employee_count?: number | null;
  industry?: string | null;
  region?: string | null;
  business_type?: string | null;
  campaign_name?: string | null;
  tax_delinquency?: boolean | null;
  [key: string]: unknown;
}

export interface ClassificationResult {
  grade_id: string;
  grade_name: string;
  matched_rule_id?: string;
  evaluation_log: EvaluationLog[];
}

export interface EvaluationLog {
  grade_name: string;
  rule_description: string;
  result: boolean;
  details: string;
}

/**
 * 리드 데이터에 대해 등급을 자동 분류합니다.
 */
export function classifyGrade(
  lead: LeadData,
  gradesWithRules: GradeWithRule[]
): ClassificationResult {
  const evaluationLog: EvaluationLog[] = [];

  // 등급을 우선순위 순으로 정렬 (낮은 숫자가 높은 우선순위)
  const sortedGrades = [...gradesWithRules].sort(
    (a, b) => a.priority - b.priority
  );

  // 기본 등급 찾기
  const defaultGrade = sortedGrades.find((g) => g.is_default);

  // ⚠️ 세금체납이 있으면 무조건 D등급 (기본 등급) 강제 반환
  if (lead.tax_delinquency === true && defaultGrade) {
    evaluationLog.push({
      grade_name: defaultGrade.name,
      rule_description: "세금체납 강제 규칙",
      result: true,
      details: "세금체납이 있는 업체는 다른 조건에 관계없이 기본 등급(D)이 부여됩니다.",
    });

    return {
      grade_id: defaultGrade.id,
      grade_name: defaultGrade.name,
      evaluation_log: evaluationLog,
    };
  }

  // 각 등급의 규칙 평가
  for (const grade of sortedGrades) {
    if (grade.is_default) continue; // 기본 등급은 마지막에 처리

    for (const rule of grade.rules) {
      const conditions = parseConditions(rule.conditions);
      const ruleResult = evaluateRule(lead, conditions, rule.logic_operator);

      const ruleDescription = formatRuleDescription(
        conditions,
        rule.logic_operator
      );

      evaluationLog.push({
        grade_name: grade.name,
        rule_description: ruleDescription,
        result: ruleResult.matched,
        details: ruleResult.details,
      });

      if (ruleResult.matched) {
        return {
          grade_id: grade.id,
          grade_name: grade.name,
          matched_rule_id: rule.id,
          evaluation_log: evaluationLog,
        };
      }
    }
  }

  // 어떤 규칙에도 해당하지 않으면 기본 등급 반환
  if (defaultGrade) {
    evaluationLog.push({
      grade_name: defaultGrade.name,
      rule_description: "기본 등급 (모든 규칙 미충족)",
      result: true,
      details: "어떤 등급 규칙에도 해당하지 않아 기본 등급이 부여됩니다.",
    });

    return {
      grade_id: defaultGrade.id,
      grade_name: defaultGrade.name,
      evaluation_log: evaluationLog,
    };
  }

  // 기본 등급도 없는 경우 (예외 상황)
  throw new Error("기본 등급이 설정되어 있지 않습니다.");
}

/**
 * JSON 형태의 conditions를 Condition 배열로 변환
 */
function parseConditions(conditions: Json | Condition[]): Condition[] {
  if (Array.isArray(conditions)) {
    return conditions as Condition[];
  }
  return [];
}

/**
 * 규칙 평가
 */
function evaluateRule(
  lead: LeadData,
  conditions: Condition[],
  logicOperator: "AND" | "OR"
): { matched: boolean; details: string } {
  if (conditions.length === 0) {
    return { matched: false, details: "조건이 없습니다." };
  }

  const results = conditions.map((condition) =>
    evaluateCondition(lead, condition)
  );

  const detailParts = results.map(
    (r, i) =>
      `${conditions[i].field} ${formatOperator(conditions[i].operator)} ${formatValue(conditions[i].value)}: ${r.matched ? "충족" : "미충족"} (${r.detail})`
  );

  if (logicOperator === "AND") {
    const matched = results.every((r) => r.matched);
    return {
      matched,
      details: detailParts.join(", "),
    };
  } else {
    const matched = results.some((r) => r.matched);
    return {
      matched,
      details: detailParts.join(", "),
    };
  }
}

/**
 * 개별 조건 평가
 */
function evaluateCondition(
  lead: LeadData,
  condition: Condition
): { matched: boolean; detail: string } {
  const fieldValue = lead[condition.field];

  // 값이 없는 경우
  if (fieldValue === null || fieldValue === undefined) {
    return { matched: false, detail: "값 없음" };
  }

  const { operator, value } = condition;

  // 숫자 비교
  if (typeof fieldValue === "number" || !isNaN(Number(fieldValue))) {
    const numValue = Number(fieldValue);
    const numTarget =
      typeof value === "number" ? value : parseFloat(String(value));

    switch (operator) {
      case "eq":
      case "=":
        return {
          matched: numValue === numTarget,
          detail: `${numValue} = ${numTarget}`,
        };

      case "neq":
      case "!=":
        return {
          matched: numValue !== numTarget,
          detail: `${numValue} != ${numTarget}`,
        };

      case "gt":
      case ">":
        return {
          matched: numValue > numTarget,
          detail: `${numValue} > ${numTarget}`,
        };

      case "gte":
      case ">=":
        return {
          matched: numValue >= numTarget,
          detail: `${numValue} >= ${numTarget}`,
        };

      case "lt":
      case "<":
        return {
          matched: numValue < numTarget,
          detail: `${numValue} < ${numTarget}`,
        };

      case "lte":
      case "<=":
        return {
          matched: numValue <= numTarget,
          detail: `${numValue} <= ${numTarget}`,
        };

      case "between":
        if (Array.isArray(value) && value.length === 2) {
          const [min, max] = value;
          const matched = numValue >= min && numValue <= max;
          return {
            matched,
            detail: `${min} <= ${numValue} <= ${max}`,
          };
        }
        return { matched: false, detail: "범위 값 오류" };
    }
  }

  // 문자열 비교
  const strValue = String(fieldValue).toLowerCase();
  const strTarget = String(value).toLowerCase();

  switch (operator) {
    case "eq":
    case "=":
      return {
        matched: strValue === strTarget,
        detail: `"${fieldValue}" = "${value}"`,
      };

    case "neq":
    case "!=":
      return {
        matched: strValue !== strTarget,
        detail: `"${fieldValue}" != "${value}"`,
      };

    case "contains":
      return {
        matched: strValue.includes(strTarget),
        detail: `"${fieldValue}" contains "${value}"`,
      };

    case "not_contains":
      return {
        matched: !strValue.includes(strTarget),
        detail: `"${fieldValue}" not contains "${value}"`,
      };

    case "in":
      if (Array.isArray(value)) {
        const matched = value
          .map((v) => String(v).toLowerCase())
          .includes(strValue);
        return {
          matched,
          detail: `"${fieldValue}" in [${value.join(", ")}]`,
        };
      }
      return { matched: false, detail: "목록 값 오류" };

    default:
      return { matched: false, detail: `알 수 없는 연산자: ${operator}` };
  }
}

/**
 * 연산자 포맷팅
 */
function formatOperator(operator: string): string {
  const operatorMap: Record<string, string> = {
    eq: "=",
    neq: "≠",
    gt: ">",
    gte: "≥",
    lt: "<",
    lte: "≤",
    between: "범위",
    contains: "포함",
    not_contains: "미포함",
    in: "목록 중",
  };
  return operatorMap[operator] || operator;
}

/**
 * 값 포맷팅
 */
function formatValue(value: string | number | [number, number]): string {
  if (Array.isArray(value)) {
    return `${value[0]} ~ ${value[1]}`;
  }
  return String(value);
}

/**
 * 규칙 설명 포맷팅
 */
function formatRuleDescription(
  conditions: Condition[],
  logicOperator: "AND" | "OR"
): string {
  const parts = conditions.map((c) => {
    const field = formatFieldName(c.field);
    const op = formatOperator(c.operator);
    const val = formatValue(c.value);
    return `${field} ${op} ${val}`;
  });

  return parts.join(logicOperator === "AND" ? " 그리고 " : " 또는 ");
}

/**
 * 필드명 포맷팅
 */
function formatFieldName(field: string): string {
  const fieldMap: Record<string, string> = {
    annual_revenue: "연매출",
    employee_count: "종업원수",
    industry: "업종",
    region: "지역",
    company_name: "업체명",
    representative_name: "대표자명",
    business_type: "사업자 유형",
    campaign_name: "광고 캠페인",
    tax_delinquency: "세금체납",
  };
  return fieldMap[field] || field;
}

/**
 * 여러 리드에 대해 일괄 등급 분류
 */
export function classifyLeads(
  leads: LeadData[],
  gradesWithRules: GradeWithRule[]
): { lead: LeadData; classification: ClassificationResult }[] {
  return leads.map((lead) => ({
    lead,
    classification: classifyGrade(lead, gradesWithRules),
  }));
}
