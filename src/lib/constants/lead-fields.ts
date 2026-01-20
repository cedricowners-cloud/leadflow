/**
 * LeadFlow 리드 필드 정의
 *
 * 이 파일은 CSV 매핑, 리드 목록 컬럼 설정, CSV 업로드 처리에서
 * 공통으로 사용되는 필드 정의를 담고 있습니다.
 *
 * - Core Fields: leads 테이블의 실제 컬럼으로 존재하는 필드
 * - Dynamic Fields: leads.extra_fields JSONB에 저장되는 동적 필드
 *
 * csv_mappings 테이블과 동기화되어야 합니다.
 */

export type FieldType = "text" | "number" | "date" | "datetime" | "phone" | "email" | "select";

export interface LeadFieldDefinition {
  /** 시스템 필드명 (DB 컬럼명 또는 extra_fields 키) */
  systemField: string;
  /** 필드 레이블 (한글) */
  label: string;
  /** 필드 설명 */
  description?: string;
  /** 필드 타입 */
  fieldType: FieldType;
  /** 코어 필드 여부 (true: leads 테이블 컬럼, false: extra_fields JSONB) */
  isCoreField: boolean;
  /** 필수 필드 여부 (CSV 업로드 시 반드시 매핑되어야 함) */
  isRequired: boolean;
  /** 기본 CSV 컬럼명 (Meta 광고 기본 형식) */
  defaultCsvColumn?: string;
  /** 리드 목록에서 기본 표시 여부 */
  defaultVisible: boolean;
  /** 기본 표시 순서 */
  displayOrder: number;
  /** 읽기 전용 여부 (시스템이 자동 생성하는 필드) */
  readonly?: boolean;
}

/**
 * 코어 필드 정의
 * leads 테이블에 실제 컬럼으로 존재하는 필드들
 */
