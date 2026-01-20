import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { z } from "zod";

// 자격 수정 스키마
const updateQualificationSchema = z.object({
  member_id: z.string().uuid("올바른 멤버를 선택해주세요"),
  newbie_test_passed: z.boolean().optional(),
});

// GET: 멤버 자격 목록 조회
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();

    // 인증 확인
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "인증이 필요합니다" }, { status: 401 });
    }

    // 쿼리 파라미터
    const { searchParams } = new URL(request.url);
    const teamId = searchParams.get("teamId");
    const testPassed = searchParams.get("testPassed");

    // 멤버 목록 조회 (자격 정보 포함 - 모든 멤버 표시)
    let query = supabase
      .from("members")
      .select(`
        id,
        name,
        email,
        phone,
        role,
        is_active,
        team:teams(id, name),
        qualification:member_qualifications(
          id,
          newbie_test_passed,
          newbie_test_passed_at,
          created_at,
          updated_at
        )
      `)
      .eq("is_active", true)
      .eq("role", "team_leader")
      .order("name", { ascending: true });

    // 팀 필터
    if (teamId) {
      query = query.eq("team_id", teamId);
    }

    const { data: members, error } = await query;

    if (error) {
      console.error("Members fetch error:", error);
      return NextResponse.json(
        { error: "멤버 자격 목록을 불러오는데 실패했습니다" },
        { status: 500 }
      );
    }

    // 멤버 데이터를 member_qualifications 형식으로 변환
    // (기존 프론트엔드 호환성 유지)
    const qualifications = members?.map((member) => {
      // qualification이 배열인 경우 첫 번째 요소 사용
      const qual = Array.isArray(member.qualification)
        ? member.qualification[0]
        : member.qualification;

      return {
        id: qual?.id || null,
        member_id: member.id,
        newbie_test_passed: qual?.newbie_test_passed || false,
        newbie_test_passed_at: qual?.newbie_test_passed_at || null,
        created_at: qual?.created_at || null,
        updated_at: qual?.updated_at || null,
        member: {
          id: member.id,
          name: member.name,
          email: member.email,
          phone: member.phone,
          role: member.role,
          is_active: member.is_active,
          team: Array.isArray(member.team) ? member.team[0] : member.team,
        },
      };
    }) || [];

    // 테스트 통과 여부 필터
    let filteredQualifications = qualifications;
    if (testPassed !== null && testPassed !== undefined) {
      const testPassedBool = testPassed === "true";
      filteredQualifications = qualifications.filter(
        (q) => q.newbie_test_passed === testPassedBool
      );
    }

    return NextResponse.json({ success: true, data: filteredQualifications });
  } catch (error) {
    console.error("Member qualifications GET error:", error);
    return NextResponse.json(
      { error: "서버 오류가 발생했습니다" },
      { status: 500 }
    );
  }
}

// POST: 멤버 자격 생성/수정 (upsert)
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
    const { data: currentMember } = await supabase
      .from("members")
      .select("role")
      .eq("user_id", user.id)
      .single();

    if (!currentMember || currentMember.role !== "system_admin") {
      return NextResponse.json(
        { error: "권한이 없습니다" },
        { status: 403 }
      );
    }

    // 요청 데이터 파싱 및 검증
    const body = await request.json();
    const validationResult = updateQualificationSchema.safeParse(body);

    if (!validationResult.success) {
      return NextResponse.json(
        {
          error: "입력값이 올바르지 않습니다",
          details: validationResult.error.flatten().fieldErrors,
        },
        { status: 400 }
      );
    }

    const { member_id, newbie_test_passed } = validationResult.data;

    // 멤버 존재 확인
    const { data: member } = await supabase
      .from("members")
      .select("id, is_active")
      .eq("id", member_id)
      .single();

    if (!member || !member.is_active) {
      return NextResponse.json(
        { error: "유효하지 않은 멤버입니다" },
        { status: 400 }
      );
    }

    // 기존 자격 조회
    const { data: existingQualification } = await supabase
      .from("member_qualifications")
      .select("id, newbie_test_passed, newbie_test_passed_at")
      .eq("member_id", member_id)
      .single();

    const updateData: Record<string, unknown> = {};

    if (newbie_test_passed !== undefined) {
      updateData.newbie_test_passed = newbie_test_passed;
      // 테스트 통과 시 통과 일시 기록
      if (newbie_test_passed && !existingQualification?.newbie_test_passed) {
        updateData.newbie_test_passed_at = new Date().toISOString();
      }
      // 테스트 통과 취소 시 통과 일시 초기화
      if (!newbie_test_passed) {
        updateData.newbie_test_passed_at = null;
      }
    }

    let qualification;

    if (existingQualification) {
      // 기존 자격 수정
      const { data, error } = await supabase
        .from("member_qualifications")
        .update(updateData)
        .eq("id", existingQualification.id)
        .select(`
          *,
          member:members(id, name, team:teams(id, name))
        `)
        .single();

      if (error) {
        console.error("Member qualification update error:", error);
        return NextResponse.json(
          { error: "멤버 자격 수정에 실패했습니다" },
          { status: 500 }
        );
      }

      qualification = data;
    } else {
      // 새 자격 생성
      const insertData = {
        member_id,
        newbie_test_passed: newbie_test_passed || false,
        newbie_test_passed_at: newbie_test_passed ? new Date().toISOString() : null,
      };

      const { data, error } = await supabase
        .from("member_qualifications")
        .insert(insertData)
        .select(`
          *,
          member:members(id, name, team:teams(id, name))
        `)
        .single();

      if (error) {
        console.error("Member qualification create error:", error);
        return NextResponse.json(
          { error: "멤버 자격 생성에 실패했습니다" },
          { status: 500 }
        );
      }

      qualification = data;
    }

    return NextResponse.json(
      { success: true, data: qualification },
      { status: existingQualification ? 200 : 201 }
    );
  } catch (error) {
    console.error("Member qualifications POST error:", error);
    return NextResponse.json(
      { error: "서버 오류가 발생했습니다" },
      { status: 500 }
    );
  }
}
