import * as XLSX from "xlsx";

export interface ParsedRow {
  [key: string]: string | number | null;
}

export interface ParseResult {
  headers: string[];
  rows: ParsedRow[];
  errors: { row: number; message: string }[];
}

export interface CsvMapping {
  id?: string;
  csv_column: string;
  system_field: string;
  is_required: boolean;
  display_order: number;
}

export interface NumberRange {
  min: number | null;
  max: number | null;
}

export interface MappedLead {
  company_name?: string | null;
  representative_name?: string | null;
  phone: string;
  business_type?: string | null;
  industry?: string | null;
  annual_revenue?: number | null;
  annual_revenue_min?: number | null;
  annual_revenue_max?: number | null;
  employee_count?: number | null;
  employee_count_min?: number | null;
  employee_count_max?: number | null;
  region?: string | null;
  available_time?: string | null;
  tax_delinquency?: boolean | null;
  source_date?: string | null;
  campaign_name?: string | null;
  ad_set_name?: string | null;
  ad_name?: string | null;
  memo?: string | null;
}

export interface MappingResult {
  leads: MappedLead[];
  errors: { row: number; message: string }[];
  warnings: { row: number; message: string }[];
}

/**
 * CSV/Excel 파일을 파싱하여 데이터를 추출합니다.
 * 지원 형식: .csv, .xlsx, .xls
 */
export async function parseFile(file: File): Promise<ParseResult> {
  const extension = file.name.split(".").pop()?.toLowerCase();

  if (extension === "csv") {
    return parseCSV(file);
  } else if (extension === "xlsx" || extension === "xls") {
    return parseExcel(file);
  } else {
    throw new Error(
      `지원하지 않는 파일 형식입니다: ${extension}. CSV, XLSX, XLS 파일만 업로드 가능합니다.`
    );
  }
}

/**
 * CSV 파일 파싱 (UTF-8, EUC-KR 인코딩 지원)
 */
async function parseCSV(file: File): Promise<ParseResult> {
  const errors: { row: number; message: string }[] = [];

  // UTF-8로 먼저 시도
  let text = await file.text();

  // EUC-KR 인코딩 감지 및 변환 시도
  if (text.includes("�")) {
    const buffer = await file.arrayBuffer();
    const decoder = new TextDecoder("euc-kr");
    text = decoder.decode(buffer);
  }

  const lines = text.split(/\r?\n/).filter((line) => line.trim());

  if (lines.length === 0) {
    throw new Error("파일이 비어있습니다.");
  }

  // 헤더 파싱
  const headers = parseCSVLine(lines[0]);

  // 데이터 행 파싱
  const rows: ParsedRow[] = [];
  for (let i = 1; i < lines.length; i++) {
    try {
      const values = parseCSVLine(lines[i]);
      if (values.length === 0 || values.every((v) => !v)) continue;

      const row: ParsedRow = {};
      headers.forEach((header, index) => {
        row[header] = values[index] ?? null;
      });
      rows.push(row);
    } catch (error) {
      errors.push({
        row: i + 1,
        message: error instanceof Error ? error.message : "파싱 오류",
      });
    }
  }

  return { headers, rows, errors };
}

/**
 * CSV 라인 파싱 (쉼표, 따옴표 처리)
 */
function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];

    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === "," && !inQuotes) {
      result.push(current.trim());
      current = "";
    } else {
      current += char;
    }
  }

  result.push(current.trim());
  return result;
}

/**
 * Excel 파일 파싱 (.xlsx, .xls)
 */
async function parseExcel(file: File): Promise<ParseResult> {
  const errors: { row: number; message: string }[] = [];
  const buffer = await file.arrayBuffer();

  const workbook = XLSX.read(buffer, { type: "array" });

  // 첫 번째 시트 사용
  const sheetName = workbook.SheetNames[0];
  const sheet = workbook.Sheets[sheetName];

  if (!sheet) {
    throw new Error("시트를 찾을 수 없습니다.");
  }

  // 시트를 JSON으로 변환
  const jsonData = XLSX.utils.sheet_to_json(sheet, {
    header: 1,
    raw: false,
    defval: null,
  }) as unknown as (string | number | null)[][];

  if (jsonData.length === 0) {
    throw new Error("파일이 비어있습니다.");
  }

  // 헤더 추출
  const headers = (jsonData[0] || []).map((h) => String(h ?? "").trim());

  // 데이터 행 추출
  const rows: ParsedRow[] = [];
  for (let i = 1; i < jsonData.length; i++) {
    const rowData = jsonData[i];
    if (!rowData || rowData.every((v) => v === null || v === "")) continue;

    try {
      const row: ParsedRow = {};
      headers.forEach((header, index) => {
        const value = rowData[index];
        row[header] = value ?? null;
      });
      rows.push(row);
    } catch (error) {
      errors.push({
        row: i + 1,
        message: error instanceof Error ? error.message : "파싱 오류",
      });
    }
  }

  return { headers, rows, errors };
}

