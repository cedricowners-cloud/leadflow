"use client";

import { useEffect, useState, useMemo } from "react";
import { Plus, Pencil, Trash2, UserCog, Users, Phone, Shield, Briefcase, User, KeyRound } from "lucide-react";
import { Header } from "@/components/layout/header";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import type { Member, Team } from "@/types/database.types";
import { roleLabels, roleColors, type MemberRole } from "@/lib/constants/roles";

// 역할별 그룹 정보
const roleGroups: {
  role: MemberRole;
  label: string;
  icon: React.ElementType;
  description: string;
}[] = [
  {
    role: "system_admin",
    label: "시스템 관리자",
    icon: Shield,
    description: "시스템 전체 관리 권한을 가진 관리자입니다.",
  },
  {
    role: "sales_manager",
    label: "영업 관리자",
    icon: Briefcase,
    description: "소속 팀의 리드와 멤버를 관리하는 매니저입니다.",
  },
  {
    role: "team_leader",
    label: "팀장",
    icon: User,
    description: "배분된 리드를 담당하는 팀장입니다.",
  },
];

interface MemberWithTeam extends Member {
  team: { id: string; name: string } | null;
}

interface FormData {
  name: string;
  loginId: string;
  phone: string;
  role: MemberRole;
  team_id: string;
}

const EMAIL_DOMAIN = "@leadflow.com";

const initialFormData: FormData = {
  name: "",
  loginId: "",
  phone: "",
  role: "team_leader",
  team_id: "",
};

// 전화번호 포맷팅 함수 (숫자만 추출 후 하이픈 자동 생성)
const formatPhoneNumber = (value: string): string => {
  // 숫자만 추출
  const numbers = value.replace(/[^0-9]/g, "");

  // 최대 11자리까지만 허용
  const limited = numbers.slice(0, 11);

  // 하이픈 자동 추가
  if (limited.length <= 3) {
    return limited;
  } else if (limited.length <= 7) {
    return `${limited.slice(0, 3)}-${limited.slice(3)}`;
  } else {
    return `${limited.slice(0, 3)}-${limited.slice(3, 7)}-${limited.slice(7)}`;
  }
};

