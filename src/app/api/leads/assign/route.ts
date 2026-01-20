import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { z } from "zod";

// 단일 배분 스키마
const assignSchema = z.object({
  leadId: z.string().uuid(),
  memberId: z.string().uuid().nullable(),
});

// 일괄 배분 스키마
const bulkAssignSchema = z.object({
  leadIds: z.array(z.string().uuid()).min(1),
  memberId: z.string().uuid().nullable(),
});

// 일괄 등급 변경 스키마
const bulkGradeChangeSchema = z.object({
  leadIds: z.array(z.string().uuid()).min(1),
  gradeId: z.string().uuid(),
});

// POST /api/leads/assign - 리드 배분 (단일/일괄)
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
      .select("id, role")
      .eq("user_id", user.id)
      .single();

    if (!member || member.role !== "system_admin") {
      return NextResponse.json(
        { error: "배분 권한이 없습니다" },
        { status: 403 }
      );
    }

    const body = await request.json();
    const action = body.action || "assign";

    // 일괄 등급 변경
    if (action === "bulk_grade_change") {
      const result = bulkGradeChangeSchema.safeParse(body);

      if (!result.success) {
        return NextResponse.json(
          { error: result.error.issues[0].message },
          { status: 400 }
        );
      }

      const { leadIds, gradeId } = result.data;

      // 등급 존재 확인
      const { data: grade, error: gradeError } = await supabase
        .from("lead_grades")
        .select("id, name")
        .eq("id", gradeId)
        .eq("is_active", true)
        .single();

      if (gradeError || !grade) {
        return NextResponse.json(
          { error: "유효하지 않은 등급입니다" },
          { status: 400 }
        );
      }

      // 기존 리드 정보 조회
      const { data: existingLeads } = await supabase
        .from("leads")
        .select("id, grade_id")
        .in("id", leadIds);

      // 일괄 등급 변경
      const { error: updateError } = await supabase
        .from("leads")
        .update({
          grade_id: gradeId,
          grade_source: "manual",
        })
        .in("id", leadIds);

      if (updateError) {
        console.error("Bulk grade change error:", updateError);
        return NextResponse.json(
          { error: updateError.message },
          { status: 500 }
        );
      }

      // 변경 이력 저장
      const histories = (existingLeads || [])
        .filter((lead) => lead.grade_id !== gradeId)
        .map((lead) => ({
          lead_id: lead.id,
          changed_by: member.id,
          change_type: "grade_change",
          old_value: { grade_id: lead.grade_id },
          new_value: { grade_id: gradeId },
        }));

      if (histories.length > 0) {
        await supabase.from("lead_histories").insert(histories);
      }

      return NextResponse.json({
        data: {
          success: true,
          updatedCount: leadIds.length,
          message: `${leadIds.length}건의 리드 등급이 ${grade.name}등급으로 변경되었습니다`,
        },
      });
    }

    // 일괄 배분
    if (body.leadIds) {
      const result = bulkAssignSchema.safeParse(body);

      if (!result.success) {
        return NextResponse.json(
          { error: result.error.issues[0].message },
          { status: 400 }
        );
      }

      const { leadIds, memberId } = result.data;

      // 배분 대상 멤버 확인 (memberId가 있는 경우)
      if (memberId) {
        const { data: targetMember, error: memberError } = await supabase
          .from("members")
          .select("id, name, role, is_active")
          .eq("id", memberId)
          .single();

        if (memberError || !targetMember) {
          return NextResponse.json(
            { error: "유효하지 않은 멤버입니다" },
            { status: 400 }
          );
        }

        if (!targetMember.is_active) {
          return NextResponse.json(
            { error: "비활성화된 멤버에게 배분할 수 없습니다" },
            { status: 400 }
          );
        }

        if (targetMember.role !== "team_leader") {
          return NextResponse.json(
            { error: "팀장에게만 배분할 수 있습니다" },
            { status: 400 }
          );
        }
      }

      // 기존 리드 정보 조회
      const { data: existingLeads } = await supabase
        .from("leads")
        .select("id, assigned_member_id")
        .in("id", leadIds);

      // 일괄 배분 업데이트
      const updateData = memberId
        ? {
            assigned_member_id: memberId,
            assigned_at: new Date().toISOString(),
            assigned_by: member.id,
          }
        : {
            assigned_member_id: null,
            assigned_at: null,
            assigned_by: null,
          };

      const { error: updateError } = await supabase
        .from("leads")
        .update(updateData)
        .in("id", leadIds);

      if (updateError) {
        console.error("Bulk assign error:", updateError);
        return NextResponse.json({ error: updateError.message }, { status: 500 });
      }

      // 변경 이력 저장
      const histories = (existingLeads || [])
        .filter((lead) => lead.assigned_member_id !== memberId)
        .map((lead) => ({
          lead_id: lead.id,
          changed_by: member.id,
          change_type: "assignment",
          old_value: { assigned_member_id: lead.assigned_member_id },
          new_value: { assigned_member_id: memberId },
        }));

      if (histories.length > 0) {
        await supabase.from("lead_histories").insert(histories);
      }

      const message = memberId
        ? `${leadIds.length}건의 리드가 배분되었습니다`
        : `${leadIds.length}건의 리드 배분이 해제되었습니다`;

      return NextResponse.json({
        data: {
          success: true,
          updatedCount: leadIds.length,
          message,
        },
      });
    }

    // 단일 배분
    const result = assignSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json(
        { error: result.error.issues[0].message },
        { status: 400 }
      );
    }

    const { leadId, memberId } = result.data;

    // 리드 존재 확인
    const { data: lead, error: leadError } = await supabase
      .from("leads")
      .select("id, assigned_member_id")
      .eq("id", leadId)
      .single();

    if (leadError || !lead) {
      return NextResponse.json(
        { error: "리드를 찾을 수 없습니다" },
        { status: 404 }
      );
    }

    // 배분 대상 멤버 확인 (memberId가 있는 경우)
    if (memberId) {
      const { data: targetMember, error: memberError } = await supabase
        .from("members")
        .select("id, name, role, is_active")
        .eq("id", memberId)
        .single();

      if (memberError || !targetMember) {
        return NextResponse.json(
          { error: "유효하지 않은 멤버입니다" },
          { status: 400 }
        );
      }

      if (!targetMember.is_active) {
        return NextResponse.json(
          { error: "비활성화된 멤버에게 배분할 수 없습니다" },
          { status: 400 }
        );
      }

      if (targetMember.role !== "team_leader") {
        return NextResponse.json(
          { error: "팀장에게만 배분할 수 있습니다" },
          { status: 400 }
        );
      }
    }

    // 배분 업데이트
    const updateData = memberId
      ? {
          assigned_member_id: memberId,
          assigned_at: new Date().toISOString(),
          assigned_by: member.id,
        }
      : {
          assigned_member_id: null,
          assigned_at: null,
          assigned_by: null,
        };

    const { data: updatedLead, error: updateError } = await supabase
      .from("leads")
      .update(updateData)
      .eq("id", leadId)
      .select(
        `
        *,
        grade:lead_grades(id, name, color),
        assigned_member:members!leads_assigned_member_id_fkey(
          id, name, email,
          team:teams(id, name)
        )
      `
      )
      .single();

    if (updateError) {
      console.error("Assign error:", updateError);
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }

    // 변경 이력 저장
    if (lead.assigned_member_id !== memberId) {
      await supabase.from("lead_histories").insert({
        lead_id: leadId,
        changed_by: member.id,
        change_type: "assignment",
        old_value: { assigned_member_id: lead.assigned_member_id },
        new_value: { assigned_member_id: memberId },
      });
    }

    return NextResponse.json({ data: updatedLead });
  } catch (error) {
    console.error("Assign API error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
