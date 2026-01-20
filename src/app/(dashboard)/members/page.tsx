"use client";

import { useEffect, useState } from "react";
import { Plus, Pencil, Trash2, UserCog, Users, Mail, Phone } from "lucide-react";
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

interface MemberWithTeam extends Member {
  team: { id: string; name: string } | null;
}

interface FormData {
  name: string;
  email: string;
  phone: string;
  role: MemberRole;
  team_id: string;
  password: string;
}

const initialFormData: FormData = {
  name: "",
  email: "",
  phone: "",
  role: "team_leader",
  team_id: "",
  password: "",
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
  const [formData, setFormData] = useState<FormData>(initialFormData);
  const [submitting, setSubmitting] = useState(false);

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
      setFormData({
        name: member.name,
        email: member.email,
        phone: member.phone || "",
        role: member.role as MemberRole,
        team_id: member.team_id || "",
        password: "",
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

    try {
      const url = editingMember
        ? `/api/members/${editingMember.id}`
        : "/api/members";
      const method = editingMember ? "PATCH" : "POST";

      // 수정 시 빈 패스워드 필드는 제외
      const submitData = editingMember
        ? {
            name: formData.name,
            email: formData.email,
            phone: formData.phone || null,
            role: formData.role,
            team_id: formData.team_id || null,
          }
        : {
            ...formData,
            team_id: formData.team_id || null,
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
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>이름</TableHead>
                    <TableHead>이메일</TableHead>
                    <TableHead>연락처</TableHead>
                    <TableHead>역할</TableHead>
                    <TableHead>소속 팀</TableHead>
                    <TableHead className="text-right">액션</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {members.map((member) => (
                    <TableRow key={member.id}>
                      <TableCell className="font-medium">
                        {member.name}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1 text-muted-foreground">
                          <Mail className="h-3 w-3" />
                          {member.email}
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
                      <TableCell>
                        <Badge
                          className={
                            roleColors[member.role as MemberRole] || ""
                          }
                        >
                          {roleLabels[member.role as MemberRole] || member.role}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {member.team?.name || "-"}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => openDialog(member)}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => openDeleteDialog(member)}
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
                <Label htmlFor="email">이메일</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="example@company.com"
                  value={formData.email}
                  onChange={(e) =>
                    setFormData({ ...formData, email: e.target.value })
                  }
                  required
                />
                {editingMember && (
                  <p className="text-xs text-muted-foreground">
                    이메일 변경 시 로그인 ID도 함께 변경됩니다
                  </p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone">연락처</Label>
                <Input
                  id="phone"
                  type="tel"
                  placeholder="010-1234-5678"
                  value={formData.phone}
                  onChange={(e) =>
                    setFormData({ ...formData, phone: e.target.value })
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
                <div className="space-y-2">
                  <Label htmlFor="password">비밀번호</Label>
                  <Input
                    id="password"
                    type="password"
                    placeholder="8자 이상 입력"
                    value={formData.password}
                    onChange={(e) =>
                      setFormData({ ...formData, password: e.target.value })
                    }
                    required={!editingMember}
                    minLength={8}
                  />
                </div>
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
    </>
  );
}