/**
 * 전화번호 정규화
 * - 국제번호 형식 (821012345678) → 010-1234-5678
 * - 앞자리 0 누락 (1012345678) → 010-1234-5678
 * - 일반 형식 (01012345678) → 010-1234-5678
 */
export function normalizePhone(phone: string | number | null): string | null {
  if (phone === null || phone === undefined) return null;

  let str = String(phone).replace(/[^0-9]/g, "");

  if (str.length === 0) return null;

  // 국제번호 형식: 821012345678 (12자리, 82로 시작)
  // → 82 제거 후 앞에 0 붙이기
  if (str.length === 12 && str.startsWith("82")) {
    str = "0" + str.slice(2); // 821012345678 → 01012345678
  }

  // 앞자리 0 누락: 1012345678 (10자리, 10으로 시작)
  // → 앞에 0 붙이기
  if (str.length === 10 && str.startsWith("10")) {
    str = "0" + str; // 1012345678 → 01012345678
  }

  // 010-XXXX-XXXX 형식으로 변환 (11자리, 010으로 시작)
  if (str.length === 11 && str.startsWith("010")) {
    return `${str.slice(0, 3)}-${str.slice(3, 7)}-${str.slice(7)}`;
  }

  // 02-XXXX-XXXX 형식 (10자리, 02로 시작)
  if (str.length === 10 && str.startsWith("02")) {
    return `${str.slice(0, 2)}-${str.slice(2, 6)}-${str.slice(6)}`;
  }

  // 그 외에는 원본 반환
  return str;
}

/**
 * 숫자 파싱 (연매출, 종업원수 등) - 단일 값 반환
 * 지원 형식:
 * - 일반 숫자: "10", "10.5"
 * - 억원 단위: "10억", "10억원"
 * - 범위 형식: "10억~30억", "10억~30억_미만", "10~30억"
 * - 이상/이하: "10억_이상", "30억_미만"
 */
export function parseNumber(
  value: string | number | null
): number | null {
  if (value === null || value === undefined || value === "") return null;

  if (typeof value === "number") return value;

  const str = String(value).trim();

  // 범위 형식 처리: "10억~30억", "10억~30억_미만", "10~30억" 등
  // 범위인 경우 첫 번째 값(하한)을 사용
  const rangeMatch = str.match(/^(\d+(?:\.\d+)?)\s*(?:억|억원)?\s*[~\-]\s*(\d+(?:\.\d+)?)\s*(?:억|억원)?/);
  if (rangeMatch) {
    const lowerBound = parseFloat(rangeMatch[1]);
    return isNaN(lowerBound) ? null : lowerBound;
  }

  // 단일 숫자 + 억원 단위: "10억", "10억원", "10억_이상" 등
  const singleMatch = str.match(/^(\d+(?:\.\d+)?)\s*(?:억|억원)/);
  if (singleMatch) {
    const num = parseFloat(singleMatch[1]);
    return isNaN(num) ? null : num;
  }

  // 일반 숫자 (숫자와 소수점만 추출)
  const cleaned = str.replace(/[^0-9.-]/g, "");

  // 연속된 숫자가 여러 개 있으면 첫 번째만 사용 (예: "1030" 방지)
  const firstNumberMatch = cleaned.match(/^-?\d+(?:\.\d+)?/);
  if (firstNumberMatch) {
    const num = parseFloat(firstNumberMatch[0]);
    return isNaN(num) ? null : num;
  }

  return null;
}

/**
 * 숫자 범위 파싱 (연매출, 종업원수 등) - min/max 범위 반환
 * 지원 형식:
 * - 일반 숫자: "10" → { min: 10, max: 10 }
 * - 억원 단위: "10억" → { min: 10, max: 10 }
 * - 범위 형식: "10억~30억" → { min: 10, max: 30 }
 * - 범위+미만: "10억~30억_미만" → { min: 10, max: 30 }
 * - 이상: "10억_이상" → { min: 10, max: null }
 * - 미만: "30억_미만" → { min: null, max: 30 }
 * - 이하: "30억_이하" → { min: null, max: 30 }
 * - 초과: "10억_초과" → { min: 10, max: null }
 */