export default function MembersPage() {
  const [members, setMembers] = useState<MemberWithTeam[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [editingMember, setEditingMember] = useState<MemberWithTeam | null>(
    null
  );
  const [deletingMember, setDeletingMember] = useState<MemberWithTeam | null>(
    null
  );
  const [resetPasswordDialogOpen, setResetPasswordDialogOpen] = useState(false);
  const [resettingMember, setResettingMember] = useState<MemberWithTeam | null>(
    null
  );
  const [formData, setFormData] = useState<FormData>(initialFormData);
  const [submitting, setSubmitting] = useState(false);

  // 역할별로 멤버 그룹화 (팀명 1순위, created_at 2순위로 정렬)
  const groupedMembers = useMemo(() => {
    const groups: Record<MemberRole, MemberWithTeam[]> = {
      system_admin: [],
      sales_manager: [],
      team_leader: [],
    };

    members.forEach((member) => {
      const role = member.role as MemberRole;
      if (groups[role]) {
        groups[role].push(member);
      }
    });

    // 각 그룹 내에서 팀명 1순위, created_at 2순위로 정렬
    Object.keys(groups).forEach((role) => {
      groups[role as MemberRole].sort((a, b) => {
        // 팀명 비교 (null인 경우 맨 뒤로)
        const teamA = a.team?.name || "zzz";
        const teamB = b.team?.name || "zzz";
        if (teamA !== teamB) {
          return teamA.localeCompare(teamB, "ko");
        }
        // 팀명이 같으면 created_at으로 정렬 (오름차순)
        const dateA = a.created_at ? new Date(a.created_at).getTime() : 0;
        const dateB = b.created_at ? new Date(b.created_at).getTime() : 0;
        return dateA - dateB;
      });
    });

    return groups;
  }, [members]);

  // 멤버 목록 조회
  const fetchMembers = async () => {
    try {
      const response = await fetch("/api/members");
      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error);
      }

      setMembers(result.data);
    } catch (error) {
      toast.error("멤버 목록을 불러오는데 실패했습니다");
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  // 팀 목록 조회
  const fetchTeams = async () => {
    try {
      const response = await fetch("/api/teams");
      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error);
      }

      setTeams(result.data);
    } catch (error) {
      console.error("Failed to fetch teams:", error);
    }
  };

  useEffect(() => {
    fetchMembers();
    fetchTeams();
  }, []);

  // 다이얼로그 열기 (생성/수정)
  const openDialog = (member?: MemberWithTeam) => {
    if (member) {
      setEditingMember(member);
      // 이메일에서 아이디 부분만 추출 (@앞 부분)
      const loginId = member.email.split("@")[0] || "";
      setFormData({
        name: member.name,
        loginId,
        phone: member.phone || "",
        role: member.role as MemberRole,
        team_id: member.team_id || "",
      });
    } else {
      setEditingMember(null);
      setFormData(initialFormData);
    }
    setDialogOpen(true);
  };

  // 멤버 생성/수정
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    // 아이디 + @leadflow.com 도메인으로 이메일 생성
    const fullEmail = `${formData.loginId}${EMAIL_DOMAIN}`;

    try {
      const url = editingMember
        ? `/api/members/${editingMember.id}`
        : "/api/members";
      const method = editingMember ? "PATCH" : "POST";

      // 수정 시 비밀번호 필드 제외, 생성 시 기본 비밀번호 "1234" 사용
      const submitData = editingMember
        ? {
            name: formData.name,
            email: fullEmail,
            phone: formData.phone || null,
            role: formData.role,
            team_id: formData.team_id || null,
          }
        : {
            name: formData.name,
            email: fullEmail,
            phone: formData.phone || null,
            role: formData.role,
            team_id: formData.team_id || null,
            password: "1234",
          };

      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(submitData),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error);
      }

      toast.success(
        editingMember ? "멤버가 수정되었습니다" : "멤버가 생성되었습니다"
      );
      setDialogOpen(false);
      fetchMembers();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "요청에 실패했습니다"
      );
    } finally {
      setSubmitting(false);
    }
  };

  // 멤버 삭제
  const handleDelete = async () => {
    if (!deletingMember) return;
    setSubmitting(true);

    try {
      const response = await fetch(`/api/members/${deletingMember.id}`, {
        method: "DELETE",
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error);
      }

      toast.success("멤버가 비활성화되었습니다");
      setDeleteDialogOpen(false);
      setDeletingMember(null);
      fetchMembers();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "삭제에 실패했습니다"
      );
    } finally {
      setSubmitting(false);
    }
  };

  // 삭제 다이얼로그 열기
  const openDeleteDialog = (member: MemberWithTeam) => {
    setDeletingMember(member);
    setDeleteDialogOpen(true);
  };

  // 비밀번호 초기화 다이얼로그 열기
  const openResetPasswordDialog = (member: MemberWithTeam) => {
    setResettingMember(member);
    setResetPasswordDialogOpen(true);
  };

  // 비밀번호 초기화
  const handleResetPassword = async () => {
    if (!resettingMember) return;
    setSubmitting(true);

    try {
      const response = await fetch(`/api/members/${resettingMember.id}/reset-password`, {
        method: "POST",
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error);
      }

      toast.success(`${resettingMember.name}님의 비밀번호가 "1234"로 초기화되었습니다`);
      setResetPasswordDialogOpen(false);
      setResettingMember(null);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "비밀번호 초기화에 실패했습니다"
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <Header title="멤버 관리" />
      <div className="flex flex-1 flex-col gap-4 p-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <UserCog className="h-5 w-5" />
                멤버 목록
              </CardTitle>
              <CardDescription>
                시스템 관리자, 영업 관리자, 팀장을 관리합니다.
              </CardDescription>
            </div>
            <Button onClick={() => openDialog()}>
              <Plus className="mr-2 h-4 w-4" />
              멤버 추가
            </Button>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex items-center justify-center h-32 text-muted-foreground">
                로딩 중...
              </div>
            ) : members.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-32 text-muted-foreground">
                <Users className="h-8 w-8 mb-2" />
                <p>등록된 멤버가 없습니다</p>
                <Button
                  variant="link"
                  className="mt-2"
                  onClick={() => openDialog()}
                >
                  첫 번째 멤버 추가하기
                </Button>
              </div>
            ) : (
              <div className="space-y-6">
                {roleGroups.map((group) => {
                  const groupMembers = groupedMembers[group.role];
                  const Icon = group.icon;

                  return (
                    <div key={group.role} className="space-y-3">
                      {/* 그룹 헤더 */}
                      <div className="flex items-center gap-2 pb-2 border-b">
                        <Icon className="h-4 w-4 text-muted-foreground" />
                        <h3 className="font-medium">{group.label}</h3>
                        <Badge variant="secondary" className="ml-1">
                          {groupMembers.length}명
                        </Badge>
                        <span className="text-xs text-muted-foreground ml-2">
                          {group.description}
                        </span>
                      </div>

                      {/* 그룹 멤버 목록 */}
                      {groupMembers.length === 0 ? (
                        <div className="text-sm text-muted-foreground py-4 text-center bg-muted/30 rounded-md">
                          등록된 {group.label}가 없습니다
                        </div>
                      ) : (
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>이름</TableHead>
                              <TableHead>아이디</TableHead>
                              <TableHead>연락처</TableHead>
                              <TableHead>소속 팀</TableHead>
                              <TableHead className="text-right">액션</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {groupMembers.map((member) => (
                              <TableRow key={member.id}>
                                <TableCell className="font-medium">
                                  {member.name}
                                </TableCell>
                                <TableCell>
                                  <div className="text-muted-foreground">
                                    {member.email.split("@")[0]}
                                  </div>
                                </TableCell>
                                <TableCell>
                                  {member.phone ? (
                                    <div className="flex items-center gap-1 text-muted-foreground">
                                      <Phone className="h-3 w-3" />
                                      {member.phone}
                                    </div>
                                  ) : (
                                    <span className="text-muted-foreground">-</span>
                                  )}
                                </TableCell>
                                <TableCell className="text-muted-foreground">
                                  {member.team?.name || "-"}
                                </TableCell>
                                <TableCell className="text-right">
                                  <div className="flex items-center justify-end gap-1">
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      onClick={() => openDialog(member)}
                                      title="정보 수정"
                                    >
                                      <Pencil className="h-4 w-4" />
                                    </Button>
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      onClick={() => openResetPasswordDialog(member)}
                                      title="비밀번호 초기화"
                                    >
                                      <KeyRound className="h-4 w-4" />
                                    </Button>
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      onClick={() => openDeleteDialog(member)}
                                      title="비활성화"
                                    >
                                      <Trash2 className="h-4 w-4" />
                                    </Button>
                                  </div>
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* 생성/수정 다이얼로그 */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>
              {editingMember ? "멤버 수정" : "새 멤버 추가"}
            </DialogTitle>
            <DialogDescription>
              {editingMember
                ? "멤버 정보를 수정합니다."
                : "새로운 멤버를 추가합니다."}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit}>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="name">이름</Label>
                <Input
                  id="name"
                  placeholder="홍길동"
                  value={formData.name}
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="loginId">아이디 (로그인 ID)</Label>
                <Input
                  id="loginId"
                  type="text"
                  placeholder="아이디 입력"
                  value={formData.loginId}
                  onChange={(e) =>
                    setFormData({ ...formData, loginId: e.target.value.toLowerCase().replace(/[^a-z0-9._-]/g, "") })
                  }
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone">연락처</Label>
                <Input
                  id="phone"
                  type="tel"
                  placeholder="010-1234-5678"
                  value={formData.phone}
                  onChange={(e) =>
                    setFormData({ ...formData, phone: formatPhoneNumber(e.target.value) })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="role">역할</Label>
                <Select
                  value={formData.role}
                  onValueChange={(value: MemberRole) =>
                    setFormData({ ...formData, role: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="역할 선택" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="system_admin">시스템 관리자</SelectItem>
                    <SelectItem value="sales_manager">영업 관리자</SelectItem>
                    <SelectItem value="team_leader">팀장</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="team">소속 팀</Label>
                <Select
                  value={formData.team_id || "none"}
                  onValueChange={(value) =>
                    setFormData({ ...formData, team_id: value === "none" ? "" : value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="팀 선택 (선택사항)" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">없음</SelectItem>
                    {teams.map((team) => (
                      <SelectItem key={team.id} value={team.id}>
                        {team.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {formData.role === "team_leader" && (
                  <p className="text-xs text-muted-foreground">
                    팀장은 반드시 소속 팀을 지정해야 합니다
                  </p>
                )}
              </div>
              {!editingMember && (
                <p className="text-xs text-muted-foreground bg-muted p-2 rounded">
                  초기 비밀번호는 &quot;1234&quot;로 자동 생성됩니다. 첫 로그인 시 변경하세요.
                </p>
              )}
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setDialogOpen(false)}
              >
                취소
              </Button>
              <Button type="submit" disabled={submitting}>
                {submitting ? "저장 중..." : editingMember ? "수정" : "생성"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* 삭제 확인 다이얼로그 */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>멤버 비활성화</AlertDialogTitle>
            <AlertDialogDescription>
              정말로 &quot;{deletingMember?.name}&quot; 멤버를
              비활성화하시겠습니까? 이 작업은 되돌릴 수 있습니다.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>취소</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {submitting ? "처리 중..." : "비활성화"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* 비밀번호 초기화 확인 다이얼로그 */}
      <AlertDialog open={resetPasswordDialogOpen} onOpenChange={setResetPasswordDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>비밀번호 초기화</AlertDialogTitle>
            <AlertDialogDescription>
              &quot;{resettingMember?.name}&quot;님의 비밀번호를 &quot;1234&quot;로 초기화하시겠습니까?
              <br />
              <span className="text-muted-foreground text-xs mt-2 block">
                해당 멤버에게 새 비밀번호를 안내해주세요.
              </span>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>취소</AlertDialogCancel>
            <AlertDialogAction onClick={handleResetPassword}>
              {submitting ? "처리 중..." : "초기화"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
