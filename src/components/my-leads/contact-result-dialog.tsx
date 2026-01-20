"use client";

import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Building2,
  User,
  Phone,
  Calendar as CalendarIcon,
  MapPin,
  Loader2,
  Briefcase,
  TrendingUp,
  Users,
  Clock,
  Building,
  AlertTriangle,
} from "lucide-react";
import { format } from "date-fns";
import { ko } from "date-fns/locale";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface Lead {
  id: string;
  company_name: string | null;
  representative_name: string | null;
  phone: string;
  industry: string | null;
  annual_revenue: number | null;
  annual_revenue_min: number | null;
  annual_revenue_max: number | null;
  employee_count: number | null;
  employee_count_min: number | null;
  employee_count_max: number | null;
  region: string | null;
  available_time: string | null;
  business_type: string | null;
  tax_delinquency: boolean | null;
  grade: { id: string; name: string; color: string | null } | null;
  contact_status: { id: string; name: string } | null;
  meeting_status: { id: string; name: string } | null;
  contract_status: { id: string; name: string } | null;
  meeting_date: string | null;
  meeting_location: string | null;
  contract_amount: number | null;
  memo: string | null;
  next_contact_date: string | null;
  assigned_at: string | null;
}

interface Status {
  id: string;
  name: string;
  category: string;
}

