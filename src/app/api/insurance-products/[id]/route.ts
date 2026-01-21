import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { z } from "zod";
import { isAdminRole, MemberRole } from "@/lib/constants/roles";

interface RouteParams {
  params: Promise<{ id: string }>;
}

// 보험 상품 수정 스키마
const updateProductSchema = z.object({
  name: z.string().min(1, "상품명을 입력해주세요").max(200).optional(),
  company: z.string().max(100).optional().nullable(),
  insurer_commission_rate: z
    .number()
    .min(0, "보험사 수수료율은 0 이상이어야 합니다")
    .max(10, "보험사 수수료율은 1000% 이하여야 합니다")
    .optional(),
  adjustment_rate: z
    .number()
    .min(0, "회사 조정률은 0 이상이어야 합니다")
    .max(10, "회사 조정률은 1000% 이하여야 합니다")
    .optional(),
  description: z.string().max(500).optional().nullable(),
});

// GET: 보험 상품 상세 조회
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const supabase = await createClient();

    // 인증 확인
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "인증이 필요합니다" }, { status: 401 });
    }

    // 보험 상품 조회
    const { data: product, error } = await supabase
      .from("insurance_products")
      .select("*")
      .eq("id", id)
      .single();

    if (error) {
      console.error("Insurance product fetch error:", error);
      return NextResponse.json(
        { error: "보험 상품을 찾을 수 없습니다" },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, data: product });
  } catch (error) {
    console.error("Insurance product GET error:", error);
    return NextResponse.json(
      { error: "서버 오류가 발생했습니다" },
      { status: 500 }
    );
  }
}

// PATCH: 보험 상품 수정
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const supabase = await createClient();

    // 인증 확인
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "인증이 필요합니다" }, { status: 401 });
    }

    // 권한 확인 (시스템 관리자만)
    const { data: member } = await supabase
      .from("members")
      .select("role")
      .eq("user_id", user.id)
      .single();

    if (!member || !isAdminRole(member.role as MemberRole)) {
      return NextResponse.json({ error: "권한이 없습니다" }, { status: 403 });
    }

    // 보험 상품 존재 확인
    const { data: existingProduct } = await supabase
      .from("insurance_products")
      .select("id, is_active")
      .eq("id", id)
      .single();

    if (!existingProduct || !existingProduct.is_active) {
      return NextResponse.json(
        { error: "보험 상품을 찾을 수 없습니다" },
        { status: 404 }
      );
    }

    // 요청 데이터 파싱 및 검증
    const body = await request.json();
    const validationResult = updateProductSchema.safeParse(body);

    if (!validationResult.success) {
      return NextResponse.json(
        {
          error: "입력값이 올바르지 않습니다",
          details: validationResult.error.flatten().fieldErrors,
        },
        { status: 400 }
      );
    }

    const updateData = validationResult.data;

    // 상품명 중복 체크 (본인 제외)
    if (updateData.name) {
      const duplicateQuery = supabase
        .from("insurance_products")
        .select("id")
        .eq("name", updateData.name)
        .eq("is_active", true)
        .neq("id", id);

      if (updateData.company) {
        duplicateQuery.eq("company", updateData.company);
      }

      const { data: duplicateProduct } = await duplicateQuery.single();

      if (duplicateProduct) {
        return NextResponse.json(
          { error: "이미 존재하는 상품명입니다" },
          { status: 400 }
        );
      }
    }

    // 보험 상품 수정
    const { data: product, error } = await supabase
      .from("insurance_products")
      .update(updateData)
      .eq("id", id)
      .select()
      .single();

    if (error) {
      console.error("Insurance product update error:", error);
      return NextResponse.json(
        { error: "보험 상품 수정에 실패했습니다" },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, data: product });
  } catch (error) {
    console.error("Insurance product PATCH error:", error);
    return NextResponse.json(
      { error: "서버 오류가 발생했습니다" },
      { status: 500 }
    );
  }
}

// DELETE: 보험 상품 삭제 (soft delete)
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const supabase = await createClient();

    // 인증 확인
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "인증이 필요합니다" }, { status: 401 });
    }

    // 권한 확인 (시스템 관리자만)
    const { data: member } = await supabase
      .from("members")
      .select("role")
      .eq("user_id", user.id)
      .single();

    if (!member || !isAdminRole(member.role as MemberRole)) {
      return NextResponse.json({ error: "권한이 없습니다" }, { status: 403 });
    }

    // 보험 상품 존재 확인
    const { data: product } = await supabase
      .from("insurance_products")
      .select("id, is_active")
      .eq("id", id)
      .single();

    if (!product || !product.is_active) {
      return NextResponse.json(
        { error: "보험 상품을 찾을 수 없습니다" },
        { status: 404 }
      );
    }

    // 해당 상품을 사용하는 실적이 있는지 확인
    const { count: detailCount } = await supabase
      .from("member_performance_details")
      .select("*", { count: "exact", head: true })
      .eq("product_id", id);

    if (detailCount && detailCount > 0) {
      return NextResponse.json(
        {
          error: `해당 상품을 사용 중인 실적이 ${detailCount}건 있습니다. 삭제할 수 없습니다.`,
        },
        { status: 400 }
      );
    }

    // 보험 상품 비활성화 (soft delete)
    const { error } = await supabase
      .from("insurance_products")
      .update({ is_active: false })
      .eq("id", id);

    if (error) {
      console.error("Insurance product delete error:", error);
      return NextResponse.json(
        { error: "보험 상품 삭제에 실패했습니다" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "보험 상품이 삭제되었습니다",
    });
  } catch (error) {
    console.error("Insurance product DELETE error:", error);
    return NextResponse.json(
      { error: "서버 오류가 발생했습니다" },
      { status: 500 }
    );
  }
}
