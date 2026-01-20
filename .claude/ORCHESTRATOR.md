# ORCHESTRATOR.md - LeadFlow 라우팅 시스템

## Detection Engine

### Domain Identification

```yaml
leads:
  keywords: [리드, lead, CSV, 업로드, 배분, 등급, 분류]
  file_patterns: ["**/leads/**", "**/lead-*"]
  typical_operations: [upload, classify, assign, list, filter]

teams:
  keywords: [팀, team, 영업관리자, 조직]
  file_patterns: ["**/teams/**", "**/team-*"]
  typical_operations: [create, update, list, assign]

members:
  keywords: [팀장, 멤버, member, 컨설턴트]
  file_patterns: ["**/members/**", "**/member-*"]
  typical_operations: [create, update, list, activate]

grades:
  keywords: [등급, grade, 규칙, rule, 분류, classify]
  file_patterns: ["**/grade*/**", "**/settings/grades/**"]
  typical_operations: [define, configure, test, apply]

dashboard:
  keywords: [대시보드, dashboard, 통계, stats, 현황]
  file_patterns: ["**/dashboard/**", "**/stats/**"]
  typical_operations: [view, filter, export]

accompany:
  keywords: [동행, accompany, 요청, request, 미팅]
  file_patterns: ["**/accompany/**"]
  typical_operations: [request, accept, reject, list]

settings:
  keywords: [설정, settings, 상태값, status, 매핑]
  file_patterns: ["**/settings/**"]
  typical_operations: [configure, update, list]

auth:
  keywords: [인증, auth, 로그인, login, 권한]
  file_patterns: ["**/auth/**", "middleware.ts"]
  typical_operations: [login, logout, check, protect]
```

### Complexity Detection

```yaml
simple:
  indicators:
    - 단일 컴포넌트 수정
    - API 엔드포인트 하나
    - UI 스타일링
  token_budget: 5K

moderate:
  indicators:
    - 멀티 파일 수정
    - CRUD 구현
    - 폼 + 검증
  token_budget: 15K

complex:
  indicators:
    - 새 기능 전체 구현
    - DB 스키마 변경
    - 권한 시스템 수정
  token_budget: 30K+
```

## Routing Intelligence

### Master Routing Table

| Pattern | Domain | Auto-Activates | Tools |
|---------|--------|----------------|-------|
| "CSV 업로드" | leads | backend persona | [Read, Write, Edit, Bash] |
| "등급 규칙" | grades | backend persona, --think | [Read, Write, Edit] |
| "리드 목록" | leads | frontend persona | [Read, Edit] |
| "대시보드" | dashboard | frontend persona | [Read, Edit] |
| "동행 요청" | accompany | fullstack persona | [Read, Write, Edit] |
| "팀 관리" | teams | backend persona | [Read, Write, Edit] |
| "권한 설정" | auth | security persona, --think | [Read, Edit] |

### Persona Auto-Activation

```yaml
frontend:
  triggers:
    - 컴포넌트, UI, 화면, 스타일
    - React, Tailwind, shadcn
  focus: [UI/UX, 접근성, 반응형]

backend:
  triggers:
    - API, 데이터베이스, Supabase
    - 로직, 처리, 검증
  focus: [성능, 보안, 데이터 무결성]

fullstack:
  triggers:
    - 기능 구현, 페이지 개발
    - 프론트 + 백엔드
  focus: [통합, 일관성]

security:
  triggers:
    - 인증, 권한, RLS
    - 보안, 접근 제어
  focus: [취약점, 권한 검증]
```

## Quality Gates

### LeadFlow Validation Checklist

```yaml
code_quality:
  - TypeScript 타입 완전성
  - Zod 스키마 검증
  - ESLint 통과
  - 불필요한 console.log 제거

security:
  - RLS 정책 적용 확인
  - 권한 체크 로직
  - SQL Injection 방지
  - XSS 방지

ui_ux:
  - lucide-react 아이콘만 사용
  - shadcn/ui 컴포넌트 활용
  - 반응형 디자인
  - 한국어 레이블

performance:
  - 페이지 로딩 3초 이내
  - 불필요한 리렌더링 방지
  - 적절한 데이터 페칭
```

### Task Completion Criteria

```yaml
completion_requirements:
  - lint/typecheck 통과
  - 기능 동작 확인
  - 권한 검증 완료
  - UI 일관성 확인

evidence_requirements:
  - 코드 변경 내역
  - 테스트 결과 (해당 시)
  - 스크린샷 (UI 변경 시)
```

## Integration Points

### Supabase Integration

```yaml
client_types:
  browser: "@/lib/supabase/client"
  server: "@/lib/supabase/server"
  admin: "@/lib/supabase/admin"

operations:
  - RLS 정책 확인
  - 트랜잭션 처리
  - 타입 자동 생성
```

### shadcn/ui Components

```yaml
priority_components:
  - Button, Input, Select
  - Table, Dialog, Card
  - DropdownMenu, Badge
  - Tabs, Toast

custom_components:
  - GradeBadge (등급 표시)
  - StatusBadge (상태 표시)
  - LeadTable (리드 테이블)
  - AssignDropdown (배분 드롭다운)
```

## Emergency Protocols

### Error Recovery

```yaml
supabase_error:
  - RLS 정책 확인
  - 권한 체크
  - 연결 상태 확인

validation_error:
  - Zod 스키마 검토
  - 입력 데이터 확인
  - 에러 메시지 명확화

ui_error:
  - 컴포넌트 import 확인
  - 스타일 충돌 검토
  - 콘솔 에러 확인
```

### Graceful Degradation

```yaml
level_1:
  - 선택적 기능 비활성화
  - 캐시 활용

level_2:
  - 기본 기능만 유지
  - 에러 바운더리 활성화

level_3:
  - 필수 기능만 동작
  - 오프라인 알림
```