export const CORE_FIELDS: LeadFieldDefinition[] = [
  // 필수 필드
  {
    systemField: "representative_name",
    label: "대표자명",
    description: "리드 담당자 또는 대표자 이름",
    fieldType: "text",
    isCoreField: true,
    isRequired: true,
    defaultCsvColumn: "이름",
    defaultVisible: true,
    displayOrder: 1,
  },
  {
    systemField: "phone",
    label: "연락처",
    description: "리드 연락처 (휴대폰 번호)",
    fieldType: "phone",
    isCoreField: true,
    isRequired: true,
    defaultCsvColumn: "연락처",
    defaultVisible: true,
    displayOrder: 2,
  },
  // 기본 정보 필드
  {
    systemField: "company_name",
    label: "업체명",
    description: "회사 또는 업체 이름",
    fieldType: "text",
    isCoreField: true,
    isRequired: false,
    defaultCsvColumn: "업체명",
    defaultVisible: true,
    displayOrder: 3,
  },
  {
    systemField: "industry",
    label: "업종",
    description: "업체의 업종 분류",
    fieldType: "text",
    isCoreField: true,
    isRequired: false,
    defaultCsvColumn: "업종",
    defaultVisible: true,
    displayOrder: 4,
  },
  {
    systemField: "region",
    label: "지역",
    description: "업체 소재 지역",
    fieldType: "text",
    isCoreField: true,
    isRequired: false,
    defaultCsvColumn: "지역",
    defaultVisible: false,
    displayOrder: 5,
  },
  // 사업 규모 필드
  {
    systemField: "annual_revenue",
    label: "연매출",
    description: "연간 매출액 (억원 단위)",
    fieldType: "number",
    isCoreField: true,
    isRequired: false,
    defaultCsvColumn: "연매출",
    defaultVisible: true,
    displayOrder: 6,
  },
  {
    systemField: "employee_count",
    label: "종업원수",
    description: "종업원 수",
    fieldType: "number",
    isCoreField: true,
    isRequired: false,
    defaultCsvColumn: "종업원수",
    defaultVisible: false,
    displayOrder: 7,
  },
  // 사업자 정보 필드
  {
    systemField: "business_type",
    label: "사업자유형",
    description: "개인사업자, 법인사업자 등",
    fieldType: "text",
    isCoreField: true,
    isRequired: false,
    defaultCsvColumn: "사업자유형",
    defaultVisible: false,
    displayOrder: 8,
  },
  {
    systemField: "annual_revenue_min",
    label: "연매출(최소)",
    description: "연매출 범위의 최소값",
    fieldType: "number",
    isCoreField: true,
    isRequired: false,
    defaultCsvColumn: "연매출(최소)",
    defaultVisible: false,
    displayOrder: 9,
  },
  {
    systemField: "annual_revenue_max",
    label: "연매출(최대)",
    description: "연매출 범위의 최대값",
    fieldType: "number",
    isCoreField: true,
    isRequired: false,
    defaultCsvColumn: "연매출(최대)",
    defaultVisible: false,
    displayOrder: 10,
  },
  {
    systemField: "employee_count_min",
    label: "직원수(최소)",
    description: "직원수 범위의 최소값",
    fieldType: "number",
    isCoreField: true,
    isRequired: false,
    defaultCsvColumn: "직원수(최소)",
    defaultVisible: false,
    displayOrder: 11,
  },
  {
    systemField: "employee_count_max",
    label: "직원수(최대)",
    description: "직원수 범위의 최대값",
    fieldType: "number",
    isCoreField: true,
    isRequired: false,
    defaultCsvColumn: "직원수(최대)",
    defaultVisible: false,
    displayOrder: 12,
  },
  // 연락 관련 필드
  {
    systemField: "available_time",
    label: "연락 가능한 시간",
    description: "리드가 연락 가능한 시간대",
    fieldType: "text",
    isCoreField: true,
    isRequired: false,
    defaultCsvColumn: "연락 가능한 시간",
    defaultVisible: false,
    displayOrder: 13,
  },
  {
    systemField: "tax_delinquency",
    label: "세금체납여부",
    description: "세금 체납 여부",
    fieldType: "text",
    isCoreField: true,
    isRequired: false,
    defaultCsvColumn: "세금체납여부",
    defaultVisible: false,
    displayOrder: 14,
  },
  // 광고 정보 필드
  {
    systemField: "campaign_name",
    label: "캠페인",
    description: "Meta 광고 캠페인명",
    fieldType: "text",
    isCoreField: true,
    isRequired: false,
    defaultCsvColumn: "캠페인",
    defaultVisible: false,
    displayOrder: 15,
  },
  {
    systemField: "ad_set_name",
    label: "광고세트",
    description: "Meta 광고 세트명",
    fieldType: "text",
    isCoreField: true,
    isRequired: false,
    defaultCsvColumn: "광고세트",
    defaultVisible: false,
    displayOrder: 16,
  },
  {
    systemField: "ad_name",
    label: "광고",
    description: "Meta 광고명",
    fieldType: "text",
    isCoreField: true,
    isRequired: false,
    defaultCsvColumn: "광고",
    defaultVisible: false,
    displayOrder: 17,
  },
  // 날짜 필드
  {
    systemField: "source_date",
    label: "신청일시",
    description: "리드 신청 일시 (CSV 원본 데이터)",
    fieldType: "datetime",
    isCoreField: true,
    isRequired: false,
    defaultCsvColumn: "신청일시",
    defaultVisible: true,
    displayOrder: 18,
  },
];

/**
 * 시스템 자동 생성 필드 (읽기 전용)
 * CSV 매핑에서 제외되며, 시스템이 자동으로 관리하는 필드들
 */
