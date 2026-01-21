import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { z } from "zod";
import { isAdminRole, MemberRole } from "@/lib/constants/roles";

// 팀 생성 스키마
const createTeamSchema = z.object({
  name: z.string().min(1, "팀 이름을 입력해주세요").max(100),
  description: z.string().max(500).optional(),
});

// GET /api/teams - 팀 목록 조회
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

    // 팀 목록 조회 (멤버 수 포함)
    const { data: teams, error } = await supabase
      .from("teams")
      .select(
        `
        *,
        members:members(count)
      `
      )
      .eq("is_active", true)
      .order("name");

    if (error) {
      console.error("Teams fetch error:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // 멤버 수 형식 변환
    const teamsWithCount = teams.map((team) => ({
      ...team,
      member_count: team.members?.[0]?.count || 0,
    }));

    return NextResponse.json({ data: teamsWithCount });
  } catch (error) {
    console.error("Teams API error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// POST /api/teams - 팀 생성
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
    const result = createTeamSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json(
        { error: result.error.issues[0].message },
        { status: 400 }
      );
    }

    const { name, description } = result.data;

    // 팀명 중복 체크
    const { data: existingTeam } = await supabase
      .from("teams")
      .select("id")
      .eq("name", name)
      .eq("is_active", true)
      .single();

    if (existingTeam) {
      return NextResponse.json(
        { error: "이미 존재하는 팀 이름입니다" },
        { status: 400 }
      );
    }

    // 팀 생성
    const { data: team, error } = await supabase
      .from("teams")
      .insert({ name, description })
      .select()
      .single();

    if (error) {
      console.error("Team create error:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ data: team }, { status: 201 });
  } catch (error) {
    console.error("Teams API error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
