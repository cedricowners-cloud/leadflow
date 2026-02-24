/**
 * Meta API Types
 *
 * 이 파일은 Meta Graph API와 관련된 모든 타입 정의를 포함합니다.
 * 다른 프로젝트에서 재사용 가능하도록 독립적으로 설계되었습니다.
 */

// =====================================================
// Meta Graph API Response Types
// =====================================================

export interface MetaApiError {
  message: string;
  type: string;
  code: number;
  error_subcode?: number;
  fbtrace_id?: string;
}

export interface MetaApiResponse<T> {
  data?: T;
  error?: MetaApiError;
  paging?: MetaPaging;
}

export interface MetaPaging {
  cursors?: {
    before?: string;
    after?: string;
  };
  next?: string;
  previous?: string;
}

// =====================================================
// Lead Form Types
// =====================================================

export interface MetaLeadForm {
  id: string;
  name: string;
  status: string;
  created_time?: string;
  locale?: string;
  page?: {
    id: string;
    name: string;
  };
}

export interface MetaLeadFormsResponse {
  data: MetaLeadForm[];
  paging?: MetaPaging;
}

// =====================================================
// Lead Types
// =====================================================

export interface MetaLeadFieldData {
  name: string;
  values: string[];
}

export interface MetaLead {
  id: string;
  created_time: string;
  field_data: MetaLeadFieldData[];
  ad_id?: string;
  adset_id?: string;
  campaign_id?: string;
  form_id?: string;
  platform?: string;
  is_organic?: boolean;
}

export interface MetaLeadsResponse {
  data: MetaLead[];
  paging?: MetaPaging;
}

// =====================================================
// Ad Types
// =====================================================

export interface MetaAdInfo {
  id: string;
  name: string;
  campaign?: {
    id: string;
    name: string;
  };
  adset?: {
    id: string;
    name: string;
  };
}

// =====================================================
// Parsed/Transformed Lead Types
// =====================================================

export interface ParsedMetaLead {
  // Meta 원본 정보
  meta_id: string;
  form_id: string;
  form_name?: string;
  ad_id?: string;
  adset_id?: string;
  campaign_id?: string;
  platform?: string;
  is_organic: boolean;
  source_date: string;

  // 파싱된 필드
  representative_name?: string;
  company_name?: string;
  phone?: string;
  phone_formatted?: string;

  // 추가 필드 (raw_fields에서 파싱)
  tax_delinquency?: boolean;
  business_type?: string;
  industry?: string;
  annual_revenue_text?: string;
  annual_revenue_min?: number;
  annual_revenue_max?: number;
  available_time?: string;

  // 등급 (자동 분류)
  grade?: string;

  // 광고 정보 (별도 API로 조회 후 병합)
  campaign_name?: string;
  ad_set_name?: string;
  ad_name?: string;

  // 원본 필드 데이터
  raw_fields: Record<string, string>;
}

// =====================================================
// Meta Page Configuration Types
// =====================================================

export interface MetaPageConfig {
  id: string;
  page_id: string;
  page_name: string;
  access_token: string;
  is_active: boolean;
  last_sync_at?: string;
  last_sync_status?: 'success' | 'error';
  last_sync_message?: string;
  sync_interval_minutes: number;
  created_at: string;
  updated_at: string;
}

export interface MetaPageInput {
  page_id: string;
  page_name: string;
  access_token: string;
  is_active?: boolean;
  sync_interval_minutes?: number;
}

// =====================================================
// Meta Ad Account Configuration Types
// =====================================================

export interface MetaAdAccountConfig {
  id: string;
  ad_account_id: string;
  account_name?: string;
  currency?: string;
  business_name?: string;
  is_active: boolean;
  sync_interval_minutes: number;
  last_sync_at?: string;
  last_sync_status?: 'success' | 'error';
  last_sync_message?: string;
  created_at: string;
  updated_at: string;
}

export interface MetaAdAccountInput {
  ad_account_id: string;
  account_name?: string;
  currency?: string;
  business_name?: string;
  is_active?: boolean;
  sync_interval_minutes?: number;
}

// =====================================================
// Sync Result Types
// =====================================================

export interface MetaSyncResult {
  success: boolean;
  /** 동기화 소스 타입: page(폼 기반) 또는 ad_account(광고 기반) */
  source_type: 'page' | 'ad_account';
  /** 소스 ID (page_id 또는 ad_account_id) */
  source_id: string;
  /** 소스 이름 (page_name 또는 account_name) */
  source_name: string;
  leads_fetched: number;
  leads_created: number;
  leads_duplicated: number;
  leads_error: number;
  forms_processed: number;
  error?: string;
  started_at: string;
  completed_at: string;
}

export interface MetaSyncLogEntry {
  id: string;
  page_id?: string;
  ad_account_id?: string;
  sync_type: 'manual' | 'scheduled' | 'webhook';
  status: 'running' | 'success' | 'error';
  leads_fetched: number;
  leads_created: number;
  leads_duplicated: number;
  error_message?: string;
  started_at: string;
  completed_at?: string;
}

// =====================================================
// Client Options
// =====================================================

export interface MetaClientOptions {
  accessToken: string;
  pageId: string;
  adAccountId?: string;
  apiVersion?: string;
  timeout?: number;
}

export interface MetaFetchOptions {
  /** 가져올 리드 개수 제한 (기본: 100) */
  limit?: number;
  /** 특정 날짜 이후의 리드만 (ISO 8601) */
  since?: string;
  /** 특정 날짜 이전의 리드만 (ISO 8601) */
  until?: string;
  /** 다음 페이지 커서 */
  after?: string;
}
