import {
  LayoutDashboard,
  Users,
  Upload,
  Building,
  UserCog,
  Settings,
  UserPlus,
  BarChart,
  Star,
  FileSpreadsheet,
  Shield,
  TrendingUp,
  Award,
  GitBranch,
  type LucideIcon,
} from "lucide-react";

export type NavItem = {
  label: string;
  href: string;
  icon: LucideIcon;
  badge?: string;
};

export type NavGroup = {
  label: string;
  items: NavItem[];
};

// 시스템 관리자와 지점장이 공유하는 관리자 메뉴
const adminMenu: NavGroup[] = [
  {
    label: "메인",
    items: [
      { label: "대시보드", href: "/dashboard", icon: LayoutDashboard },
    ],
  },
  {
    label: "리드 관리",
    items: [
      { label: "리드 목록", href: "/leads", icon: Users },
      { label: "CSV 업로드", href: "/leads/upload", icon: Upload },
    ],
  },
  {
    label: "조직 관리",
    items: [
      { label: "팀 관리", href: "/teams", icon: Building },
      { label: "멤버 관리", href: "/members", icon: UserCog },
    ],
  },
  {
    label: "설정",
    items: [
      { label: "등급 설정", href: "/settings/grades", icon: Star },
      { label: "배분 규칙", href: "/settings/distribution-rules", icon: GitBranch },
      { label: "CSV 매핑", href: "/settings/csv-mapping", icon: FileSpreadsheet },
      { label: "시스템 설정", href: "/settings", icon: Settings },
    ],
  },
  {
    label: "실적 관리",
    items: [
      { label: "보험 상품", href: "/settings/insurance-products", icon: Shield },
      { label: "멤버 실적", href: "/settings/member-performance", icon: TrendingUp },
      { label: "멤버 자격", href: "/settings/member-qualifications", icon: Award },
    ],
  },
];

export const menuByRole: Record<string, NavGroup[]> = {
  // 시스템 관리자와 지점장은 동일한 관리자 권한
  system_admin: adminMenu,
  branch_manager: adminMenu,

  sales_manager: [
    {
      label: "메인",
      items: [
        { label: "팀 대시보드", href: "/team-dashboard", icon: LayoutDashboard },
      ],
    },
    {
      label: "관리",
      items: [
        { label: "팀 리드 현황", href: "/leads", icon: Users },
        { label: "팀 실적 현황", href: "/settings/member-performance", icon: TrendingUp },
        { label: "동행 현황", href: "/accompany", icon: UserPlus },
      ],
    },
  ],

  team_leader: [
    {
      label: "메인",
      items: [
        { label: "내 리드", href: "/my-leads", icon: Users },
      ],
    },
    {
      label: "활동",
      items: [
        { label: "동행 요청", href: "/accompany", icon: UserPlus },
        { label: "내 실적", href: "/my-stats", icon: BarChart },
      ],
    },
  ],
};
