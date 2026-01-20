"use client";

import { useEffect, useState } from "react";
import { Plus, Pencil, Trash2, Building, Users } from "lucide-react";
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import type { Team } from "@/types/database.types";

interface TeamWithCount extends Team {
  member_count: number;
}

export default function TeamsPage() {
  const [teams, setTeams] = useState<TeamWithCount[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [editingTeam, setEditingTeam] = useState<TeamWithCount | null>(null);
  const [deletingTeam, setDeletingTeam] = useState<TeamWithCount | null>(null);
  const [formData, setFormData] = useState({ name: "", description: "" });
  const [submitting, setSubmitting] = useState(false);

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
      toast.error("팀 목록을 불러오는데 실패했습니다");
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTeams();
  }, []);

  // 다이얼로그 열기 (생성/수정)
  const openDialog = (team?: TeamWithCount) => {
    if (team) {
      setEditingTeam(team);
      setFormData({ name: team.name, description: team.description || "" });
    } else {
      setEditingTeam(null);
      setFormData({ name: "", description: "" });
    }
    setDialogOpen(true);
  };

  // 팀 생성/수정
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      const url = editingTeam ? `/api/teams/${editingTeam.id}` : "/api/teams";
      const method = editingTeam ? "PATCH" : "POST";

      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error);
      }

      toast.success(editingTeam ? "팀이 수정되었습니다" : "팀이 생성되었습니다");
      setDialogOpen(false);
      fetchTeams();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "요청에 실패했습니다"
      );
    } finally {
      setSubmitting(false);
    }
  };

  // 팀 삭제
  const handleDelete = async () => {
    if (!deletingTeam) return;
    setSubmitting(true);

    try {
      const response = await fetch(`/api/teams/${deletingTeam.id}`, {
        method: "DELETE",
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error);
      }

      toast.success("팀이 삭제되었습니다");
      setDeleteDialogOpen(false);
      setDeletingTeam(null);
      fetchTeams();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "삭제에 실패했습니다"
      );
    } finally {
      setSubmitting(false);
    }
  };

  // 삭제 다이얼로그 열기
  const openDeleteDialog = (team: TeamWithCount) => {
    setDeletingTeam(team);
    setDeleteDialogOpen(true);
  };

  return (
    <>
      <Header title="팀 관리" />
      <div className="flex flex-1 flex-col gap-4 p-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Building className="h-5 w-5" />
                팀 목록
              </CardTitle>
              <CardDescription>
                영업 팀을 관리합니다. 팀을 생성하고 멤버를 배치할 수 있습니다.
              </CardDescription>
            </div>
            <Button onClick={() => openDialog()}>
              <Plus className="mr-2 h-4 w-4" />
              팀 추가
            </Button>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex items-center justify-center h-32 text-muted-foreground">
                로딩 중...
              </div>
            ) : teams.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-32 text-muted-foreground">
                <Building className="h-8 w-8 mb-2" />
                <p>등록된 팀이 없습니다</p>
                <Button
                  variant="link"
                  className="mt-2"
                  onClick={() => openDialog()}
                >
                  첫 번째 팀 만들기
                </Button>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>팀 이름</TableHead>
                    <TableHead>설명</TableHead>
                    <TableHead className="text-center">멤버 수</TableHead>
                    <TableHead className="text-center">생성일</TableHead>
                    <TableHead className="text-right">액션</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {teams.map((team) => (
                    <TableRow key={team.id}>
                      <TableCell className="font-medium">{team.name}</TableCell>
                      <TableCell className="text-muted-foreground">
                        {team.description || "-"}
                      </TableCell>
                      <TableCell className="text-center">
                        <div className="flex items-center justify-center gap-1">
                          <Users className="h-4 w-4 text-muted-foreground" />
                          {team.member_count}
                        </div>
                      </TableCell>
                      <TableCell className="text-center text-muted-foreground">
                        {team.created_at
                          ? new Date(team.created_at).toLocaleDateString(
                              "ko-KR"
                            )
                          : "-"}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => openDialog(team)}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => openDeleteDialog(team)}
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
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingTeam ? "팀 수정" : "새 팀 만들기"}
            </DialogTitle>
            <DialogDescription>
              {editingTeam
                ? "팀 정보를 수정합니다."
                : "새로운 영업 팀을 생성합니다."}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit}>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="name">팀 이름</Label>
                <Input
                  id="name"
                  placeholder="예: 영업 1팀"
                  value={formData.name}
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="description">설명 (선택)</Label>
                <Textarea
                  id="description"
                  placeholder="팀에 대한 설명을 입력하세요"
                  value={formData.description}
                  onChange={(e) =>
                    setFormData({ ...formData, description: e.target.value })
                  }
                  rows={3}
                />
              </div>
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
                {submitting ? "저장 중..." : editingTeam ? "수정" : "생성"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* 삭제 확인 다이얼로그 */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>팀 삭제</AlertDialogTitle>
            <AlertDialogDescription>
              정말로 &quot;{deletingTeam?.name}&quot; 팀을 삭제하시겠습니까? 이
              작업은 되돌릴 수 없습니다.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>취소</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {submitting ? "삭제 중..." : "삭제"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
