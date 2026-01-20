# LeadFlow 개발 현황

## 현재 Phase: Phase 1 - 인증 및 조직 관리

| 항목 | 내용 |
|------|------|
| 마지막 업데이트 | 2026.01.09 |
| 현재 상태 | 완료 |
| 다음 작업 | Phase 2 - CSV 업로드 및 등급 시스템 |

---

## Phase 개요

| Phase | 기간 | 주요 기능 | 상태 |
|-------|------|-----------|------|
| **0** | 1주 | 프로젝트 초기 설정, DB 스키마 | 완료 |
| **1** | 2주 | 인증, 팀/멤버 관리 | 완료 |
| 2 | 2주 | CSV 업로드, 등급 규칙, 자동 분류 | 대기 |
| 3 | 2주 | 리드 목록, 팀장 배분 | 대기 |
| 4 | 2주 | 팀장 개인 페이지, 결과 입력 | 대기 |
| 5 | 2주 | 영업관리자 대시보드, 동행 요청 | 대기 |
| 6 | 2주 | 시스템관리자 대시보드, 리포트 | 대기 |
| 7 | 1주 | 시스템 설정 기능 | 대기 |
| 8 | 1주 | 테스트, 버그 수정, 배포 | 대기 |

---

## Phase 0: 프로젝트 초기 설정 (완료)

### 체크리스트

- [x] **0.1 Next.js 프로젝트 생성**
  - [x] `npx create-next-app@latest leadflow --typescript --tailwind --app`
  - [x] 기본 폴더 구조 정리

- [x] **0.2 의존성 설치**
  - [x] Supabase: `@supabase/supabase-js @supabase/ssr`
  - [x] State: `zustand`
  - [x] Form: `react-hook-form @hookform/resolvers zod`
  - [x] Table: `@tanstack/react-table`
  - [x] Chart: `recharts`
  - [x] Icons: `lucide-react`
  - [x] CSV: `papaparse @types/papaparse`

- [x] **0.3 shadcn/ui 설정**
  - [x] `npx shadcn@latest init`
  - [x] 필수 컴포넌트 설치:
    - button, input, select, table
    - dialog, dropdown-menu, badge, card
    - tabs, toast, sidebar, separator
    - avatar, tooltip, popover, command

- [x] **0.4 Supabase 설정**
  - [x] Supabase 프로젝트 생성
  - [x] 환경 변수 설정 (.env.local)
  - [x] Supabase 클라이언트 설정 (lib/supabase/)

- [x] **0.5 데이터베이스 스키마**
  - [x] SQL 스키마 실행 (EXECUTION.md 섹션 2.2)
  - [x] RLS 정책 적용
  - [x] 기본 데이터 삽입 (등급, 상태값, CSV 매핑)
  - [x] TypeScript 타입 생성 (src/types/database.types.ts)

- [x] **0.6 기본 레이아웃**
  - [x] Root Layout 설정
  - [x] globals.css 테마 설정 (ADMIN_UI.md 참조)
  - [x] 인증/대시보드 레이아웃 그룹 생성

### 완료 조건 (모두 충족)
- [x] Next.js 프로젝트 실행 가능
- [x] Supabase 연결 확인
- [x] 기본 페이지 접근 가능

---

## Phase 1: 인증 및 조직 관리 (완료)

### 체크리스트

- [x] **1.1 인증 시스템**
  - [x] 로그인 페이지 레이아웃 (/login)
  - [x] 로그인 폼 완성 (이메일/비밀번호 입력)
  - [x] Supabase Auth 연동
  - [x] 미들웨어 (인증 체크)
  - [x] 로그아웃 기능

- [x] **1.2 팀 관리**
  - [x] 팀 목록 페이지 (/teams)
  - [x] 팀 CRUD API (/api/teams)
  - [x] 팀 생성/수정 폼

- [x] **1.3 멤버 관리**
  - [x] 멤버 목록 페이지 (/members)
  - [x] 멤버 CRUD API (/api/members)
  - [x] 멤버 생성/수정 폼
  - [x] 역할 선택 (system_admin, sales_manager, team_leader)

- [x] **1.4 사이드바/헤더**
  - [x] 사이드바 컴포넌트
  - [x] 역할별 메뉴 표시
  - [x] 사용자 정보 표시
  - [x] 로그아웃 버튼

### 관련 테이블
- teams
- members
- manager_teams

### 관련 API
- POST /api/auth/login
- POST /api/auth/logout
- GET /api/auth/me
- GET/POST/PATCH/DELETE /api/teams
- GET/POST/PATCH/DELETE /api/members

---

## Phase 2: CSV 업로드 및 등급 시스템 (예정)

### 체크리스트

- [ ] **2.1 등급 관리**
  - [ ] 등급 목록 (/settings/grades)
  - [ ] 등급 CRUD API (/api/grades)
  - [ ] 색상 선택, 우선순위 설정

- [ ] **2.2 등급 규칙 설정**
  - [ ] 규칙 목록/편집 UI
  - [ ] 조건 빌더 (field, operator, value)
  - [ ] AND/OR 로직 선택
  - [ ] 규칙 CRUD API (/api/grade-rules)

- [ ] **2.3 규칙 테스트**
  - [ ] 테스트 데이터 입력 폼
  - [ ] 테스트 API (/api/grade-rules/test)
  - [ ] 평가 로그 표시

- [ ] **2.4 CSV 업로드**
  - [ ] 업로드 페이지 (/leads/upload)
  - [ ] CSV 파싱 (papaparse)
  - [ ] 컬럼 매핑 적용
  - [ ] 중복 체크
  - [ ] 등급 자동 분류
  - [ ] 업로드 결과 표시

