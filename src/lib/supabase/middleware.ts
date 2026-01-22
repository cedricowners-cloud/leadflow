import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({
            request,
          });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // Do not run code between createServerClient and
  // supabase.auth.getUser(). A simple mistake could make it very hard to debug
  // issues with users being randomly logged out.

  const {
    data: { user },
  } = await supabase.auth.getUser();

  // 인증되지 않은 사용자 -> 로그인 페이지로 (login, api/auth, api/seed, api/leads/webhook 제외)
  if (
    !user &&
    !request.nextUrl.pathname.startsWith("/login") &&
    !request.nextUrl.pathname.startsWith("/api/auth") &&
    !request.nextUrl.pathname.startsWith("/api/seed") &&
    !request.nextUrl.pathname.startsWith("/api/leads/webhook")
  ) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  // 인증된 사용자가 로그인 페이지 접근 -> 대시보드로
  if (user && request.nextUrl.pathname.startsWith("/login")) {
    const url = request.nextUrl.clone();
    url.pathname = "/dashboard";
    return NextResponse.redirect(url);
  }

  // 인증된 사용자: 비밀번호 변경 필요 여부 확인
  if (
    user &&
    !request.nextUrl.pathname.startsWith("/change-password") &&
    !request.nextUrl.pathname.startsWith("/api/auth") &&
    !request.nextUrl.pathname.startsWith("/login")
  ) {
    // members 테이블에서 must_change_password 확인
    const { data: member } = await supabase
      .from("members")
      .select("must_change_password")
      .eq("user_id", user.id)
      .single();

    // 비밀번호 변경이 필요한 경우 리다이렉트
    if (member?.must_change_password === true) {
      const url = request.nextUrl.clone();
      url.pathname = "/change-password";
      return NextResponse.redirect(url);
    }
  }

  return supabaseResponse;
}
