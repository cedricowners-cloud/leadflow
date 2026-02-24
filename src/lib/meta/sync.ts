/**
 * Meta Lead Sync Service
 *
 * Meta Lead Ads 데이터를 LeadFlow 데이터베이스와 동기화합니다.
 * 이 모듈은 Supabase에 의존하지만, 다른 데이터베이스로 교체할 수 있도록
 * 인터페이스를 분리했습니다.
 *
 * @example
 * ```typescript
 * import { MetaSyncService } from '@/lib/meta';
 * import { createAdminClient } from '@/lib/supabase/admin';
 *
 * const supabase = createAdminClient();
 * const syncService = new MetaSyncService(supabase);
 *
 * // 특정 페이지 동기화
 * const result = await syncService.syncPage('page-config-id');
 *
 * // 모든 활성 페이지 동기화
 * const results = await syncService.syncAllPages();
 * ```
 */

import { SupabaseClient } from '@supabase/supabase-js';
import { MetaClient } from './client';
import { MetaLeadParser, metaLeadParser } from './parser';
import {
  MetaPageConfig,
  ParsedMetaLead,
  MetaSyncResult,
  MetaSyncLogEntry,
} from './types';

export interface SyncOptions {
  /** 마지막 동기화 이후의 리드만 가져올지 여부 */
  incrementalSync?: boolean;
  /** 강제로 모든 리드 가져오기 (중복 체크는 유지) */
  forceFullSync?: boolean;
  /** 최대 리드 수 제한 */
  maxLeads?: number;
  /** 동기화 타입 */
  syncType?: 'manual' | 'scheduled' | 'webhook';
  /** 사용자 지정 시작 날짜 (ISO 8601) — 이 날짜 이후 리드만 가져옴 */
  sinceDate?: string;
  /** 사용자 지정 종료 날짜 (ISO 8601) — 이 날짜 이전 리드만 가져옴 */
  untilDate?: string;
}

/** 리드 타입 */
export type LeadType = 'sales' | 'recruit';

/** 리크루팅 캠페인 식별 키워드 */
const RECRUIT_KEYWORDS = [
  '리크루팅',
  '리쿠르팅',
  '채용',
  '구인',
  '인재',
  '모집',
  'recruit',
  'recruiting',
  'hiring',
  'job',
  '입사',
  '지원',
];

export class MetaSyncService {
  private supabase: SupabaseClient;
  private parser: MetaLeadParser;

  constructor(supabase: SupabaseClient, parser?: MetaLeadParser) {
    this.supabase = supabase;
    this.parser = parser || metaLeadParser;
  }

  /**
   * 캠페인 이름 기반으로 리드 타입 판별
   * 리크루팅 관련 키워드가 포함되어 있으면 'recruit', 그 외에는 'sales'
   */
  private determineLeadType(lead: ParsedMetaLead): LeadType {
    const searchText = [
      lead.campaign_name,
      lead.ad_set_name,
      lead.ad_name,
      lead.form_name,
    ]
      .filter(Boolean)
      .join(' ')
      .toLowerCase();

    const isRecruit = RECRUIT_KEYWORDS.some((keyword) =>
      searchText.includes(keyword.toLowerCase())
    );

    return isRecruit ? 'recruit' : 'sales';
  }

  /**
   * 활성화된 모든 Meta 페이지 설정 조회
   */
  async getActivePages(): Promise<MetaPageConfig[]> {
    const { data, error } = await this.supabase
      .from('meta_pages')
      .select('*')
      .eq('is_active', true)
      .order('created_at', { ascending: true });

    if (error) {
      throw new Error(`Failed to fetch meta pages: ${error.message}`);
    }

    return data || [];
  }

  /**
   * 특정 페이지 설정 조회
   */
  async getPageConfig(pageConfigId: string): Promise<MetaPageConfig | null> {
    const { data, error } = await this.supabase
      .from('meta_pages')
      .select('*')
      .eq('id', pageConfigId)
      .single();

    if (error) {
      return null;
    }

    return data;
  }