export function parseNumberRange(
  value: string | number | null
): NumberRange {
  if (value === null || value === undefined || value === "") {
    return { min: null, max: null };
  }

  // 숫자 타입인 경우 그대로 반환
  if (typeof value === "number") {
    return { min: value, max: value };
  }

  const str = String(value).trim();

  // 범위 형식 처리: "10억~30억", "10억~30억_미만", "10~30억", "10~30명" 등
  const rangeMatch = str.match(/^(\d+(?:\.\d+)?)\s*(?:억|억원|명)?\s*[~\-]\s*(\d+(?:\.\d+)?)\s*(?:억|억원|명)?/);
  if (rangeMatch) {
    const min = parseFloat(rangeMatch[1]);
    const max = parseFloat(rangeMatch[2]);
    return {
      min: isNaN(min) ? null : min,
      max: isNaN(max) ? null : max,
    };
  }

  // "30억_미만", "30억미만", "30억 미만" 형식 (상한만)
  const lessThanMatch = str.match(/^(\d+(?:\.\d+)?)\s*(?:억|억원|명)?\s*[_\s]?미만/);
  if (lessThanMatch) {
    const max = parseFloat(lessThanMatch[1]);
    return { min: null, max: isNaN(max) ? null : max };
  }

  // "30억_이하", "30억이하", "30억 이하" 형식 (상한만)
  const lessOrEqualMatch = str.match(/^(\d+(?:\.\d+)?)\s*(?:억|억원|명)?\s*[_\s]?이하/);
  if (lessOrEqualMatch) {
    const max = parseFloat(lessOrEqualMatch[1]);
    return { min: null, max: isNaN(max) ? null : max };
  }

  // "10억_이상", "10억이상", "10억 이상" 형식 (하한만)
  const greaterOrEqualMatch = str.match(/^(\d+(?:\.\d+)?)\s*(?:억|억원|명)?\s*[_\s]?이상/);
  if (greaterOrEqualMatch) {
    const min = parseFloat(greaterOrEqualMatch[1]);
    return { min: isNaN(min) ? null : min, max: null };
  }

  // "10억_초과", "10억초과", "10억 초과" 형식 (하한만)
  const greaterThanMatch = str.match(/^(\d+(?:\.\d+)?)\s*(?:억|억원|명)?\s*[_\s]?초과/);
  if (greaterThanMatch) {
    const min = parseFloat(greaterThanMatch[1]);
    return { min: isNaN(min) ? null : min, max: null };
  }

  // 단일 숫자 + 억원/명 단위: "10억", "10억원", "50명" 등
  const singleMatch = str.match(/^(\d+(?:\.\d+)?)\s*(?:억|억원|명)?$/);
  if (singleMatch) {
    const num = parseFloat(singleMatch[1]);
    return { min: isNaN(num) ? null : num, max: isNaN(num) ? null : num };
  }

  // 일반 숫자 (숫자와 소수점만 추출)
  const cleaned = str.replace(/[^0-9.-]/g, "");
  const firstNumberMatch = cleaned.match(/^-?\d+(?:\.\d+)?/);
  if (firstNumberMatch) {
    const num = parseFloat(firstNumberMatch[0]);
    return { min: isNaN(num) ? null : num, max: isNaN(num) ? null : num };
  }

  return { min: null, max: null };
}

/**
 * 날짜 파싱
 */
export function parseDate(value: string | number | null): string | null {
  if (value === null || value === undefined || value === "") return null;

  // Excel 날짜 시리얼 번호 처리
  if (typeof value === "number") {
    const date = XLSX.SSF.parse_date_code(value);
    if (date) {
      return new Date(date.y, date.m - 1, date.d).toISOString();
    }
  }

  // 문자열 날짜 파싱
  const dateStr = String(value);
  const date = new Date(dateStr);

  if (!isNaN(date.getTime())) {
    return date.toISOString();
  }

  // 한국어 날짜 형식 처리 (예: 2024년 1월 15일)
  const koMatch = dateStr.match(/(\d{4})년\s*(\d{1,2})월\s*(\d{1,2})일/);
  if (koMatch) {
    const [, year, month, day] = koMatch;
    return new Date(
      parseInt(year),
      parseInt(month) - 1,
      parseInt(day)
    ).toISOString();
  }

  return null;
}

/**
 * CSV 매핑을 적용하여 파싱된 데이터를 리드 형식으로 변환합니다.
 */
