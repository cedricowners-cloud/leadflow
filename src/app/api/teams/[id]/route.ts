import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { z } from "zod";

// 팀 수정 스키마
const updateTeamSchema = z.object({
  name: z.string().min(1, "팀 이름을 입력해주세요").max(100).optional(),
  description: z.string().max(500).optional(),
  is_active: z.boolean().optional(),
});

interface RouteParams {
  params: Promise<{ id: string }>;
}

// GET /api/teams/[id] - 팀 상세 조회
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

    // 팀 조회 (멤버 목록 포함)
    const { data: team, error } = await supabase
      .from("teams")
      .select(
        `
        *,
        members:members(
          id,
          name,
          email,
          role,
          is_active
        )
      `
      )
      .eq("id", id)
      .single();

    if (error) {
      if (error.code === "PGRST116") {
        return NextResponse.json(
          { error: "팀을 찾을 수 없습니다" },
          { status: 404 }
        );
      }
      console.error("Team fetch error:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ data: team });
  } catch (error) {
    console.error("Team API error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// PATCH /api/teams/[id] - 팀 수정
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
    const result = updateTeamSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json(
        { error: result.error.issues[0].message },
        { status: 400 }
      );
    }

    const updateData = result.data;

    // 팀명 변경 시 중복 체크
    if (updateData.name) {
      const { data: existingTeam } = await supabase
        .from("teams")
        .select("id")
        .eq("name", updateData.name)
        .eq("is_active", true)
        .neq("id", id)
        .single();

      if (existingTeam) {
        return NextResponse.json(
          { error: "이미 존재하는 팀 이름입니다" },
          { status: 400 }
        );
      }
    }

    // 팀 수정
    const { data: team, error } = await supabase
      .from("teams")
      .update(updateData)
      .eq("id", id)
      .select()
      .single();

    if (error) {
      if (error.code === "PGRST116") {
        return NextResponse.json(
          { error: "팀을 찾을 수 없습니다" },
          { status: 404 }
        );
      }
      console.error("Team update error:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ data: team });
  } catch (error) {
    console.error("Team API error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// DELETE /api/teams/[id] - 팀 삭제 (비활성화)
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

    // 팀에 속한 활성 멤버가 있는지 확인
    const { data: activeMembers, error: memberCheckError } = await supabase
      .from("members")
      .select("id")
      .eq("team_id", id)
      .eq("is_active", true);

    if (memberCheckError) {
      console.error("Member check error:", memberCheckError);
      return NextResponse.json(
        { error: memberCheckError.message },
        { status: 500 }
      );
    }

    if (activeMembers && activeMembers.length > 0) {
      return NextResponse.json(
        { error: "팀에 소속된 멤버가 있어 삭제할 수 없습니다" },
        { status: 400 }
      );
    }

    // 팀 비활성화 (soft delete)
    const { error } = await supabase
      .from("teams")
      .update({ is_active: false })
      .eq("id", id);

    if (error) {
      console.error("Team delete error:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ message: "팀이 삭제되었습니다" });
  } catch (error) {
    console.error("Team API error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
