import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

// Admin client for seeding
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  }
);

export async function POST() {
  try {
    // 1. 테스트 팀 생성
    const { data: team1, error: teamError1 } = await supabaseAdmin
      .from("teams")
      .insert({ name: "영업 1팀", description: "서울 지역 담당" })
      .select()
      .single();

    if (teamError1 && !teamError1.message.includes("duplicate")) {
      console.error("Team 1 creation error:", teamError1);
    }

    const { data: team2, error: teamError2 } = await supabaseAdmin
      .from("teams")
      .insert({ name: "영업 2팀", description: "경기 지역 담당" })
      .select()
      .single();

    if (teamError2 && !teamError2.message.includes("duplicate")) {
      console.error("Team 2 creation error:", teamError2);
    }

    // 팀 ID 조회
    const { data: teams } = await supabaseAdmin
      .from("teams")
      .select("id, name")
      .eq("is_active", true);

    const team1Id = teams?.find((t) => t.name === "영업 1팀")?.id;
    const team2Id = teams?.find((t) => t.name === "영업 2팀")?.id;

    // 2. 시스템 관리자 생성
    const adminEmail = "admin@leadflow.com";
    const adminPassword = "admin1234!";

    // 기존 사용자 확인
    const { data: existingUsers } = await supabaseAdmin.auth.admin.listUsers();
    const existingAdmin = existingUsers?.users?.find(
      (u) => u.email === adminEmail
    );

    let adminUserId: string;

    if (existingAdmin) {
      adminUserId = existingAdmin.id;
    } else {
      const { data: adminAuth, error: adminAuthError } =
        await supabaseAdmin.auth.admin.createUser({
          email: adminEmail,
          password: adminPassword,
          email_confirm: true,
        });

      if (adminAuthError) {
        console.error("Admin auth creation error:", adminAuthError);
        return NextResponse.json(
          { error: adminAuthError.message },
          { status: 500 }
        );
      }

      adminUserId = adminAuth.user.id;
    }

    // members 테이블에 관리자 추가
    const { error: adminMemberError } = await supabaseAdmin
      .from("members")
      .upsert(
        {
          user_id: adminUserId,
          role: "system_admin",
          name: "시스템 관리자",
          email: adminEmail,
          phone: "010-1234-5678",
          is_active: true,
        },
        { onConflict: "email" }
      );

    if (adminMemberError) {
      console.error("Admin member creation error:", adminMemberError);
    }

    // 3. 영업 관리자 생성
    const managerEmail = "manager@leadflow.com";
    const managerPassword = "manager1234!";

    const existingManager = existingUsers?.users?.find(
      (u) => u.email === managerEmail
    );

    let managerUserId: string;

    if (existingManager) {
      managerUserId = existingManager.id;
    } else {
      const { data: managerAuth, error: managerAuthError } =
        await supabaseAdmin.auth.admin.createUser({
          email: managerEmail,
          password: managerPassword,
          email_confirm: true,
        });

      if (managerAuthError) {
        console.error("Manager auth creation error:", managerAuthError);
      } else {
        managerUserId = managerAuth.user.id;
      }
    }

    if (managerUserId!) {
      const { data: managerMember, error: managerMemberError } = await supabaseAdmin
        .from("members")
        .upsert(
          {
            user_id: managerUserId,
            role: "sales_manager",
            name: "김영업",
            email: managerEmail,
            phone: "010-2345-6789",
            is_active: true,
          },
          { onConflict: "email" }
        )
        .select()
        .single();

      if (managerMemberError) {
        console.error("Manager member creation error:", managerMemberError);
      }

      // manager_teams 연결
      if (managerMember && team1Id) {
        await supabaseAdmin.from("manager_teams").upsert(
          {
            member_id: managerMember.id,
            team_id: team1Id,
          },
          { onConflict: "member_id,team_id" }
        );
      }
    }

    // 4. 팀장 생성
    const leaderEmail = "leader@leadflow.com";
    const leaderPassword = "leader1234!";

    const existingLeader = existingUsers?.users?.find(
      (u) => u.email === leaderEmail
    );

    let leaderUserId: string;

    if (existingLeader) {
      leaderUserId = existingLeader.id;
    } else {
      const { data: leaderAuth, error: leaderAuthError } =
        await supabaseAdmin.auth.admin.createUser({
          email: leaderEmail,
          password: leaderPassword,
          email_confirm: true,
        });

      if (leaderAuthError) {
        console.error("Leader auth creation error:", leaderAuthError);
      } else {
        leaderUserId = leaderAuth.user.id;
      }
    }

    if (leaderUserId!) {
      await supabaseAdmin.from("members").upsert(
        {
          user_id: leaderUserId,
          team_id: team1Id,
          role: "team_leader",
          name: "박팀장",
          email: leaderEmail,
          phone: "010-3456-7890",
          is_active: true,
        },
        { onConflict: "email" }
      );
    }

    return NextResponse.json({
      success: true,
      message: "시드 데이터 생성 완료",
      accounts: [
        {
          role: "시스템 관리자",
          email: adminEmail,
          password: adminPassword,
        },
        {
          role: "영업 관리자",
          email: managerEmail,
          password: managerPassword,
        },
        {
          role: "팀장",
          email: leaderEmail,
          password: leaderPassword,
        },
      ],
    });
  } catch (error) {
    console.error("Seed error:", error);
    return NextResponse.json(
      { error: "시드 데이터 생성 실패" },
      { status: 500 }
    );
  }
}
