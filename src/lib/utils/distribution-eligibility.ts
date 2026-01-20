/**
 * 배분 자격 평가 유틸리티
 * 멤버가 특정 등급의 리드를 받을 자격이 있는지 평가합니다.
 */

export interface MemberQualification {
  id: string;
  member_id: string;
  newbie_test_passed: boolean;
  newbie_test_passed_at: string | null;
}

export interface MemberPerformance {
  id: string;
  member_id: string;
  year: number;
  month: number;
  total_monthly_payment: number;
  total_commission: number;
  contract_count: number;
}

export interface DistributionRule {
  id: string;
  grade_id: string;
  name: string;
  conditions: Condition[];
  logic_operator: "AND" | "OR";
  exclusion_rules: string[];
  priority: number;
  is_active: boolean;
}

export interface Condition {
  field: string;
  operator:
    | "eq"
    | "neq"
    | "gt"
    | "gte"
    | "lt"
    | "lte"
    | "between"
    | "in"
    | "contains";
  value: unknown;
}

export interface MemberData {
  qualification: MemberQualification | null;
  previousMonthPerformance: MemberPerformance | null;
}

export interface EligibilityResult {
  isEligible: boolean;
  matchedRule: DistributionRule | null;
  evaluationLog: EvaluationLog[];
  excludedBy: string | null;
}

export interface EvaluationLog {
  ruleId: string;
  ruleName: string;
  conditionResults: ConditionResult[];
  overallResult: boolean;
}

export interface ConditionResult {
  field: string;
  operator: string;
  expectedValue: unknown;
  actualValue: unknown;
  passed: boolean;
  message: string;
}

/**
 * 멤버의 필드 값을 가져오는 함수
 */
function getMemberFieldValue(
  memberData: MemberData,
  field: string
): unknown {
  const { qualification, previousMonthPerformance } = memberData;

  // 자격 관련 필드
  if (field === "newbie_test_passed") {
    return qualification?.newbie_test_passed || false;
  }

  // 실적 관련 필드
  if (field === "monthly_payment" || field === "insurance_monthly_payment") {
    return previousMonthPerformance?.total_monthly_payment || 0;
  }
  if (field === "commission" || field === "total_commission") {
    return previousMonthPerformance?.total_commission || 0;
  }
  if (field === "contract_count") {
    return previousMonthPerformance?.contract_count || 0;
  }

  return null;
}

/**
 * 단일 조건 평가
 */
function evaluateCondition(
  memberData: MemberData,
  condition: Condition
): ConditionResult {
  const { field, operator, value } = condition;
  const actualValue = getMemberFieldValue(memberData, field);

  let passed = false;
  let message = "";

  if (actualValue === null || actualValue === undefined) {
    return {
      field,
      operator,
      expectedValue: value,
      actualValue: null,
      passed: false,
      message: `${field} 값이 없습니다`,
    };
  }

  switch (operator) {
    case "eq":
      passed = actualValue === value;
      message = passed
        ? `${field} = ${value} 충족`
        : `${field} = ${actualValue} (${value} 필요)`;
      break;

    case "neq":
      passed = actualValue !== value;
      message = passed
        ? `${field} != ${value} 충족`
        : `${field} = ${actualValue} (${value}가 아니어야 함)`;
      break;

    case "gt":
      passed = Number(actualValue) > Number(value);
      message = passed
        ? `${field} > ${value} 충족 (${actualValue})`
        : `${field} = ${actualValue} (> ${value} 필요)`;
      break;

    case "gte":
      passed = Number(actualValue) >= Number(value);
      message = passed
        ? `${field} >= ${value} 충족 (${actualValue})`
        : `${field} = ${actualValue} (>= ${value} 필요)`;
      break;

    case "lt":
      passed = Number(actualValue) < Number(value);
      message = passed
        ? `${field} < ${value} 충족 (${actualValue})`
        : `${field} = ${actualValue} (< ${value} 필요)`;
      break;

    case "lte":
      passed = Number(actualValue) <= Number(value);
      message = passed
        ? `${field} <= ${value} 충족 (${actualValue})`
        : `${field} = ${actualValue} (<= ${value} 필요)`;
      break;

    case "between":
      if (Array.isArray(value) && value.length === 2) {
        const [min, max] = value as [number, number];
        const numValue = Number(actualValue);
        passed = numValue >= min && numValue < max;
        message = passed
          ? `${field} ${min}~${max} 범위 충족 (${actualValue})`
          : `${field} = ${actualValue} (${min}~${max} 범위 필요)`;
      }
      break;

    case "in":
      if (Array.isArray(value)) {
        passed = value.includes(actualValue);
        message = passed
          ? `${field} 목록에 포함됨`
          : `${field} = ${actualValue} (목록에 없음)`;
      }
      break;

    case "contains":
      passed = String(actualValue)
        .toLowerCase()
        .includes(String(value).toLowerCase());
      message = passed
        ? `${field}에 ${value} 포함`
        : `${field}에 ${value} 미포함`;
      break;

    default:
      message = `알 수 없는 연산자: ${operator}`;
  }

  return {
    field,
    operator,
    expectedValue: value,
    actualValue,
    passed,
    message,
  };
}

