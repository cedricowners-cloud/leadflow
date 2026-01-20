"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { LogIn } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";

const EMAIL_DOMAIN = "@leadflow.com";

export default function LoginPage() {
  const router = useRouter();
  const [loginId, setLoginId] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const supabase = createClient();

    // 아이디에 @가 포함되어 있으면 그대로 사용, 아니면 도메인 추가
    const email = loginId.includes("@") ? loginId : `${loginId}${EMAIL_DOMAIN}`;

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      toast.error("로그인 실패", {
        description: "아이디 또는 비밀번호를 확인해주세요.",
      });
      setLoading(false);
      return;
    }

    // 로그인한 사용자의 역할 조회
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { data: member } = await supabase
        .from("members")
        .select("role")
        .eq("user_id", user.id)
        .single();

      toast.success("로그인 성공");

      // 역할별 메인 페이지로 리다이렉트
      if (member?.role === "team_leader") {
        router.push("/my-leads");
      } else if (member?.role === "sales_manager") {
        router.push("/team-dashboard");
      } else {
        router.push("/dashboard");
      }
      router.refresh();
    } else {
      toast.success("로그인 성공");
      router.push("/dashboard");
      router.refresh();
    }
  };

  return (
    <Card>
      <CardHeader className="space-y-1">
        <CardTitle className="text-2xl font-bold">LeadFlow</CardTitle>
        <CardDescription>
          리드 배분 및 성과 관리 통합 플랫폼
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleLogin} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="loginId">아이디</Label>
            <Input
              id="loginId"
              type="text"
              placeholder="admin"
              value={loginId}
              onChange={(e) => setLoginId(e.target.value)}
              required
            />
            <p className="text-xs text-muted-foreground">
              @leadflow.com은 자동으로 추가됩니다
            </p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">비밀번호</Label>
            <Input
              id="password"
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>
          <Button type="submit" className="w-full" disabled={loading}>
            <LogIn className="mr-2 h-4 w-4" />
            {loading ? "로그인 중..." : "로그인"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
