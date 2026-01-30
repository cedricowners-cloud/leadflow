import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * GET /api/meta/app-settings
 *
 * Meta 앱 설정 조회
 */
export async function GET() {
  try {
    const supabase = await createClient();

    // 인증 확인
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // 권한 확인
    const { data: member } = await supabase
      .from("members")
      .select("role")
      .eq("user_id", user.id)
      .single();

    if (!member || (member.role !== "system_admin" && member.role !== "branch_manager")) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // 앱 설정 조회
    const { data: settings } = await supabase
      .from("meta_app_settings")
      .select("app_id, created_at, updated_at")
      .single();

    // app_secret은 보안상 반환하지 않음
    return NextResponse.json({
      data: settings
        ? {
            app_id: settings.app_id,
            has_secret: true, // 시크릿이 설정되어 있는지 여부만 반환
            created_at: settings.created_at,
            updated_at: settings.updated_at,
          }
        : null,
    });
  } catch (error) {
    console.error("Get Meta app settings error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/meta/app-settings
 *
 * Meta 앱 설정 저장/업데이트
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();

    // 인증 확인
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // 권한 확인
    const { data: member } = await supabase
      .from("members")
      .select("role")
      .eq("user_id", user.id)
      .single();

    if (!member || (member.role !== "system_admin" && member.role !== "branch_manager")) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();
    const { app_id, app_secret } = body;

    if (!app_id || !app_secret) {
      return NextResponse.json(
        { error: "앱 ID와 앱 Secret이 필요합니다." },
        { status: 400 }
      );
    }

    // Admin 클라이언트로 저장 (RLS 우회)
    const adminClient = createAdminClient();

    // 기존 설정 확인
    const { data: existing } = await adminClient
      .from("meta_app_settings")
      .select("id")
      .single();

    if (existing) {
      // 업데이트
      const { error } = await adminClient
        .from("meta_app_settings")
        .update({
          app_id,
          app_secret,
          updated_at: new Date().toISOString(),
        })
        .eq("id", existing.id);

      if (error) throw error;
    } else {
      // 새로 생성
      const { error } = await adminClient.from("meta_app_settings").insert({
        app_id,
        app_secret,
      });

      if (error) throw error;
    }

    return NextResponse.json({
      success: true,
      message: "앱 설정이 저장되었습니다.",
    });
  } catch (error) {
    console.error("Save Meta app settings error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
