import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createMetaSyncService } from "@/lib/meta";

/**
 * POST /api/meta/sync - 수동 동기화 트리거
 *
 * 요청 본문:
 * - page_id (선택): 특정 페이지만 동기화. 없으면 모든 활성 페이지 동기화
 * - force_full_sync (선택): true면 증분 동기화 대신 전체 동기화
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

    // 요청 바디 파싱
    const body = await request.json().catch(() => ({}));
    const { page_id, force_full_sync, since_date, until_date } = body as {
      page_id?: string;
      force_full_sync?: boolean;
      since_date?: string;
      until_date?: string;
    };

    // Admin 클라이언트로 동기화 서비스 생성 (RLS 우회)
    const adminClient = createAdminClient();
    const syncService = createMetaSyncService(adminClient);

    let results;

    // 날짜 범위가 지정된 경우 증분 동기화 대신 날짜 범위 사용
    const hasDateRange = !!(since_date || until_date);

    const syncOptions = {
      syncType: "manual" as const,
      forceFullSync: force_full_sync,
      incrementalSync: hasDateRange ? false : !force_full_sync,
      sinceDate: since_date,
      untilDate: until_date,
    };

    if (page_id) {
      // 특정 페이지만 동기화
      const result = await syncService.syncPage(page_id, syncOptions);
      results = [result];
    } else {
      // 모든 활성 페이지 동기화
      results = await syncService.syncAllPages(syncOptions);
    }

    // 결과 요약
    const summary = {
      total_pages: results.length,
      successful_pages: results.filter((r) => r.success).length,
      failed_pages: results.filter((r) => !r.success).length,
      total_leads_fetched: results.reduce((sum, r) => sum + r.leads_fetched, 0),
      total_leads_created: results.reduce((sum, r) => sum + r.leads_created, 0),
      total_leads_duplicated: results.reduce(
        (sum, r) => sum + r.leads_duplicated,
        0
      ),
    };

    return NextResponse.json({
      success: summary.failed_pages === 0,
      data: {
        summary,
        results,
      },
    });
  } catch (error) {
    console.error("Meta sync API error:", error);
    return NextResponse.json(
      {
        error: "Internal server error",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/meta/sync - Vercel Cron Job용 엔드포인트
 *
 * vercel.json에서 스케줄로 호출됨
 * Authorization 헤더에 CRON_SECRET이 있어야 함
 */
export async function GET(request: NextRequest) {
  try {
    // Vercel Cron 인증 확인
    const authHeader = request.headers.get("authorization");
    const cronSecret = process.env.CRON_SECRET;

    // CRON_SECRET이 설정된 경우에만 검증
    if (cronSecret) {
      if (authHeader !== `Bearer ${cronSecret}`) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }
    } else {
      // 개발 환경에서는 경고만 출력
      console.warn(
        "CRON_SECRET is not set. Cron endpoint is accessible without authentication."
      );
    }

    // Admin 클라이언트로 동기화 서비스 생성
    const adminClient = createAdminClient();
    const syncService = createMetaSyncService(adminClient);

    // 모든 활성 페이지 증분 동기화
    const results = await syncService.syncAllPages({
      syncType: "scheduled",
      incrementalSync: true,
    });

    // 결과 요약
    const summary = {
      total_pages: results.length,
      successful_pages: results.filter((r) => r.success).length,
      failed_pages: results.filter((r) => !r.success).length,
      total_leads_fetched: results.reduce((sum, r) => sum + r.leads_fetched, 0),
      total_leads_created: results.reduce((sum, r) => sum + r.leads_created, 0),
      total_leads_duplicated: results.reduce(
        (sum, r) => sum + r.leads_duplicated,
        0
      ),
    };

    console.log("Cron sync completed:", summary);

    return NextResponse.json({
      success: summary.failed_pages === 0,
      data: {
        summary,
        results,
      },
    });
  } catch (error) {
    console.error("Meta cron sync error:", error);
    return NextResponse.json(
      {
        error: "Internal server error",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
