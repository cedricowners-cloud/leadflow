"use client";

import { useState } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Building2,
  Phone,
  Calendar,
  MapPin,
  FileEdit,
  Clock,
  AlertCircle,
  Briefcase,
  Users,
  TrendingUp,
  Building,
  AlertTriangle,
} from "lucide-react";
import { format, formatDistanceToNow, isToday, parseISO } from "date-fns";
import { ko } from "date-fns/locale";
import { ContactResultDialog } from "./contact-result-dialog";

export interface MyLead {
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
  source_date: string | null;
  created_at: string;
}

interface MyLeadTableProps {
  leads: MyLead[];
  loading: boolean;
  onLeadUpdate: () => void;
}

export function MyLeadTable({ leads, loading, onLeadUpdate }: MyLeadTableProps) {
  const [selectedLead, setSelectedLead] = useState<MyLead | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  const handleEditClick = (lead: MyLead) => {
    setSelectedLead(lead);
    setDialogOpen(true);
  };

  const getContactStatusColor = (status: string | undefined) => {
    if (!status) return "bg-gray-100 text-gray-700";

    switch (status) {
      case "통화 성공":
        return "bg-green-100 text-green-700";
      case "부재":
      case "미연락":
        return "bg-yellow-100 text-yellow-700";
      case "번호 오류":
      case "연락 거부":
        return "bg-red-100 text-red-700";
      default:
        return "bg-gray-100 text-gray-700";
    }
  };

  const getMeetingStatusColor = (status: string | undefined) => {
    if (!status || status === "해당없음") return "bg-gray-100 text-gray-700";

    switch (status) {
      case "미팅 완료":
        return "bg-green-100 text-green-700";
      case "미팅 예정":
        return "bg-blue-100 text-blue-700";
      case "미팅 취소":
        return "bg-red-100 text-red-700";
      default:
        return "bg-gray-100 text-gray-700";
    }
  };

  const getContractStatusColor = (status: string | undefined) => {
    if (!status || status === "해당없음") return "bg-gray-100 text-gray-700";

    switch (status) {
      case "계약 성사":
        return "bg-green-100 text-green-700";
      case "상담 중":
        return "bg-blue-100 text-blue-700";
      case "계약 실패":
        return "bg-red-100 text-red-700";
      default:
        return "bg-gray-100 text-gray-700";
    }
  };

  if (loading) {
    return (
      <div className="space-y-3">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="flex items-center gap-4 p-4">
            <Skeleton className="h-10 w-10 rounded-lg" />
            <div className="space-y-2 flex-1">
              <Skeleton className="h-4 w-[200px]" />
              <Skeleton className="h-3 w-[300px]" />
            </div>
            <Skeleton className="h-8 w-20" />
          </div>
        ))}
      </div>
    );
  }

  if (leads.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <AlertCircle className="h-12 w-12 text-muted-foreground mb-4" />
        <h3 className="text-lg font-medium">배분된 리드가 없습니다</h3>
        <p className="text-muted-foreground mt-1">
          아직 배분받은 리드가 없습니다.
        </p>
      </div>
    );
  }

  return (
    <TooltipProvider>
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[200px]">업체 정보</TableHead>
              <TableHead className="w-[180px]">상세 정보</TableHead>
              <TableHead className="w-[100px]">등급</TableHead>
              <TableHead className="w-[100px]">컨택 상태</TableHead>
              <TableHead className="w-[100px]">미팅 상태</TableHead>
              <TableHead className="w-[100px]">계약 상태</TableHead>
              <TableHead className="w-[120px]">배분일</TableHead>
              <TableHead className="w-[120px]">다음 연락</TableHead>
              <TableHead className="w-[80px] text-right">액션</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {leads.map((lead) => {
              const isNew =
                lead.assigned_at && isToday(parseISO(lead.assigned_at));
              const hasNextContact =
                lead.next_contact_date &&
                new Date(lead.next_contact_date) <= new Date();

              return (
                <TableRow
                  key={lead.id}
                  className={isNew ? "bg-blue-50/50" : undefined}
                >
                  {/* 업체 정보 */}
                  <TableCell>
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        {isNew && (
                          <Badge variant="default" className="text-xs">
                            NEW
                          </Badge>
                        )}
                        <span className="font-medium">
                          {lead.company_name || "업체명 없음"}
                        </span>
                      </div>
                      <div className="flex items-center gap-3 text-sm text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Building2 className="h-3 w-3" />
                          {lead.representative_name || "-"}
                        </span>
                        <span className="flex items-center gap-1">
                          <Phone className="h-3 w-3" />
                          {lead.phone}
                        </span>
                        {lead.region && (
                          <span className="flex items-center gap-1">
                            <MapPin className="h-3 w-3" />
                            {lead.region}
                          </span>
                        )}
                      </div>
                    </div>
                  </TableCell>

                  {/* 상세 정보 */}
                  <TableCell>
                    <div className="space-y-1 text-sm">
                      {/* 업종 */}
                      {lead.industry && (
                        <div className="flex items-center gap-1.5 text-muted-foreground">
                          <Briefcase className="h-3 w-3" />
                          <span>{lead.industry}</span>
                        </div>
                      )}
                      {/* 매출 규모 */}
                      {(lead.annual_revenue || lead.annual_revenue_min || lead.annual_revenue_max) && (
                        <div className="flex items-center gap-1.5 text-muted-foreground">
                          <TrendingUp className="h-3 w-3" />
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
                      {/* 종업원수 */}
                      {(lead.employee_count || lead.employee_count_min || lead.employee_count_max) && (
                        <div className="flex items-center gap-1.5 text-muted-foreground">
                          <Users className="h-3 w-3" />
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
                      {/* 사업자 유형 */}
                      {lead.business_type && (
                        <div className="flex items-center gap-1.5 text-muted-foreground">
                          <Building className="h-3 w-3" />
                          <span>{lead.business_type}</span>
                        </div>
                      )}
                      {/* 세금 체납 여부 */}
                      {lead.tax_delinquency === true && (
                        <div className="flex items-center gap-1.5 text-red-600">
                          <AlertTriangle className="h-3 w-3" />
                          <span>세금 체납</span>
                        </div>
                      )}
                      {/* 연락 가능 시간 */}
                      {lead.available_time && (
                        <div className="flex items-center gap-1.5 text-blue-600">
                          <Clock className="h-3 w-3" />
                          <span>{lead.available_time}</span>
                        </div>
                      )}
                      {/* 정보 없음 표시 */}
                      {!lead.industry &&
                        !lead.annual_revenue &&
                        !lead.annual_revenue_min &&
                        !lead.employee_count &&
                        !lead.employee_count_min &&
                        !lead.business_type &&
                        !lead.available_time && (
                          <span className="text-muted-foreground">-</span>
                        )}
                    </div>
                  </TableCell>

                  {/* 등급 */}
                  <TableCell>
                    {lead.grade ? (
                      <Badge
                        style={{
                          backgroundColor: lead.grade.color || undefined,
                        }}
                        className="text-white"
                      >
                        {lead.grade.name}등급
                      </Badge>
                    ) : (
                      <span className="text-muted-foreground">-</span>
                    )}
                  </TableCell>

                  {/* 컨택 상태 */}
                  <TableCell>
                    <Badge
                      variant="secondary"
                      className={getContactStatusColor(
                        lead.contact_status?.name
                      )}
                    >
                      {lead.contact_status?.name || "미연락"}
                    </Badge>
                  </TableCell>

                  {/* 미팅 상태 */}
                  <TableCell>
                    {lead.meeting_status ? (
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Badge
                            variant="secondary"
                            className={getMeetingStatusColor(
                              lead.meeting_status.name
                            )}
                          >
                            {lead.meeting_status.name}
                          </Badge>
                        </TooltipTrigger>
                        {lead.meeting_date && (
                          <TooltipContent>
                            <div className="text-xs">
                              <div>
                                {format(
                                  new Date(lead.meeting_date),
                                  "yyyy-MM-dd HH:mm"
                                )}
                              </div>
                              {lead.meeting_location && (
                                <div>{lead.meeting_location}</div>
                              )}
                            </div>
                          </TooltipContent>
                        )}
                      </Tooltip>
                    ) : (
                      <span className="text-muted-foreground">-</span>
                    )}
                  </TableCell>

                  {/* 계약 상태 */}
                  <TableCell>
                    {lead.contract_status ? (
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Badge
                            variant="secondary"
                            className={getContractStatusColor(
                              lead.contract_status.name
                            )}
                          >
                            {lead.contract_status.name}
                          </Badge>
                        </TooltipTrigger>
                        {lead.contract_amount && (
                          <TooltipContent>
                            계약금액: {lead.contract_amount.toLocaleString()}만원
                          </TooltipContent>
                        )}
                      </Tooltip>
                    ) : (
                      <span className="text-muted-foreground">-</span>
                    )}
                  </TableCell>

                  {/* 배분일 */}
                  <TableCell>
                    {lead.assigned_at ? (
                      <div className="flex items-center gap-1 text-sm">
                        <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
                        <span>
                          {format(new Date(lead.assigned_at), "MM/dd HH:mm")}
                        </span>
                      </div>
                    ) : (
                      <span className="text-muted-foreground">-</span>
                    )}
                  </TableCell>

                  {/* 다음 연락 */}
                  <TableCell>
                    {lead.next_contact_date ? (
                      <div
                        className={`flex items-center gap-1 text-sm ${
                          hasNextContact
                            ? "text-orange-600 font-medium"
                            : "text-muted-foreground"
                        }`}
                      >
                        <Clock className="h-3.5 w-3.5" />
                        <span>
                          {formatDistanceToNow(
                            new Date(lead.next_contact_date),
                            { addSuffix: true, locale: ko }
                          )}
                        </span>
                      </div>
                    ) : (
                      <span className="text-muted-foreground">-</span>
                    )}
                  </TableCell>

                  {/* 액션 */}
                  <TableCell className="text-right">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleEditClick(lead)}
                    >
                      <FileEdit className="h-4 w-4 mr-1" />
                      입력
                    </Button>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      <ContactResultDialog
        lead={selectedLead}
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onSuccess={onLeadUpdate}
      />
    </TooltipProvider>
  );
}