/**
 * 단일 규칙 평가
 */
function evaluateRule(
  memberData: MemberData,
  rule: DistributionRule
): EvaluationLog {
  const conditionResults = rule.conditions.map((condition) =>
    evaluateCondition(memberData, condition)
  );

  let overallResult: boolean;
  if (rule.logic_operator === "AND") {
    overallResult = conditionResults.every((r) => r.passed);
  } else {
    overallResult = conditionResults.some((r) => r.passed);
  }

  return {
    ruleId: rule.id,
    ruleName: rule.name,
    conditionResults,
    overallResult,
  };
}

/**
 * 제외 규칙 평가
 */
function evaluateExclusionRules(
  memberData: MemberData,
  exclusionRules: string[],
  allGradeEligibilities?: Map<string, boolean>
): string | null {
  for (const exclusionRule of exclusionRules) {
    // A등급 자격자 제외
    if (exclusionRule === "grade_a_eligible") {
      if (allGradeEligibilities?.get("A") === true) {
        return "A등급 자격자 제외";
      }
    }
    // B등급 자격자 제외
    if (exclusionRule === "grade_b_eligible") {
      if (allGradeEligibilities?.get("B") === true) {
        return "B등급 자격자 제외";
      }
    }
  }
  return null;
}

/**
 * 멤버가 특정 등급 리드를 받을 자격이 있는지 평가
 */
export function evaluateMemberEligibility(
  memberData: MemberData,
  rules: DistributionRule[],
  allGradeEligibilities?: Map<string, boolean>
): EligibilityResult {
  const evaluationLog: EvaluationLog[] = [];
  let matchedRule: DistributionRule | null = null;

  // 우선순위 순으로 정렬
  const sortedRules = [...rules].sort((a, b) => a.priority - b.priority);

  for (const rule of sortedRules) {
    // 제외 규칙 먼저 평가
    const excludedBy = evaluateExclusionRules(
      memberData,
      rule.exclusion_rules,
      allGradeEligibilities
    );

    if (excludedBy) {
      return {
        isEligible: false,
        matchedRule: null,
        evaluationLog,
        excludedBy,
      };
    }

    // 규칙 평가
    const log = evaluateRule(memberData, rule);
    evaluationLog.push(log);

    if (log.overallResult) {
      matchedRule = rule;
      break;
    }
  }

  return {
    isEligible: matchedRule !== null,
    matchedRule,
    evaluationLog,
    excludedBy: null,
  };
}

/**
 * 등급별 기본 자격 조건 (빠른 체크용)
 *
 * 새로운 자격 기준:
 * - 테스트 통과자: 모든 등급 배분 가능 (실적에 따라 A/B/C 결정)
 * - 테스트 미통과자: D등급만 배분 가능
 */
export interface GradeEligibilityQuick {
  gradeA: boolean;
  gradeB: boolean;
  gradeC: boolean;
  gradeD: boolean;
}

export function evaluateQuickEligibility(
  monthlyPayment: number,
  isNewbieTestPassed: boolean
): GradeEligibilityQuick {
  const GRADE_A_THRESHOLD = 600000; // 60만원
  const GRADE_B_MIN_THRESHOLD = 200000; // 20만원

  // 테스트 미통과자는 D등급만 가능
  if (!isNewbieTestPassed) {
    return {
      gradeA: false,
      gradeB: false,
      gradeC: false,
      gradeD: true,
    };
  }

  // 테스트 통과자: 실적에 따라 등급 결정
  const gradeA = monthlyPayment >= GRADE_A_THRESHOLD;
  const gradeB =
    monthlyPayment >= GRADE_B_MIN_THRESHOLD && monthlyPayment < GRADE_A_THRESHOLD;
  const gradeC = !gradeA && !gradeB; // A, B 둘 다 아니면 C
  const gradeD = true; // D는 항상 가능

  return { gradeA, gradeB, gradeC, gradeD };
}

/**
 * 멤버가 받을 수 있는 모든 등급 목록 반환
 */
export function getEligibleGrades(
  monthlyPayment: number,
  isNewbieTestPassed: boolean
): string[] {
  const eligibility = evaluateQuickEligibility(monthlyPayment, isNewbieTestPassed);

  const grades: string[] = [];

  if (eligibility.gradeA) grades.push("A");
  if (eligibility.gradeB) grades.push("B");
  if (eligibility.gradeC) grades.push("C");
  if (eligibility.gradeD) grades.push("D");

  // 자격이 없으면 기본적으로 D등급만 허용
  if (grades.length === 0) {
    grades.push("D");
  }

  return grades;
}

/**
 * 금액을 읽기 쉬운 형식으로 변환
 */
export function formatPaymentAmount(amount: number): string {
  if (amount >= 10000) {
    const manWon = amount / 10000;
    return `${manWon.toLocaleString()}만원`;
  }
  return `${amount.toLocaleString()}원`;
}