export function applyMappings(
  parseResult: ParseResult,
  mappings: CsvMapping[]
): MappingResult {
  const leads: MappedLead[] = [];
  const errors: { row: number; message: string }[] = [...parseResult.errors];
  const warnings: { row: number; message: string }[] = [];

  // 매핑을 display_order 순으로 정렬
  const sortedMappings = [...mappings].sort(
    (a, b) => a.display_order - b.display_order
  );

  // CSV 컬럼명 -> 시스템 필드 매핑 생성
  const columnToField: Record<string, string> = {};
  const requiredFields: string[] = [];

  for (const mapping of sortedMappings) {
    columnToField[mapping.csv_column.toLowerCase()] = mapping.system_field;
    if (mapping.is_required) {
      requiredFields.push(mapping.system_field);
    }
  }

  // 각 행을 MappedLead로 변환
  for (let i = 0; i < parseResult.rows.length; i++) {
    const row = parseResult.rows[i];
    const rowNumber = i + 2; // 헤더가 1행이므로 데이터는 2행부터

    try {
      const lead: MappedLead = {
        phone: "",
      };

      // 각 컬럼을 매핑에 따라 변환
      for (const [csvColumn, value] of Object.entries(row)) {
        const systemField = columnToField[csvColumn.toLowerCase()];
        if (!systemField) continue;

        switch (systemField) {
          case "company_name":
            lead.company_name = value ? String(value) : null;
            break;
          case "representative_name":
            lead.representative_name = value ? String(value) : null;
            break;
          case "phone":
            lead.phone = normalizePhone(value) || "";
            break;
          case "industry":
            lead.industry = value ? String(value) : null;
            break;
          case "annual_revenue": {
            const revenueRange = parseNumberRange(value);
            lead.annual_revenue = revenueRange.min; // 기존 필드 호환성 유지
            lead.annual_revenue_min = revenueRange.min;
            lead.annual_revenue_max = revenueRange.max;
            break;
          }
          case "employee_count": {
            const employeeRange = parseNumberRange(value);
            lead.employee_count = employeeRange.min
              ? Math.floor(employeeRange.min)
              : null; // 기존 필드 호환성 유지
            lead.employee_count_min = employeeRange.min
              ? Math.floor(employeeRange.min)
              : null;
            lead.employee_count_max = employeeRange.max
              ? Math.floor(employeeRange.max)
              : null;
            break;
          }
          case "region":
            lead.region = value ? String(value) : null;
            break;
          case "source_date":
            lead.source_date = parseDate(value);
            break;
          case "campaign_name":
            lead.campaign_name = value ? String(value) : null;
            break;
          case "ad_set_name":
            lead.ad_set_name = value ? String(value) : null;
            break;
          case "ad_name":
            lead.ad_name = value ? String(value) : null;
            break;
          case "memo":
            lead.memo = value ? String(value) : null;
            break;
        }
      }

      // 필수 필드 검증
      const missingFields: string[] = [];
      for (const field of requiredFields) {
        if (field === "phone" && !lead.phone) {
          missingFields.push("연락처");
        } else if (field === "representative_name" && !lead.representative_name) {
          missingFields.push("대표자명");
        } else if (field === "company_name" && !lead.company_name) {
          missingFields.push("업체명");
        }
      }

      if (missingFields.length > 0) {
        errors.push({
          row: rowNumber,
          message: `필수 필드 누락: ${missingFields.join(", ")}`,
        });
        continue;
      }

      // phone이 없으면 경고 추가하고 건너뛰기
      if (!lead.phone) {
        warnings.push({
          row: rowNumber,
          message: "연락처가 없어 건너뜁니다",
        });
        continue;
      }

      leads.push(lead);
    } catch (error) {
      errors.push({
        row: rowNumber,
        message: error instanceof Error ? error.message : "변환 오류",
      });
    }
  }

  return { leads, errors, warnings };
}

/**
 * CSV 헤더와 매핑 설정을 비교하여 매칭되지 않는 컬럼을 찾습니다.
 */
export function findUnmappedColumns(
  headers: string[],
  mappings: CsvMapping[]
): { unmapped: string[]; missing: string[] } {
  const mappedColumns = new Set(
    mappings.map((m) => m.csv_column.toLowerCase())
  );
  const headerSet = new Set(headers.map((h) => h.toLowerCase()));

  // CSV에는 있지만 매핑에 없는 컬럼
  const unmapped = headers.filter(
    (h) => !mappedColumns.has(h.toLowerCase())
  );

  // 매핑에는 있지만 CSV에 없는 컬럼
  const missing = mappings
    .filter((m) => !headerSet.has(m.csv_column.toLowerCase()))
    .map((m) => m.csv_column);

  return { unmapped, missing };
}
