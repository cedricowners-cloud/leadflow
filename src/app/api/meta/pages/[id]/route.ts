import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { z } from "zod";
import { MetaClient } from "@/lib/meta";

// 페이지 수정 스키마
const updatePageSchema = z.object({
  page_name: z.string().min(1).optional(),
  access_token: z.string().min(1).optional(),
  is_active: z.boolean().optional(),
  sync_interval_minutes: z.number().int().min(5).max(1440).optional(),
});

interface RouteParams {
  params: Promise<{ id: string }>;
}

// GET /api/meta/pages/[id] - 특정 페이지 조회
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
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

    // 페이지 조회
    const { data: page, error } = await supabase
      .from("meta_pages")
      .select("*")
      .eq("id", id)
      .single();

    if (error || !page) {
      return NextResponse.json(
        { error: "페이지를 찾을 수 없습니다" },
        { status: 404 }
      );
    }

    // 동기화 로그도 함께 조회
    const { data: logs } = await supabase
      .from("meta_sync_logs")
      .select("*")
      .eq("page_id", id)
      .order("started_at", { ascending: false })
      .limit(10);

    // 액세스 토큰 마스킹
    return NextResponse.json({
      data: {
        ...page,
        access_token: page.access_token
          ? `${page.access_token.substring(0, 10)}...${page.access_token.slice(-4)}`
          : null,
        has_token: !!page.access_token,
        recent_logs: logs || [],
      },
    });
  } catch (error) {
    console.error("Meta page fetch error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// PATCH /api/meta/pages/[id] - 페이지 수정
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
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

    // 기존 페이지 조회
    const { data: existingPage, error: fetchError } = await supabase
      .from("meta_pages")
      .select("*")
      .eq("id", id)
      .single();

    if (fetchError || !existingPage) {
      return NextResponse.json(
        { error: "페이지를 찾을 수 없습니다" },
        { status: 404 }
      );
    }

    // 요청 바디 파싱
    const body = await request.json();
    const result = updatePageSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json(
        { error: "잘못된 요청입니다", details: result.error.issues },
        { status: 400 }
      );
    }

    const updates = result.data;

    // 토큰이 변경된 경우 검증
    if (updates.access_token) {
      try {
        const client = new MetaClient({
          accessToken: updates.access_token,
          pageId: existingPage.page_id,
        });

        const pageInfo = await client.getPageInfo();
        if (!pageInfo) {
          return NextResponse.json(
            { error: "페이지 정보를 가져올 수 없습니다. 토큰을 확인해주세요." },
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
    }

    // 페이지 업데이트
    const { data: updatedPage, error: updateError } = await supabase
      .from("meta_pages")
      .update(updates)
      .eq("id", id)
      .select()
      .single();

    if (updateError) {
      console.error("Meta page update error:", updateError);
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }

    // 액세스 토큰 마스킹해서 반환
    return NextResponse.json({
      data: {
        ...updatedPage,
        access_token: updatedPage.access_token
          ? `${updatedPage.access_token.substring(0, 10)}...${updatedPage.access_token.slice(-4)}`
          : null,
        has_token: !!updatedPage.access_token,
      },
    });
  } catch (error) {
    console.error("Meta page update API error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// DELETE /api/meta/pages/[id] - 페이지 삭제
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
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

    // 페이지 존재 확인
    const { data: existingPage, error: fetchError } = await supabase
      .from("meta_pages")
      .select("id")
      .eq("id", id)
      .single();

    if (fetchError || !existingPage) {
      return NextResponse.json(
        { error: "페이지를 찾을 수 없습니다" },
        { status: 404 }
      );
    }

    // 페이지 삭제 (관련 sync_logs는 CASCADE로 자동 삭제)
    const { error: deleteError } = await supabase
      .from("meta_pages")
      .delete()
      .eq("id", id);

    if (deleteError) {
      console.error("Meta page delete error:", deleteError);
      return NextResponse.json({ error: deleteError.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Meta page delete API error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
