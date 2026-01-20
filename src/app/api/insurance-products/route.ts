import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { z } from "zod";

// 보험 상품 생성 스키마
const createProductSchema = z.object({
  name: z.string().min(1, "상품명을 입력해주세요").max(200),
  company: z.string().max(100).nullish(), // null, undefined 모두 허용
  insurer_commission_rate: z
    .number()
    .min(0, "보험사 수수료율은 0 이상이어야 합니다")
    .max(10, "보험사 수수료율은 1000% 이하여야 합니다"), // 예: 1.5 = 150%
  adjustment_rate: z
    .number()
    .min(0, "회사 조정률은 0 이상이어야 합니다")
    .max(2, "회사 조정률은 200% 이하여야 합니다")
    .default(1.0), // 예: 1.0 = 100%
  description: z.string().max(500).nullish(), // null, undefined 모두 허용
});

// GET: 보험 상품 목록 조회
export async function GET() {
  try {
    const supabase = await createClient();

    // 인증 확인
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "인증이 필요합니다" }, { status: 401 });
    }

    // 보험 상품 목록 조회 (활성 상품만, 이름순)
    const { data: products, error } = await supabase
      .from("insurance_products")
      .select("*")
      .eq("is_active", true)
      .order("name", { ascending: true });

    if (error) {
      console.error("Insurance products fetch error:", error);
      return NextResponse.json(
        { error: "보험 상품 목록을 불러오는데 실패했습니다" },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, data: products });
  } catch (error) {
    console.error("Insurance products GET error:", error);
    return NextResponse.json(
      { error: "서버 오류가 발생했습니다" },
      { status: 500 }
    );
  }
}

// POST: 보험 상품 생성
export async function POST(request: NextRequest) {
  try {
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

    if (!member || member.role !== "system_admin") {
      return NextResponse.json(
        { error: "권한이 없습니다" },
        { status: 403 }
      );
    }

    // 요청 데이터 파싱 및 검증
    const body = await request.json();
    const validationResult = createProductSchema.safeParse(body);

    if (!validationResult.success) {
      return NextResponse.json(
        {
          error: "입력값이 올바르지 않습니다",
          details: validationResult.error.flatten().fieldErrors,
        },
        { status: 400 }
      );
    }

    const { name, company, insurer_commission_rate, adjustment_rate, description } =
      validationResult.data;

    // 상품명 중복 체크 (같은 회사 내에서)
    const duplicateQuery = supabase
      .from("insurance_products")
      .select("id")
      .eq("name", name)
      .eq("is_active", true);

    if (company) {
      duplicateQuery.eq("company", company);
    }

    const { data: existingProduct } = await duplicateQuery.single();

    if (existingProduct) {
      return NextResponse.json(
        { error: "이미 존재하는 상품명입니다" },
        { status: 400 }
      );
    }

    // 보험 상품 생성
    const { data: product, error } = await supabase
      .from("insurance_products")
      .insert({
        name,
        company: company || null,
        insurer_commission_rate,
        adjustment_rate: adjustment_rate ?? 1.0,
        description: description || null,
        is_active: true,
      })
      .select()
      .single();

    if (error) {
      console.error("Insurance product create error:", error);
      return NextResponse.json(
        { error: "보험 상품 생성에 실패했습니다" },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, data: product }, { status: 201 });
  } catch (error) {
    console.error("Insurance products POST error:", error);
    return NextResponse.json(
      { error: "서버 오류가 발생했습니다" },
      { status: 500 }
    );
  }
}
