import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { z } from "zod";
import { CORE_FIELDS } from "@/lib/constants/lead-fields";
import { isAdminRole, MemberRole } from "@/lib/constants/roles";

// CSV 매핑 스키마 (확장된 필드 포함)
const csvMappingSchema = z.object({
  csv_column: z.string().min(1, "CSV 컬럼명을 입력해주세요"),
  system_field: z.string().min(1, "시스템 필드를 선택해주세요"),
  is_required: z.boolean().default(false),
  is_core_field: z.boolean().default(true),
  field_type: z.string().default("text"),
  field_label: z.string().optional(),
  field_description: z.string().optional(),
  display_order: z.number().int().min(0).default(0),
  is_visible_in_list: z.boolean().default(false),
});

const bulkUpdateSchema = z.object({
  mappings: z.array(csvMappingSchema),
});

// GET /api/csv-mappings - CSV 매핑 목록 조회
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

    // CSV 매핑 목록 조회
    const { data: mappings, error } = await supabase
      .from("csv_mappings")
      .select("*")
      .order("display_order", { ascending: true });

    if (error) {
      console.error("CSV mappings fetch error:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ data: mappings });
  } catch (error) {
    console.error("CSV mappings API error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// POST /api/csv-mappings - CSV 매핑 생성
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

    if (!member || !isAdminRole(member.role as MemberRole)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // 요청 데이터 파싱 및 검증
    const body = await request.json();
    const result = csvMappingSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json(
        { error: result.error.issues[0].message },
        { status: 400 }
      );
    }

    const { csv_column, system_field, is_required, display_order } = result.data;

    // 시스템 필드 중복 체크
    const { data: existing } = await supabase
      .from("csv_mappings")
      .select("id")
      .eq("system_field", system_field)
      .single();

    if (existing) {
      return NextResponse.json(
        { error: "이미 매핑된 시스템 필드입니다" },
        { status: 400 }
      );
    }

    // 매핑 생성
    const { data: mapping, error } = await supabase
      .from("csv_mappings")
      .insert({ csv_column, system_field, is_required, display_order })
      .select()
      .single();

    if (error) {
      console.error("CSV mapping create error:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ data: mapping }, { status: 201 });
  } catch (error) {
    console.error("CSV mappings API error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// PUT /api/csv-mappings - CSV 매핑 일괄 업데이트
export async function PUT(request: NextRequest) {
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

    if (!member || !isAdminRole(member.role as MemberRole)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // 요청 데이터 파싱 및 검증
    const body = await request.json();
    const result = bulkUpdateSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json(
        { error: result.error.issues[0].message },
        { status: 400 }
      );
    }

    const { mappings } = result.data;

    // 기존 매핑 삭제 후 새로 삽입
    const { error: deleteError } = await supabase
      .from("csv_mappings")
      .delete()
      .neq("id", "00000000-0000-0000-0000-000000000000"); // 전체 삭제

    if (deleteError) {
      console.error("CSV mappings delete error:", deleteError);
      return NextResponse.json({ error: deleteError.message }, { status: 500 });
    }

    // 새 매핑 삽입
    if (mappings.length > 0) {
      const { error: insertError } = await supabase
        .from("csv_mappings")
        .insert(mappings);

      if (insertError) {
        console.error("CSV mappings insert error:", insertError);
        return NextResponse.json({ error: insertError.message }, { status: 500 });
      }

      // lead_column_settings에 누락된 시스템 필드 자동 추가
      await syncLeadColumnSettings(supabase, mappings);
    }

    // 업데이트된 매핑 조회
    const { data: updatedMappings, error: fetchError } = await supabase
      .from("csv_mappings")
      .select("*")
      .order("display_order", { ascending: true });

    if (fetchError) {
      console.error("CSV mappings fetch error:", fetchError);
      return NextResponse.json({ error: fetchError.message }, { status: 500 });
    }

    return NextResponse.json({ data: updatedMappings });
  } catch (error) {
    console.error("CSV mappings API error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// CORE_FIELDS에서 시스템 필드 레이블 가져오기
function getFieldLabel(systemField: string): string {
  const field = CORE_FIELDS.find((f) => f.systemField === systemField);
  return field?.label || systemField;
}

// CSV 매핑의 시스템 필드를 lead_column_settings에 동기화
async function syncLeadColumnSettings(
  supabase: Awaited<ReturnType<typeof createClient>>,
  mappings: Array<{ system_field: string }>
) {
  try {
    // 현재 lead_column_settings에 있는 컬럼 키 조회
    const { data: existingColumns } = await supabase
      .from("lead_column_settings")
      .select("column_key");

    const existingKeys = new Set(existingColumns?.map((c) => c.column_key) || []);

    // 매핑에는 있지만 lead_column_settings에 없는 필드 찾기
    const missingFields = mappings
      .map((m) => m.system_field)
      .filter((field) => !existingKeys.has(field));

    if (missingFields.length === 0) return;

    // 현재 최대 display_order 조회
    const { data: maxOrderResult } = await supabase
      .from("lead_column_settings")
      .select("display_order")
      .order("display_order", { ascending: false })
      .limit(1);

    let nextOrder = (maxOrderResult?.[0]?.display_order || 0) + 1;

    // 누락된 필드 추가
    const newColumns = missingFields.map((field) => ({
      column_key: field,
      column_label: getFieldLabel(field),
      is_visible: false, // 기본적으로 숨김
      display_order: nextOrder++,
      is_system: false,
    }));

    await supabase.from("lead_column_settings").insert(newColumns);

    console.log(`Added ${newColumns.length} new columns to lead_column_settings:`, missingFields);
  } catch (error) {
    console.error("Error syncing lead_column_settings:", error);
    // 동기화 실패해도 CSV 매핑 저장은 성공으로 처리
  }
}
