/**
 * 수수료 계산 유틸리티
 * 보험 상품의 월납 금액과 수수료율을 기반으로 수수료를 계산합니다.
 */

export interface InsuranceProduct {
  id: string;
  name: string;
  company: string | null;
  insurer_commission_rate: number; // 보험사 수수료 환산율 (예: 1.5 = 150%)
  adjustment_rate: number; // 회사 조정률 (예: 1.0 = 100%, 0.8 = 80%)
}

export interface PerformanceDetail {
  product_id: string | null;
  monthly_payment: number;
  commission_amount: number;
  client_name?: string;
  contract_date?: string;
  memo?: string;
}

export interface PerformanceSummary {
  totalMonthlyPayment: number;
  totalCommission: number;
  contractCount: number;
  averageCommissionRate: number;
}

/**
 * 월납 금액과 이중 수수료율로 수수료(CMP) 계산
 * 계산 공식: 월납 × 보험사 수수료 환산율 / 회사 조정률
 *
 * 예시: 월납 1,000,000원, 환산율 150%, 조정률 105%
 *       CMP = 1,000,000 × 1.5 / 1.05 = 1,428,571원
 *
 * @param monthlyPayment 월납 금액 (원)
 * @param insurerCommissionRate 보험사 수수료 환산율 (예: 1.5 = 150%)
 * @param adjustmentRate 회사 조정률 (예: 1.05 = 105%)
 * @returns 계산된 수수료/CMP (원)
 */
export function calculateCommission(
  monthlyPayment: number,
  insurerCommissionRate: number,
  adjustmentRate: number = 1.0
): number {
  if (monthlyPayment < 0 || insurerCommissionRate < 0 || adjustmentRate <= 0) {
    return 0;
  }

  // 소수점 이하 반올림 (정수 원 단위)
  // CMP = 월납 × 환산율 / 조정률
  return Math.round((monthlyPayment * insurerCommissionRate) / adjustmentRate);
}

/**
 * 상품 정보를 사용해 수수료 계산
 * 보험사 수수료율과 회사 조정률을 모두 적용
 */
export function calculateCommissionWithProduct(
  monthlyPayment: number,
  product: InsuranceProduct | null
): number {
  if (!product) {
    return 0;
  }

  return calculateCommission(
    monthlyPayment,
    product.insurer_commission_rate,
    product.adjustment_rate
  );
}

/**
 * 수수료율 2개를 하나의 유효 수수료율(CMP율)로 계산
 * CMP율 = 보험사 수수료 환산율 / 회사 조정률
 *
 * 예시: 환산율 150%, 조정률 105%
 *       CMP율 = 1.5 / 1.05 = 1.4286 (142.86%)
 */
export function getEffectiveCommissionRate(
  insurerCommissionRate: number,
  adjustmentRate: number
): number {
  if (adjustmentRate <= 0) return 0;
  return insurerCommissionRate / adjustmentRate;
}

/**
 * 여러 실적 상세의 합계 계산
 */
export function calculatePerformanceSummary(
  details: PerformanceDetail[]
): PerformanceSummary {
  if (!details || details.length === 0) {
    return {
      totalMonthlyPayment: 0,
      totalCommission: 0,
      contractCount: 0,
      averageCommissionRate: 0,
    };
  }

  const totalMonthlyPayment = details.reduce(
    (sum, d) => sum + (d.monthly_payment || 0),
    0
  );
  const totalCommission = details.reduce(
    (sum, d) => sum + (d.commission_amount || 0),
    0
  );
  const contractCount = details.length;

  // 평균 수수료율 계산 (총 수수료 / 총 월납)
  const averageCommissionRate =
    totalMonthlyPayment > 0 ? totalCommission / totalMonthlyPayment : 0;

  return {
    totalMonthlyPayment,
    totalCommission,
    contractCount,
    averageCommissionRate: Math.round(averageCommissionRate * 10000) / 10000, // 소수점 4자리
  };
}

/**
 * 금액 포맷팅 (천 단위 쉼표 표시)
 */
export function formatCurrency(amount: number, showUnit: boolean = true): string {
  return showUnit ? `${amount.toLocaleString()}원` : amount.toLocaleString();
}

/**
 * 수수료율 포맷팅 (1.5 -> "150%", 0.12 -> "12%")
 */
export function formatCommissionRate(rate: number): string {
  return `${(rate * 100).toFixed(0)}%`;
}

/**
 * 이중 수수료율 포맷팅 (보험사율 × 조정률 형태로 표시)
 * 예: "150% × 100%"
 */
export function formatDualCommissionRate(
  insurerRate: number,
  adjustmentRate: number
): string {
  return `${formatCommissionRate(insurerRate)} × ${formatCommissionRate(adjustmentRate)}`;
}

/**
 * 등급별 자격 조건 충족 여부 계산
 * A등급: 전월 월납 >= 60만원
 * B등급: 전월 월납 >= 20만원 AND < 60만원
 */
export interface GradeEligibility {
  gradeA: boolean;
  gradeB: boolean;
  gradeC: boolean;
  gradeD: boolean;
  totalMonthlyPayment: number;
}

export function calculateGradeEligibility(
  monthlyPayment: number,
  isNewbieTestPassed: boolean = false,
  isTrainee: boolean = false
): GradeEligibility {
  const GRADE_A_THRESHOLD = 600000; // 60만원
  const GRADE_B_MIN_THRESHOLD = 200000; // 20만원

  return {
    gradeA: monthlyPayment >= GRADE_A_THRESHOLD,
    gradeB:
      monthlyPayment >= GRADE_B_MIN_THRESHOLD &&
      monthlyPayment < GRADE_A_THRESHOLD,
    gradeC: isNewbieTestPassed && monthlyPayment < GRADE_A_THRESHOLD,
    gradeD: isTrainee,
    totalMonthlyPayment: monthlyPayment,
  };
}

/**
 * 이전 월 기준으로 년월 계산
 */
export function getPreviousMonth(
  year: number,
  month: number
): { year: number; month: number } {
  if (month === 1) {
    return { year: year - 1, month: 12 };
  }
  return { year, month: month - 1 };
}

/**
 * 현재 날짜 기준 전월 년월 반환
 */
export function getPreviousMonthFromNow(): { year: number; month: number } {
  const now = new Date();
  return getPreviousMonth(now.getFullYear(), now.getMonth() + 1);
}
