export type MemberRole = "system_admin" | "branch_manager" | "sales_manager" | "team_leader";

export const roleLabels: Record<MemberRole, string> = {
  system_admin: "시스템 관리자",
  branch_manager: "지점장",
  sales_manager: "부지점장",
  team_leader: "팀장",
};

export const roleColors: Record<MemberRole, string> = {
  system_admin: "bg-destructive text-destructive-foreground",
  branch_manager: "bg-purple-600 text-white",
  sales_manager: "bg-primary text-primary-foreground",
  team_leader: "bg-secondary text-secondary-foreground",
};

// 관리자 권한을 가진 역할들 (system_admin과 branch_manager는 동등한 권한)
export const adminRoles: MemberRole[] = ["system_admin", "branch_manager"];

// 역할이 관리자 권한인지 확인
export function isAdminRole(role: MemberRole): boolean {
  return adminRoles.includes(role);
}
