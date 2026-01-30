/**
 * Meta Lead Parser
 *
 * Meta Lead Ads에서 받은 원시 데이터를 파싱하고 변환합니다.
 * n8n 워크플로우의 로직을 TypeScript로 포팅했습니다.
 *
 * @example
 * ```typescript
 * import { MetaLeadParser } from '@/lib/meta';
 *
 * const parser = new MetaLeadParser();
 * const parsed = parser.parseMetaLead(rawLead, formName);
 * ```
 */

import { MetaLead, MetaLeadFieldData, ParsedMetaLead, MetaAdInfo } from './types';

// =====================================================
// Field Mapping Configuration
// =====================================================

/**
 * Meta 폼 필드 이름 → 시스템 필드 매핑
 * 우선순위가 높은 패턴이 먼저 매칭됨
 */
const FIELD_MAPPINGS: { pattern: RegExp; field: string }[] = [
  // 이름
  { pattern: /^full[_\s]?name$/i, field: 'representative_name' },
  { pattern: /이름/i, field: 'representative_name' },
  { pattern: /성함/i, field: 'representative_name' },
  { pattern: /대표자/i, field: 'representative_name' },

  // 회사명
  { pattern: /company[_\s]?name/i, field: 'company_name' },
  { pattern: /업체[_\s]?명/i, field: 'company_name' },
  { pattern: /회사[_\s]?명/i, field: 'company_name' },
  { pattern: /상호/i, field: 'company_name' },

  // 전화번호
  { pattern: /phone[_\s]?number/i, field: 'phone' },
  { pattern: /전화/i, field: 'phone' },
  { pattern: /연락처/i, field: 'phone' },
  { pattern: /휴대폰/i, field: 'phone' },
  { pattern: /번호.*작성/i, field: 'phone' },
  { pattern: /회신.*번호/i, field: 'callback_number' },

  // 업종
  { pattern: /업종/i, field: 'industry' },
  { pattern: /industry/i, field: 'industry' },

  // 연매출
  { pattern: /연매출/i, field: 'annual_revenue_text' },
  { pattern: /매출/i, field: 'annual_revenue_text' },
  { pattern: /revenue/i, field: 'annual_revenue_text' },

  // 사업자 유형
  { pattern: /사업자/i, field: 'business_type' },
  { pattern: /business[_\s]?type/i, field: 'business_type' },

  // 세금 체납
  { pattern: /세금/i, field: 'tax_delinquency' },
  { pattern: /세급/i, field: 'tax_delinquency' }, // 오타 대응
  { pattern: /체납/i, field: 'tax_delinquency' },

  // 연락 가능 시간
  { pattern: /시간대/i, field: 'available_time' },
  { pattern: /회신.*시간/i, field: 'available_time' },
  { pattern: /연락.*시간/i, field: 'available_time' },
];

export class MetaLeadParser {
  /**
   * Meta 리드의 field_data를 key-value 객체로 변환
   */
  parseFieldData(fieldData: MetaLeadFieldData[]): Record<string, string> {
    const result: Record<string, string> = {};

    for (const field of fieldData) {
      const value = field.values?.[0] || '';
      if (value) {
        result[field.name] = value;
      }
    }

    return result;
  }

  /**
   * 특정 필드 찾기 (패턴 매칭)
   */
  findField(
    rawFields: Record<string, string>,
    targetField: string
  ): string | undefined {
    // 정확한 매핑된 필드 찾기
    const mappings = FIELD_MAPPINGS.filter((m) => m.field === targetField);

    for (const mapping of mappings) {
      for (const [key, value] of Object.entries(rawFields)) {
        if (mapping.pattern.test(key)) {
          return value;
        }
      }
    }

    return undefined;
  }

  /**
   * 전화번호 정규화 (뒤 8자리)
   */
  normalizePhone(value: string | undefined): string {
    if (!value) return '';
    const digits = String(value).replace(/[^0-9]/g, '');
    if (digits.length < 8) return '';
    return digits.slice(-8);
  }

  /**
   * 전화번호가 유효한지 확인
   */
  isValidPhone(value: string | undefined): boolean {
    if (!value) return false;
    const digits = String(value).replace(/[^0-9]/g, '');
    return digits.length >= 8;
  }

  /**
   * 전화번호 국제 형식 변환 (+82)
   */
  formatPhoneInternational(phone: string | undefined): string {
    if (!phone) return '';
    if (!this.isValidPhone(phone)) return '';

    let p = String(phone).replace(/[^0-9+]/g, '');

    if (p.startsWith('+82')) return p;
    if (p.startsWith('82') && p.length >= 11) return '+' + p;
    if (p.startsWith('010')) return '+82' + p.substring(1);
    if (p.startsWith('10') && p.length >= 10) return '+82' + p;
    if (p.startsWith('0') && p.length >= 10) return '+82' + p.substring(1);

    return p;
  }

