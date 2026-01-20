import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";
import { ClientSidebarWrapper } from "@/components/layout/client-sidebar-wrapper";
import type { MemberRole } from "@/lib/constants/roles";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  // 멤버 정보 조회
  const { data: member } = await supabase
    .from("members")
    .select("name, email, role")
    .eq("user_id", user.id)
    .single();

  const userData = member
    ? {
        name: member.name,
        email: member.email,
        role: member.role as MemberRole,
      }
    : null;

  return (
    <SidebarProvider>
      <ClientSidebarWrapper user={userData} />
      <SidebarInset>{children}</SidebarInset>
    </SidebarProvider>
  );
}
