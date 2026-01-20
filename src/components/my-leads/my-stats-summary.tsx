"use client";

import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Users, Phone, Calendar, FileCheck, TrendingUp } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

interface Stats {
  totalLeads: number;
  contactedLeads: number;
  meetingScheduled: number;
  contractSuccess: number;
  thisMonthLeads: number;
}

export function MyStatsSummary() {
  const [stats, setStats] = useState<Stats>({
    totalLeads: 0,
    contactedLeads: 0,
    meetingScheduled: 0,
    contractSuccess: 0,
    thisMonthLeads: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      const supabase = createClient();

      // 현재 사용자의 멤버 ID 가져오기
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) return;

      const { data: member } = await supabase
        .from("members")
        .select("id")
        .eq("user_id", user.id)
        .single();

      if (!member) return;

      // 상태값 ID 조회
      const { data: statuses } = await supabase
        .from("lead_statuses")
        .select("id, name, category");

      const contactSuccessId = statuses?.find(
        (s) => s.category === "contact" && s.name === "통화 성공"
      )?.id;
      const meetingScheduledId = statuses?.find(
        (s) => s.category === "meeting" && s.name === "미팅 예정"
      )?.id;
      const contractSuccessId = statuses?.find(
        (s) => s.category === "contract" && s.name === "계약 성사"
      )?.id;

      // 이번 달 시작일
      const now = new Date();
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

      // 통계 조회
      const [
        { count: totalLeads },
        { count: contactedLeads },
        { count: meetingScheduled },
        { count: contractSuccess },
        { count: thisMonthLeads },
      ] = await Promise.all([
        // 전체 리드
        supabase
          .from("leads")
          .select("*", { count: "exact", head: true })
          .eq("assigned_member_id", member.id),
        // 통화 성공
        contactSuccessId
          ? supabase
              .from("leads")
              .select("*", { count: "exact", head: true })
              .eq("assigned_member_id", member.id)
              .eq("contact_status_id", contactSuccessId)
          : Promise.resolve({ count: 0 }),
        // 미팅 예정
        meetingScheduledId
          ? supabase
              .from("leads")
              .select("*", { count: "exact", head: true })
              .eq("assigned_member_id", member.id)
              .eq("meeting_status_id", meetingScheduledId)
          : Promise.resolve({ count: 0 }),
        // 계약 성사
        contractSuccessId
          ? supabase
              .from("leads")
              .select("*", { count: "exact", head: true })
              .eq("assigned_member_id", member.id)
              .eq("contract_status_id", contractSuccessId)
          : Promise.resolve({ count: 0 }),
        // 이번 달 배분
        supabase
          .from("leads")
          .select("*", { count: "exact", head: true })
          .eq("assigned_member_id", member.id)
          .gte("assigned_at", startOfMonth.toISOString()),
      ]);

      setStats({
        totalLeads: totalLeads || 0,
        contactedLeads: contactedLeads || 0,
        meetingScheduled: meetingScheduled || 0,
        contractSuccess: contractSuccess || 0,
        thisMonthLeads: thisMonthLeads || 0,
      });
      setLoading(false);
    };

    fetchStats();
  }, []);

  const statItems = [
    {
      label: "전체 리드",
      value: stats.totalLeads,
      icon: Users,
      color: "text-blue-600",
      bgColor: "bg-blue-100",
    },
    {
      label: "이번 달 배분",
      value: stats.thisMonthLeads,
      icon: TrendingUp,
      color: "text-purple-600",
      bgColor: "bg-purple-100",
    },
    {
      label: "통화 성공",
      value: stats.contactedLeads,
      icon: Phone,
      color: "text-green-600",
      bgColor: "bg-green-100",
    },
    {
      label: "미팅 예정",
      value: stats.meetingScheduled,
      icon: Calendar,
      color: "text-orange-600",
      bgColor: "bg-orange-100",
    },
    {
      label: "계약 성사",
      value: stats.contractSuccess,
      icon: FileCheck,
      color: "text-emerald-600",
      bgColor: "bg-emerald-100",
    },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
      {statItems.map((item) => (
        <Card key={item.label}>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-lg ${item.bgColor}`}>
                <item.icon className={`h-5 w-5 ${item.color}`} />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">{item.label}</p>
                <p className="text-2xl font-bold">
                  {loading ? "-" : item.value}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
