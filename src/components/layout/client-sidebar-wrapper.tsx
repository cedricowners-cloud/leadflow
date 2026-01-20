"use client";

import { useState, useEffect } from "react";
import { AppSidebar } from "@/components/layout/app-sidebar";
import type { MemberRole } from "@/lib/constants/roles";

interface ClientSidebarWrapperProps {
  user: {
    name: string;
    email: string;
    role: MemberRole;
  } | null;
}

export function ClientSidebarWrapper({ user }: ClientSidebarWrapperProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    // 서버 렌더링 시 빈 사이드바 플레이스홀더 반환
    return (
      <div
        className="bg-sidebar text-sidebar-foreground flex h-full w-[--sidebar-width] flex-col"
        style={{ "--sidebar-width": "16rem" } as React.CSSProperties}
      />
    );
  }

  return <AppSidebar user={user} />;
}
