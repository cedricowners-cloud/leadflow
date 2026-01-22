import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { normalizePhone, parseNumberRange, parseDate } from "@/lib/utils/file-parser";
import {
  classifyGrade,
  GradeWithRule,
  Condition,
} from "@/lib/utils/grade-classifier";

/**
 * n8n Webhook API - Facebook Lead Ads 데이터 수신
 *
 * n8n 워크플로우에서 HTTP Request 노드를 통해 호출됩니다.
 *
 * 요청 형식:
 * POST /api/leads/webhook
 * Headers:
 *   x-api-key: {WEBHOOK_API_KEY}
 *   Content-Type: application/json
 *
 * Body (단일 리드):
 * {
 *   "lead_id": "123456789",
 *   "created_at": "2026-01-22T10:00:00+0000",
 *   "full_name": "홍길동",
 *   "phone_number": "01012345678",
 *   "company_name": "ABC회사",
 *   "raw_fields": { ... },
 *   "source": "meta_lead_ads"
 * }
 *
 * Body (다중 리드 - 배열):
 * [
 *   { "lead_id": "...", ... },
 *   { "lead_id": "...", ... }
 * ]
 */

interface WebhookResult {
  success: boolean;
  data?: {
    batchId: string;
    totalCount: number;
    successCount: number;
    duplicateCount: number;
    errorCount: number;
    gradeSummary: Record<string, number>;
    errors: { lead_id?: string; message: string }[];
    duplicates: { lead_id?: string; phone: string }[];
  };
  error?: string;
}

// n8n에서 보내는 리드 데이터 형식
interface WebhookLeadData {
  lead_id?: string;
  created_at?: string;
  full_name?: string;
  phone_number?: string;
  company_name?: string;
  raw_fields?: Record<string, unknown>;
  source?: string;
  // raw_fields에서 추출될 수 있는 필드들
  industry?: string;
  annual_revenue?: string | number;
  employee_count?: string | number;
  region?: string;
  business_type?: string;
  tax_delinquency?: string | boolean;
  available_time?: string;
  campaign_name?: string;
  ad_set_name?: string;
  ad_name?: string;
  form_id?: string;
  form_name?: string;
}

// raw_fields에서 시스템 필드로 매핑
// 주의: 패턴 매칭은 key.toLowerCase().includes(pattern.toLowerCase()) 방식
const RAW_FIELD_MAPPINGS: Record<string, string[]> = {
  industry: ["업종", "업종을", "업종선택", "업종_선택", "industry", "business_type_field"],
  annual_revenue: ["연매출", "연매출을", "매출", "매출액", "annual_revenue", "revenue"],
  employee_count: ["종업원수", "종업원수를", "직원수", "인원", "employees", "employee_count"],
  region: ["지역", "지역을", "주소", "주소를", "region", "address", "location"],
  business_type: ["사업자", "사업자유형", "사업자를", "business_type"],
  tax_delinquency: ["세금체납", "세금_체납", "세급_체납", "체납이_있습니까", "체납", "체납이", "tax_delinquency"],
  available_time: [
    "회신시간", "회신받으실", "연락시간", "시간대", "available_time",
    "연락_가능", "연락가능", "연락_가능_시간", "연락가능시간",
  ],
  // 추가 한글 필드 매핑 (n8n/Meta에서 올 수 있는 필드들)
  representative_name: ["이름", "성명", "대표자", "대표자명", "full_name"],
  phone: ["전화번호", "연락처", "휴대폰", "핸드폰", "phone_number", "회신_받으실_번호", "회신번호"],
  company_name: ["업체명", "회사명", "상호", "회사", "company_name"],
  email: ["이메일", "메일", "email"],
  // 참고: 보험/채용 관련 필드(insurance_career, corporate_sales_career, qualifications)는
  // DB에 컬럼이 없어 extra_fields에 자동 저장됨
};

