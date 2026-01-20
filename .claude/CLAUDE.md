# LeadFlow - SuperClaude Framework

## Project Entry Point

LeadFlow는 리드 배분 및 성과 관리 통합 플랫폼입니다.

## Framework References

@PRINCIPLES.md
@RULES.md
@ORCHESTRATOR.md

## Project Documents

@PRD.md
@EXECUTION.md
@ADMIN_UI.md
@CLIENT_UI.md

## Tech Stack

| 영역 | 기술 |
|------|------|
| Frontend | Next.js 14 (App Router) |
| Styling | Tailwind CSS + shadcn/ui |
| State | Zustand |
| Form | React Hook Form + Zod |
| Table | TanStack Table |
| Chart | Recharts |
| Icons | lucide-react |
| Backend | Next.js API Routes |
| Database | Supabase (PostgreSQL) |
| Auth | Supabase Auth |
| Deploy | Vercel |

## Key Constraints

1. **아이콘**: lucide-react만 사용 (이모지 사용 금지)
2. **언어**: 한국어 인터페이스
3. **인코딩**: UTF-8, EUC-KR CSV 지원
4. **브라우저**: Chrome 90+, Safari 14+, Edge 90+

## User Roles

| 역할 | 권한 범위 |
|------|-----------|
| system_admin | 전체 시스템 관리 |
| sales_manager | 담당 팀 관리 |
| team_leader | 본인 리드 관리 |

## Development Phases

| Phase | 기능 |
|-------|------|
| 1 | 인증, 팀/멤버 관리 |
| 2 | CSV 업로드, 등급 규칙, 자동 분류 |
| 3 | 리드 목록, 팀장 배분 |
| 4 | 팀장 개인 페이지, 결과 입력 |
| 5 | 영업관리자 대시보드, 동행 요청 |
| 6 | 시스템관리자 대시보드 |
| 7 | 시스템 설정 |
| 8 | 테스트, 배포 |
