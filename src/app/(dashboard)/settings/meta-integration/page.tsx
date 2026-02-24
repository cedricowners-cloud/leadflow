"use client";

import { useCallback, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import {
  Facebook,
  Plus,
  RefreshCw,
  Trash2,
  Pencil,
  CheckCircle,
  XCircle,
  Clock,
  Eye,
  EyeOff,
  Loader2,
  Link as LinkIcon,
  Settings,
  AlertCircle,
  Calendar,
} from "lucide-react";
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
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { toast } from "sonner";

interface MetaPage {
  id: string;
  page_id: string;
  page_name: string;
  access_token?: string;
  has_token?: boolean;
  is_active: boolean;
  sync_interval_minutes: number;
  last_sync_at: string | null;
  last_sync_status: "success" | "error" | null;
  last_sync_message: string | null;
  created_at: string;
  updated_at: string;
}

interface SyncLog {
  id: string;
  page_id: string;
  sync_type: string;
  status: string;
  leads_fetched: number;
  leads_created: number;
  leads_duplicated: number;
  error_message: string | null;
  started_at: string;
  completed_at: string | null;
  meta_pages?: { page_name: string };
}

interface PageFormData {
  page_id: string;
  page_name: string;
  access_token: string;
  sync_interval_minutes: number;
}

interface AppSettings {
  app_id: string;
  has_secret: boolean;
  created_at?: string;
  updated_at?: string;
}

const defaultFormData: PageFormData = {
  page_id: "",
  page_name: "",
  access_token: "",
  sync_interval_minutes: 30,
};

export default function MetaIntegrationPage() {
  const searchParams = useSearchParams();
  const [pages, setPages] = useState<MetaPage[]>([]);
  const [syncLogs, setSyncLogs] = useState<SyncLog[]>([]);
  const [appSettings, setAppSettings] = useState<AppSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState<string | null>(null);
  const [syncingAll, setSyncingAll] = useState(false);
  const [connecting, setConnecting] = useState(false);

  // Dialog states
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isAppSettingsDialogOpen, setIsAppSettingsDialogOpen] = useState(false);
  const [selectedPage, setSelectedPage] = useState<MetaPage | null>(null);
  const [formData, setFormData] = useState<PageFormData>(defaultFormData);
  const [appFormData, setAppFormData] = useState({ app_id: "", app_secret: "" });
  const [showToken, setShowToken] = useState(false);
  const [showAppSecret, setShowAppSecret] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Sync date range
  const [syncStartDate, setSyncStartDate] = useState("");
  const [syncEndDate, setSyncEndDate] = useState("");

  // Handle URL params (success/error from OAuth callback)
  useEffect(() => {
    const success = searchParams.get("success");
    const error = searchParams.get("error");

    if (success) {
      toast.success(success);
      // Clean up URL
      window.history.replaceState({}, "", "/settings/meta-integration");
    }

    if (error) {
      toast.error(error);
      // Clean up URL
      window.history.replaceState({}, "", "/settings/meta-integration");
    }
  }, [searchParams]);

  // Fetch pages
  const fetchPages = useCallback(async () => {
    try {
      const res = await fetch("/api/meta/pages");
      if (!res.ok) throw new Error("Failed to fetch pages");
      const data = await res.json();
      setPages(data.data || []);
    } catch (error) {
      console.error("Failed to fetch meta pages:", error);
      toast.error("페이지 목록을 불러오는데 실패했습니다.");
    }
  }, []);

  // Fetch sync logs
  const fetchSyncLogs = useCallback(async () => {
    try {
      const res = await fetch("/api/meta/sync-logs");
      if (!res.ok) throw new Error("Failed to fetch sync logs");
      const data = await res.json();
      setSyncLogs(data.data || []);
    } catch (error) {
      console.error("Failed to fetch sync logs:", error);
    }
  }, []);

  // Fetch app settings
  const fetchAppSettings = useCallback(async () => {
    try {
      const res = await fetch("/api/meta/app-settings");
      if (!res.ok) throw new Error("Failed to fetch app settings");
      const data = await res.json();
      setAppSettings(data.data || null);
    } catch (error) {
      console.error("Failed to fetch app settings:", error);
    }
  }, []);

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      await Promise.all([fetchPages(), fetchSyncLogs(), fetchAppSettings()]);
      setLoading(false);
    };
    loadData();
  }, [fetchPages, fetchSyncLogs, fetchAppSettings]);

  // Save app settings
  const handleSaveAppSettings = async () => {
    if (!appFormData.app_id || !appFormData.app_secret) {
      toast.error("앱 ID와 앱 Secret을 모두 입력해주세요.");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/meta/app-settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(appFormData),
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Failed to save app settings");
      }

      toast.success("앱 설정이 저장되었습니다.");
      setIsAppSettingsDialogOpen(false);
      setAppFormData({ app_id: "", app_secret: "" });
      await fetchAppSettings();
    } catch (error) {
      console.error("Failed to save app settings:", error);
      toast.error(
        error instanceof Error ? error.message : "앱 설정 저장에 실패했습니다."
      );
    } finally {
      setSubmitting(false);
    }
  };

  // Connect with Facebook
  const handleFacebookConnect = () => {
    if (!appSettings) {
      toast.error("먼저 Facebook 앱 설정을 완료해주세요.");
      setIsAppSettingsDialogOpen(true);
      return;
    }

    setConnecting(true);
    // Redirect to OAuth authorize endpoint
    window.location.href = "/api/meta/oauth/authorize";
  };

  // Add page
  const handleAddPage = async () => {
    if (!formData.page_id || !formData.page_name || !formData.access_token) {
      toast.error("모든 필수 항목을 입력해주세요.");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/meta/pages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Failed to add page");
      }

      toast.success("페이지가 추가되었습니다.");
      setIsAddDialogOpen(false);
      setFormData(defaultFormData);
      await fetchPages();
    } catch (error) {
      console.error("Failed to add page:", error);
      toast.error(
        error instanceof Error ? error.message : "페이지 추가에 실패했습니다."
      );
    } finally {
      setSubmitting(false);
    }
  };

  // Edit page
  const handleEditPage = async () => {
    if (!selectedPage) return;

    setSubmitting(true);
    try {
      const updateData: Partial<PageFormData> = {
        page_name: formData.page_name,
        sync_interval_minutes: formData.sync_interval_minutes,
      };

      if (formData.access_token && formData.access_token !== "") {
        updateData.access_token = formData.access_token;
      }

      const res = await fetch(`/api/meta/pages/${selectedPage.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updateData),
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Failed to update page");
      }

      toast.success("페이지가 수정되었습니다.");
      setIsEditDialogOpen(false);
      setSelectedPage(null);
      setFormData(defaultFormData);
      await fetchPages();
    } catch (error) {
      console.error("Failed to update page:", error);
      toast.error(
        error instanceof Error ? error.message : "페이지 수정에 실패했습니다."
      );
    } finally {
      setSubmitting(false);
    }
  };

  // Delete page
  const handleDeletePage = async () => {
    if (!selectedPage) return;

    setSubmitting(true);
    try {
      const res = await fetch(`/api/meta/pages/${selectedPage.id}`, {
        method: "DELETE",
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Failed to delete page");
      }

      toast.success("페이지가 삭제되었습니다.");
      setIsDeleteDialogOpen(false);
      setSelectedPage(null);
      await fetchPages();
    } catch (error) {
      console.error("Failed to delete page:", error);
      toast.error(
        error instanceof Error ? error.message : "페이지 삭제에 실패했습니다."
      );
    } finally {
      setSubmitting(false);
    }
  };

  // Toggle page active status
  const handleToggleActive = async (page: MetaPage) => {
    try {
      const res = await fetch(`/api/meta/pages/${page.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ is_active: !page.is_active }),
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Failed to toggle page status");
      }

      toast.success(
        page.is_active ? "페이지가 비활성화되었습니다." : "페이지가 활성화되었습니다."
      );
      await fetchPages();
    } catch (error) {
      console.error("Failed to toggle page status:", error);
      toast.error("상태 변경에 실패했습니다.");
    }
  };

  // Sync single page
  const handleSyncPage = async (pageId: string) => {
    setSyncing(pageId);
    try {
      const body: Record<string, string | boolean> = { page_id: pageId };
      if (syncStartDate) body.since_date = syncStartDate;
      if (syncEndDate) body.until_date = syncEndDate;

      const res = await fetch("/api/meta/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Sync failed");
      }

      const result = data.data?.results?.[0];
      if (result?.success) {
        toast.success(
          `동기화 완료: ${result.leads_created}건 생성, ${result.leads_duplicated}건 중복`
        );
      } else {
        toast.error(`동기화 실패: ${result?.error || "Unknown error"}`);
      }

      await Promise.all([fetchPages(), fetchSyncLogs()]);
    } catch (error) {
      console.error("Sync failed:", error);
      toast.error(
        error instanceof Error ? error.message : "동기화에 실패했습니다."
      );
    } finally {
      setSyncing(null);
    }
  };

  // Sync all pages
  const handleSyncAll = async () => {
    setSyncingAll(true);
    try {
      const body: Record<string, string> = {};
      if (syncStartDate) body.since_date = syncStartDate;
      if (syncEndDate) body.until_date = syncEndDate;

      const res = await fetch("/api/meta/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Sync failed");
      }

      const summary = data.data?.summary;
      if (summary) {
        toast.success(
          `전체 동기화 완료: ${summary.total_leads_created}건 생성, ${summary.total_leads_duplicated}건 중복`
        );
      }

      await Promise.all([fetchPages(), fetchSyncLogs()]);
    } catch (error) {
      console.error("Sync all failed:", error);
      toast.error(
        error instanceof Error ? error.message : "전체 동기화에 실패했습니다."
      );
    } finally {
      setSyncingAll(false);
    }
  };

  // Open edit dialog
  const openEditDialog = (page: MetaPage) => {
    setSelectedPage(page);
    setFormData({
      page_id: page.page_id,
      page_name: page.page_name,
      access_token: "",
      sync_interval_minutes: page.sync_interval_minutes,
    });
    setShowToken(false);
    setIsEditDialogOpen(true);
  };

  // Open delete dialog
  const openDeleteDialog = (page: MetaPage) => {
    setSelectedPage(page);
    setIsDeleteDialogOpen(true);
  };

  // Format date
  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return "-";
    return new Date(dateStr).toLocaleString("ko-KR", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  // Get status badge
  const getStatusBadge = (status: "success" | "error" | null) => {
    if (status === "success") {
      return (
        <Badge variant="default" className="bg-green-500">
          <CheckCircle className="w-3 h-3 mr-1" />
          성공
        </Badge>
      );
    }
    if (status === "error") {
      return (
        <Badge variant="destructive">
          <XCircle className="w-3 h-3 mr-1" />
          실패
        </Badge>
      );
    }
    return (
      <Badge variant="secondary">
        <Clock className="w-3 h-3 mr-1" />
        대기
      </Badge>
    );
  };

  return (
    <>
      <Header title="Meta 연동 설정" />

      <div className="flex flex-1 flex-col gap-4 p-4">
        <Tabs defaultValue="pages" className="w-full">
          <TabsList>
            <TabsTrigger value="pages">페이지 관리</TabsTrigger>
            <TabsTrigger value="logs">동기화 로그</TabsTrigger>
            <TabsTrigger value="settings">앱 설정</TabsTrigger>
          </TabsList>

          {/* Pages Tab */}
          <TabsContent value="pages" className="space-y-4">
            {/* Facebook Connect Card */}
            <Card className="border-blue-200 bg-blue-50/50">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-blue-600 rounded-lg">
                      <Facebook className="w-6 h-6 text-white" />
                    </div>
                    <div>
                      <CardTitle className="text-lg">Facebook 연결</CardTitle>
                      <CardDescription>
                        Facebook으로 로그인하여 페이지를 자동으로 연결하고 영구 토큰을 발급받습니다.
                      </CardDescription>
                    </div>
                  </div>
                  <Button
                    onClick={handleFacebookConnect}
                    disabled={connecting}
                    className="bg-blue-600 hover:bg-blue-700"
                  >
                    {connecting ? (
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    ) : (
                      <LinkIcon className="w-4 h-4 mr-2" />
                    )}
                    Facebook으로 연결
                  </Button>
                </div>
              </CardHeader>
              {!appSettings && (
                <CardContent>
                  <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertTitle>앱 설정 필요</AlertTitle>
                    <AlertDescription>
                      Facebook 연결을 사용하려면 먼저{" "}
                      <button
                        className="underline font-medium"
                        onClick={() => setIsAppSettingsDialogOpen(true)}
                      >
                        앱 설정
                      </button>
                      에서 Facebook 앱 ID와 시크릿을 설정해주세요.
                    </AlertDescription>
                  </Alert>
                </CardContent>
              )}
            </Card>

            {/* Pages List Card */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <Facebook className="w-5 h-5" />
                      Facebook 페이지 목록
                    </CardTitle>
                    <CardDescription>
                      Meta Lead Ads에서 리드를 가져올 Facebook 페이지를 관리합니다.
                    </CardDescription>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      onClick={handleSyncAll}
                      disabled={syncingAll || pages.length === 0}
                    >
                      {syncingAll ? (
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      ) : (
                        <RefreshCw className="w-4 h-4 mr-2" />
                      )}
                      전체 동기화
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => setIsAddDialogOpen(true)}
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      수동 추가
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {/* 동기화 날짜 범위 선택 */}
                {pages.length > 0 && (
                  <div className="flex items-center gap-3 mb-4 p-3 bg-muted/50 rounded-lg">
                    <Calendar className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                    <span className="text-sm text-muted-foreground flex-shrink-0">동기화 기간:</span>
                    <Input
                      type="date"
                      value={syncStartDate}
                      onChange={(e) => setSyncStartDate(e.target.value)}
                      className="w-40 h-8 text-sm"
                      placeholder="시작일"
                    />
                    <span className="text-sm text-muted-foreground">~</span>
                    <Input
                      type="date"
                      value={syncEndDate}
                      onChange={(e) => setSyncEndDate(e.target.value)}
                      className="w-40 h-8 text-sm"
                      placeholder="종료일"
                    />
                    {(syncStartDate || syncEndDate) && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 text-xs"
                        onClick={() => {
                          setSyncStartDate("");
                          setSyncEndDate("");
                        }}
                      >
                        초기화
                      </Button>
                    )}
                    {!syncStartDate && !syncEndDate && (
                      <span className="text-xs text-muted-foreground">
                        미선택 시 마지막 동기화 이후 데이터를 가져옵니다
                      </span>
                    )}
                  </div>
                )}

                {loading ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                  </div>
                ) : pages.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <Facebook className="w-12 h-12 mx-auto mb-4 opacity-20" />
                    <p className="mb-4">등록된 페이지가 없습니다.</p>
                    <p className="text-sm">
                      위의 &quot;Facebook으로 연결&quot; 버튼을 클릭하여 페이지를 자동으로 연결하거나,
                      <br />
                      &quot;수동 추가&quot; 버튼으로 직접 페이지를 추가할 수 있습니다.
                    </p>
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>페이지명</TableHead>
                        <TableHead>페이지 ID</TableHead>
                        <TableHead>상태</TableHead>
                        <TableHead>마지막 동기화</TableHead>
                        <TableHead>동기화 결과</TableHead>
                        <TableHead>활성화</TableHead>
                        <TableHead className="text-right">작업</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {pages.map((page) => (
                        <TableRow key={page.id}>
                          <TableCell className="font-medium">
                            {page.page_name}
                          </TableCell>
                          <TableCell className="font-mono text-sm">
                            {page.page_id}
                          </TableCell>
                          <TableCell>
                            {page.has_token ? (
                              <Badge variant="outline" className="text-green-600">
                                토큰 설정됨
                              </Badge>
                            ) : (
                              <Badge variant="outline" className="text-red-600">
                                토큰 없음
                              </Badge>
                            )}
                          </TableCell>
                          <TableCell>{formatDate(page.last_sync_at)}</TableCell>
                          <TableCell>
                            {getStatusBadge(page.last_sync_status)}
                          </TableCell>
                          <TableCell>
                            <Switch
                              checked={page.is_active}
                              onCheckedChange={() => handleToggleActive(page)}
                            />
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-1">
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleSyncPage(page.id)}
                                disabled={syncing === page.id || !page.is_active}
                                title="동기화"
                              >
                                {syncing === page.id ? (
                                  <Loader2 className="w-4 h-4 animate-spin" />
                                ) : (
                                  <RefreshCw className="w-4 h-4" />
                                )}
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => openEditDialog(page)}
                                title="수정"
                              >
                                <Pencil className="w-4 h-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => openDeleteDialog(page)}
                                title="삭제"
                              >
                                <Trash2 className="w-4 h-4 text-destructive" />
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
          </TabsContent>

          {/* Logs Tab */}
          <TabsContent value="logs" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>동기화 로그</CardTitle>
                <CardDescription>
                  최근 동기화 작업 이력을 확인합니다.
                </CardDescription>
              </CardHeader>
              <CardContent>
                {syncLogs.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    동기화 이력이 없습니다.
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>시작 시간</TableHead>
                        <TableHead>페이지</TableHead>
                        <TableHead>유형</TableHead>
                        <TableHead>상태</TableHead>
                        <TableHead>가져온 리드</TableHead>
                        <TableHead>생성</TableHead>
                        <TableHead>중복</TableHead>
                        <TableHead>오류 메시지</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {syncLogs.map((log) => (
                        <TableRow key={log.id}>
                          <TableCell>{formatDate(log.started_at)}</TableCell>
                          <TableCell className="text-sm">
                            {log.meta_pages?.page_name || "-"}
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline">
                              {log.sync_type === "manual" ? "수동" : "자동"}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            {log.status === "success" ? (
                              <Badge className="bg-green-500">성공</Badge>
                            ) : log.status === "error" ? (
                              <Badge variant="destructive">실패</Badge>
                            ) : (
                              <Badge variant="secondary">진행 중</Badge>
                            )}
                          </TableCell>
                          <TableCell>{log.leads_fetched}</TableCell>
                          <TableCell className="text-green-600">
                            +{log.leads_created}
                          </TableCell>
                          <TableCell className="text-muted-foreground">
                            {log.leads_duplicated}
                          </TableCell>
                          <TableCell className="text-sm text-destructive max-w-xs truncate">
                            {log.error_message || "-"}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Settings Tab */}
          <TabsContent value="settings" className="space-y-4">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <Settings className="w-5 h-5" />
                      Facebook 앱 설정
                    </CardTitle>
                    <CardDescription>
                      Facebook 개발자 앱의 ID와 Secret을 설정합니다. OAuth 연결에 필요합니다.
                    </CardDescription>
                  </div>
                  <Button onClick={() => setIsAppSettingsDialogOpen(true)}>
                    {appSettings ? "설정 변경" : "설정하기"}
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {appSettings ? (
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4 p-4 bg-muted rounded-lg">
                      <div>
                        <p className="text-sm text-muted-foreground">앱 ID</p>
                        <p className="font-mono">{appSettings.app_id}</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">앱 Secret</p>
                        <p className="font-mono">••••••••••••••••</p>
                      </div>
                    </div>
                    {appSettings.updated_at && (
                      <p className="text-sm text-muted-foreground">
                        마지막 수정: {formatDate(appSettings.updated_at)}
                      </p>
                    )}
                  </div>
                ) : (
                  <Alert>
                    <AlertCircle className="h-4 w-4" />
                    <AlertTitle>설정 필요</AlertTitle>
                    <AlertDescription>
                      Facebook 앱 설정이 완료되지 않았습니다. OAuth 연결을 사용하려면 앱 ID와
                      Secret을 설정해주세요.
                    </AlertDescription>
                  </Alert>
                )}
              </CardContent>
            </Card>

            {/* Guide Card */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Facebook 앱 생성 가이드</CardTitle>
              </CardHeader>
              <CardContent className="text-sm text-muted-foreground space-y-3">
                <ol className="list-decimal list-inside space-y-2">
                  <li>
                    <a
                      href="https://developers.facebook.com"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 underline"
                    >
                      Facebook 개발자 사이트
                    </a>
                    에서 새 앱을 생성합니다.
                  </li>
                  <li>
                    앱 유형으로 &quot;비즈니스&quot;를 선택합니다.
                  </li>
                  <li>
                    앱 설정 &gt; 기본 설정에서 <strong>앱 ID</strong>와{" "}
                    <strong>앱 시크릿 코드</strong>를 확인합니다.
                  </li>
                  <li>
                    제품 추가에서 &quot;Facebook 로그인&quot;을 추가합니다.
                  </li>
                  <li>
                    Facebook 로그인 설정에서 유효한 OAuth 리디렉션 URI를 추가합니다:
                    <code className="block mt-1 p-2 bg-muted rounded">
                      {typeof window !== "undefined"
                        ? `${window.location.origin}/api/meta/oauth/callback`
                        : "https://your-domain.com/api/meta/oauth/callback"}
                    </code>
                  </li>
                  <li>
                    앱 검수에서 다음 권한을 요청합니다:
                    <ul className="list-disc list-inside ml-4 mt-1">
                      <li>pages_show_list</li>
                      <li>pages_read_engagement</li>
                      <li>leads_retrieval</li>
                    </ul>
                  </li>
                </ol>
                <p className="pt-2 border-t">
                  <strong>참고:</strong> 개발 모드에서는 앱 관리자/개발자로 등록된 계정만 사용할 수
                  있습니다. 다른 사용자가 사용하려면 앱 검수를 완료해야 합니다.
                </p>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {/* Add Page Dialog */}
      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Facebook 페이지 수동 추가</DialogTitle>
            <DialogDescription>
              Meta Lead Ads 리드를 가져올 Facebook 페이지 정보를 직접 입력해주세요.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="page_id">페이지 ID *</Label>
              <Input
                id="page_id"
                placeholder="예: 123456789012345"
                value={formData.page_id}
                onChange={(e) =>
                  setFormData({ ...formData, page_id: e.target.value })
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="page_name">페이지 이름 *</Label>
              <Input
                id="page_name"
                placeholder="예: 우리 회사 페이지"
                value={formData.page_name}
                onChange={(e) =>
                  setFormData({ ...formData, page_name: e.target.value })
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="access_token">액세스 토큰 *</Label>
              <div className="relative">
                <Input
                  id="access_token"
                  type={showToken ? "text" : "password"}
                  placeholder="페이지 액세스 토큰"
                  value={formData.access_token}
                  onChange={(e) =>
                    setFormData({ ...formData, access_token: e.target.value })
                  }
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="absolute right-0 top-0"
                  onClick={() => setShowToken(!showToken)}
                >
                  {showToken ? (
                    <EyeOff className="w-4 h-4" />
                  ) : (
                    <Eye className="w-4 h-4" />
                  )}
                </Button>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="sync_interval">동기화 주기 (분)</Label>
              <Input
                id="sync_interval"
                type="number"
                min={5}
                max={1440}
                value={formData.sync_interval_minutes}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    sync_interval_minutes: parseInt(e.target.value) || 30,
                  })
                }
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setIsAddDialogOpen(false);
                setFormData(defaultFormData);
              }}
            >
              취소
            </Button>
            <Button onClick={handleAddPage} disabled={submitting}>
              {submitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              추가
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Page Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>페이지 수정</DialogTitle>
            <DialogDescription>
              페이지 정보를 수정합니다. 토큰을 변경하려면 새 토큰을 입력하세요.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="edit_page_id">페이지 ID</Label>
              <Input
                id="edit_page_id"
                value={formData.page_id}
                disabled
                className="bg-muted"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit_page_name">페이지 이름 *</Label>
              <Input
                id="edit_page_name"
                placeholder="예: 우리 회사 페이지"
                value={formData.page_name}
                onChange={(e) =>
                  setFormData({ ...formData, page_name: e.target.value })
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit_access_token">
                새 액세스 토큰 (변경 시에만 입력)
              </Label>
              <div className="relative">
                <Input
                  id="edit_access_token"
                  type={showToken ? "text" : "password"}
                  placeholder="새 토큰을 입력하거나 비워두세요"
                  value={formData.access_token}
                  onChange={(e) =>
                    setFormData({ ...formData, access_token: e.target.value })
                  }
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="absolute right-0 top-0"
                  onClick={() => setShowToken(!showToken)}
                >
                  {showToken ? (
                    <EyeOff className="w-4 h-4" />
                  ) : (
                    <Eye className="w-4 h-4" />
                  )}
                </Button>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit_sync_interval">동기화 주기 (분)</Label>
              <Input
                id="edit_sync_interval"
                type="number"
                min={5}
                max={1440}
                value={formData.sync_interval_minutes}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    sync_interval_minutes: parseInt(e.target.value) || 30,
                  })
                }
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setIsEditDialogOpen(false);
                setSelectedPage(null);
                setFormData(defaultFormData);
              }}
            >
              취소
            </Button>
            <Button onClick={handleEditPage} disabled={submitting}>
              {submitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              저장
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>페이지 삭제</AlertDialogTitle>
            <AlertDialogDescription>
              {selectedPage?.page_name} 페이지를 삭제하시겠습니까? 이 작업은 되돌릴 수
              없으며, 해당 페이지의 동기화 로그도 함께 삭제됩니다.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>취소</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeletePage}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {submitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              삭제
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* App Settings Dialog */}
      <Dialog open={isAppSettingsDialogOpen} onOpenChange={setIsAppSettingsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Facebook 앱 설정</DialogTitle>
            <DialogDescription>
              Facebook 개발자 앱의 ID와 Secret을 입력해주세요. 이 정보는 OAuth 연결에
              사용됩니다.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="app_id">앱 ID *</Label>
              <Input
                id="app_id"
                placeholder="예: 123456789012345"
                value={appFormData.app_id}
                onChange={(e) =>
                  setAppFormData({ ...appFormData, app_id: e.target.value })
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="app_secret">앱 Secret *</Label>
              <div className="relative">
                <Input
                  id="app_secret"
                  type={showAppSecret ? "text" : "password"}
                  placeholder="앱 시크릿 코드"
                  value={appFormData.app_secret}
                  onChange={(e) =>
                    setAppFormData({ ...appFormData, app_secret: e.target.value })
                  }
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="absolute right-0 top-0"
                  onClick={() => setShowAppSecret(!showAppSecret)}
                >
                  {showAppSecret ? (
                    <EyeOff className="w-4 h-4" />
                  ) : (
                    <Eye className="w-4 h-4" />
                  )}
                </Button>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setIsAppSettingsDialogOpen(false);
                setAppFormData({ app_id: "", app_secret: "" });
              }}
            >
              취소
            </Button>
            <Button onClick={handleSaveAppSettings} disabled={submitting}>
              {submitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              저장
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