export async function POST(request: NextRequest): Promise<NextResponse<WebhookResult>> {
  try {
    // API 키 검증
    const apiKey = request.headers.get("x-api-key");
    const expectedApiKey = process.env.WEBHOOK_API_KEY;

    if (!expectedApiKey) {
      console.error("WEBHOOK_API_KEY 환경 변수가 설정되지 않았습니다.");
      return NextResponse.json(
        { success: false, error: "서버 설정 오류입니다." },
        { status: 500 }
      );
    }

    if (!apiKey || apiKey !== expectedApiKey) {
      return NextResponse.json(
        { success: false, error: "유효하지 않은 API 키입니다." },
        { status: 401 }
      );
    }

    // 요청 본문 파싱
    const body = await request.json();

    // 단일 리드 또는 배열 처리
    const leads: WebhookLeadData[] = Array.isArray(body) ? body : [body];

    if (leads.length === 0) {
      return NextResponse.json(
        { success: false, error: "처리할 리드 데이터가 없습니다." },
        { status: 400 }
      );
    }

    // Admin 클라이언트 사용 (RLS 우회)
    const supabase = createAdminClient();

    // 등급 및 규칙 조회
    const { data: grades } = await supabase
      .from("lead_grades")
      .select("id, name, color, priority, is_default")
      .eq("is_active", true)
      .order("priority");

    const { data: rules } = await supabase
      .from("grade_rules")
      .select("id, grade_id, conditions, logic_operator")
      .eq("is_active", true);

    // 등급과 규칙 매핑
    const gradesWithRules: GradeWithRule[] = (grades || []).map((grade) => ({
      ...grade,
      rules: (rules || [])
        .filter((rule) => rule.grade_id === grade.id)
        .map((rule) => ({
          id: rule.id,
          grade_id: rule.grade_id,
          conditions: (Array.isArray(rule.conditions)
            ? rule.conditions
            : []) as Condition[],
          logic_operator: (rule.logic_operator as "AND" | "OR") || "AND",
        })),
    }));

    // 기존 리드의 전화번호 조회 (중복 체크용)
    const { data: existingLeads } = await supabase
      .from("leads")
      .select("phone");

    const existingPhones = new Set(
      (existingLeads || []).map((l) => l.phone)
    );

    // 데이터 처리
    const transformedLeads: Record<string, unknown>[] = [];
    const errors: { lead_id?: string; message: string }[] = [];
    const duplicates: { lead_id?: string; phone: string }[] = [];
    const gradeSummary: Record<string, number> = {};
    const processedPhones = new Set<string>();

    for (const lead of leads) {
      try {
        // 데이터 변환
        const transformedData = transformWebhookLead(lead);

        // 전화번호 필수 체크
        if (!transformedData.phone) {
          errors.push({
            lead_id: lead.lead_id,
            message: "연락처가 누락되었습니다.",
          });
          continue;
        }

        const phone = transformedData.phone as string;

        // 중복 체크 (DB 기존 데이터)
        if (existingPhones.has(phone)) {
          duplicates.push({ lead_id: lead.lead_id, phone });
          continue;
        }

        // 중복 체크 (현재 요청 내)
        if (processedPhones.has(phone)) {
          duplicates.push({ lead_id: lead.lead_id, phone });
          continue;
        }

        processedPhones.add(phone);

        // 등급 분류
        const classification = classifyGrade(
          {
            annual_revenue: transformedData.annual_revenue as number | null,
            employee_count: transformedData.employee_count as number | null,
            industry: transformedData.industry as string | null,
            region: transformedData.region as string | null,
            business_type: transformedData.business_type as string | null,
            campaign_name: transformedData.campaign_name as string | null,
          },
          gradesWithRules
        );

        transformedData.grade_id = classification.grade_id;
        transformedData.grade_source = "auto";

        // 등급 통계
        gradeSummary[classification.grade_name] =
          (gradeSummary[classification.grade_name] || 0) + 1;

        transformedLeads.push(transformedData);
      } catch (error) {
        errors.push({
          lead_id: lead.lead_id,
          message: error instanceof Error ? error.message : "변환 오류",
        });
      }
    }

    // upload_batches 레코드 생성
    const { data: batch, error: batchError } = await supabase
      .from("upload_batches")
      .insert({
        file_name: `webhook_${new Date().toISOString().slice(0, 10)}`,
        total_count: leads.length,
        success_count: transformedLeads.length,
        duplicate_count: duplicates.length,
        error_count: errors.length,
        grade_summary: gradeSummary,
        source: "webhook",
      })
      .select("id")
      .single();

    if (batchError) {
      console.error("Webhook 배치 생성 오류:", batchError);
      // 배치 생성 실패해도 리드 저장은 계속 진행
    }

    const batchId = batch?.id || null;

    // 리드 데이터에 batch_id 추가
    if (batchId && transformedLeads.length > 0) {
      transformedLeads.forEach((lead) => {
        lead.upload_batch_id = batchId;
      });
    }

    // 리드 데이터 삽입
    if (transformedLeads.length > 0) {
      const { error: insertError } = await supabase
        .from("leads")
        .insert(transformedLeads);

      if (insertError) {
        console.error("Webhook 리드 저장 오류:", insertError);
        return NextResponse.json(
          { success: false, error: "리드 저장 실패: " + insertError.message },
          { status: 500 }
        );
      }
    }

    // 성공 응답
    console.log(`Webhook 처리 완료: 배치 ${batchId}, 성공 ${transformedLeads.length}건, 중복 ${duplicates.length}건, 오류 ${errors.length}건`);

    return NextResponse.json({
      success: true,
      data: {
        batchId: batchId || "",
        totalCount: leads.length,
        successCount: transformedLeads.length,
        duplicateCount: duplicates.length,
        errorCount: errors.length,
        gradeSummary,
        errors: errors.slice(0, 10),
        duplicates: duplicates.slice(0, 10),
      },
    });
  } catch (error) {
    console.error("Webhook 처리 오류:", error);
    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error ? error.message : "알 수 없는 오류가 발생했습니다.",
      },
      { status: 500 }
    );
  }
}

