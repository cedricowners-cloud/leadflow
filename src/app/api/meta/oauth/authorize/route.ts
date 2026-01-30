import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { buildAuthorizationUrl } from "@/lib/meta/oauth";
import { randomBytes } from "crypto";

/**
 * GET /api/meta/oauth/authorize
 *
 * Facebook OAuth 인증 시작
 * 사용자를 Facebook 로그인 페이지로 리다이렉트
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();

    // 인증 확인
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // 권한 확인 (시스템 관리자만)
    const { data: member } = await supabase
      .from("members")
      .select("role")
      .eq("user_id", user.id)
      .single();

    if (!member || (member.role !== "system_admin" && member.role !== "branch_manager")) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Meta 앱 설정 조회
    const { data: appSettings } = await supabase
      .from("meta_app_settings")
      .select("app_id, app_secret")
      .single();

    if (!appSettings?.app_id || !appSettings?.app_secret) {
      return NextResponse.json(
        { error: "Meta 앱 설정이 필요합니다. 앱 ID와 앱 Secret을 먼저 설정해주세요." },
        { status: 400 }
      );
    }

    // State 생성 (CSRF 방지)
    const state = randomBytes(32).toString("hex");

    // State를 DB에 저장 (5분 후 만료)
    await supabase.from("meta_oauth_states").insert({
      state,
      user_id: user.id,
      expires_at: new Date(Date.now() + 5 * 60 * 1000).toISOString(),
    });

    // Redirect URI 설정
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || request.nextUrl.origin;
    const redirectUri = `${baseUrl}/api/meta/oauth/callback`;

    // Facebook OAuth URL 생성
    const authUrl = buildAuthorizationUrl(
      {
        appId: appSettings.app_id,
        appSecret: appSettings.app_secret,
        redirectUri,
      },
      state
    );

    // Facebook으로 리다이렉트
    return NextResponse.redirect(authUrl);
  } catch (error) {
    console.error("Meta OAuth authorize error:", error);
    return NextResponse.json(
      { error: "Failed to start OAuth flow" },
      { status: 500 }
    );
  }
}
