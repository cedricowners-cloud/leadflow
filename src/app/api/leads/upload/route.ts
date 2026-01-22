import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import {
  parseFile,
  normalizePhone,
  parseNumberRange,
  parseDate,
  ParsedRow,
} from "@/lib/utils/file-parser";
import {
  classifyGrade,
  GradeWithRule,
  Condition,
} from "@/lib/utils/grade-classifier";
import { CORE_FIELDS } from "@/lib/constants/lead-fields";
import { isAdminRole, MemberRole } from "@/lib/constants/roles";

// 코어 필드 목록 (leads 테이블의 실제 컬럼들)
const CORE_FIELD_NAMES = new Set(CORE_FIELDS.map((f) => f.systemField));

interface UploadResult {
  success: boolean;
  data?: {
    batchId: string;
    totalCount: number;
    successCount: number;
    duplicateCount: number;
    errorCount: number;
    gradeSummary: Record<string, number>;
    errors: { row: number; message: string }[];
    duplicates: { row: number; phone: string }[];
    // 매핑 정보 추가
    mappedColumns: string[];
    unmappedColumns: string[];
  };
  error?: string;
}

// 시스템 필드와 CSV 컬럼 기본 매핑
// 정확히 일치하는 경우 매핑
const DEFAULT_MAPPINGS: Record<string, string[]> = {
  // 기본 정보
  representative_name: ["이름", "대표자", "대표자명", "성명", "name", "representative_name", "full_name"],
  phone: ["연락처", "전화번호", "휴대폰", "phone", "mobile", "tel", "phone_number"],
  company_name: ["업체명", "회사명", "기업명", "company", "business_name", "company_name"],
  industry: ["업종", "업종명", "industry", "business_type"],
  annual_revenue: ["연매출", "매출", "매출액", "revenue", "annual_revenue"],
  employee_count: ["종업원수", "직원수", "인원", "employees", "employee_count"],
  region: ["지역", "주소", "region", "address", "location"],

  // 날짜/시간
  source_date: ["신청일", "신청일시", "등록일", "created_time", "source_date"],

  // Meta Ads 광고 정보
  campaign_name: ["캠페인", "캠페인명", "campaign_name"],
  ad_set_name: ["광고세트", "광고세트명", "ad_set_name", "adset_name"],
  ad_name: ["광고", "광고명", "ad_name"],

  // Meta Ads 추가 필드
  meta_id: ["id", "lead_id", "meta_id"],
  form_id: ["form_id"],
  form_name: ["form_name", "폼이름", "폼명"],
  is_organic: ["is_organic", "오가닉", "organic"],
  platform: ["platform", "플랫폼"],

  // 추가 필드
  business_type: ["사업자", "사업자유형", "business_type"],
  tax_delinquency: ["세금체납", "체납", "tax_delinquency"],
  available_time: ["회신시간", "연락시간", "available_time"],
};

// 부분 일치(contains)로 매핑할 필드들
// Meta 광고 폼에서 "업종을_선택해주세요" 같은 긴 헤더명을 처리
const PARTIAL_MATCH_MAPPINGS: Record<string, string[]> = {
  industry: ["업종을", "업종_선택", "업종선택"],
  annual_revenue: ["연매출을", "연매출_선택", "매출을_선택", "매출선택"],
  employee_count: ["종업원수를", "직원수를", "인원을"],
  region: ["지역을", "주소를"],
  business_type: ["사업자를", "사업자_선택"],
  tax_delinquency: ["세급_체납", "체납이_있습니까", "세금체납"],
  available_time: ["회신받으실_시간", "시간대를_작성"],
};

