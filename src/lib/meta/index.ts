/**
 * Meta API Library
 *
 * Meta (Facebook) Lead Ads API 연동을 위한 모듈화된 라이브러리입니다.
 * 이 라이브러리는 다른 프로젝트에서 독립적으로 사용할 수 있도록 설계되었습니다.
 *
 * @example
 * ```typescript
 * // 기본 사용법 - API 클라이언트만 사용
 * import { MetaClient, createMetaClient } from '@/lib/meta';
 *
 * const client = createMetaClient({
 *   accessToken: 'your-token',
 *   pageId: 'your-page-id',
 * });
 *
 * const forms = await client.getLeadForms();
 * const leads = await client.getLeadsFromForm(forms[0].id);
 * ```
 *
 * @example
 * ```typescript
 * // 파서만 사용
 * import { MetaLeadParser, metaLeadParser } from '@/lib/meta';
 *
 * const rawFields = metaLeadParser.parseFieldData(lead.field_data);
 * const phone = metaLeadParser.formatPhoneInternational('01012345678');
 * ```
 *
 * @example
 * ```typescript
 * // Supabase와 함께 동기화 서비스 사용
 * import { createMetaSyncService } from '@/lib/meta';
 * import { createAdminClient } from '@/lib/supabase/admin';
 *
 * const supabase = createAdminClient();
 * const syncService = createMetaSyncService(supabase);
 *
 * // 모든 활성 페이지 동기화
 * const results = await syncService.syncAllPages();
 * ```
 *
 * @module @/lib/meta
 */

// Types
export * from './types';

// Client
export { MetaClient, MetaApiException, createMetaClient } from './client';

// Parser
export { MetaLeadParser, metaLeadParser } from './parser';

// Sync Service (Supabase 의존)
export { MetaSyncService, createMetaSyncService } from './sync';
export type { SyncOptions } from './sync';