export const SYSTEM_FIELDS: LeadFieldDefinition[] = [
  {
    systemField: "id",
    label: "ID",
    fieldType: "text",
    isCoreField: true,
    isRequired: false,
    defaultVisible: false,
    displayOrder: 100,
    readonly: true,
  },
  {
    systemField: "grade_id",
    label: "등급",
    description: "자동 분류된 등급",
    fieldType: "text",
    isCoreField: true,
    isRequired: false,
    defaultVisible: true,
    displayOrder: 101,
    readonly: true,
  },
  {
    systemField: "assigned_member_id",
    label: "담당자",
    description: "배분된 팀장",
    fieldType: "text",
    isCoreField: true,
    isRequired: false,
    defaultVisible: true,
    displayOrder: 102,
    readonly: true,
  },
  {
    systemField: "contact_status_id",
    label: "컨택상태",
    fieldType: "text",
    isCoreField: true,
    isRequired: false,
    defaultVisible: true,
    displayOrder: 103,
    readonly: true,
  },
  {
    systemField: "meeting_status_id",
    label: "미팅상태",
    fieldType: "text",
    isCoreField: true,
    isRequired: false,
    defaultVisible: true,
    displayOrder: 104,
    readonly: true,
  },
  {
    systemField: "contract_status_id",
    label: "계약상태",
    fieldType: "text",
    isCoreField: true,
    isRequired: false,
    defaultVisible: true,
    displayOrder: 105,
    readonly: true,
  },
  {
    systemField: "created_at",
    label: "등록일",
    fieldType: "datetime",
    isCoreField: true,
    isRequired: false,
    defaultVisible: true,
    displayOrder: 106,
    readonly: true,
  },
  {
    systemField: "updated_at",
    label: "수정일",
    fieldType: "datetime",
    isCoreField: true,
    isRequired: false,
    defaultVisible: false,
    displayOrder: 107,
    readonly: true,
  },
];

/**
 * 모든 코어 필드 (CSV 매핑 가능 + 시스템 필드)
 */
export const ALL_CORE_FIELDS = [...CORE_FIELDS, ...SYSTEM_FIELDS];

/**
 * CSV 매핑에 사용 가능한 필드 목록
 * (readonly가 아닌 코어 필드만)
 */
export const MAPPABLE_FIELDS = CORE_FIELDS.filter((f) => !f.readonly);

/**
 * 필수 필드 목록
 */
export const REQUIRED_FIELDS = CORE_FIELDS.filter((f) => f.isRequired);

/**
 * 시스템 필드명으로 필드 정의 조회
 */
export function getFieldBySystemName(
  systemField: string
): LeadFieldDefinition | undefined {
  return ALL_CORE_FIELDS.find((f) => f.systemField === systemField);
}

/**
 * 필드 타입에 따른 값 변환
 */
export function convertFieldValue(
  value: string | null | undefined,
  fieldType: FieldType
): string | number | Date | null {
  if (value === null || value === undefined || value === "") {
    return null;
  }

  switch (fieldType) {
    case "number":
      const num = parseFloat(value.replace(/[^0-9.-]/g, ""));
      return isNaN(num) ? null : num;
    case "date":
    case "datetime":
      const date = new Date(value);
      return isNaN(date.getTime()) ? null : date;
    case "phone":
      // 전화번호 정규화 (숫자만 추출)
      return value.replace(/[^0-9]/g, "");
    default:
      return value.trim();
  }
}

/**
 * CSV 컬럼명으로 시스템 필드 찾기 (기본 매핑 기준)
 */
export function findFieldByCsvColumn(
  csvColumn: string
): LeadFieldDefinition | undefined {
  return CORE_FIELDS.find(
    (f) => f.defaultCsvColumn?.toLowerCase() === csvColumn.toLowerCase()
  );
}

/**
 * 필드 타입별 아이콘 매핑 (lucide-react)
 */
export const FIELD_TYPE_ICONS: Record<FieldType, string> = {
  text: "Type",
  number: "Hash",
  date: "Calendar",
  datetime: "CalendarClock",
  phone: "Phone",
  email: "Mail",
  select: "ChevronDown",
};

/**
 * 필드 타입 레이블
 */
export const FIELD_TYPE_LABELS: Record<FieldType, string> = {
  text: "텍스트",
  number: "숫자",
  date: "날짜",
  datetime: "날짜/시간",
  phone: "전화번호",
  email: "이메일",
  select: "선택",
};
