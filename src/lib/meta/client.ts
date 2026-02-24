/**
 * Meta Graph API Client
 *
 * Meta (Facebook) Graph API와 통신하는 기본 클라이언트입니다.
 * 다른 프로젝트에서 독립적으로 사용할 수 있도록 설계되었습니다.
 *
 * @example
 * ```typescript
 * import { MetaClient } from '@/lib/meta';
 *
 * const client = new MetaClient({
 *   accessToken: 'your-access-token',
 *   pageId: 'your-page-id',
 * });
 *
 * const forms = await client.getLeadForms();
 * const leads = await client.getLeadsFromForm(forms[0].id);
 * ```
 */

import {
  MetaClientOptions,
  MetaApiResponse,
  MetaApiError,
  MetaLeadForm,
  MetaLeadFormsResponse,
  MetaLead,
  MetaLeadsResponse,
  MetaAdInfo,
  MetaFetchOptions,
} from './types';

const DEFAULT_API_VERSION = 'v21.0';
const DEFAULT_TIMEOUT = 30000; // 30 seconds
const META_GRAPH_BASE_URL = 'https://graph.facebook.com';

export class MetaApiException extends Error {
  constructor(
    message: string,
    public readonly code?: number,
    public readonly type?: string,
    public readonly fbtrace_id?: string
  ) {
    super(message);
    this.name = 'MetaApiException';
  }

  static fromApiError(error: MetaApiError): MetaApiException {
    return new MetaApiException(
      error.message,
      error.code,
      error.type,
      error.fbtrace_id
    );
  }
}

export class MetaClient {
  private accessToken: string;
  private pageId: string;
  private apiVersion: string;
  private timeout: number;
  private baseUrl: string;

  constructor(options: MetaClientOptions) {
    this.accessToken = options.accessToken;
    this.pageId = options.pageId;
    this.apiVersion = options.apiVersion || DEFAULT_API_VERSION;
    this.timeout = options.timeout || DEFAULT_TIMEOUT;
    this.baseUrl = `${META_GRAPH_BASE_URL}/${this.apiVersion}`;
  }

  /**
   * 페이지 ID 변경 (멀티 페이지 지원용)
   */
  setPageId(pageId: string): void {
    this.pageId = pageId;
  }

  /**
   * 액세스 토큰 변경
   */
  setAccessToken(accessToken: string): void {
    this.accessToken = accessToken;
  }