### 관련 테이블
- lead_grades
- grade_rules
- csv_mappings
- upload_batches
- leads

### 관련 API
- GET/POST/PATCH/DELETE /api/grades
- GET/POST/PATCH/DELETE /api/grade-rules
- POST /api/grade-rules/test
- POST /api/leads/upload

---

## Phase 3: 리드 관리 및 배분 (예정)

### 체크리스트

- [ ] **3.1 리드 목록**
  - [ ] 리드 목록 페이지 (/leads)
  - [ ] 필터링 (기간, 등급, 팀, 상태)
  - [ ] 검색 (업체명, 대표자, 연락처)
  - [ ] 정렬, 페이지네이션
  - [ ] 리드 API (/api/leads)

- [ ] **3.2 리드 상세**
  - [ ] 상세 페이지 (/leads/[id])
  - [ ] 정보 표시, 이력 조회

- [ ] **3.3 팀장 배분**
  - [ ] 배분 드롭다운 컴포넌트
  - [ ] 단일 배분 API (/api/leads/assign)
  - [ ] 일괄 배분 API (/api/leads/bulk-assign)
  - [ ] 배분 이력 저장

- [ ] **3.4 등급 수동 변경**
  - [ ] 등급 변경 드롭다운
  - [ ] 변경 API (/api/leads/:id/grade)
  - [ ] 변경 이력 저장

### 관련 테이블
- leads
- lead_histories
- lead_statuses

### 관련 API
- GET /api/leads
- GET/PATCH /api/leads/:id
- PATCH /api/leads/:id/grade
- POST /api/leads/assign
- POST /api/leads/bulk-assign

---

## Phase 4: 팀장 기능 (예정)

### 체크리스트

- [ ] **4.1 내 리드 목록**
  - [ ] 팀장용 페이지 (/my-leads)
  - [ ] 상태별 필터 (신규, 미처리, 진행중, 완료)

- [ ] **4.2 결과 입력**
  - [ ] 컨택 상태 선택
  - [ ] 미팅 상태/일정 입력
  - [ ] 계약 상태/금액 입력
  - [ ] 메모, 다음 연락일

- [ ] **4.3 개인 실적**
  - [ ] 내 실적 페이지 (/my-stats)
  - [ ] 컨택률, 미팅률, 계약률

### 관련 테이블
- leads
- lead_statuses
- lead_histories

### 관련 API
- GET /api/leads (팀장 필터)
- PATCH /api/leads/:id
- GET /api/dashboard/my-stats

---

## Phase 5: 영업관리자 및 동행 요청 (예정)

### 체크리스트

- [ ] **5.1 팀 대시보드**
  - [ ] 영업관리자용 페이지 (/team-dashboard)
  - [ ] 팀원별 현황, 팀 파이프라인
  - [ ] 팀 실적 추이

- [ ] **5.2 동행 요청**
  - [ ] 동행 요청 페이지 (/accompany)
  - [ ] 요청 생성, 수락/거절
  - [ ] 받은/보낸 요청 탭

### 관련 테이블
- accompany_requests

### 관련 API
- GET /api/dashboard/team-stats
- GET/POST /api/accompany-requests
- POST /api/accompany-requests/:id/accept
- POST /api/accompany-requests/:id/reject

---

## Phase 6: 시스템 관리자 대시보드 (예정)

### 체크리스트

- [ ] **6.1 전체 대시보드**
  - [ ] 대시보드 페이지 (/dashboard)
  - [ ] 오늘의 요약, 등급별 분포
  - [ ] 팀별/팀장별 현황
  - [ ] 파이프라인 퍼널
  - [ ] 기간별 추이 차트

- [ ] **6.2 Excel 내보내기**
  - [ ] 리드 목록 내보내기
  - [ ] 성과 리포트 내보내기

### 관련 API
- GET /api/dashboard/stats

---

## Phase 7: 시스템 설정 (예정)

### 체크리스트

- [ ] **7.1 상태값 관리**
  - [ ] 상태값 페이지 (/settings/statuses)
  - [ ] 컨택/미팅/계약 상태 CRUD

- [ ] **7.2 CSV 매핑**
  - [ ] 매핑 페이지 (/settings/csv-mapping)
  - [ ] 컬럼 매핑 설정

- [ ] **7.3 기타 설정**
  - [ ] 설정 페이지 (/settings)
  - [ ] 대시보드 새로고침 주기 등

### 관련 테이블
- lead_statuses
- csv_mappings
- system_settings

### 관련 API
- GET/POST/PATCH/DELETE /api/statuses
- GET/PATCH /api/csv-mappings
- GET/PATCH /api/settings

---

## Phase 8: 테스트 및 배포 (예정)

### 체크리스트

- [ ] **8.1 테스트**
  - [ ] 주요 기능 테스트
  - [ ] 권한 검증 테스트
  - [ ] 등급 분류 로직 테스트

- [ ] **8.2 버그 수정**
  - [ ] 발견된 버그 수정
  - [ ] 성능 최적화

- [ ] **8.3 배포**
  - [ ] Vercel 배포 설정
  - [ ] 환경 변수 설정
  - [ ] 도메인 연결
  - [ ] 초기 관리자 계정 생성

---

## 기술 스택 요약

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

---

## 핵심 규칙

1. **아이콘**: lucide-react만 사용 (이모지 사용 금지)
2. **언어**: 한국어 인터페이스
3. **권한**: RLS 정책 필수 적용
4. **검증**: Zod 스키마 사용
5. **절대 경로**: import 시 절대 경로 사용

---

_- 문서 끝 -_