/**
 * Webhook 리드 데이터를 leads 테이블 형식으로 변환
 */
function transformWebhookLead(lead: WebhookLeadData): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  const extraFields: Record<string, unknown> = {};

  // raw_fields에서 기본 필드 추출 (n8n이 raw_fields에 넣는 경우가 있음)
  const rawFields = lead.raw_fields || {};

  // 이름: full_name 또는 raw_fields의 full_name/이름
  const fullName = lead.full_name
    || (rawFields.full_name as string)
    || (rawFields.이름 as string);
  result.representative_name = fullName?.toString().trim() || null;

  // 전화번호: phone_number 또는 raw_fields의 phone_number/전화번호/회신_받으실_번호...
  const phoneNumber = lead.phone_number
    || (rawFields.phone_number as string)
    || (rawFields.전화번호 as string)
    || findRawFieldValue(rawFields, ["회신_받으실_번호", "회신번호", "연락처"]);
  result.phone = normalizePhone(phoneNumber?.toString() || null);

  // 회사명: company_name 또는 raw_fields의 company_name/업체명/회사명
  const companyName = lead.company_name
    || (rawFields.company_name as string)
    || (rawFields.업체명 as string)
    || (rawFields.회사명 as string);
  result.company_name = companyName?.toString().trim() || null;

  // 생성일
  result.source_date = lead.created_at ? parseDate(lead.created_at) : null;

  // 소스 구분 (meta_lead_ads로 통일)
  result.source = "meta_lead_ads";

  // Meta Lead ID 저장
  if (lead.lead_id) {
    extraFields.meta_lead_id = lead.lead_id;
  }

  // Form 정보
  if (lead.form_id) extraFields.form_id = lead.form_id;
  if (lead.form_name) extraFields.form_name = lead.form_name;

  // 광고 정보
  if (lead.campaign_name) result.campaign_name = lead.campaign_name;
  if (lead.ad_set_name) result.ad_set_name = lead.ad_set_name;
  if (lead.ad_name) result.ad_name = lead.ad_name;

  // 직접 전달된 필드 처리
  if (lead.industry) result.industry = lead.industry.trim();
  if (lead.region) result.region = lead.region.trim();
  if (lead.business_type) result.business_type = lead.business_type.trim();
  if (lead.available_time) result.available_time = lead.available_time.trim();

  // 연매출 처리
  if (lead.annual_revenue) {
    const revenueRange = parseNumberRange(lead.annual_revenue);
    result.annual_revenue = revenueRange.min;
    result.annual_revenue_min = revenueRange.min;
    result.annual_revenue_max = revenueRange.max;
  }

  // 종업원수 처리
  if (lead.employee_count) {
    const employeeRange = parseNumberRange(lead.employee_count);
    result.employee_count = employeeRange.min
      ? Math.floor(employeeRange.min)
      : null;
    result.employee_count_min = employeeRange.min
      ? Math.floor(employeeRange.min)
      : null;
    result.employee_count_max = employeeRange.max
      ? Math.floor(employeeRange.max)
      : null;
  }

  // 세금 체납 여부
  if (lead.tax_delinquency !== undefined) {
    if (typeof lead.tax_delinquency === "boolean") {
      result.tax_delinquency = lead.tax_delinquency;
    } else {
      const strValue = String(lead.tax_delinquency).toLowerCase().trim();
      result.tax_delinquency = ["네", "있음", "yes", "true", "1", "y"].includes(strValue);
    }
  }

  // raw_fields에서 추가 필드 추출
  if (lead.raw_fields && typeof lead.raw_fields === "object") {
    for (const [key, value] of Object.entries(lead.raw_fields)) {
      if (value === null || value === undefined || value === "") continue;

      const lowerKey = key.toLowerCase();
      let mapped = false;

      // 시스템 필드로 매핑 시도
      for (const [systemField, patterns] of Object.entries(RAW_FIELD_MAPPINGS)) {
        if (patterns.some((p) => lowerKey.includes(p.toLowerCase()))) {
          // 이미 설정된 필드가 아닌 경우에만 매핑
          if (!result[systemField]) {
            const processedValue = processRawFieldValue(systemField, value);
            if (processedValue !== null) {
              if (systemField === "annual_revenue" && typeof processedValue === "string") {
                const range = parseNumberRange(processedValue);
                result.annual_revenue = range.min;
                result.annual_revenue_min = range.min;
                result.annual_revenue_max = range.max;
              } else if (systemField === "employee_count" && typeof processedValue === "string") {
                const range = parseNumberRange(processedValue);
                result.employee_count = range.min ? Math.floor(range.min) : null;
                result.employee_count_min = range.min ? Math.floor(range.min) : null;
                result.employee_count_max = range.max ? Math.floor(range.max) : null;
              } else {
                result[systemField] = processedValue;
              }
            }
          }
          mapped = true;
          break;
        }
      }

      // 매핑되지 않은 필드는 extra_fields에 저장
      if (!mapped) {
        extraFields[key] = value;
      }
    }
  }

  // extra_fields가 있는 경우에만 추가
  if (Object.keys(extraFields).length > 0) {
    result.extra_fields = extraFields;
  }

  return result;
}