interface ContactResultDialogProps {
  lead: Lead | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export function ContactResultDialog({
  lead,
  open,
  onOpenChange,
  onSuccess,
}: ContactResultDialogProps) {
  const [statuses, setStatuses] = useState<Status[]>([]);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    contactStatusId: "",
    meetingStatusId: "",
    contractStatusId: "",
    meetingDate: undefined as Date | undefined,
    meetingLocation: "",
    contractAmount: "",
    memo: "",
    nextContactDate: undefined as Date | undefined,
  });

  // 상태값 로드
  useEffect(() => {
    const fetchStatuses = async () => {
      const supabase = createClient();
      const { data } = await supabase
        .from("lead_statuses")
        .select("id, name, category")
        .eq("is_active", true)
        .order("display_order");

      setStatuses(data || []);
    };

    fetchStatuses();
  }, []);

  // 리드가 변경되면 폼 초기화
  useEffect(() => {
    if (lead) {
      setFormData({
        contactStatusId: lead.contact_status?.id || "",
        meetingStatusId: lead.meeting_status?.id || "",
        contractStatusId: lead.contract_status?.id || "",
        meetingDate: lead.meeting_date
          ? new Date(lead.meeting_date)
          : undefined,
        meetingLocation: lead.meeting_location || "",
        contractAmount: lead.contract_amount?.toString() || "",
        memo: lead.memo || "",
        nextContactDate: lead.next_contact_date
          ? new Date(lead.next_contact_date)
          : undefined,
      });
    }
  }, [lead]);

  const contactStatuses = statuses.filter((s) => s.category === "contact");
  const meetingStatuses = statuses.filter((s) => s.category === "meeting");
  const contractStatuses = statuses.filter((s) => s.category === "contract");

  const handleSubmit = async () => {
    if (!lead) return;

    setLoading(true);
    try {
      const response = await fetch(`/api/leads/${lead.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contact_status_id: formData.contactStatusId || null,
          meeting_status_id: formData.meetingStatusId || null,
          contract_status_id: formData.contractStatusId || null,
          meeting_date: formData.meetingDate?.toISOString() || null,
          meeting_location: formData.meetingLocation || null,
          contract_amount: formData.contractAmount
            ? parseFloat(formData.contractAmount)
            : null,
          memo: formData.memo || null,
          next_contact_date: formData.nextContactDate?.toISOString() || null,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "저장에 실패했습니다");
      }

      toast.success("컨택 결과가 저장되었습니다");
      onSuccess();
      onOpenChange(false);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "저장에 실패했습니다"
      );
    } finally {
      setLoading(false);
    }
  };

  if (!lead) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>컨택 결과 입력</DialogTitle>
          <DialogDescription>
            리드의 컨택 결과를 입력하세요.
          </DialogDescription>
        </DialogHeader>

        {/* 리드 정보 요약 */}
        <div className="bg-muted/50 rounded-lg p-4 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Building2 className="h-4 w-4 text-muted-foreground" />
              <span className="font-medium">
                {lead.company_name || "업체명 없음"}
              </span>
            </div>
            {lead.grade && (
              <Badge
                style={{ backgroundColor: lead.grade.color || undefined }}
                className="text-white"
              >
                {lead.grade.name}등급
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-4 text-sm text-muted-foreground">
            <div className="flex items-center gap-1">
              <User className="h-3.5 w-3.5" />
              <span>{lead.representative_name || "-"}</span>
            </div>
            <div className="flex items-center gap-1">
              <Phone className="h-3.5 w-3.5" />
              <span>{lead.phone}</span>
            </div>
            {lead.region && (
              <div className="flex items-center gap-1">
                <MapPin className="h-3.5 w-3.5" />
                <span>{lead.region}</span>
              </div>
            )}
          </div>
          {/* 상세 정보 */}
          <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
            {lead.industry && (
              <div className="flex items-center gap-1">
                <Briefcase className="h-3.5 w-3.5" />
                <span>{lead.industry}</span>
              </div>
            )}
            {(lead.annual_revenue || lead.annual_revenue_min || lead.annual_revenue_max) && (
              <div className="flex items-center gap-1">
                <TrendingUp className="h-3.5 w-3.5" />
                <span>
                  {lead.annual_revenue
                    ? `${lead.annual_revenue}억`
                    : lead.annual_revenue_min && lead.annual_revenue_max
                    ? `${lead.annual_revenue_min}~${lead.annual_revenue_max}억`
                    : lead.annual_revenue_min
                    ? `${lead.annual_revenue_min}억 이상`
                    : `${lead.annual_revenue_max}억 이하`}
                </span>
              </div>
            )}
            {(lead.employee_count || lead.employee_count_min || lead.employee_count_max) && (
              <div className="flex items-center gap-1">
                <Users className="h-3.5 w-3.5" />
                <span>
                  {lead.employee_count
                    ? `${lead.employee_count}명`
                    : lead.employee_count_min && lead.employee_count_max
                    ? `${lead.employee_count_min}~${lead.employee_count_max}명`
                    : lead.employee_count_min
                    ? `${lead.employee_count_min}명 이상`
                    : `${lead.employee_count_max}명 이하`}
                </span>
              </div>
            )}
            {lead.business_type && (
              <div className="flex items-center gap-1">
                <Building className="h-3.5 w-3.5" />
                <span>{lead.business_type}</span>
              </div>
            )}
          </div>
          {/* 세금 체납 경고 */}
          {lead.tax_delinquency === true && (
            <div className="flex items-center gap-1.5 text-sm text-red-600 font-medium">
              <AlertTriangle className="h-3.5 w-3.5" />
              <span>세금 체납 있음 (정책자금 신청 어려움)</span>
            </div>
          )}
          {/* 연락 가능 시간 - 강조 표시 */}
          {lead.available_time && (
            <div className="flex items-center gap-1.5 text-sm text-blue-600 font-medium">
              <Clock className="h-3.5 w-3.5" />
              <span>연락 가능: {lead.available_time}</span>
            </div>
          )}
        </div>

        <Separator />

        {/* 상태 입력 */}
        <div className="grid gap-4">
          <div className="grid grid-cols-3 gap-4">
            {/* 컨택 상태 */}
            <div className="space-y-2">
              <Label>컨택 상태</Label>
              <Select
                value={formData.contactStatusId || "none"}
                onValueChange={(v) =>
                  setFormData({
                    ...formData,
                    contactStatusId: v === "none" ? "" : v,
                  })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="선택" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">선택 안함</SelectItem>
                  {contactStatuses.map((status) => (
                    <SelectItem key={status.id} value={status.id}>
                      {status.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* 미팅 상태 */}
            <div className="space-y-2">
              <Label>미팅 상태</Label>
              <Select
                value={formData.meetingStatusId || "none"}
                onValueChange={(v) =>
                  setFormData({
                    ...formData,
                    meetingStatusId: v === "none" ? "" : v,
                  })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="선택" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">선택 안함</SelectItem>
                  {meetingStatuses.map((status) => (
                    <SelectItem key={status.id} value={status.id}>
                      {status.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* 계약 상태 */}
            <div className="space-y-2">
              <Label>계약 상태</Label>
              <Select
                value={formData.contractStatusId || "none"}
                onValueChange={(v) =>
                  setFormData({
                    ...formData,
                    contractStatusId: v === "none" ? "" : v,
                  })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="선택" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">선택 안함</SelectItem>
                  {contractStatuses.map((status) => (
                    <SelectItem key={status.id} value={status.id}>
                      {status.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* 미팅 정보 */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>미팅 일시</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !formData.meetingDate && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {formData.meetingDate
                      ? format(formData.meetingDate, "yyyy-MM-dd HH:mm", {
                          locale: ko,
                        })
                      : "날짜 선택"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={formData.meetingDate}
                    onSelect={(date) =>
                      setFormData({ ...formData, meetingDate: date })
                    }
                    locale={ko}
                  />
                </PopoverContent>
              </Popover>
            </div>

            <div className="space-y-2">
              <Label>미팅 장소</Label>
              <Input
                placeholder="미팅 장소 입력"
                value={formData.meetingLocation}
                onChange={(e) =>
                  setFormData({ ...formData, meetingLocation: e.target.value })
                }
              />
            </div>
          </div>

          {/* 계약 금액 */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>계약 금액 (만원)</Label>
              <Input
                type="number"
                placeholder="계약 금액"
                value={formData.contractAmount}
                onChange={(e) =>
                  setFormData({ ...formData, contractAmount: e.target.value })
                }
              />
            </div>

            <div className="space-y-2">
              <Label>다음 연락 예정일</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !formData.nextContactDate && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {formData.nextContactDate
                      ? format(formData.nextContactDate, "yyyy-MM-dd", {
                          locale: ko,
                        })
                      : "날짜 선택"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={formData.nextContactDate}
                    onSelect={(date) =>
                      setFormData({ ...formData, nextContactDate: date })
                    }
                    locale={ko}
                  />
                </PopoverContent>
              </Popover>
            </div>
          </div>

          {/* 메모 */}
          <div className="space-y-2">
            <Label>메모</Label>
            <Textarea
              placeholder="메모를 입력하세요..."
              value={formData.memo}
              onChange={(e) =>
                setFormData({ ...formData, memo: e.target.value })
              }
              rows={4}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            취소
          </Button>
          <Button onClick={handleSubmit} disabled={loading}>
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            저장
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
