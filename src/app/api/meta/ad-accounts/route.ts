import { NextResponse } from "next/server";
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
