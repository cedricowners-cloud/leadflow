import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { SYSTEM_FIELDS, ALL_CORE_FIELDS } from "@/lib/constants/lead-fields";

export interface LeadColumnSetting {
  id: string;
  column_key: string;
  column_label: string;
  is_visible: boolean;
  display_order: number;
  is_system: boolean;
  column_width: number | null;
  // csv_mappings와 연동된 추가 정보
  field_type?: string;
  is_core_field?: boolean;
  csv_column?: string;
}

// 시스템 필드 키 목록 (CSV 매핑 불가, 시스템 자동 생성)
const SYSTEM_FIELD_KEYS = new Set(SYSTEM_FIELDS.map((f) => f.systemField));

// GET: 컬럼 설정 목록 조회 (csv_mappings 메타데이터 포함)
export async function GET() {
  try {
    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { success: false, error: "인증이 필요합니다." },
        { status: 401 }
      );
    }

    // lead_column_settings 조회
    const { data: columnSettings, error: columnError } = await supabase
      .from("lead_column_settings")
      .select("*")
      .order("display_order");

    if (columnError) {
      return NextResponse.json(
        { success: false, error: columnError.message },
        { status: 500 }
      );
    }

    // csv_mappings 조회하여 메타데이터 확보
    const { data: csvMappings } = await supabase
      .from("csv_mappings")
      .select("system_field, csv_column, field_type, is_core_field");

    // csv_mappings를 system_field 기준으로 맵 생성
    const mappingByField = new Map<string, {
      csv_column: string;
      field_type: string;
      is_core_field: boolean;
    }>();

    if (csvMappings) {
      for (const mapping of csvMappings) {
        mappingByField.set(mapping.system_field, {
          csv_column: mapping.csv_column,
          field_type: mapping.field_type || "text",
          is_core_field: mapping.is_core_field ?? true,
        });
      }
    }

    // lead-fields.ts의 정의와 병합
    const enrichedColumns = columnSettings?.map((col) => {
      const mapping = mappingByField.get(col.column_key);
      const fieldDef = ALL_CORE_FIELDS.find((f) => f.systemField === col.column_key);

      return {
        ...col,
        field_type: mapping?.field_type || fieldDef?.fieldType || "text",
        is_core_field: mapping?.is_core_field ?? (fieldDef?.isCoreField ?? true),
        csv_column: mapping?.csv_column,
        // is_system 플래그 업데이트: SYSTEM_FIELDS에 정의된 필드들
        is_system: col.is_system || SYSTEM_FIELD_KEYS.has(col.column_key),
      };
    }) || [];

    return NextResponse.json({
      success: true,
      data: enrichedColumns,
    });
  } catch (error) {
    console.error("Error fetching lead column settings:", error);
    return NextResponse.json(
      { success: false, error: "서버 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}

// PATCH: 컬럼 설정 일괄 업데이트
export async function PATCH(request: NextRequest) {
  try {
    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { success: false, error: "인증이 필요합니다." },
        { status: 401 }
      );
    }

    // 권한 체크
    const { data: member } = await supabase
      .from("members")
      .select("role")
      .eq("user_id", user.id)
      .single();

    if (!member || member.role !== "system_admin") {
      return NextResponse.json(
        { success: false, error: "권한이 없습니다." },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { columns } = body as { columns: Partial<LeadColumnSetting>[] };

    if (!columns || !Array.isArray(columns)) {
      return NextResponse.json(
        { success: false, error: "잘못된 요청입니다." },
        { status: 400 }
      );
    }

    // 각 컬럼 업데이트
    const updatePromises = columns.map((column) => {
      if (!column.id) return Promise.resolve();

      return supabase
        .from("lead_column_settings")
        .update({
          is_visible: column.is_visible,
          display_order: column.display_order,
          column_width: column.column_width,
          column_label: column.column_label,
        })
        .eq("id", column.id);
    });

    await Promise.all(updatePromises);

    // 업데이트된 목록 반환
    const { data, error } = await supabase
      .from("lead_column_settings")
      .select("*")
      .order("display_order");

    if (error) {
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      data,
    });
  } catch (error) {
    console.error("Error updating lead column settings:", error);
    return NextResponse.json(
      { success: false, error: "서버 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}