/**
 * raw_fields에서 패턴과 일치하는 키의 값 찾기
 */
function findRawFieldValue(
  rawFields: Record<string, unknown>,
  patterns: string[]
): string | null {
  for (const [key, value] of Object.entries(rawFields)) {
    if (value === null || value === undefined || value === "") continue;
    const lowerKey = key.toLowerCase();
    for (const pattern of patterns) {
      if (lowerKey.includes(pattern.toLowerCase())) {
        return String(value).trim();
      }
    }
  }
  return null;
}

/**
 * raw_fields 값 처리
 */
function processRawFieldValue(
  systemField: string,
  value: unknown
): string | number | boolean | null {
  if (value === null || value === undefined || value === "") {
    return null;
  }

  const strValue = String(value).trim();

  switch (systemField) {
    case "tax_delinquency":
      // "예", "네" 모두 한국어 긍정 응답으로 처리
      // toLowerCase()는 한글에 영향 없지만 영문 처리를 위해 유지
      return ["예", "네", "있음", "yes", "true", "1", "y"].includes(
        strValue.toLowerCase()
      );

    case "annual_revenue":
    case "employee_count":
      // 숫자 범위는 그대로 반환 (parseNumberRange에서 처리)
      return strValue;

    default:
      return strValue;
  }
}

// GET 요청은 API 상태 확인용
export async function GET(): Promise<NextResponse> {
  return NextResponse.json({
    status: "ok",
    message: "LeadFlow Webhook API",
    endpoints: {
      POST: "리드 데이터 수신 (x-api-key 헤더 필요)",
    },
  });
}
