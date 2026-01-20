# RULES.md - LeadFlow 실행 규칙

## Core Operational Rules

### Task Management
- TodoRead() → TodoWrite() → Execute → Track
- 병렬 가능한 작업은 병렬로 실행
- 실행 전 검증, 완료 후 확인
- lint/typecheck 통과 후 완료 처리

### File Operations
- Read → Write/Edit 순서 준수
- 절대 경로 사용
- 트랜잭션 방식 선호
- 자동 커밋 금지 (명시적 요청 시만)

### Framework Compliance
- package.json 확인 후 라이브러리 사용
- 기존 프로젝트 패턴 준수
- import 스타일 통일
- Next.js App Router 컨벤션 준수

## LeadFlow Specific Rules

### Icon Usage (Critical)
```tsx
// DO: lucide-react 사용
import { Upload, Users, Settings } from "lucide-react";
<Upload className="w-4 h-4" />

// DON'T: 이모지 사용 금지
❌ 📊 ✅ ❌ 🔄
```

### Component Structure
```
components/
├── ui/          # shadcn/ui 기본 컴포넌트
├── layout/      # 레이아웃 컴포넌트
├── leads/       # 리드 관련 컴포넌트
├── dashboard/   # 대시보드 컴포넌트
├── settings/    # 설정 컴포넌트
├── accompany/   # 동행 요청 컴포넌트
└── common/      # 공통 컴포넌트
```

### API Route Structure
```
app/api/
├── auth/
├── leads/
│   ├── route.ts           # GET, POST
│   ├── [id]/route.ts      # GET, PATCH, DELETE
│   ├── upload/route.ts
│   └── assign/route.ts
├── teams/
├── members/
├── grade-rules/
├── statuses/
├── accompany-requests/
└── dashboard/
```

### Database Rules
- RLS 정책 필수 적용
- UUID 기본키
- soft delete 사용 (is_active)
- updated_at 트리거 설정

### Authentication Rules
```typescript
// 페이지 레벨 권한 체크
await checkRole(['system_admin']);

// API 레벨 권한 체크
const member = await getCurrentMember();
if (member.role !== 'system_admin') {
  return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
}
```

### Role-Based Access
| 기능 | system_admin | sales_manager | team_leader |
|------|:------------:|:-------------:|:-----------:|
| CSV 업로드 | ✅ | ❌ | ❌ |
| 등급 규칙 설정 | ✅ | ❌ | ❌ |
| 리드 배분 | ✅ | ❌ | ❌ |
| 팀 리드 조회 | ✅ | ✅ (담당팀) | ❌ |
| 본인 리드 조회 | ✅ | ✅ | ✅ |
| 결과 입력 | ❌ | ❌ | ✅ |
| 동행 요청 | ❌ | ❌ | ✅ |

### Grade Classification Rules
```typescript
// 등급 적용 순서: 우선순위 낮은 것부터 (A=1, B=2, C=3, D=4)
// 첫 번째 매칭 등급 부여
// 미매칭 시 기본 등급 (D)
```

### Validation Rules
```typescript
// Zod 스키마 위치
lib/validations/
├── lead.ts
├── team.ts
├── member.ts
├── grade-rule.ts
└── accompany.ts
```

## Quick Reference

### Do
- ✅ lucide-react 아이콘 사용
- ✅ shadcn/ui 컴포넌트 우선
- ✅ RLS 정책 적용
- ✅ Zod 스키마 검증
- ✅ 역할 기반 접근 제어
- ✅ 변경 이력 추적
- ✅ 절대 경로 사용

### Don't
- ❌ 이모지 사용
- ❌ 커스텀 UI 컴포넌트 (불필요 시)
- ❌ RLS 우회
- ❌ 하드코딩된 설정값
- ❌ 자동 커밋
- ❌ 상대 경로 import