  /**
   * 연매출 텍스트 파싱 (억원 단위로 변환)
   */
  parseRevenue(
    text: string | undefined
  ): { min: number | null; max: number | null } {
    if (!text) return { min: null, max: null };

    const s = String(text).replace(/[_\s,]/g, '');

    // '미만'/'이하' 수식어 처리
    const hasMiman = s.includes('미만') || s.includes('이하');
    const hasSang = s.includes('이상');

    // 범위 패턴: 'X억이상Y억미만'
    const rangeMatch = s.match(/(\d+)억이상(\d+)억미만/);
    if (rangeMatch) {
      return {
        min: parseInt(rangeMatch[1], 10),
        max: parseInt(rangeMatch[2], 10),
      };
    }

    // 물결표/하이픈 범위 패턴: '1억~3억미만'
    const tildeRangeMatch = s.match(/(\d+)억[~\-](\d+)억/);
    if (tildeRangeMatch) {
      return {
        min: parseInt(tildeRangeMatch[1], 10),
        max: parseInt(tildeRangeMatch[2], 10),
      };
    }

    // 단일 값 패턴
    const billionMatch = s.match(/(\d+)억/);
    if (billionMatch) {
      const val = parseInt(billionMatch[1], 10);

      if (hasMiman && !hasSang) {
        // X억 미만 → 0 ~ X
        return { min: 0, max: val };
      } else if (hasSang) {
        // X억 이상 → X ~ null
        return { min: val, max: null };
      }

      return { min: val, max: val };
    }

    // 천만원 단위
    const tenMillionMatch = s.match(/(\d+)천만/);
    if (tenMillionMatch) {
      const val = parseInt(tenMillionMatch[1], 10) * 0.1;
      if (hasMiman && !hasSang) {
        return { min: 0, max: val };
      }
      return { min: val, max: val };
    }

    // 백만원 단위
    const millionMatch = s.match(/(\d+)백만/);
    if (millionMatch) {
      const val = parseInt(millionMatch[1], 10) * 0.01;
      if (hasMiman && !hasSang) {
        return { min: 0, max: val };
      }
      return { min: val, max: val };
    }

    // 숫자만 있는 경우
    const numOnly = s.match(/^(\d+)$/);
    if (numOnly) {
      const val = parseInt(numOnly[1], 10);
      return { min: val, max: val };
    }

    return { min: null, max: null };
  }

  /**
   * 등급 자동 분류 (A/B/C/D)
   */
  classifyGrade(
    revenueText: string | undefined,
    taxDelinquency: boolean | undefined
  ): string {
    // 세금 체납 시 D등급
    if (taxDelinquency === true) {
      return 'D';
    }

    const revenue = this.parseRevenue(revenueText);
    const minRevenue = revenue.min ?? 0;

    if (minRevenue >= 3) return 'A';
    if (minRevenue >= 1) return 'B';
    return 'C';
  }

  /**
   * 세금 체납 여부 파싱
   */
  parseTaxDelinquency(value: string | undefined): boolean | undefined {
    if (!value) return undefined;

    const v = value.toLowerCase().trim();

    if (
      v === '예' ||
      v === '네' ||
      v === 'yes' ||
      v === 'true' ||
      v === '있음' ||
      v === '체납'
    ) {
      return true;
    }

    if (
      v === '아니오' ||
      v === '아니요' ||
      v === 'no' ||
      v === 'false' ||
      v === '없음'
    ) {
      return false;
    }

    return undefined;
  }

  /**
   * Meta 리드 전체 파싱
   */
  parseMetaLead(lead: MetaLead, formName?: string): ParsedMetaLead {
    const rawFields = this.parseFieldData(lead.field_data);

    // 전화번호 처리: 회신번호가 유효하면 사용, 아니면 phone_number 사용
    const callbackNumber = this.findField(rawFields, 'callback_number');
    const phoneField = this.findField(rawFields, 'phone');
    const phoneSource =
      callbackNumber && this.isValidPhone(callbackNumber)
        ? callbackNumber
        : phoneField;

    // 연매출 파싱
    const revenueText = this.findField(rawFields, 'annual_revenue_text');
    const revenue = this.parseRevenue(revenueText);

    // 세금 체납 파싱
    const taxDelinquencyText = this.findField(rawFields, 'tax_delinquency');
    const taxDelinquency = this.parseTaxDelinquency(taxDelinquencyText);

    // 등급 분류
    const grade = this.classifyGrade(revenueText, taxDelinquency);

    return {
      // Meta 원본 정보
      meta_id: lead.id,
      form_id: lead.form_id || '',
      form_name: formName,
      ad_id: lead.ad_id,
      adset_id: lead.adset_id,
      campaign_id: lead.campaign_id,
      platform: lead.platform,
      is_organic: lead.is_organic || false,
      source_date: lead.created_time,

      // 파싱된 필드
      representative_name: this.findField(rawFields, 'representative_name'),
      company_name: this.findField(rawFields, 'company_name'),
      phone: phoneSource,
      phone_formatted: this.formatPhoneInternational(phoneSource),

      // 추가 필드
      tax_delinquency: taxDelinquency,
      business_type: this.findField(rawFields, 'business_type'),
      industry: this.findField(rawFields, 'industry'),
      annual_revenue_text: revenueText,
      annual_revenue_min: revenue.min ?? undefined,
      annual_revenue_max: revenue.max ?? undefined,
      available_time: this.findField(rawFields, 'available_time'),

      // 등급
      grade,

      // 원본 데이터
      raw_fields: rawFields,
    };
  }

  /**
   * 광고 정보 병합
   */
  mergeAdInfo(lead: ParsedMetaLead, adInfo: MetaAdInfo | null): ParsedMetaLead {
    if (!adInfo) return lead;

    return {
      ...lead,
      ad_name: adInfo.name,
      campaign_name: adInfo.campaign?.name,
      ad_set_name: adInfo.adset?.name,
    };
  }

  /**
   * 여러 리드 일괄 파싱
   */
  parseMetaLeads(
    leads: MetaLead[],
    formName?: string
  ): ParsedMetaLead[] {
    return leads.map((lead) => this.parseMetaLead(lead, formName));
  }
}

/**
 * 싱글톤 인스턴스
 */
export const metaLeadParser = new MetaLeadParser();
