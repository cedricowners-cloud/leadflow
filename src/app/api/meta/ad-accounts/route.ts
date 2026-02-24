import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

const META_GRAPH_API = "https://graph.facebook.com/v21.0";

interface MetaAdAccount {
  id: string; // "act_123456789"
  account_id: string; // "123456789"
  name: string;
  account_status: number;
  currency?: string;
  business_name?: string;
}

/**
 * GET /api/meta/ad-accounts
 *
 * Meta 광고 계정 목록 조회
 * OAuth로 저장된 User Access Token을 사용하여 /me/adaccounts 호출
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

    // Admin 클라이언트로 user_access_token 조회
    const adminClient = createAdminClient();
    const { data: appSettings } = await adminClient
      .from("meta_app_settings")
      .select("user_access_token, user_token_expires_at")
      .single();

    if (!appSettings?.user_access_token) {
      return NextResponse.json(
        {
          error:
            "User Access Token이 없습니다. Facebook 계정을 다시 연결해주세요.",
        },
        { status: 400 }
      );
    }

    // 토큰 만료 확인
    if (
      appSettings.user_token_expires_at &&
      new Date(appSettings.user_token_expires_at) < new Date()
    ) {
      return NextResponse.json(
        {
          error:
            "User Access Token이 만료되었습니다. Facebook 계정을 다시 연결해주세요.",
        },
        { status: 400 }
      );
    }

    // Meta API로 광고 계정 목록 조회
    const params = new URLSearchParams({
      access_token: appSettings.user_access_token,
      fields: "id,account_id,name,account_status,currency,business_name",
      limit: "100",
    });

    const response = await fetch(
      `${META_GRAPH_API}/me/adaccounts?${params.toString()}`
    );

    if (!response.ok) {
      const error = await response.json();
      console.error("Meta API error:", error);

      // 토큰 만료 에러인 경우
      if (error.error?.code === 190) {
        return NextResponse.json(
          {
            error:
              "User Access Token이 만료되었습니다. Facebook 계정을 다시 연결해주세요.",
          },
          { status: 400 }
        );
      }

      return NextResponse.json(
        {
          error:
            error.error?.message || "광고 계정 목록을 가져오는 데 실패했습니다.",
        },
        { status: 500 }
      );
    }

    const result = await response.json();
    const adAccounts: MetaAdAccount[] = result.data || [];

    // 활성 계정만 필터링 (account_status: 1 = ACTIVE)
    const activeAccounts = adAccounts.filter(
      (account) => account.account_status === 1
    );

    return NextResponse.json({
      ad_accounts: activeAccounts.map((account) => ({
        id: account.id, // "act_123456789"
        account_id: account.account_id, // "123456789"
        name: account.name,
        currency: account.currency,
        business_name: account.business_name,
      })),
      total: activeAccounts.length,
    });
  } catch (error) {
    console.error("Ad accounts fetch error:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "광고 계정 조회 중 오류가 발생했습니다.",
      },
      { status: 500 }
    );
  }
}

/**
 * POST /api/meta/ad-accounts
 *
 * 선택한 광고 계정을 DB에 저장
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

    // 권한 확인 (시스템 관리자만)
    const { data: member } = await supabase
      .from("members")
      .select("role")
      .eq("user_id", user.id)
      .single();

    if (!member || member.role !== "system_admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();
    const { ad_account_id, account_name, currency, business_name } = body as {
      ad_account_id: string;
      account_name?: string;
      currency?: string;
      business_name?: string;
    };

    if (!ad_account_id) {
      return NextResponse.json(
        { error: "ad_account_id는 필수입니다." },
        { status: 400 }
      );
    }

    const adminClient = createAdminClient();

    // 중복 확인
    const { data: existing } = await adminClient
      .from("meta_ad_accounts")
      .select("id")
      .eq("ad_account_id", ad_account_id)
      .single();

    if (existing) {
      return NextResponse.json(
        { error: "이미 등록된 광고 계정입니다." },
        { status: 409 }
      );
    }

    // 저장
    const { data, error } = await adminClient
      .from("meta_ad_accounts")
      .insert({
        ad_account_id,
        account_name: account_name || null,
        currency: currency || null,
        business_name: business_name || null,
      })
      .select()
      .single();

    if (error) {
      return NextResponse.json(
        { error: `저장 실패: ${error.message}` },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error("Ad account save error:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "광고 계정 저장 중 오류가 발생했습니다.",
      },
      { status: 500 }
    );
  }
}
