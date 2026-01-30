/**
 * Meta OAuth Utilities
 *
 * Facebook OAuth 인증 및 토큰 교환 유틸리티
 */

const META_GRAPH_API = "https://graph.facebook.com/v21.0";

export interface MetaOAuthConfig {
  appId: string;
  appSecret: string;
  redirectUri: string;
}

export interface TokenExchangeResult {
  access_token: string;
  token_type: string;
  expires_in?: number;
}

export interface PageTokenResult {
  id: string;
  name: string;
  access_token: string;
  category?: string;
}

export interface UserPagesResult {
  data: PageTokenResult[];
  paging?: {
    cursors: { before: string; after: string };
    next?: string;
  };
}

/**
 * Facebook OAuth 인증 URL 생성
 */
export function buildAuthorizationUrl(config: MetaOAuthConfig, state: string): string {
  const params = new URLSearchParams({
    client_id: config.appId,
    redirect_uri: config.redirectUri,
    state,
    scope: [
      "pages_show_list",
      "pages_read_engagement",
      "leads_retrieval",
      "pages_manage_ads",
      "ads_read",
    ].join(","),
    response_type: "code",
  });

  return `https://www.facebook.com/v21.0/dialog/oauth?${params.toString()}`;
}

/**
 * Authorization Code를 Access Token으로 교환
 */
export async function exchangeCodeForToken(
  code: string,
  config: MetaOAuthConfig
): Promise<TokenExchangeResult> {
  const params = new URLSearchParams({
    client_id: config.appId,
    client_secret: config.appSecret,
    redirect_uri: config.redirectUri,
    code,
  });

  const response = await fetch(
    `${META_GRAPH_API}/oauth/access_token?${params.toString()}`
  );

  if (!response.ok) {
    const error = await response.json();
    throw new Error(
      error.error?.message || "Failed to exchange code for token"
    );
  }

  return response.json();
}

/**
 * Short-lived Token을 Long-lived Token으로 교환
 */
export async function exchangeForLongLivedToken(
  shortLivedToken: string,
  config: MetaOAuthConfig
): Promise<TokenExchangeResult> {
  const params = new URLSearchParams({
    grant_type: "fb_exchange_token",
    client_id: config.appId,
    client_secret: config.appSecret,
    fb_exchange_token: shortLivedToken,
  });

  const response = await fetch(
    `${META_GRAPH_API}/oauth/access_token?${params.toString()}`
  );

  if (!response.ok) {
    const error = await response.json();
    throw new Error(
      error.error?.message || "Failed to exchange for long-lived token"
    );
  }

  return response.json();
}

/**
 * 사용자가 관리하는 페이지 목록 조회 (Page Access Token 포함)
 */
export async function getUserPages(
  userAccessToken: string
): Promise<PageTokenResult[]> {
  const params = new URLSearchParams({
    access_token: userAccessToken,
    fields: "id,name,access_token,category",
  });

  const response = await fetch(`${META_GRAPH_API}/me/accounts?${params.toString()}`);

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error?.message || "Failed to fetch user pages");
  }

  const result: UserPagesResult = await response.json();
  return result.data || [];
}

/**
 * 특정 페이지의 영구 Page Access Token 조회
 */
export async function getPageAccessToken(
  pageId: string,
  userAccessToken: string
): Promise<string> {
  const params = new URLSearchParams({
    access_token: userAccessToken,
    fields: "access_token",
  });

  const response = await fetch(
    `${META_GRAPH_API}/${pageId}?${params.toString()}`
  );

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error?.message || "Failed to fetch page access token");
  }

  const result = await response.json();
  return result.access_token;
}

/**
 * Access Token 디버그 (만료 시간 등 확인)
 */
export async function debugToken(
  inputToken: string,
  appAccessToken: string
): Promise<{
  is_valid: boolean;
  expires_at?: number;
  scopes?: string[];
  type?: string;
  user_id?: string;
  app_id?: string;
}> {
  const params = new URLSearchParams({
    input_token: inputToken,
    access_token: appAccessToken,
  });

  const response = await fetch(
    `${META_GRAPH_API}/debug_token?${params.toString()}`
  );

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error?.message || "Failed to debug token");
  }

  const result = await response.json();
  return result.data;
}

/**
 * App Access Token 생성 (앱 ID + 시크릿)
 */
export function buildAppAccessToken(appId: string, appSecret: string): string {
  return `${appId}|${appSecret}`;
}

/**
 * 전체 OAuth 플로우 실행 (코드 → 영구 Page Token)
 */
export async function completeOAuthFlow(
  code: string,
  config: MetaOAuthConfig
): Promise<{
  userToken: string;
  pages: PageTokenResult[];
}> {
  // 1. Authorization Code → Short-lived User Token
  const shortLivedResult = await exchangeCodeForToken(code, config);

  // 2. Short-lived → Long-lived User Token
  const longLivedResult = await exchangeForLongLivedToken(
    shortLivedResult.access_token,
    config
  );

  // 3. 사용자 페이지 목록 조회 (각 페이지의 영구 Page Token 포함)
  const pages = await getUserPages(longLivedResult.access_token);

  return {
    userToken: longLivedResult.access_token,
    pages,
  };
}
