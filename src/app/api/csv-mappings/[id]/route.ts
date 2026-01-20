import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { z } from "zod";

// CSV 매핑 수정 스키마
const updateMappingSchema = z.object({
  csv_column: z.string().min(1).optional(),
  system_field: z.string().min(1).optional(),
  is_required: z.boolean().optional(),
  display_order: z.number().int().min(0).optional(),
});

interface RouteParams {
  params: Promise<{ id: string }>;
}

// GET /api/csv-mappings/[id] - CSV 매핑 상세 조회
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

    // 매핑 조회
    const { data: mapping, error } = await supabase
      .from("csv_mappings")
      .select("*")
      .eq("id", id)
      .single();

    if (error) {
      if (error.code === "PGRST116") {
        return NextResponse.json(
          { error: "매핑을 찾을 수 없습니다" },
          { status: 404 }
        );
      }
      console.error("CSV mapping fetch error:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ data: mapping });
  } catch (error) {
    console.error("CSV mapping API error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// PATCH /api/csv-mappings/[id] - CSV 매핑 수정
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

    // 요청 데이터 파싱 및 검증
    const body = await request.json();
    const result = updateMappingSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json(
        { error: result.error.issues[0].message },
        { status: 400 }
      );
    }

    const updateData = result.data;

    // 시스템 필드 변경 시 중복 체크
    if (updateData.system_field) {
      const { data: existing } = await supabase
        .from("csv_mappings")
        .select("id")
        .eq("system_field", updateData.system_field)
        .neq("id", id)
        .single();

      if (existing) {
        return NextResponse.json(
          { error: "이미 매핑된 시스템 필드입니다" },
          { status: 400 }
        );
      }
    }

    // 매핑 수정
    const { data: mapping, error } = await supabase
      .from("csv_mappings")
      .update(updateData)
      .eq("id", id)
      .select()
      .single();

    if (error) {
      if (error.code === "PGRST116") {
        return NextResponse.json(
          { error: "매핑을 찾을 수 없습니다" },
          { status: 404 }
        );
      }
      console.error("CSV mapping update error:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ data: mapping });
  } catch (error) {
    console.error("CSV mapping API error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// DELETE /api/csv-mappings/[id] - CSV 매핑 삭제
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

    // 매핑 삭제
    const { error } = await supabase
      .from("csv_mappings")
      .delete()
      .eq("id", id);

    if (error) {
      console.error("CSV mapping delete error:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ message: "매핑이 삭제되었습니다" });
  } catch (error) {
    console.error("CSV mapping API error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