export async function POST(request: NextRequest): Promise<NextResponse<UploadResult>> {
  try {
    const supabase = await createClient();

    // 현재 사용자 확인
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { success: false, error: "인증이 필요합니다." },
        { status: 401 }
      );
    }

    // 현재 멤버 정보 조회
    const { data: member, error: memberError } = await supabase
      .from("members")
      .select("id, role")
      .eq("user_id", user.id)
      .single();

    if (memberError || !member) {
      return NextResponse.json(
        { success: false, error: "멤버 정보를 찾을 수 없습니다." },
        { status: 403 }
      );
    }

    // 권한 체크 (관리자 권한만 - 시스템 관리자, 지점장)
    if (!isAdminRole(member.role as MemberRole)) {
      return NextResponse.json(
        { success: false, error: "업로드 권한이 없습니다." },
        { status: 403 }
      );
    }

    // FormData에서 파일 추출
    const formData = await request.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json(
        { success: false, error: "파일이 필요합니다." },
        { status: 400 }
      );
    }

    // 파일 파싱
    const parseResult = await parseFile(file);
    const { headers, rows, errors: parseErrors } = parseResult;

    if (rows.length === 0) {
      return NextResponse.json(
        { success: false, error: "업로드할 데이터가 없습니다." },
        { status: 400 }
      );
    }

    // CSV 매핑 조회 (DB에 저장된 커스텀 매핑)
    const { data: customMappings } = await supabase
      .from("csv_mappings")
      .select("csv_column, system_field");

    // 매핑 생성 (커스텀 매핑 우선)
    const columnMapping = createColumnMapping(
      headers,
      customMappings || [],
      DEFAULT_MAPPINGS
    );

    // 디버깅: 헤더와 매핑 결과 로깅
    console.log("=== CSV Upload Debug ===");
    console.log("Headers from file:", headers);
    console.log("Custom mappings from DB:", customMappings);
    console.log("Final column mapping:", columnMapping);
    console.log("Unmapped headers:", headers.filter(h => !columnMapping[h]));

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

    // 데이터 변환 및 검증
    const transformedLeads: {
      data: Record<string, unknown>;
      row: number;
    }[] = [];
    const errors: { row: number; message: string }[] = [...parseErrors];
    const duplicates: { row: number; phone: string }[] = [];
    const gradeSummary: Record<string, number> = {};
    const processedPhones = new Set<string>();

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const rowNumber = i + 2; // 헤더 포함, 1-indexed

      try {
        // 데이터 변환
        const transformedData = transformRow(row, columnMapping);

        // 전화번호 필수 체크
        if (!transformedData.phone) {
          errors.push({ row: rowNumber, message: "연락처가 누락되었습니다." });
          continue;
        }

        const phone = transformedData.phone as string;

        // 중복 체크 (DB 기존 데이터)
        if (existingPhones.has(phone)) {
          duplicates.push({ row: rowNumber, phone });
          continue;
        }

        // 중복 체크 (현재 업로드 파일 내)
        if (processedPhones.has(phone)) {
          duplicates.push({ row: rowNumber, phone });
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

        transformedLeads.push({ data: transformedData, row: rowNumber });
      } catch (error) {
        errors.push({
          row: rowNumber,
          message: error instanceof Error ? error.message : "변환 오류",
        });
      }
    }

    // 업로드 배치 생성
    const { data: batch, error: batchError } = await supabase
      .from("upload_batches")
      .insert({
        uploaded_by: member.id,
        file_name: file.name,
        total_count: rows.length,
        success_count: transformedLeads.length,
        duplicate_count: duplicates.length,
        error_count: errors.length,
        grade_summary: gradeSummary,
      })
      .select()
      .single();

    if (batchError || !batch) {
      return NextResponse.json(
        { success: false, error: "배치 생성 실패: " + batchError?.message },
        { status: 500 }
      );
    }

    // 리드 데이터 삽입
    if (transformedLeads.length > 0) {
      const leadsToInsert = transformedLeads.map((item) => ({
        ...item.data,
        upload_batch_id: batch.id,
      }));

      const { error: insertError } = await supabase
        .from("leads")
        .insert(leadsToInsert);

      if (insertError) {
        // 배치 삭제 (롤백)
        await supabase.from("upload_batches").delete().eq("id", batch.id);

        return NextResponse.json(
          { success: false, error: "리드 저장 실패: " + insertError.message },
          { status: 500 }
        );
      }
    }

    // 매핑된/매핑안된 컬럼 정보 수집
    const mappedColumns = Object.keys(columnMapping);
    const unmappedColumns = headers.filter(h => !columnMapping[h]);

    return NextResponse.json({
      success: true,
      data: {
        batchId: batch.id,
        totalCount: rows.length,
        successCount: transformedLeads.length,
        duplicateCount: duplicates.length,
        errorCount: errors.length,
        gradeSummary,
        errors: errors.slice(0, 10), // 처음 10개만 반환
        duplicates: duplicates.slice(0, 10),
        mappedColumns,
        unmappedColumns,
      },
    });
  } catch (error) {
    console.error("Upload error:", error);
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
 * 컬럼 매핑 생성
 */
function createColumnMapping(
  headers: string[],
  customMappings: { csv_column: string; system_field: string }[],
  defaultMappings: Record<string, string[]>
): Record<string, string> {
  const mapping: Record<string, string> = {};

  // 커스텀 매핑 먼저 적용
  for (const { csv_column, system_field } of customMappings) {
    const headerIndex = headers.findIndex(
      (h) => h.toLowerCase() === csv_column.toLowerCase()
    );
    if (headerIndex !== -1) {
      mapping[headers[headerIndex]] = system_field;
    }
  }

  // 기본 매핑 적용 (커스텀 매핑이 없는 경우)
  for (const header of headers) {
    if (mapping[header]) continue;

    const lowerHeader = header.toLowerCase().trim();

    // 특정 _id 컬럼은 스킵 (campaign_id, ad_id, adset_id 등 - 이름 버전을 사용)
    // 단, form_id, meta_id 같은 필요한 ID는 매핑함
    const skipIdFields = ["campaign_id", "ad_id", "adset_id"];
    if (skipIdFields.includes(lowerHeader)) continue;

    // 1. 정확히 일치하는 경우 매핑
    let matched = false;
    for (const [systemField, aliases] of Object.entries(defaultMappings)) {
      if (aliases.some((alias) => alias.toLowerCase() === lowerHeader)) {
        mapping[header] = systemField;
        matched = true;
        break;
      }
    }

    // 2. 정확히 일치하지 않으면 부분 일치(contains) 확인
    // Meta 광고 폼의 긴 헤더명 처리 (예: "업종을_선택해주세요_(80%완료)")
    if (!matched) {
      for (const [systemField, patterns] of Object.entries(PARTIAL_MATCH_MAPPINGS)) {
        if (patterns.some((pattern) => lowerHeader.includes(pattern.toLowerCase()))) {
          mapping[header] = systemField;
          break;
        }
      }
    }
  }

  return mapping;
}

/**
 * 행 데이터 변환
 * 코어 필드는 leads 테이블 컬럼에, 동적 필드는 extra_fields JSONB에 저장
 */
function transformRow(
  row: ParsedRow,
  columnMapping: Record<string, string>
): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  const extraFields: Record<string, unknown> = {};

  for (const [csvColumn, systemField] of Object.entries(columnMapping)) {
    const value = row[csvColumn];

    // 코어 필드인지 확인
    const isCoreField = CORE_FIELD_NAMES.has(systemField);

    // 값 변환
    const transformedValue = transformFieldValue(systemField, value);

    if (isCoreField) {
      // 코어 필드는 결과 객체에 직접 추가
      if (systemField === "annual_revenue") {
        // annual_revenue는 범위 처리가 필요
        const revenueRange = parseNumberRange(value);
        result.annual_revenue = revenueRange.min;
        result.annual_revenue_min = revenueRange.min;
        result.annual_revenue_max = revenueRange.max;
      } else if (systemField === "employee_count") {
        // employee_count도 범위 처리
        const employeeRange = parseNumberRange(value);
        result.employee_count = employeeRange.min
          ? Math.floor(employeeRange.min)
          : null;
        result.employee_count_min = employeeRange.min
          ? Math.floor(employeeRange.min)
          : null;
        result.employee_count_max = employeeRange.max
          ? Math.floor(employeeRange.max)
          : null;
      } else {
        result[systemField] = transformedValue;
      }
    } else {
      // 동적 필드는 extra_fields에 추가
      if (transformedValue !== null && transformedValue !== undefined && transformedValue !== "") {
        extraFields[systemField] = transformedValue;
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
 * 필드 값 변환 (타입에 따라)
 */
function transformFieldValue(
  systemField: string,
  value: string | number | boolean | null | undefined
): unknown {
  if (value === null || value === undefined || value === "") {
    return null;
  }

  switch (systemField) {
    case "phone":
      // phone은 문자열/숫자만 처리
      if (typeof value === "boolean") return null;
      return normalizePhone(value);

    case "source_date":
      // date도 문자열/숫자만 처리
      if (typeof value === "boolean") return null;
      return parseDate(value);

    case "is_organic":
      // boolean 변환: "true", "1", "yes" 등을 true로
      if (typeof value === "boolean") {
        return value;
      }
      const strValueOrganic = String(value).toLowerCase().trim();
      return ["true", "1", "yes", "y"].includes(strValueOrganic);

    case "tax_delinquency":
      // 세금 체납 여부 변환: "네", "있음", "yes" 등을 true로
      if (typeof value === "boolean") {
        return value;
      }
      const strValueTax = String(value).toLowerCase().trim();
      return ["네", "있음", "yes", "true", "1", "y"].includes(strValueTax);

    case "business_type":
    case "available_time":
    case "representative_name":
    case "company_name":
    case "industry":
    case "region":
    case "campaign_name":
    case "ad_set_name":
    case "ad_name":
      // 문자열 필드: trim 처리
      return String(value).trim();

    default:
      // 기타 필드는 그대로 반환
      return value;
  }
}
