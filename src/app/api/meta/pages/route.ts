import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { z } from "zod";
import { MetaClient } from "@/lib/meta";

// 페이지 생성 스키마
const createPageSchema = z.object({
  page_id: z.string().min(1, "페이지 ID는 필수입니다"),
  page_name: z.string().min(1, "페이지 이름은 필수입니다"),
  access_token: z.string().min(1, "액세스 토큰은 필수입니다"),
  is_active: z.boolean().default(true),
  sync_interval_minutes: z.number().int().min(5).max(1440).default(60),
});

// GET /api/meta/pages - 메타 페이지 목록 조회
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

    // 권한 확인 (시스템 관리자만)
    const { data: member } = await supabase
      .from("members")
      .select("role")
      .eq("user_id", user.id)
      .single();

    if (!member || member.role !== "system_admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // 페이지 목록 조회
    const { data: pages, error } = await supabase
      .from("meta_pages")
      .select("*")
      .order("created_at", { ascending: true });

    if (error) {
      console.error("Meta pages fetch error:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // 액세스 토큰은 마스킹해서 반환
    const maskedPages = (pages || []).map((page) => ({
      ...page,
      access_token: page.access_token
        ? `${page.access_token.substring(0, 10)}...${page.access_token.slice(-4)}`
        : null,
      has_token: !!page.access_token,
    }));

    return NextResponse.json({ data: maskedPages });
  } catch (error) {
    console.error("Meta pages API error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// POST /api/meta/pages - 새 메타 페이지 추가
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
    const body = await request.json();
    const result = createPageSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json(
        { error: "잘못된 요청입니다", details: result.error.issues },
        { status: 400 }
      );
    }

    const { page_id, page_name, access_token, is_active, sync_interval_minutes } =
      result.data;

    // 토큰 검증 (Meta API 호출 테스트)
    try {
      const client = new MetaClient({
        accessToken: access_token,
        pageId: page_id,
      });

      const pageInfo = await client.getPageInfo();
      if (!pageInfo) {
        return NextResponse.json(
          { error: "페이지 정보를 가져올 수 없습니다. 페이지 ID와 토큰을 확인해주세요." },
          { status: 400 }
        );
      }
    } catch (e) {
      return NextResponse.json(
        {
          error: "Meta API 연결에 실패했습니다. 액세스 토큰이 유효한지 확인해주세요.",
          details: e instanceof Error ? e.message : "Unknown error",
        },
        { status: 400 }
      );
    }

    // 중복 체크
    const { data: existing } = await supabase
      .from("meta_pages")
      .select("id")
      .eq("page_id", page_id)
      .single();

    if (existing) {
      return NextResponse.json(
        { error: "이미 등록된 페이지 ID입니다" },
        { status: 409 }
      );
    }

    // 페이지 저장
    const { data: newPage, error } = await supabase
      .from("meta_pages")
      .insert({
        page_id,
        page_name,
        access_token,
        is_active,
        sync_interval_minutes,
      })
      .select()
      .single();

    if (error) {
      console.error("Meta page create error:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // 액세스 토큰 마스킹해서 반환
    return NextResponse.json({
      data: {
        ...newPage,
        access_token: `${access_token.substring(0, 10)}...${access_token.slice(-4)}`,
        has_token: true,
      },
    });
  } catch (error) {
    console.error("Meta pages create API error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