  /**
   * 특정 페이지 동기화
   */
  async syncPage(
    pageConfigId: string,
    options: SyncOptions = {}
  ): Promise<MetaSyncResult> {
    const startedAt = new Date().toISOString();

    // 페이지 설정 조회
    const pageConfig = await this.getPageConfig(pageConfigId);
    if (!pageConfig) {
      return {
        success: false,
        page_id: pageConfigId,
        page_name: 'Unknown',
        leads_fetched: 0,
        leads_created: 0,
        leads_duplicated: 0,
        leads_error: 0,
        forms_processed: 0,
        error: 'Page configuration not found',
        started_at: startedAt,
        completed_at: new Date().toISOString(),
      };
    }

    // 동기화 로그 생성
    const logEntry = await this.createSyncLog(pageConfigId, options.syncType || 'manual');

    try {
      // Meta API 클라이언트 생성
      const client = new MetaClient({
        accessToken: pageConfig.access_token,
        pageId: pageConfig.page_id,
      });

      // 날짜 범위 결정: 사용자 지정 날짜 > 증분 동기화 > 전체 동기화
      const since = options.sinceDate
        ? options.sinceDate
        : options.incrementalSync && pageConfig.last_sync_at && !options.forceFullSync
          ? pageConfig.last_sync_at
          : undefined;

      const until = options.untilDate || undefined;

      // 모든 폼에서 리드 가져오기
      const formResults = await client.getAllLeadsFromAllForms({
        since,
        until,
        limit: options.maxLeads || 100,
      });

      let totalFetched = 0;
      let totalCreated = 0;
      let totalDuplicated = 0;
      let totalError = 0;

      // 광고 정보 일괄 조회를 위한 ad_id 수집
      const allAdIds: string[] = [];
      const allParsedLeads: ParsedMetaLead[] = [];

      for (const formResult of formResults) {
        const parsedLeads = this.parser.parseMetaLeads(
          formResult.leads,
          formResult.formName
        );

        for (const lead of parsedLeads) {
          if (lead.ad_id) {
            allAdIds.push(lead.ad_id);
          }
        }

        allParsedLeads.push(...parsedLeads);
        totalFetched += formResult.leads.length;
      }

      // 광고 정보 일괄 조회
      const adInfoMap = await client.getAdInfoBatch(allAdIds);

      // 광고 정보 병합
      const enrichedLeads = allParsedLeads.map((lead) => {
        if (lead.ad_id && adInfoMap.has(lead.ad_id)) {
          return this.parser.mergeAdInfo(lead, adInfoMap.get(lead.ad_id)!);
        }
        return lead;
      });

      // 데이터베이스에 저장
      const saveResult = await this.saveLeads(enrichedLeads, pageConfigId);
      totalCreated = saveResult.created;
      totalDuplicated = saveResult.duplicated;
      totalError = saveResult.errors;

      // 페이지 동기화 상태 업데이트
      await this.updatePageSyncStatus(pageConfigId, 'success');

      // 동기화 로그 업데이트
      await this.updateSyncLog(logEntry.id, {
        status: 'success',
        leads_fetched: totalFetched,
        leads_created: totalCreated,
        leads_duplicated: totalDuplicated,
      });

      return {
        success: true,
        page_id: pageConfig.page_id,
        page_name: pageConfig.page_name,
        leads_fetched: totalFetched,
        leads_created: totalCreated,
        leads_duplicated: totalDuplicated,
        leads_error: totalError,
        forms_processed: formResults.length,
        started_at: startedAt,
        completed_at: new Date().toISOString(),
      };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';

      // 페이지 동기화 상태 업데이트
      await this.updatePageSyncStatus(pageConfigId, 'error', errorMessage);

      // 동기화 로그 업데이트
      await this.updateSyncLog(logEntry.id, {
        status: 'error',
        error_message: errorMessage,
      });

      return {
        success: false,
        page_id: pageConfig.page_id,
        page_name: pageConfig.page_name,
        leads_fetched: 0,
        leads_created: 0,
        leads_duplicated: 0,
        leads_error: 0,
        forms_processed: 0,
        error: errorMessage,
        started_at: startedAt,
        completed_at: new Date().toISOString(),
      };
    }
  }

  /**
   * 모든 활성 페이지 동기화
   */
  async syncAllPages(options: SyncOptions = {}): Promise<MetaSyncResult[]> {
    const pages = await this.getActivePages();
    const results: MetaSyncResult[] = [];

    for (const page of pages) {
      const result = await this.syncPage(page.id, options);
      results.push(result);

      // Rate limit 보호
      await this.delay(1000);
    }

    return results;
  }

