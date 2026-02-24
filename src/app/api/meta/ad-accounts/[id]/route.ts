import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * PATCH /api/meta/ad-accounts/[id]
 *
 * 광고 계정 설정 수정 (활성/비활성, 동기화 주기 등)
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
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

    // 권한 확인
    const { data: member } = await supabase
      .from("members")
      .select("role")
      .eq("user_id", user.id)
      .single();

    if (!member || member.role !== "system_admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();
    const { is_active, sync_interval_minutes, account_name } = body as {
      is_active?: boolean;
      sync_interval_minutes?: number;
      account_name?: string;
    };

    const updateData: Record<string, unknown> = {};
    if (is_active !== undefined) updateData.is_active = is_active;
    if (sync_interval_minutes !== undefined)
      updateData.sync_interval_minutes = sync_interval_minutes;
    if (account_name !== undefined) updateData.account_name = account_name;

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json(
        { error: "수정할 항목이 없습니다." },
        { status: 400 }
      );
    }

    const adminClient = createAdminClient();
    const { data, error } = await adminClient
      .from("meta_ad_accounts")
      .update(updateData)
      .eq("id", id)
      .select()
      .single();

    if (error) {
      return NextResponse.json(
        { error: `수정 실패: ${error.message}` },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error("Ad account update error:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "광고 계정 수정 중 오류가 발생했습니다.",
      },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/meta/ad-accounts/[id]
 *
 * 광고 계정 삭제
 */
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
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

    // 권한 확인
    const { data: member } = await supabase
      .from("members")
      .select("role")
      .eq("user_id", user.id)
      .single();

    if (!member || member.role !== "system_admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const adminClient = createAdminClient();
    const { error } = await adminClient
      .from("meta_ad_accounts")
      .delete()
      .eq("id", id);

    if (error) {
      return NextResponse.json(
        { error: `삭제 실패: ${error.message}` },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Ad account delete error:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "광고 계정 삭제 중 오류가 발생했습니다.",
      },
      { status: 500 }
    );
  }
}
