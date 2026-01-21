import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { z } from "zod";
import { isAdminRole, MemberRole } from "@/lib/constants/roles";

interface RouteParams {
  params: Promise<{ id: string }>;
}

// 리드 수정 스키마
const updateLeadSchema = z.object({
  company_name: z.string().optional(),
  representative_name: z.string().optional(),
  phone: z.string().optional(),
  industry: z.string().optional(),
  annual_revenue: z.number().nullable().optional(),
  employee_count: z.number().int().nullable().optional(),
  region: z.string().nullable().optional(),
  grade_id: z.string().uuid().optional(),
  contact_status_id: z.string().uuid().nullable().optional(),
  meeting_status_id: z.string().uuid().nullable().optional(),
  contract_status_id: z.string().uuid().nullable().optional(),
  meeting_date: z.string().nullable().optional(),
  meeting_location: z.string().nullable().optional(),
  contract_amount: z.number().nullable().optional(),
  memo: z.string().nullable().optional(),
  next_contact_date: z.string().nullable().optional(),
});

// GET /api/leads/[id] - 리드 상세 조회
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

    // 현재 멤버 정보 조회
    const { data: member } = await supabase
      .from("members")
      .select("id, role, team_id")
      .eq("user_id", user.id)
      .single();

    if (!member) {
      return NextResponse.json(
        { error: "멤버 정보를 찾을 수 없습니다" },
        { status: 403 }
      );
    }

    // 리드 조회
    const { data: lead, error } = await supabase
      .from("leads")
      .select(
        `
        *,
        grade:lead_grades(id, name, color, description),
        assigned_member:members!leads_assigned_member_id_fkey(
          id, name, email, phone,
          team:teams(id, name)
        ),
        assigned_by_member:members!leads_assigned_by_fkey(id, name),
        contact_status:lead_statuses!leads_contact_status_id_fkey(id, name, category),
        meeting_status:lead_statuses!leads_meeting_status_id_fkey(id, name, category),
        contract_status:lead_statuses!leads_contract_status_id_fkey(id, name, category),
        upload_batch:upload_batches(id, file_name, created_at)
      `
      )
      .eq("id", id)
      .single();

    if (error) {
      if (error.code === "PGRST116") {
        return NextResponse.json(
          { error: "리드를 찾을 수 없습니다" },
          { status: 404 }
        );
      }
      console.error("Lead fetch error:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // 권한 체크
    if (member.role === "team_leader") {
      // 팀장은 본인에게 배분된 리드만 조회 가능
      if (lead.assigned_member_id !== member.id) {
        return NextResponse.json(
          { error: "접근 권한이 없습니다" },
          { status: 403 }
        );
      }
    } else if (member.role === "sales_manager") {
      // 영업 관리자는 담당 팀의 리드만 조회 가능
      if (lead.assigned_member_id) {
        const { data: managerTeams } = await supabase
          .from("manager_teams")
          .select("team_id")
          .eq("member_id", member.id);

        const teamIds = (managerTeams || []).map((mt) => mt.team_id);

        const { data: assignedMember } = await supabase
          .from("members")
          .select("team_id")
          .eq("id", lead.assigned_member_id)
          .single();

        if (!assignedMember || !teamIds.includes(assignedMember.team_id)) {
          return NextResponse.json(
            { error: "접근 권한이 없습니다" },
            { status: 403 }
          );
        }
      }
    }
    // system_admin은 모든 리드 조회 가능

    // 리드 이력 조회
    const { data: histories } = await supabase
      .from("lead_histories")
      .select(
        `
        id,
        change_type,
        old_value,
        new_value,
        created_at,
        changed_by_member:members!lead_histories_changed_by_fkey(id, name)
      `
      )
      .eq("lead_id", id)
      .order("created_at", { ascending: false })
      .limit(20);

    return NextResponse.json({
      data: {
        ...lead,
        histories: histories || [],
      },
    });
  } catch (error) {
    console.error("Lead API error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// PATCH /api/leads/[id] - 리드 수정
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

    // 현재 멤버 정보 조회
    const { data: member } = await supabase
      .from("members")
      .select("id, role, team_id")
      .eq("user_id", user.id)
      .single();

    if (!member) {
      return NextResponse.json(
        { error: "멤버 정보를 찾을 수 없습니다" },
        { status: 403 }
      );
    }

    // 기존 리드 조회
    const { data: existingLead, error: fetchError } = await supabase
      .from("leads")
      .select("*")
      .eq("id", id)
      .single();

    if (fetchError) {
      if (fetchError.code === "PGRST116") {
        return NextResponse.json(
          { error: "리드를 찾을 수 없습니다" },
          { status: 404 }
        );
      }
      return NextResponse.json({ error: fetchError.message }, { status: 500 });
    }

    // 권한 체크
    if (member.role === "team_leader") {
      // 팀장은 본인에게 배분된 리드만 수정 가능
      if (existingLead.assigned_member_id !== member.id) {
        return NextResponse.json(
          { error: "수정 권한이 없습니다" },
          { status: 403 }
        );
      }
    } else if (member.role === "sales_manager") {
      // 영업 관리자는 담당 팀의 리드만 조회 가능 (수정 불가)
      return NextResponse.json(
        { error: "수정 권한이 없습니다" },
        { status: 403 }
      );
    }
    // system_admin은 모든 리드 수정 가능

    // 요청 데이터 파싱 및 검증
    const body = await request.json();
    const result = updateLeadSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json(
        { error: result.error.issues[0].message },
        { status: 400 }
      );
    }

    const updateData = result.data;

    // 팀장은 특정 필드만 수정 가능
    if (member.role === "team_leader") {
      const allowedFields = [
        "contact_status_id",
        "meeting_status_id",
        "contract_status_id",
        "meeting_date",
        "meeting_location",
        "contract_amount",
        "memo",
        "next_contact_date",
      ];

      const filteredData: Record<string, unknown> = {};
      for (const key of allowedFields) {
        if (key in updateData) {
          filteredData[key] = updateData[key as keyof typeof updateData];
        }
      }

      if (Object.keys(filteredData).length === 0) {
        return NextResponse.json(
          { error: "수정 가능한 필드가 없습니다" },
          { status: 400 }
        );
      }

      Object.assign(updateData, filteredData);
    }

    // 등급 변경 시 grade_source를 manual로 변경
    if (updateData.grade_id && updateData.grade_id !== existingLead.grade_id) {
      (updateData as Record<string, unknown>).grade_source = "manual";
    }

    // 리드 업데이트
    const { data: updatedLead, error: updateError } = await supabase
      .from("leads")
      .update(updateData)
      .eq("id", id)
      .select(
        `
        *,
        grade:lead_grades(id, name, color),
        assigned_member:members!leads_assigned_member_id_fkey(id, name, email),
        contact_status:lead_statuses!leads_contact_status_id_fkey(id, name),
        meeting_status:lead_statuses!leads_meeting_status_id_fkey(id, name),
        contract_status:lead_statuses!leads_contract_status_id_fkey(id, name)
      `
      )
      .single();

    if (updateError) {
      console.error("Lead update error:", updateError);
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }

    // 변경 이력 저장
    const changedFields: string[] = [];
    const oldValues: Record<string, unknown> = {};
    const newValues: Record<string, unknown> = {};

    for (const [key, value] of Object.entries(updateData)) {
      if (existingLead[key as keyof typeof existingLead] !== value) {
        changedFields.push(key);
        oldValues[key] = existingLead[key as keyof typeof existingLead];
        newValues[key] = value;
      }
    }

    if (changedFields.length > 0) {
      let changeType = "update";
      if (changedFields.includes("grade_id")) {
        changeType = "grade_change";
      } else if (
        changedFields.some((f) =>
          ["contact_status_id", "meeting_status_id", "contract_status_id"].includes(f)
        )
      ) {
        changeType = "status_change";
      }

      await supabase.from("lead_histories").insert({
        lead_id: id,
        changed_by: member.id,
        change_type: changeType,
        old_value: oldValues,
        new_value: newValues,
      });
    }

    return NextResponse.json({ data: updatedLead });
  } catch (error) {
    console.error("Lead API error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// DELETE /api/leads/[id] - 리드 삭제 (시스템 관리자만)
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

    if (!member || !isAdminRole(member.role as MemberRole)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // 리드 삭제
    const { error } = await supabase.from("leads").delete().eq("id", id);

    if (error) {
      console.error("Lead delete error:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ message: "리드가 삭제되었습니다" });
  } catch (error) {
    console.error("Lead API error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