  /**
   * 리드를 데이터베이스에 저장
   */
  private async saveLeads(
    leads: ParsedMetaLead[],
    pageConfigId: string
  ): Promise<{ created: number; duplicated: number; errors: number }> {
    let created = 0;
    let duplicated = 0;
    let errors = 0;

    // 업로드 배치 생성
    const { data: batch, error: batchError } = await this.supabase
      .from('upload_batches')
      .insert({
        file_name: `meta_sync_${new Date().toISOString()}`,
        source: 'meta_lead_ads',
        total_count: leads.length,
      })
      .select('id')
      .single();

    if (batchError) {
      throw new Error(`Failed to create upload batch: ${batchError.message}`);
    }

    // 기존 meta_id 조회 (중복 체크용)
    const metaIds = leads.map((l) => l.meta_id).filter(Boolean);
    const { data: existingLeads } = await this.supabase
      .from('leads')
      .select('meta_id')
      .in('meta_id', metaIds);

    const existingMetaIds = new Set(
      (existingLeads || []).map((l) => l.meta_id)
    );

    // 기존 전화번호 조회 (추가 중복 체크)
    const phones = leads
      .map((l) => this.parser.normalizePhone(l.phone))
      .filter(Boolean);

    const { data: existingPhones } = await this.supabase
      .from('leads')
      .select('phone')
      .not('phone', 'is', null);

    const existingPhoneSet = new Set(
      (existingPhones || []).map((l) =>
        l.phone ? l.phone.replace(/[^0-9]/g, '').slice(-8) : ''
      )
    );

    // 등급 ID 조회
    const { data: grades } = await this.supabase
      .from('lead_grades')
      .select('id, name')
      .eq('is_active', true);

    const gradeMap = new Map((grades || []).map((g) => [g.name, g.id]));

    // 리드 저장
    for (const lead of leads) {
      // meta_id 중복 체크
      if (existingMetaIds.has(lead.meta_id)) {
        duplicated++;
        continue;
      }

      // 전화번호 중복 체크
      const normalizedPhone = this.parser.normalizePhone(lead.phone);
      if (normalizedPhone && existingPhoneSet.has(normalizedPhone)) {
        duplicated++;
        continue;
      }

      try {
        const gradeId = gradeMap.get(lead.grade) || gradeMap.get('D');
        const leadType = this.determineLeadType(lead);

        const { error: insertError } = await this.supabase
          .from('leads')
          .insert({
            meta_id: lead.meta_id,
            form_id: lead.form_id,
            form_name: lead.form_name,
            ad_id: lead.ad_id,
            adset_id: lead.adset_id,
            campaign_name: lead.campaign_name,
            ad_set_name: lead.ad_set_name,
            ad_name: lead.ad_name,
            platform: lead.platform,
            is_organic: lead.is_organic,
            source_date: lead.source_date,
            representative_name: lead.representative_name,
            company_name: lead.company_name,
            phone: lead.phone_formatted || lead.phone,
            industry: lead.industry,
            business_type: lead.business_type,
            tax_delinquency: lead.tax_delinquency,
            annual_revenue_min: lead.annual_revenue_min,
            annual_revenue_max: lead.annual_revenue_max,
            available_time: lead.available_time,
            grade_id: gradeId,
            grade_source: 'auto',
            upload_batch_id: batch.id,
            source: 'meta_lead_ads',
            extra_fields: lead.raw_fields,
            lead_type: leadType,
          });

        if (insertError) {
          console.error('Failed to insert lead:', insertError);
          errors++;
        } else {
          created++;
          // 새로 생성된 전화번호를 set에 추가
          if (normalizedPhone) {
            existingPhoneSet.add(normalizedPhone);
          }
        }
      } catch (e) {
        console.error('Error inserting lead:', e);
        errors++;
      }
    }

    // 배치 정보 업데이트
    await this.supabase
      .from('upload_batches')
      .update({
        success_count: created,
        duplicate_count: duplicated,
        error_count: errors,
      })
      .eq('id', batch.id);

    return { created, duplicated, errors };
  }

  /**
   * 페이지 동기화 상태 업데이트
   */
  private async updatePageSyncStatus(
    pageConfigId: string,
    status: 'success' | 'error',
    message?: string
  ): Promise<void> {
    await this.supabase
      .from('meta_pages')
      .update({
        last_sync_at: new Date().toISOString(),
        last_sync_status: status,
        last_sync_message: message || null,
      })
      .eq('id', pageConfigId);
  }

  /**
   * 동기화 로그 생성
   */
  private async createSyncLog(
    pageConfigId: string,
    syncType: string
  ): Promise<MetaSyncLogEntry> {
    const { data, error } = await this.supabase
      .from('meta_sync_logs')
      .insert({
        page_id: pageConfigId,
        sync_type: syncType,
        status: 'running',
      })
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to create sync log: ${error.message}`);
    }

    return data;
  }

  /**
   * 동기화 로그 업데이트
   */
  private async updateSyncLog(
    logId: string,
    updates: Partial<MetaSyncLogEntry>
  ): Promise<void> {
    await this.supabase
      .from('meta_sync_logs')
      .update({
        ...updates,
        completed_at: new Date().toISOString(),
      })
      .eq('id', logId);
  }

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

/**
 * Factory function
 */
export function createMetaSyncService(supabase: SupabaseClient): MetaSyncService {
  return new MetaSyncService(supabase);
}
