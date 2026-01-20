"use client";

import { useEffect, useState, useCallback } from "react";
import {
  UserCog,
  Users,
  CheckCircle,
  XCircle,
  Building2,
  Search,
  Filter,
} from "lucide-react";
import { EligibilityCriteriaCard } from "@/components/distribution";
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

// Types
interface Team {
  id: string;
  name: string;
}

interface Member {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  role: string;
  is_active: boolean;
  team: Team | null;
}

interface MemberQualification {
  id: string;
  member_id: string;
  newbie_test_passed: boolean;
  newbie_test_passed_at: string | null;
  created_at: string;
  updated_at: string;
  member: Member;
}

export default function MemberQualificationsPage() {
  const [qualifications, setQualifications] = useState<MemberQualification[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [teamFilter, setTeamFilter] = useState<string>("all");
  const [testPassedFilter, setTestPassedFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");

  // Fetch teams
  const fetchTeams = useCallback(async () => {
    try {
      const response = await fetch("/api/teams");
      const result = await response.json();

      if (response.ok) {
        setTeams(result.data || []);
      }
    } catch (error) {
      console.error("Failed to fetch teams:", error);
    }
  }, []);

  // Fetch qualifications
  const fetchQualifications = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      if (teamFilter && teamFilter !== "all") {
        params.set("teamId", teamFilter);
      }
      if (testPassedFilter && testPassedFilter !== "all") {
        params.set("testPassed", testPassedFilter);
      }

      const response = await fetch(`/api/member-qualifications?${params}`);
      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error);
      }

      setQualifications(result.data || []);
    } catch (error) {
      toast.error("멤버 자격 목록을 불러오는데 실패했습니다");
      console.error(error);
    } finally {
      setLoading(false);
    }
  }, [teamFilter, testPassedFilter]);

  useEffect(() => {
    fetchTeams();
  }, [fetchTeams]);

  useEffect(() => {
    fetchQualifications();
  }, [fetchQualifications]);

  // Filter qualifications by search
  const filteredQualifications = qualifications.filter((q) => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      q.member?.name?.toLowerCase().includes(query) ||
      q.member?.email?.toLowerCase().includes(query) ||
      q.member?.team?.name?.toLowerCase().includes(query)
    );
  });

  // Calculate summary stats
  const stats = {
    total: qualifications.length,
    testPassed: qualifications.filter((q) => q.newbie_test_passed).length,
    testNotPassed: qualifications.filter((q) => !q.newbie_test_passed).length,
  };

  // Toggle test passed
  const toggleTestPassed = async (qualification: MemberQualification) => {
    try {
      const response = await fetch("/api/member-qualifications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          member_id: qualification.member_id,
          newbie_test_passed: !qualification.newbie_test_passed,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error);
      }

      toast.success(
        qualification.newbie_test_passed
          ? "테스트 통과가 취소되었습니다"
          : "테스트 통과로 변경되었습니다"
      );
      fetchQualifications();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "변경에 실패했습니다"
      );
    }
  };

  // Format date
  const formatDate = (dateString: string | null) => {
    if (!dateString) return "-";
    return new Date(dateString).toLocaleDateString("ko-KR", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    });
  };

  return (
    <>
      <Header title="멤버 자격 관리" />
      <div className="flex flex-1 flex-col gap-4 p-4">
        {/* Summary Cards */}
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">전체 멤버</span>
              </div>
              <p className="text-2xl font-bold">{stats.total}명</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-green-500" />
                <span className="text-sm text-muted-foreground">테스트 통과</span>
              </div>
              <p className="text-2xl font-bold text-green-600">{stats.testPassed}명</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <XCircle className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">테스트 미통과</span>
              </div>
              <p className="text-2xl font-bold text-muted-foreground">{stats.testNotPassed}명</p>
            </CardContent>
          </Card>
        </div>

        {/* Main Card */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <UserCog className="h-5 w-5" />
                  멤버 자격 목록
                </CardTitle>
                <CardDescription>
                  멤버의 신입 테스트 통과 여부를 관리합니다. 테스트를 통과하면 C등급 이상의 리드를 배분받을 수 있습니다.
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {/* Filters */}
            <div className="mb-4 flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-2">
                <Filter className="h-4 w-4 text-muted-foreground" />
                <Select value={teamFilter} onValueChange={setTeamFilter}>
                  <SelectTrigger className="w-[150px]">
                    <SelectValue placeholder="팀 선택" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">전체 팀</SelectItem>
                    {teams.map((team) => (
                      <SelectItem key={team.id} value={team.id}>
                        {team.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <Select value={testPassedFilter} onValueChange={setTestPassedFilter}>
                <SelectTrigger className="w-[150px]">
                  <SelectValue placeholder="테스트 상태" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">전체</SelectItem>
                  <SelectItem value="true">테스트 통과</SelectItem>
                  <SelectItem value="false">미통과</SelectItem>
                </SelectContent>
              </Select>

              <div className="flex-1" />

              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="이름, 이메일, 팀 검색..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-[250px] pl-9"
                />
              </div>
            </div>

            {/* Table */}
            {loading ? (
              <div className="flex items-center justify-center h-32 text-muted-foreground">
                로딩 중...
              </div>
            ) : filteredQualifications.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-32 text-muted-foreground">
                <UserCog className="h-8 w-8 mb-2" />
                <p>등록된 멤버 자격이 없습니다</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>멤버</TableHead>
                    <TableHead>소속 팀</TableHead>
                    <TableHead className="text-center">신입 테스트</TableHead>
                    <TableHead>테스트 통과일</TableHead>
                    <TableHead className="text-center">배분 가능 등급</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredQualifications.map((qualification) => {
                    return (
                      <TableRow key={qualification.member_id}>
                        <TableCell>
                          <div>
                            <p className="font-medium">{qualification.member?.name}</p>
                            <p className="text-sm text-muted-foreground">
                              {qualification.member?.email}
                            </p>
                          </div>
                        </TableCell>
                        <TableCell>
                          {qualification.member?.team ? (
                            <div className="flex items-center gap-1">
                              <Building2 className="h-3 w-3 text-muted-foreground" />
                              {qualification.member.team.name}
                            </div>
                          ) : (
                            <span className="text-muted-foreground">-</span>
                          )}
                        </TableCell>
                        <TableCell className="text-center">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => toggleTestPassed(qualification)}
                            className="p-0"
                          >
                            {qualification.newbie_test_passed ? (
                              <div className="flex items-center gap-1 text-green-600">
                                <CheckCircle className="h-5 w-5" />
                                <span className="text-sm font-medium">통과</span>
                              </div>
                            ) : (
                              <div className="flex items-center gap-1 text-muted-foreground hover:text-foreground">
                                <XCircle className="h-5 w-5" />
                                <span className="text-sm">미통과</span>
                              </div>
                            )}
                          </Button>
                        </TableCell>
                        <TableCell>
                          {formatDate(qualification.newbie_test_passed_at)}
                        </TableCell>
                        <TableCell className="text-center">
                          {qualification.newbie_test_passed ? (
                            <div className="flex items-center justify-center gap-1">
                              <Badge variant="secondary" className="bg-green-100 text-green-700">A</Badge>
                              <Badge variant="secondary" className="bg-blue-100 text-blue-700">B</Badge>
                              <Badge variant="secondary" className="bg-yellow-100 text-yellow-700">C</Badge>
                              <Badge variant="secondary" className="bg-gray-100 text-gray-700">D</Badge>
                            </div>
                          ) : (
                            <Badge variant="secondary" className="bg-gray-100 text-gray-700">D만 가능</Badge>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        {/* Grade Eligibility Info Card */}
        <EligibilityCriteriaCard
          title="배분 자격 기준 안내"
          icon="shield"
          editable={true}
        />
      </div>
    </>
  );
}
