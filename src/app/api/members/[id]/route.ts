import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { z } from "zod";

// 멤버 수정 스키마
const updateMemberSchema = z.object({
  name: z.string().min(1, "이름을 입력해주세요").max(100).optional(),
  email: z.string().email("올바른 이메일을 입력해주세요").optional(),
  phone: z.string().max(20).optional(),
  role: z
    .enum(["system_admin", "sales_manager", "team_leader"], {
      message: "올바른 역할을 선택해주세요",
    })
    .optional(),
  team_id: z.string().uuid().optional().nullable(),
  is_active: z.boolean().optional(),
});

interface RouteParams {
  params: Promise<{ id: string }>;
}

// GET /api/members/[id] - 멤버 상세 조회
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

    // 멤버 조회 (팀 정보 포함)
    const { data: member, error } = await supabase
      .from("members")
      .select(
        `
        *,
        team:teams(id, name)
      `
      )
      .eq("id", id)
      .single();

    if (error) {
      if (error.code === "PGRST116") {
        return NextResponse.json(
          { error: "멤버를 찾을 수 없습니다" },
          { status: 404 }
        );
      }
      console.error("Member fetch error:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ data: member });
  } catch (error) {
    console.error("Member API error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// PATCH /api/members/[id] - 멤버 수정
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
    const { data: currentMember } = await supabase
      .from("members")
      .select("role")
      .eq("user_id", user.id)
      .single();

    if (!currentMember || currentMember.role !== "system_admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // 요청 데이터 파싱 및 검증
    const body = await request.json();
    const result = updateMemberSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json(
        { error: result.error.issues[0].message },
        { status: 400 }
      );
    }

    const updateData = result.data;

    // 수정할 멤버 조회
    const { data: targetMember } = await supabase
      .from("members")
      .select("role, team_id, user_id, email")
      .eq("id", id)
      .single();

    if (!targetMember) {
      return NextResponse.json(
        { error: "멤버를 찾을 수 없습니다" },
        { status: 404 }
      );
    }

    // team_leader는 반드시 팀에 소속되어야 함
    const newRole = updateData.role ?? targetMember.role;
    const newTeamId =
      updateData.team_id !== undefined
        ? updateData.team_id
        : targetMember.team_id;

    if (newRole === "team_leader" && !newTeamId) {
      return NextResponse.json(
        { error: "팀장은 소속 팀을 지정해야 합니다" },
        { status: 400 }
      );
    }

    // 이메일 변경 시 auth.users 테이블도 업데이트
    if (updateData.email && updateData.email !== targetMember.email) {
      const adminClient = createAdminClient();

      // 이메일 중복 확인
      const { data: existingMember } = await supabase
        .from("members")
        .select("id")
        .eq("email", updateData.email)
        .neq("id", id)
        .single();

      if (existingMember) {
        return NextResponse.json(
          { error: "이미 사용 중인 이메일입니다" },
          { status: 400 }
        );
      }

      // auth.users 이메일 업데이트
      const { error: authError } = await adminClient.auth.admin.updateUserById(
        targetMember.user_id,
        { email: updateData.email }
      );

      if (authError) {
        console.error("Auth user update error:", authError);
        return NextResponse.json(
          { error: "이메일 변경에 실패했습니다: " + authError.message },
          { status: 500 }
        );
      }
    }

    // 멤버 수정
    const { data: member, error } = await supabase
      .from("members")
      .update(updateData)
      .eq("id", id)
      .select(
        `
        *,
        team:teams(id, name)
      `
      )
      .single();

    if (error) {
      if (error.code === "PGRST116") {
        return NextResponse.json(
          { error: "멤버를 찾을 수 없습니다" },
          { status: 404 }
        );
      }
      console.error("Member update error:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ data: member });
  } catch (error) {
    console.error("Member API error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// DELETE /api/members/[id] - 멤버 비활성화 (soft delete)
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
    const { data: currentMember } = await supabase
      .from("members")
      .select("id, role")
      .eq("user_id", user.id)
      .single();

    if (!currentMember || currentMember.role !== "system_admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // 자기 자신은 삭제 불가
    if (currentMember.id === id) {
      return NextResponse.json(
        { error: "자기 자신은 비활성화할 수 없습니다" },
        { status: 400 }
      );
    }

    // 멤버에게 배분된 리드가 있는지 확인
    const { data: assignedLeads, error: leadsError } = await supabase
      .from("leads")
      .select("id")
      .eq("assigned_member_id", id)
      .limit(1);

    if (leadsError) {
      console.error("Leads check error:", leadsError);
      return NextResponse.json({ error: leadsError.message }, { status: 500 });
    }

    if (assignedLeads && assignedLeads.length > 0) {
      return NextResponse.json(
        {
          error:
            "배분된 리드가 있는 멤버는 비활성화할 수 없습니다. 먼저 리드를 재배분해주세요.",
        },
        { status: 400 }
      );
    }

    // 멤버 비활성화 (soft delete)
    const { error } = await supabase
      .from("members")
      .update({ is_active: false })
      .eq("id", id);

    if (error) {
      console.error("Member delete error:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ message: "멤버가 비활성화되었습니다" });
  } catch (error) {
    console.error("Member API error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