  /**
   * API 요청 실행
   */
  private async request<T>(
    endpoint: string,
    params: Record<string, string> = {}
  ): Promise<T> {
    const url = new URL(`${this.baseUrl}${endpoint}`);
    url.searchParams.set('access_token', this.accessToken);

    for (const [key, value] of Object.entries(params)) {
      if (value !== undefined && value !== null && value !== '') {
        url.searchParams.set(key, value);
      }
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeout);

    try {
      const response = await fetch(url.toString(), {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      const data = await response.json();

      if (data.error) {
        throw MetaApiException.fromApiError(data.error);
      }

      return data;
    } catch (error) {
      clearTimeout(timeoutId);

      if (error instanceof MetaApiException) {
        throw error;
      }

      if (error instanceof Error && error.name === 'AbortError') {
        throw new MetaApiException('Request timeout', -1, 'TIMEOUT');
      }

      throw new MetaApiException(
        error instanceof Error ? error.message : 'Unknown error',
        -1,
        'UNKNOWN'
      );
    }
  }

  // =====================================================
  // Lead Forms API
  // =====================================================

  /**
   * 페이지의 리드 폼 목록 조회
   */
  async getLeadForms(): Promise<MetaLeadForm[]> {
    const response = await this.request<MetaLeadFormsResponse>(
      `/${this.pageId}/leadgen_forms`,
      {
        fields: 'id,name,status,created_time,locale',
      }
    );

    return response.data || [];
  }

  /**
   * 특정 리드 폼 정보 조회
   */
  async getLeadForm(formId: string): Promise<MetaLeadForm | null> {
    try {
      const response = await this.request<MetaLeadForm>(`/${formId}`, {
        fields: 'id,name,status,created_time,locale',
      });
      return response;
    } catch {
      return null;
    }
  }

  // =====================================================
  // Leads API
  // =====================================================

  /**
   * 특정 폼에서 리드 목록 조회
   */
  async getLeadsFromForm(
    formId: string,
    options: MetaFetchOptions = {}
  ): Promise<{ leads: MetaLead[]; nextCursor?: string }> {
    const params: Record<string, string> = {
      fields: 'id,created_time,field_data,ad_id,adset_id,campaign_id,platform,is_organic',
      limit: String(options.limit || 100),
    };

    // 날짜 필터링 (since: 이후, until: 이전)
    const filters: { field: string; operator: string; value: number }[] = [];
    if (options.since) {
      filters.push({
        field: 'time_created',
        operator: 'GREATER_THAN',
        value: Math.floor(new Date(options.since).getTime() / 1000),
      });
    }
    if (options.until) {
      filters.push({
        field: 'time_created',
        operator: 'LESS_THAN',
        value: Math.floor(new Date(options.until).getTime() / 1000),
      });
    }
    if (filters.length > 0) {
      params.filtering = JSON.stringify(filters);
    }

    if (options.after) {
      params.after = options.after;
    }

    const response = await this.request<MetaLeadsResponse>(
      `/${formId}/leads`,
      params
    );

    return {
      leads: response.data || [],
      nextCursor: response.paging?.cursors?.after,
    };
  }

  /**
   * 모든 폼에서 리드 조회 (자동 페이지네이션)
   */
  async getAllLeadsFromAllForms(
    options: MetaFetchOptions = {}
  ): Promise<{ formId: string; formName: string; leads: MetaLead[] }[]> {
    const forms = await this.getLeadForms();
    const results: { formId: string; formName: string; leads: MetaLead[] }[] = [];

    for (const form of forms) {
      if (form.status !== 'ACTIVE') continue;

      const allLeads: MetaLead[] = [];
      let cursor: string | undefined = options.after;
      let hasMore = true;

      while (hasMore) {
        const { leads, nextCursor } = await this.getLeadsFromForm(form.id, {
          ...options,
          after: cursor,
        });

        allLeads.push(
          ...leads.map((lead) => ({
            ...lead,
            form_id: form.id,
          }))
        );

        if (nextCursor && leads.length > 0) {
          cursor = nextCursor;
        } else {
          hasMore = false;
        }

        // Rate limit protection
        await this.delay(100);
      }

      results.push({
        formId: form.id,
        formName: form.name,
        leads: allLeads,
      });
    }

    return results;
  }

  // =====================================================
  // Ad Info API
  // =====================================================

  /**
   * 광고 정보 조회
   */
  async getAdInfo(adId: string): Promise<MetaAdInfo | null> {
    try {
      const response = await this.request<MetaAdInfo>(`/${adId}`, {
        fields: 'id,name,campaign{id,name},adset{id,name}',
      });
      return response;
    } catch {
      return null;
    }
  }

  /**
   * 여러 광고 정보 일괄 조회 (배치)
   */
  async getAdInfoBatch(adIds: string[]): Promise<Map<string, MetaAdInfo>> {
    const result = new Map<string, MetaAdInfo>();
    const uniqueIds = [...new Set(adIds.filter(Boolean))];

    // 병렬 요청 (최대 5개씩)
    const chunks = this.chunkArray(uniqueIds, 5);

    for (const chunk of chunks) {
      const promises = chunk.map((id) => this.getAdInfo(id));
      const infos = await Promise.all(promises);

      infos.forEach((info, index) => {
        if (info) {
          result.set(chunk[index], info);
        }
      });

      // Rate limit protection
      await this.delay(200);
    }

    return result;
  }

  // =====================================================
  // Utility Methods
  // =====================================================

  /**
   * 토큰 유효성 검증
   */
  async validateToken(): Promise<{
    valid: boolean;
    app_id?: string;
    expires_at?: number;
    error?: string;
  }> {
    try {
      const response = await this.request<{
        data: {
          app_id: string;
          is_valid: boolean;
          expires_at: number;
        };
      }>('/debug_token', {
        input_token: this.accessToken,
      });

      return {
        valid: response.data?.is_valid || false,
        app_id: response.data?.app_id,
        expires_at: response.data?.expires_at,
      };
    } catch (error) {
      return {
        valid: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * 페이지 정보 조회
   */
  async getPageInfo(): Promise<{ id: string; name: string } | null> {
    try {
      const response = await this.request<{ id: string; name: string }>(
        `/${this.pageId}`,
        {
          fields: 'id,name',
        }
      );
      return response;
    } catch {
      return null;
    }
  }

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  private chunkArray<T>(array: T[], size: number): T[][] {
    const chunks: T[][] = [];
    for (let i = 0; i < array.length; i += size) {
      chunks.push(array.slice(i, i + size));
    }
    return chunks;
  }
}

/**
 * Factory function for creating MetaClient instances
 */
export function createMetaClient(options: MetaClientOptions): MetaClient {
  return new MetaClient(options);
}
