export type MemberRole = "system_admin" | "sales_manager" | "team_leader";

export const roleLabels: Record<MemberRole, string> = {
  system_admin: "시스템 관리자",
  sales_manager: "영업 관리자",
  team_leader: "팀장",
};

export const roleColors: Record<MemberRole, string> = {
  system_admin: "bg-destructive text-destructive-foreground",
  sales_manager: "bg-primary text-primary-foreground",
  team_leader: "bg-secondary text-secondary-foreground",
};
