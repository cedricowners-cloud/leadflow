import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { completeOAuthFlow } from "@/lib/meta/oauth";

/**
 * GET /api/meta/oauth/callback
 *
 * Facebook OAuth 콜백 처리
 * Authorization Code를 받아서 영구 Page Token으로 교환
 */
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const code = searchParams.get("code");
  const state = searchParams.get("state");
  const error = searchParams.get("error");
  const errorDescription = searchParams.get("error_description");

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || request.nextUrl.origin;
  const settingsUrl = `${baseUrl}/settings/meta-integration`;

  // Facebook에서 에러 반환 시
  if (error) {
    console.error("Facebook OAuth error:", error, errorDescription);
    return NextResponse.redirect(
      `${settingsUrl}?error=${encodeURIComponent(errorDescription || error)}`
    );
  }

  if (!code || !state) {
    return NextResponse.redirect(
      `${settingsUrl}?error=${encodeURIComponent("Invalid OAuth response")}`
    );
  }

  try {
    const supabase = await createClient();

    // State 검증
    const { data: stateRecord, error: stateError } = await supabase
      .from("meta_oauth_states")
      .select("user_id, expires_at")
      .eq("state", state)
      .single();

    if (stateError || !stateRecord) {
      return NextResponse.redirect(
        `${settingsUrl}?error=${encodeURIComponent("Invalid state parameter")}`
      );
    }

    // State 만료 확인
    if (new Date(stateRecord.expires_at) < new Date()) {
      // 만료된 state 삭제
      await supabase.from("meta_oauth_states").delete().eq("state", state);
      return NextResponse.redirect(
        `${settingsUrl}?error=${encodeURIComponent("OAuth session expired. Please try again.")}`
      );
    }

    // 사용된 state 삭제
    await supabase.from("meta_oauth_states").delete().eq("state", state);

    // Meta 앱 설정 조회
    const { data: appSettings } = await supabase
      .from("meta_app_settings")
      .select("app_id, app_secret")
      .single();

    if (!appSettings?.app_id || !appSettings?.app_secret) {
      return NextResponse.redirect(
        `${settingsUrl}?error=${encodeURIComponent("Meta app settings not found")}`
      );
    }

    // Redirect URI
    const redirectUri = `${baseUrl}/api/meta/oauth/callback`;

    // OAuth 플로우 완료 (코드 → 토큰 교환 → 페이지 목록)
    const { pages } = await completeOAuthFlow(code, {
      appId: appSettings.app_id,
      appSecret: appSettings.app_secret,
      redirectUri,
    });

    if (pages.length === 0) {
      return NextResponse.redirect(
        `${settingsUrl}?error=${encodeURIComponent("연결된 Facebook 페이지가 없습니다. 페이지 관리자 권한이 있는지 확인해주세요.")}`
      );
    }

    // Admin 클라이언트로 페이지 저장 (RLS 우회)
    const adminClient = createAdminClient();

    // 기존 페이지 조회
    const { data: existingPages } = await adminClient
      .from("meta_pages")
      .select("page_id");

    const existingPageIds = new Set(existingPages?.map((p) => p.page_id) || []);

    // 새 페이지 추가 또는 기존 페이지 토큰 업데이트
    let addedCount = 0;
    let updatedCount = 0;

    for (const page of pages) {
      if (existingPageIds.has(page.id)) {
        // 기존 페이지: 토큰만 업데이트
        await adminClient
          .from("meta_pages")
          .update({
            access_token: page.access_token,
            page_name: page.name,
            updated_at: new Date().toISOString(),
          })
          .eq("page_id", page.id);
        updatedCount++;
      } else {
        // 새 페이지: 추가
        await adminClient.from("meta_pages").insert({
          page_id: page.id,
          page_name: page.name,
          access_token: page.access_token,
          is_active: true,
        });
        addedCount++;
      }
    }

    // 성공 리다이렉트
    const successMessage = `Facebook 연결 완료! ${addedCount}개 페이지 추가, ${updatedCount}개 페이지 업데이트`;
    return NextResponse.redirect(
      `${settingsUrl}?success=${encodeURIComponent(successMessage)}`
    );
  } catch (error) {
    console.error("Meta OAuth callback error:", error);
    const errorMessage =
      error instanceof Error ? error.message : "OAuth 처리 중 오류가 발생했습니다.";
    return NextResponse.redirect(
      `${settingsUrl}?error=${encodeURIComponent(errorMessage)}`
    );
  }
}
