# LeadFlow Execution Document

## 기술 구현 명세서

| 항목      | 내용              |
| --------- | ----------------- |
| 버전      | v1.0              |
| 작성일    | 2026.01.08        |
| 작성자    | 이설희            |
| 기준 문서 | LeadFlow PRD v1.4 |

---

## 1. 기술 스택 및 아키텍처

### 1.1 기술 스택

| 영역             | 기술                  | 버전              | 용도                                                |
| ---------------- | --------------------- | ----------------- | --------------------------------------------------- |
| Frontend         | Next.js               | 14.x (App Router) | React 기반 풀스택 프레임워크                        |
| UI Library       | Tailwind CSS          | 3.x               | 스타일링                                            |
| UI Components    | shadcn/ui             | latest            | 재사용 가능한 컴포넌트                              |
| Icons            | lucide-react          | latest            | 아이콘 라이브러리 (모든 아이콘은 lucide-react 사용) |
| State Management | Zustand               | 4.x               | 클라이언트 상태 관리                                |
| Form             | React Hook Form + Zod | latest            | 폼 관리 및 유효성 검증                              |
| Table            | TanStack Table        | 8.x               | 데이터 테이블                                       |
| Chart            | Recharts              | 2.x               | 대시보드 차트                                       |
| Backend          | Next.js API Routes    | -                 | API 엔드포인트                                      |
| Database         | Supabase (PostgreSQL) | latest            | 데이터베이스 + Auth                                 |
| Auth             | Supabase Auth         | -                 | 인증/인가                                           |
| File Storage     | Supabase Storage      | -                 | CSV 파일 임시 저장                                  |
| Deployment       | Vercel                | -                 | 호스팅 + CI/CD                                      |

### 1.2 lucide-react 아이콘 가이드

프로젝트 전체에서 아이콘은 lucide-react만 사용한다. 이모지는 사용하지 않는다.

**설치:**

```bash
npm install lucide-react
```

**사용 예시:**

```tsx
import {
  LayoutDashboard,
  Users,
  Upload,
  Download,
  Settings,
  Building,
  UserCog,
  UserPlus,
  BarChart,
  Search,
  Filter,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Check,
  X,
  AlertCircle,
  Info,
  Trash2,
  Pencil,
  Plus,
  MoreVertical,
  Calendar,
  Phone,
  Mail,
  MapPin,
  Building2,
  Briefcase,
  TrendingUp,
  TrendingDown,
  Clock,
  CheckCircle,
  XCircle,
  Bell,
} from "lucide-react";

// 컴포넌트에서 사용
<Button>
  <Upload className="w-4 h-4 mr-2" />
  CSV 업로드
</Button>;
```

**주요 아이콘 매핑:**

| 용도        | 아이콘        | 컴포넌트명        |
| ----------- | ------------- | ----------------- |
| 대시보드    | 격자 레이아웃 | `LayoutDashboard` |
| 리드/사용자 | 사람들        | `Users`           |
| 업로드      | 위쪽 화살표   | `Upload`          |
| 다운로드    | 아래쪽 화살표 | `Download`        |
| 설정        | 톱니바퀴      | `Settings`        |
| 팀/조직     | 건물          | `Building`        |
| 멤버 관리   | 사람+톱니     | `UserCog`         |
| 동행 요청   | 사람+플러스   | `UserPlus`        |
| 통계/차트   | 막대 차트     | `BarChart`        |
| 검색        | 돋보기        | `Search`          |
| 필터        | 깔때기        | `Filter`          |
| 수정        | 연필          | `Pencil`          |
| 삭제        | 휴지통        | `Trash2`          |
| 추가        | 플러스        | `Plus`            |
| 더보기 메뉴 | 세로 점 3개   | `MoreVertical`    |
| 일정        | 달력          | `Calendar`        |
| 전화        | 전화기        | `Phone`           |
| 이메일      | 편지          | `Mail`            |
| 위치        | 지도 핀       | `MapPin`          |
| 성공/완료   | 체크 원형     | `CheckCircle`     |
| 실패/오류   | X 원형        | `XCircle`         |
| 경고        | 느낌표 원형   | `AlertCircle`     |
| 정보        | i 원형        | `Info`            |
| 알림        | 종            | `Bell`            |
| 시간        | 시계          | `Clock`           |
| 증가        | 위쪽 화살표   | `TrendingUp`      |
| 감소        | 아래쪽 화살표 | `TrendingDown`    |

### 1.3 시스템 아키텍처

```
+------------------------------------------------------------------+
|                         Client (Browser)                          |
+--------------------------------+---------------------------------+
                                 | HTTPS
                                 v
+------------------------------------------------------------------+
|                        Vercel (CDN + Edge)                        |
|  +--------------------------------------------------------------+ |
|  |                    Next.js Application                        | |
|  |  +---------------------+  +--------------------------------+  | |
|  |  |   Pages (SSR)       |  |      API Routes (/api/*)       |  | |
|  |  |  - Dashboard        |  |  - /api/leads                  |  | |
|  |  |  - Leads            |  |  - /api/teams                  |  | |
|  |  |  - Settings         |  |  - /api/grade-rules            |  | |
|  |  |  - My Page          |  |  - /api/accompany-requests     |  | |
|  |  +---------------------+  +--------------------------------+  | |
|  +--------------------------------------------------------------+ |
+--------------------------------+---------------------------------+
                                 | Supabase Client
                                 v
+------------------------------------------------------------------+
|                          Supabase                                 |
|  +------------------+  +------------------+  +------------------+ |
|  |   PostgreSQL     |  |   Auth Service   |  |     Storage      | |
|  |   - Tables       |  |   - JWT Token    |  |   - CSV Files    | |
|  |   - RLS Policy   |  |   - Sessions     |  |                  | |
|  +------------------+  +------------------+  +------------------+ |
+------------------------------------------------------------------+
```

### 1.4 프로젝트 폴더 구조

```
leadflow/
├── app/                          # Next.js App Router
│   ├── (auth)/                   # 인증 관련 페이지 그룹
│   │   ├── login/
│   │   │   └── page.tsx
│   │   └── layout.tsx
│   │
│   ├── (dashboard)/              # 인증 필요한 페이지 그룹
│   │   ├── layout.tsx            # 사이드바 포함 레이아웃
│   │   │
│   │   ├── dashboard/            # 대시보드
│   │   │   └── page.tsx
│   │   │
│   │   ├── leads/                # 리드 관리
│   │   │   ├── page.tsx          # 리드 목록
│   │   │   ├── upload/
│   │   │   │   └── page.tsx      # CSV 업로드
│   │   │   └── [id]/
│   │   │       └── page.tsx      # 리드 상세
│   │   │
│   │   ├── teams/                # 팀 관리
│   │   │   ├── page.tsx
│   │   │   └── [id]/
│   │   │       └── page.tsx
│   │   │
│   │   ├── members/              # 팀장/영업관리자 관리
│   │   │   ├── page.tsx
│   │   │   └── [id]/
│   │   │       └── page.tsx
│   │   │
│   │   ├── my-leads/             # 내 리드 (팀장용)
│   │   │   ├── page.tsx
│   │   │   └── [id]/
│   │   │       └── page.tsx
│   │   │
│   │   ├── team-dashboard/       # 팀 대시보드 (영업관리자용)
│   │   │   └── page.tsx
│   │   │
│   │   ├── accompany/            # 동행 요청
│   │   │   ├── page.tsx          # 동행 요청 목록
│   │   │   └── [id]/
│   │   │       └── page.tsx
│   │   │
│   │   └── settings/             # 시스템 설정
│   │       ├── page.tsx
│   │       ├── grades/           # 등급 규칙 설정
│   │       │   └── page.tsx
│   │       ├── statuses/         # 상태값 설정
│   │       │   └── page.tsx
│   │       └── csv-mapping/      # CSV 매핑 설정
│   │           └── page.tsx
│   │
│   ├── api/                      # API Routes
│   │   ├── auth/
│   │   │   └── [...supabase]/
│   │   │       └── route.ts
│   │   ├── leads/
│   │   │   ├── route.ts          # GET (목록), POST (업로드)
│   │   │   ├── [id]/
│   │   │   │   └── route.ts      # GET, PATCH, DELETE
│   │   │   ├── upload/
│   │   │   │   └── route.ts      # CSV 업로드 처리
│   │   │   ├── assign/
│   │   │   │   └── route.ts      # 팀장 배분
│   │   │   └── bulk-assign/
│   │   │       └── route.ts      # 일괄 배분
│   │   ├── teams/
│   │   │   ├── route.ts
│   │   │   └── [id]/
│   │   │       └── route.ts
│   │   ├── members/
│   │   │   ├── route.ts
│   │   │   └── [id]/
│   │   │       └── route.ts
│   │   ├── grade-rules/
│   │   │   ├── route.ts
│   │   │   ├── [id]/
│   │   │   │   └── route.ts
│   │   │   └── test/
│   │   │       └── route.ts      # 규칙 테스트
│   │   ├── statuses/
│   │   │   └── route.ts
│   │   ├── accompany-requests/
│   │   │   ├── route.ts
│   │   │   └── [id]/
│   │   │       ├── route.ts
│   │   │       ├── accept/
│   │   │       │   └── route.ts
│   │   │       └── reject/
│   │   │           └── route.ts
│   │   └── dashboard/
│   │       ├── stats/
│   │       │   └── route.ts
│   │       └── team-stats/
│   │           └── route.ts
│   │
│   ├── layout.tsx                # Root Layout
│   ├── page.tsx                  # Landing (redirect to login)
│   └── globals.css
│
├── components/
│   ├── ui/                       # shadcn/ui 컴포넌트
│   │   ├── button.tsx
│   │   ├── input.tsx
│   │   ├── select.tsx
│   │   ├── table.tsx
│   │   ├── dialog.tsx
│   │   ├── dropdown-menu.tsx
│   │   ├── badge.tsx
│   │   ├── card.tsx
│   │   ├── tabs.tsx
│   │   └── ...
│   │
│   ├── layout/
│   │   ├── sidebar.tsx
│   │   ├── header.tsx
│   │   ├── nav-item.tsx
│   │   └── user-menu.tsx
│   │
│   ├── leads/
│   │   ├── lead-table.tsx
│   │   ├── lead-filters.tsx
│   │   ├── lead-form.tsx
│   │   ├── lead-detail-card.tsx
│   │   ├── grade-badge.tsx
│   │   ├── status-badge.tsx
│   │   ├── assign-dropdown.tsx
│   │   └── csv-upload-form.tsx
│   │
│   ├── dashboard/
│   │   ├── stats-card.tsx
│   │   ├── pipeline-funnel.tsx
│   │   ├── grade-distribution-chart.tsx
│   │   ├── team-performance-table.tsx
│   │   └── recent-leads-list.tsx
│   │
│   ├── settings/
│   │   ├── grade-rule-form.tsx
│   │   ├── grade-rule-list.tsx
│   │   ├── grade-rule-condition.tsx
│   │   ├── grade-test-form.tsx
│   │   ├── status-list.tsx
│   │   └── csv-mapping-form.tsx
│   │
│   ├── accompany/
│   │   ├── request-form.tsx
│   │   ├── request-list.tsx
│   │   └── request-card.tsx
│   │
│   └── common/
│       ├── loading-spinner.tsx
│       ├── empty-state.tsx
│       ├── confirm-dialog.tsx
│       ├── date-picker.tsx
│       └── search-input.tsx
│
├── lib/
│   ├── supabase/
│   │   ├── client.ts             # 브라우저용 클라이언트
│   │   ├── server.ts             # 서버용 클라이언트
│   │   ├── admin.ts              # Admin 클라이언트 (서비스 롤)
│   │   └── middleware.ts         # Auth 미들웨어
│   │
│   ├── utils/
│   │   ├── csv-parser.ts         # CSV 파싱 유틸
│   │   ├── grade-classifier.ts   # 등급 자동 분류 로직
│   │   ├── date.ts               # 날짜 포맷
│   │   ├── number.ts             # 숫자 포맷 (억원 등)
│   │   └── cn.ts                 # className 유틸
│   │
│   ├── validations/
│   │   ├── lead.ts               # 리드 관련 Zod 스키마
│   │   ├── team.ts
│   │   ├── member.ts
│   │   ├── grade-rule.ts
│   │   └── accompany.ts
│   │
│   └── constants/
│       ├── roles.ts              # 역할 상수
│       ├── statuses.ts           # 기본 상태값
│       └── routes.ts             # 라우트 상수
│
├── hooks/
│   ├── use-user.ts               # 현재 사용자 정보
│   ├── use-leads.ts              # 리드 데이터 훅
│   ├── use-teams.ts
│   ├── use-members.ts
│   ├── use-grade-rules.ts
│   └── use-accompany-requests.ts
│
├── stores/
│   ├── user-store.ts             # 사용자 상태
│   ├── filter-store.ts           # 필터 상태
│   └── ui-store.ts               # UI 상태 (사이드바 등)
│
├── types/
│   ├── database.types.ts         # Supabase 자동 생성 타입
│   ├── lead.ts
│   ├── team.ts
│   ├── member.ts
│   ├── grade-rule.ts
│   ├── accompany.ts
│   └── index.ts
│
├── middleware.ts                 # Next.js 미들웨어 (인증 체크)
├── next.config.js
├── tailwind.config.js
├── tsconfig.json
├── package.json
└── .env.local
```

---

## 2. 데이터베이스 스키마

### 2.1 ERD (Entity Relationship Diagram)

```
+------------------+       +------------------+       +------------------+
|     teams        |       |     members      |       |   lead_grades    |
+------------------+       +------------------+       +------------------+
| id (PK)          |<--+   | id (PK)          |       | id (PK)          |
| name             |   |   | user_id (FK)     |------>| name             |
| description      |   |   | team_id (FK)     |---+   | description      |
| is_active        |   |   | role             |   |   | color            |
| created_at       |   |   | name             |   |   | priority         |
| updated_at       |   |   | email            |   |   | is_default       |
+------------------+   |   | phone            |   |   | is_active        |
                       |   | is_active        |   |   | created_at       |
                       |   | created_at       |   |   +------------------+
                       |   +------------------+   |            |
                       |            |            |            |
                       |            |            |            v
+------------------+   |            |            |   +------------------+
| manager_teams    |   |            |            |   |  grade_rules     |
+------------------+   |            |            |   +------------------+
| id (PK)          |   |            |            |   | id (PK)          |
| member_id (FK)   |---+            |            |   | grade_id (FK)    |
| team_id (FK)     |---+            |            |   | conditions       |
+------------------+                |            |   | logic_operator   |
                                    |            |   | created_at       |
                                    |            |   +------------------+
                                    |            |
                                    v            |
                       +----------------------------+
                       |            leads           |
                       +----------------------------+
                       | id (PK)                    |
                       | company_name               |
                       | representative_name        |
                       | phone                      |
                       | industry                   |
                       | annual_revenue             |
                       | employee_count             |
                       | region                     |
                       | grade_id (FK) ------------>|
                       | grade_source               |
                       | assigned_member_id (FK) -->|
                       | assigned_at                |
                       | assigned_by (FK)           |
                       | contact_status_id (FK)     |
                       | meeting_status_id (FK)     |
                       | contract_status_id (FK)    |
                       | meeting_date               |
                       | meeting_location           |
                       | contract_amount            |
                       | memo                       |
                       | next_contact_date          |
                       | campaign_name              |
                       | ad_set_name                |
                       | ad_name                    |
                       | source_date                |
                       | upload_batch_id            |
                       | created_at                 |
                       | updated_at                 |
                       +----------------------------+
                                    |
                                    |
+------------------+                |                +------------------+
| lead_statuses    |<---------------+                | upload_batches   |
+------------------+                |                +------------------+
| id (PK)          |                |                | id (PK)          |
| category         |                |                | uploaded_by      |
| name             |                |                | file_name        |
| display_order    |                |                | total_count      |
| is_final         |                |                | success_count    |
| is_active        |                |                | duplicate_count  |
| created_at       |                |                | error_count      |
+------------------+                |                | grade_summary    |
                                    |                | created_at       |
                                    |                +------------------+
                                    |
                                    v
                       +----------------------------+
                       |    accompany_requests      |
                       +----------------------------+
                       | id (PK)                    |
                       | lead_id (FK)               |
                       | requester_id (FK)          |
                       | receiver_id (FK)           |
                       | meeting_date               |
                       | meeting_location           |
                       | request_reason             |
                       | status                     |
                       | reject_reason              |
                       | created_at                 |
                       | responded_at               |
                       +----------------------------+
```

### 2.2 테이블 정의 (SQL)

```sql
-- =====================================================
-- LeadFlow Database Schema
-- Supabase (PostgreSQL)
-- =====================================================

-- 0. Extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =====================================================
-- 1. 팀 테이블
-- =====================================================
CREATE TABLE teams (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) NOT NULL,
    description TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 팀명 유니크 인덱스
CREATE UNIQUE INDEX idx_teams_name ON teams(name) WHERE is_active = true;

COMMENT ON TABLE teams IS '영업 팀';
COMMENT ON COLUMN teams.name IS '팀명';
COMMENT ON COLUMN teams.is_active IS '활성화 여부 (false=해체된 팀)';

-- =====================================================
-- 2. 멤버 테이블 (팀장, 영업관리자, 시스템관리자)
-- =====================================================
CREATE TYPE member_role AS ENUM ('system_admin', 'sales_manager', 'team_leader');

CREATE TABLE members (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    team_id UUID REFERENCES teams(id) ON DELETE SET NULL,
    role member_role NOT NULL,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(255) NOT NULL UNIQUE,
    phone VARCHAR(20),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 인덱스
CREATE INDEX idx_members_team ON members(team_id);
CREATE INDEX idx_members_role ON members(role);
CREATE INDEX idx_members_user ON members(user_id);

COMMENT ON TABLE members IS '시스템 사용자 (관리자, 영업관리자, 팀장)';
COMMENT ON COLUMN members.role IS 'system_admin=시스템관리자, sales_manager=영업관리자, team_leader=팀장';
COMMENT ON COLUMN members.team_id IS '소속 팀 (팀장만 해당, 영업관리자는 manager_teams 참조)';

-- =====================================================
-- 3. 영업관리자-팀 매핑 테이블 (N:M 관계)
-- =====================================================
CREATE TABLE manager_teams (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    member_id UUID NOT NULL REFERENCES members(id) ON DELETE CASCADE,
    team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(member_id, team_id)
);

COMMENT ON TABLE manager_teams IS '영업관리자와 담당 팀 매핑 (1명이 여러 팀 담당 가능)';

-- =====================================================
-- 4. 리드 등급 테이블
-- =====================================================
CREATE TABLE lead_grades (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(50) NOT NULL,
    description TEXT,
    color VARCHAR(20) DEFAULT '#gray',
    priority INTEGER NOT NULL DEFAULT 0,
    is_default BOOLEAN DEFAULT false,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 기본 등급은 하나만 존재
CREATE UNIQUE INDEX idx_lead_grades_default ON lead_grades(is_default) WHERE is_default = true;

COMMENT ON TABLE lead_grades IS '리드 등급 정의';
COMMENT ON COLUMN lead_grades.priority IS '우선순위 (낮을수록 높은 등급, 규칙 적용 순서)';
COMMENT ON COLUMN lead_grades.is_default IS '기본 등급 여부 (규칙 미해당 시 부여)';

-- 기본 데이터 삽입
INSERT INTO lead_grades (name, description, color, priority, is_default) VALUES
    ('A', '고매출 대규모 업체', '#22c55e', 1, false),
    ('B', '중규모 성장 업체', '#3b82f6', 2, false),
    ('C', '소규모 업체', '#eab308', 3, false),
    ('D', '정보 부족 / 소형 업체', '#6b7280', 4, true);

-- =====================================================
-- 5. 등급 규칙 테이블
-- =====================================================
CREATE TABLE grade_rules (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    grade_id UUID NOT NULL REFERENCES lead_grades(id) ON DELETE CASCADE,
    conditions JSONB NOT NULL,
    logic_operator VARCHAR(10) DEFAULT 'AND',
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE grade_rules IS '등급 자동 분류 규칙';
COMMENT ON COLUMN grade_rules.conditions IS '조건 배열 JSON: [{"field": "annual_revenue", "operator": ">=", "value": 10}, ...]';
COMMENT ON COLUMN grade_rules.logic_operator IS 'AND 또는 OR';

/*
conditions JSON 구조 예시:
[
    {"field": "annual_revenue", "operator": ">=", "value": 10},
    {"field": "employee_count", "operator": ">=", "value": 50}
]

지원 연산자: =, !=, >, >=, <, <=, between, in, contains
*/

-- 기본 규칙 삽입 (A등급 예시)
INSERT INTO grade_rules (grade_id, conditions, logic_operator)
SELECT id,
    '[{"field": "annual_revenue", "operator": ">=", "value": 10}, {"field": "employee_count", "operator": ">=", "value": 50}]'::jsonb,
    'AND'
FROM lead_grades WHERE name = 'A';

-- B등급 규칙
INSERT INTO grade_rules (grade_id, conditions, logic_operator)
SELECT id,
    '[{"field": "annual_revenue", "operator": "between", "value": [5, 10]}]'::jsonb,
    'OR'
FROM lead_grades WHERE name = 'B';

INSERT INTO grade_rules (grade_id, conditions, logic_operator)
SELECT id,
    '[{"field": "employee_count", "operator": "between", "value": [20, 50]}]'::jsonb,
    'OR'
FROM lead_grades WHERE name = 'B';

-- =====================================================
-- 6. 상태값 테이블 (컨택, 미팅, 계약)
-- =====================================================
CREATE TYPE status_category AS ENUM ('contact', 'meeting', 'contract');

CREATE TABLE lead_statuses (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    category status_category NOT NULL,
    name VARCHAR(100) NOT NULL,
    display_order INTEGER DEFAULT 0,
    is_final BOOLEAN DEFAULT false,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE lead_statuses IS '리드 상태값 정의';
COMMENT ON COLUMN lead_statuses.category IS 'contact=컨택상태, meeting=미팅상태, contract=계약상태';
COMMENT ON COLUMN lead_statuses.is_final IS '최종 상태 여부 (완료로 간주)';

-- 기본 상태값 삽입
-- 컨택 상태
INSERT INTO lead_statuses (category, name, display_order, is_final) VALUES
    ('contact', '미연락', 1, false),
    ('contact', '통화 성공', 2, false),
    ('contact', '부재', 3, false),
    ('contact', '번호 오류', 4, true),
    ('contact', '연락 거부', 5, true);

-- 미팅 상태
INSERT INTO lead_statuses (category, name, display_order, is_final) VALUES
    ('meeting', '해당없음', 1, false),
    ('meeting', '미팅 예정', 2, false),
    ('meeting', '미팅 완료', 3, false),
    ('meeting', '미팅 취소', 4, true);

-- 계약 상태
INSERT INTO lead_statuses (category, name, display_order, is_final) VALUES
    ('contract', '해당없음', 1, false),
    ('contract', '상담 중', 2, false),
    ('contract', '계약 성사', 3, true),
    ('contract', '계약 실패', 4, true);

-- =====================================================
-- 7. 업로드 배치 테이블
-- =====================================================
CREATE TABLE upload_batches (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    uploaded_by UUID NOT NULL REFERENCES members(id),
    file_name VARCHAR(255),
    total_count INTEGER DEFAULT 0,
    success_count INTEGER DEFAULT 0,
    duplicate_count INTEGER DEFAULT 0,
    error_count INTEGER DEFAULT 0,
    grade_summary JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE upload_batches IS 'CSV 업로드 이력';
COMMENT ON COLUMN upload_batches.grade_summary IS '등급별 분류 결과: {"A": 10, "B": 20, ...}';

-- =====================================================
-- 8. 리드 테이블 (메인)
-- =====================================================
CREATE TYPE grade_source AS ENUM ('auto', 'manual');

CREATE TABLE leads (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    -- 기본 정보
    company_name VARCHAR(200),
    representative_name VARCHAR(100),
    phone VARCHAR(20) NOT NULL,
    industry VARCHAR(100),
    annual_revenue DECIMAL(15, 2),
    employee_count INTEGER,
    region VARCHAR(100),

    -- 등급
    grade_id UUID REFERENCES lead_grades(id),
    grade_source grade_source DEFAULT 'auto',

    -- 배분
    assigned_member_id UUID REFERENCES members(id),
    assigned_at TIMESTAMPTZ,
    assigned_by UUID REFERENCES members(id),

    -- 상태
    contact_status_id UUID REFERENCES lead_statuses(id),
    meeting_status_id UUID REFERENCES lead_statuses(id),
    contract_status_id UUID REFERENCES lead_statuses(id),

    -- 미팅/계약 정보
    meeting_date TIMESTAMPTZ,
    meeting_location VARCHAR(500),
    contract_amount DECIMAL(15, 2),

    -- 메모/일정
    memo TEXT,
    next_contact_date TIMESTAMPTZ,

    -- 광고 정보
    campaign_name VARCHAR(200),
    ad_set_name VARCHAR(200),
    ad_name VARCHAR(200),

    -- 원본 정보
    source_date TIMESTAMPTZ,
    upload_batch_id UUID REFERENCES upload_batches(id),

    -- 시스템
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 인덱스
CREATE INDEX idx_leads_phone ON leads(phone);
CREATE INDEX idx_leads_grade ON leads(grade_id);
CREATE INDEX idx_leads_assigned_member ON leads(assigned_member_id);
CREATE INDEX idx_leads_created_at ON leads(created_at DESC);
CREATE INDEX idx_leads_campaign ON leads(campaign_name);
CREATE UNIQUE INDEX idx_leads_phone_unique ON leads(phone);

COMMENT ON TABLE leads IS '리드 (잠재고객)';
COMMENT ON COLUMN leads.annual_revenue IS '연매출 (억원 단위)';
COMMENT ON COLUMN leads.grade_source IS 'auto=자동분류, manual=수동변경';

-- =====================================================
-- 9. 리드 이력 테이블 (변경 추적)
-- =====================================================
CREATE TABLE lead_histories (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    lead_id UUID NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
    changed_by UUID REFERENCES members(id),
    change_type VARCHAR(50) NOT NULL,
    old_value JSONB,
    new_value JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_lead_histories_lead ON lead_histories(lead_id);

COMMENT ON TABLE lead_histories IS '리드 변경 이력';
COMMENT ON COLUMN lead_histories.change_type IS 'grade_change, status_change, assignment, etc.';

-- =====================================================
-- 10. 동행 요청 테이블
-- =====================================================
CREATE TYPE accompany_status AS ENUM ('pending', 'accepted', 'rejected', 'completed', 'cancelled');

CREATE TABLE accompany_requests (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    lead_id UUID NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
    requester_id UUID NOT NULL REFERENCES members(id),
    receiver_id UUID NOT NULL REFERENCES members(id),
    meeting_date TIMESTAMPTZ NOT NULL,
    meeting_location VARCHAR(500),
    request_reason TEXT,
    status accompany_status DEFAULT 'pending',
    reject_reason TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    responded_at TIMESTAMPTZ
);

CREATE INDEX idx_accompany_requests_requester ON accompany_requests(requester_id);
CREATE INDEX idx_accompany_requests_receiver ON accompany_requests(receiver_id);
CREATE INDEX idx_accompany_requests_status ON accompany_requests(status);

COMMENT ON TABLE accompany_requests IS '미팅 동행 요청';

-- =====================================================
-- 11. CSV 매핑 설정 테이블
-- =====================================================
CREATE TABLE csv_mappings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    csv_column VARCHAR(200) NOT NULL,
    system_field VARCHAR(100) NOT NULL,
    is_required BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(system_field)
);

COMMENT ON TABLE csv_mappings IS 'CSV 컬럼 <-> 시스템 필드 매핑';

-- 기본 매핑 삽입
INSERT INTO csv_mappings (csv_column, system_field, is_required) VALUES
    ('이름', 'representative_name', true),
    ('연락처', 'phone', true),
    ('업체명', 'company_name', false),
    ('업종', 'industry', false),
    ('연매출', 'annual_revenue', false),
    ('종업원수', 'employee_count', false),
    ('지역', 'region', false),
    ('신청일시', 'source_date', false),
    ('캠페인', 'campaign_name', false),
    ('광고세트', 'ad_set_name', false),
    ('광고', 'ad_name', false);

-- =====================================================
-- 12. 시스템 설정 테이블
-- =====================================================
CREATE TABLE system_settings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    key VARCHAR(100) NOT NULL UNIQUE,
    value JSONB NOT NULL,
    description TEXT,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

INSERT INTO system_settings (key, value, description) VALUES
    ('dashboard_refresh_interval', '60', '대시보드 새로고침 주기 (초)'),
    ('session_timeout', '28800', '세션 타임아웃 (초, 기본 8시간)'),
    ('accompany_reminder_days', '1', '동행 미팅 리마인더 (일 전)');

-- =====================================================
-- Row Level Security (RLS) 정책
-- =====================================================

-- RLS 활성화
ALTER TABLE teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE members ENABLE ROW LEVEL SECURITY;
ALTER TABLE manager_teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE lead_grades ENABLE ROW LEVEL SECURITY;
ALTER TABLE grade_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE lead_statuses ENABLE ROW LEVEL SECURITY;
ALTER TABLE leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE lead_histories ENABLE ROW LEVEL SECURITY;
ALTER TABLE accompany_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE upload_batches ENABLE ROW LEVEL SECURITY;
ALTER TABLE csv_mappings ENABLE ROW LEVEL SECURITY;
ALTER TABLE system_settings ENABLE ROW LEVEL SECURITY;

-- 멤버 조회 함수
CREATE OR REPLACE FUNCTION get_current_member_id()
RETURNS UUID AS $$
    SELECT id FROM members WHERE user_id = auth.uid() LIMIT 1;
$$ LANGUAGE sql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION get_current_member_role()
RETURNS member_role AS $$
    SELECT role FROM members WHERE user_id = auth.uid() LIMIT 1;
$$ LANGUAGE sql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION get_current_member_team_id()
RETURNS UUID AS $$
    SELECT team_id FROM members WHERE user_id = auth.uid() LIMIT 1;
$$ LANGUAGE sql SECURITY DEFINER;

-- 영업관리자가 담당하는 팀 ID 목록
CREATE OR REPLACE FUNCTION get_manager_team_ids()
RETURNS SETOF UUID AS $$
    SELECT team_id FROM manager_teams WHERE member_id = get_current_member_id();
$$ LANGUAGE sql SECURITY DEFINER;

-- =====================================================
-- RLS 정책: teams
-- =====================================================
-- 모든 인증된 사용자 조회 가능
CREATE POLICY "teams_select" ON teams FOR SELECT TO authenticated USING (true);
-- 시스템 관리자만 수정
CREATE POLICY "teams_insert" ON teams FOR INSERT TO authenticated
    WITH CHECK (get_current_member_role() = 'system_admin');
CREATE POLICY "teams_update" ON teams FOR UPDATE TO authenticated
    USING (get_current_member_role() = 'system_admin');
CREATE POLICY "teams_delete" ON teams FOR DELETE TO authenticated
    USING (get_current_member_role() = 'system_admin');

-- =====================================================
-- RLS 정책: members
-- =====================================================
CREATE POLICY "members_select" ON members FOR SELECT TO authenticated USING (true);
CREATE POLICY "members_insert" ON members FOR INSERT TO authenticated
    WITH CHECK (get_current_member_role() = 'system_admin');
CREATE POLICY "members_update" ON members FOR UPDATE TO authenticated
    USING (get_current_member_role() = 'system_admin' OR id = get_current_member_id());
CREATE POLICY "members_delete" ON members FOR DELETE TO authenticated
    USING (get_current_member_role() = 'system_admin');

-- =====================================================
-- RLS 정책: leads
-- =====================================================
-- 시스템관리자: 전체, 영업관리자: 담당팀, 팀장: 본인 배분만
CREATE POLICY "leads_select" ON leads FOR SELECT TO authenticated USING (
    get_current_member_role() = 'system_admin'
    OR (
        get_current_member_role() = 'sales_manager'
        AND assigned_member_id IN (
            SELECT id FROM members WHERE team_id IN (SELECT get_manager_team_ids())
        )
    )
    OR (
        get_current_member_role() = 'team_leader'
        AND assigned_member_id = get_current_member_id()
    )
);

CREATE POLICY "leads_insert" ON leads FOR INSERT TO authenticated
    WITH CHECK (get_current_member_role() = 'system_admin');

CREATE POLICY "leads_update" ON leads FOR UPDATE TO authenticated USING (
    get_current_member_role() = 'system_admin'
    OR (
        get_current_member_role() = 'team_leader'
        AND assigned_member_id = get_current_member_id()
    )
);

-- =====================================================
-- RLS 정책: accompany_requests
-- =====================================================
CREATE POLICY "accompany_select" ON accompany_requests FOR SELECT TO authenticated USING (
    get_current_member_role() = 'system_admin'
    OR requester_id = get_current_member_id()
    OR receiver_id = get_current_member_id()
    OR (
        get_current_member_role() = 'sales_manager'
        AND (
            requester_id IN (SELECT id FROM members WHERE team_id IN (SELECT get_manager_team_ids()))
            OR receiver_id IN (SELECT id FROM members WHERE team_id IN (SELECT get_manager_team_ids()))
        )
    )
);

CREATE POLICY "accompany_insert" ON accompany_requests FOR INSERT TO authenticated
    WITH CHECK (get_current_member_role() = 'team_leader');

CREATE POLICY "accompany_update" ON accompany_requests FOR UPDATE TO authenticated USING (
    requester_id = get_current_member_id() OR receiver_id = get_current_member_id()
);

-- =====================================================
-- RLS 정책: 설정 테이블들 (시스템관리자만 수정)
-- =====================================================
CREATE POLICY "grades_select" ON lead_grades FOR SELECT TO authenticated USING (true);
CREATE POLICY "grades_modify" ON lead_grades FOR ALL TO authenticated
    USING (get_current_member_role() = 'system_admin');

CREATE POLICY "rules_select" ON grade_rules FOR SELECT TO authenticated USING (true);
CREATE POLICY "rules_modify" ON grade_rules FOR ALL TO authenticated
    USING (get_current_member_role() = 'system_admin');

CREATE POLICY "statuses_select" ON lead_statuses FOR SELECT TO authenticated USING (true);
CREATE POLICY "statuses_modify" ON lead_statuses FOR ALL TO authenticated
    USING (get_current_member_role() = 'system_admin');

CREATE POLICY "settings_select" ON system_settings FOR SELECT TO authenticated USING (true);
CREATE POLICY "settings_modify" ON system_settings FOR ALL TO authenticated
    USING (get_current_member_role() = 'system_admin');

CREATE POLICY "mappings_select" ON csv_mappings FOR SELECT TO authenticated USING (true);
CREATE POLICY "mappings_modify" ON csv_mappings FOR ALL TO authenticated
    USING (get_current_member_role() = 'system_admin');

-- =====================================================
-- Triggers: updated_at 자동 갱신
-- =====================================================
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_teams_updated_at BEFORE UPDATE ON teams
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trigger_members_updated_at BEFORE UPDATE ON members
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trigger_leads_updated_at BEFORE UPDATE ON leads
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trigger_lead_grades_updated_at BEFORE UPDATE ON lead_grades
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trigger_grade_rules_updated_at BEFORE UPDATE ON grade_rules
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();
```

### 2.3 Supabase 타입 생성

```bash
# Supabase CLI로 타입 자동 생성
npx supabase gen types typescript --project-id YOUR_PROJECT_ID > types/database.types.ts
```

---

## 3. API 설계

### 3.1 API 엔드포인트 목록

| Method        | Endpoint                           | 설명                      | 권한                   |
| ------------- | ---------------------------------- | ------------------------- | ---------------------- |
| **인증**      |                                    |                           |                        |
| POST          | /api/auth/login                    | 로그인                    | 전체                   |
| POST          | /api/auth/logout                   | 로그아웃                  | 인증됨                 |
| GET           | /api/auth/me                       | 현재 사용자 정보          | 인증됨                 |
| **리드**      |                                    |                           |                        |
| GET           | /api/leads                         | 리드 목록 조회            | 역할별                 |
| GET           | /api/leads/:id                     | 리드 상세 조회            | 역할별                 |
| POST          | /api/leads/upload                  | CSV 업로드                | 시스템관리자           |
| PATCH         | /api/leads/:id                     | 리드 수정 (상태, 메모 등) | 시스템관리자, 담당팀장 |
| PATCH         | /api/leads/:id/grade               | 등급 수동 변경            | 시스템관리자           |
| POST          | /api/leads/assign                  | 단일 배분                 | 시스템관리자           |
| POST          | /api/leads/bulk-assign             | 일괄 배분                 | 시스템관리자           |
| **팀**        |                                    |                           |                        |
| GET           | /api/teams                         | 팀 목록                   | 인증됨                 |
| GET           | /api/teams/:id                     | 팀 상세                   | 인증됨                 |
| POST          | /api/teams                         | 팀 생성                   | 시스템관리자           |
| PATCH         | /api/teams/:id                     | 팀 수정                   | 시스템관리자           |
| DELETE        | /api/teams/:id                     | 팀 비활성화               | 시스템관리자           |
| **멤버**      |                                    |                           |                        |
| GET           | /api/members                       | 멤버 목록                 | 인증됨                 |
| GET           | /api/members/:id                   | 멤버 상세                 | 인증됨                 |
| POST          | /api/members                       | 멤버 생성                 | 시스템관리자           |
| PATCH         | /api/members/:id                   | 멤버 수정                 | 시스템관리자           |
| DELETE        | /api/members/:id                   | 멤버 비활성화             | 시스템관리자           |
| **등급 규칙** |                                    |                           |                        |
| GET           | /api/grade-rules                   | 규칙 목록                 | 인증됨                 |
| GET           | /api/grade-rules/:id               | 규칙 상세                 | 인증됨                 |
| POST          | /api/grade-rules                   | 규칙 생성                 | 시스템관리자           |
| PATCH         | /api/grade-rules/:id               | 규칙 수정                 | 시스템관리자           |
| DELETE        | /api/grade-rules/:id               | 규칙 삭제                 | 시스템관리자           |
| POST          | /api/grade-rules/test              | 규칙 테스트               | 시스템관리자           |
| POST          | /api/grade-rules/reclassify        | 재분류 실행               | 시스템관리자           |
| **등급**      |                                    |                           |                        |
| GET           | /api/grades                        | 등급 목록                 | 인증됨                 |
| POST          | /api/grades                        | 등급 생성                 | 시스템관리자           |
| PATCH         | /api/grades/:id                    | 등급 수정                 | 시스템관리자           |
| DELETE        | /api/grades/:id                    | 등급 삭제                 | 시스템관리자           |
| **상태값**    |                                    |                           |                        |
| GET           | /api/statuses                      | 상태값 목록               | 인증됨                 |
| POST          | /api/statuses                      | 상태값 생성               | 시스템관리자           |
| PATCH         | /api/statuses/:id                  | 상태값 수정               | 시스템관리자           |
| DELETE        | /api/statuses/:id                  | 상태값 삭제               | 시스템관리자           |
| **동행 요청** |                                    |                           |                        |
| GET           | /api/accompany-requests            | 요청 목록                 | 역할별                 |
| GET           | /api/accompany-requests/:id        | 요청 상세                 | 관련자                 |
| POST          | /api/accompany-requests            | 요청 생성                 | 팀장                   |
| POST          | /api/accompany-requests/:id/accept | 수락                      | 수신자                 |
| POST          | /api/accompany-requests/:id/reject | 거절                      | 수신자                 |
| POST          | /api/accompany-requests/:id/cancel | 취소                      | 요청자                 |
| **대시보드**  |                                    |                           |                        |
| GET           | /api/dashboard/stats               | 전체 통계                 | 시스템관리자           |
| GET           | /api/dashboard/team-stats          | 팀 통계                   | 영업관리자             |
| GET           | /api/dashboard/my-stats            | 개인 통계                 | 팀장                   |
| **설정**      |                                    |                           |                        |
| GET           | /api/settings                      | 설정 조회                 | 인증됨                 |
| PATCH         | /api/settings                      | 설정 수정                 | 시스템관리자           |
| GET           | /api/csv-mappings                  | CSV 매핑 조회             | 시스템관리자           |
| PATCH         | /api/csv-mappings                  | CSV 매핑 수정             | 시스템관리자           |

### 3.2 주요 API 상세 명세

#### 3.2.1 POST /api/leads/upload - CSV 업로드

**Request:**

```typescript
// multipart/form-data
{
  file: File; // CSV 파일
}
```

**Response:**

```typescript
{
  success: true,
  data: {
    batchId: "uuid",
    totalCount: 150,
    successCount: 143,
    duplicateCount: 5,
    errorCount: 2,
    gradeSummary: {
      "A": 12,
      "B": 38,
      "C": 67,
      "D": 26
    },
    errors: [
      { row: 45, message: "연락처 형식 오류" },
      { row: 89, message: "필수 필드 누락" }
    ]
  }
}
```

**처리 로직:**

```typescript
// lib/utils/csv-parser.ts
export async function processCSVUpload(file: File, uploaderId: string) {
  // 1. CSV 파싱
  const rows = await parseCSV(file);

  // 2. CSV 매핑 조회
  const mappings = await getCSVMappings();

  // 3. 데이터 변환 및 검증
  const { validLeads, errors } = validateAndTransform(rows, mappings);

  // 4. 중복 체크
  const { newLeads, duplicates } = await checkDuplicates(validLeads);

  // 5. 등급 규칙 조회
  const gradeRules = await getActiveGradeRules();

  // 6. 등급 자동 분류
  const classifiedLeads = classifyGrades(newLeads, gradeRules);

  // 7. DB 저장
  const batch = await saveBatch(
    uploaderId,
    file.name,
    classifiedLeads,
    duplicates,
    errors
  );

  return batch;
}
```

#### 3.2.2 GET /api/leads - 리드 목록 조회

**Query Parameters:**

```typescript
{
  page?: number;          // 페이지 (기본 1)
  limit?: number;         // 페이지당 건수 (기본 50)
  search?: string;        // 검색어 (업체명, 대표자명, 연락처)
  gradeId?: string;       // 등급 필터
  teamId?: string;        // 팀 필터
  memberId?: string;      // 담당자 필터
  contactStatusId?: string;
  meetingStatusId?: string;
  contractStatusId?: string;
  assignedStatus?: 'all' | 'assigned' | 'unassigned';
  startDate?: string;     // 생성일 시작
  endDate?: string;       // 생성일 종료
  sortBy?: string;        // 정렬 필드
  sortOrder?: 'asc' | 'desc';
}
```

**Response:**

```typescript
{
  success: true,
  data: {
    leads: Lead[],
    pagination: {
      page: 1,
      limit: 50,
      totalCount: 1234,
      totalPages: 25
    }
  }
}
```

#### 3.2.3 POST /api/grade-rules/test - 규칙 테스트

**Request:**

```typescript
{
  // 테스트할 샘플 데이터
  testData: {
    annual_revenue: 12,
    employee_count: 35,
    industry: "제조업",
    region: "서울"
  }
}
```

**Response:**

```typescript
{
  success: true,
  data: {
    resultGrade: {
      id: "uuid",
      name: "B",
      color: "#3b82f6"
    },
    matchedRule: {
      id: "uuid",
      conditions: [...],
      logic_operator: "OR"
    },
    evaluationLog: [
      {
        grade: "A",
        rule: "연매출 >= 10 AND 종업원수 >= 50",
        result: false,
        details: "종업원수 조건 미충족 (35 < 50)"
      },
      {
        grade: "B",
        rule: "연매출 5~10억 OR 종업원수 20~50명",
        result: true,
        details: "종업원수 조건 충족 (20 <= 35 <= 50)"
      }
    ]
  }
}
```

#### 3.2.4 POST /api/accompany-requests - 동행 요청 생성

**Request:**

```typescript
{
  leadId: "uuid",
  receiverId: "uuid",       // 동행 요청할 팀장
  meetingDate: "2026-01-15T14:00:00Z",
  meetingLocation: "서울시 강남구 테헤란로 123",
  requestReason: "대규모 계약 예상, 기술 지원 필요"
}
```

**Response:**

```typescript
{
  success: true,
  data: {
    id: "uuid",
    status: "pending",
    createdAt: "2026-01-08T10:00:00Z"
  }
}
```

---

## 4. 등급 자동 분류 로직

### 4.1 분류 알고리즘

```typescript
// lib/utils/grade-classifier.ts

interface Condition {
  field: string;
  operator:
    | "eq"
    | "neq"
    | "gt"
    | "gte"
    | "lt"
    | "lte"
    | "between"
    | "in"
    | "contains";
  value: any;
}

interface GradeRule {
  id: string;
  gradeId: string;
  gradeName: string;
  gradePriority: number;
  conditions: Condition[];
  logicOperator: "AND" | "OR";
}

interface Lead {
  annual_revenue?: number;
  employee_count?: number;
  industry?: string;
  region?: string;
  [key: string]: any;
}

export function classifyGrade(lead: Lead, rules: GradeRule[]): string {
  // 규칙을 우선순위 순으로 정렬
  const sortedRules = [...rules].sort(
    (a, b) => a.gradePriority - b.gradePriority
  );

  for (const rule of sortedRules) {
    if (evaluateRule(lead, rule)) {
      return rule.gradeId;
    }
  }

  // 어떤 규칙에도 해당하지 않으면 기본 등급 반환
  return getDefaultGradeId();
}

function evaluateRule(lead: Lead, rule: GradeRule): boolean {
  const results = rule.conditions.map((condition) =>
    evaluateCondition(lead, condition)
  );

  if (rule.logicOperator === "AND") {
    return results.every((r) => r === true);
  } else {
    return results.some((r) => r === true);
  }
}

function evaluateCondition(lead: Lead, condition: Condition): boolean {
  const value = lead[condition.field];

  // 값이 없으면 조건 미충족
  if (value === undefined || value === null) {
    return false;
  }

  switch (condition.operator) {
    case "eq":
      return value === condition.value;

    case "neq":
      return value !== condition.value;

    case "gt":
      return Number(value) > Number(condition.value);

    case "gte":
      return Number(value) >= Number(condition.value);

    case "lt":
      return Number(value) < Number(condition.value);

    case "lte":
      return Number(value) <= Number(condition.value);

    case "between":
      const [min, max] = condition.value as [number, number];
      const numValue = Number(value);
      return numValue >= min && numValue <= max;

    case "in":
      return (condition.value as any[]).includes(value);

    case "contains":
      return String(value)
        .toLowerCase()
        .includes(String(condition.value).toLowerCase());

    default:
      return false;
  }
}

// 일괄 분류
export function classifyLeads(leads: Lead[], rules: GradeRule[]): Lead[] {
  return leads.map((lead) => ({
    ...lead,
    grade_id: classifyGrade(lead, rules),
    grade_source: "auto",
  }));
}
```

### 4.2 분류 흐름도

```
+-------------------------------------------------------------+
|                      classifyGrade()                         |
+-----------------------------+-------------------------------+
                              |
                              v
+-------------------------------------------------------------+
|           규칙을 우선순위(priority) 순으로 정렬              |
|           A(1) -> B(2) -> C(3) -> D(4)                      |
+-----------------------------+-------------------------------+
                              |
                              v
                    +-------------------+
                    | 첫 번째 규칙      |
                    | (A등급) 평가      |
                    +---------+---------+
                              |
              +---------------+---------------+
              |                               |
              v                               v
        [조건 충족]                     [조건 미충족]
              |                               |
              v                               v
    +-------------------+           +-------------------+
    |  A등급 반환       |           | 다음 규칙         |
    |                   |           | (B등급) 평가      |
    +-------------------+           +---------+---------+
                                              |
                                     ... (반복) ...
                                              |
                                              v
                              +-------------------------------+
                              | 모든 규칙 미충족 시           |
                              | 기본 등급 (D) 반환            |
                              +-------------------------------+
```

---

## 5. 화면별 상세 설계

### 5.1 페이지 라우팅

| 경로               | 페이지         | 접근 권한    |
| ------------------ | -------------- | ------------ |
| /login             | 로그인         | 전체         |
| /dashboard         | 전체 대시보드  | 시스템관리자 |
| /team-dashboard    | 팀 대시보드    | 영업관리자   |
| /leads             | 리드 목록      | 시스템관리자 |
| /leads/upload      | CSV 업로드     | 시스템관리자 |
| /leads/[id]        | 리드 상세      | 역할별       |
| /my-leads          | 내 리드        | 팀장         |
| /my-leads/[id]     | 내 리드 상세   | 팀장         |
| /teams             | 팀 관리        | 시스템관리자 |
| /members           | 멤버 관리      | 시스템관리자 |
| /accompany         | 동행 요청      | 팀장         |
| /settings          | 시스템 설정    | 시스템관리자 |
| /settings/grades   | 등급 규칙 설정 | 시스템관리자 |
| /settings/statuses | 상태값 설정    | 시스템관리자 |

### 5.2 역할별 사이드바 메뉴

```typescript
// lib/constants/routes.ts
import {
  LayoutDashboard,
  Users,
  Upload,
  Building,
  UserCog,
  Settings,
  UserPlus,
  BarChart,
} from "lucide-react";

export const menuByRole = {
  system_admin: [
    { label: "대시보드", href: "/dashboard", icon: LayoutDashboard },
    { label: "리드 관리", href: "/leads", icon: Users },
    { label: "CSV 업로드", href: "/leads/upload", icon: Upload },
    { label: "팀 관리", href: "/teams", icon: Building },
    { label: "멤버 관리", href: "/members", icon: UserCog },
    { label: "시스템 설정", href: "/settings", icon: Settings },
  ],

  sales_manager: [
    { label: "팀 대시보드", href: "/team-dashboard", icon: LayoutDashboard },
    { label: "팀 리드 현황", href: "/leads", icon: Users },
    { label: "동행 현황", href: "/accompany", icon: UserPlus },
  ],

  team_leader: [
    { label: "내 리드", href: "/my-leads", icon: Users },
    { label: "동행 요청", href: "/accompany", icon: UserPlus },
    { label: "내 실적", href: "/my-stats", icon: BarChart },
  ],
};
```

### 5.3 주요 화면 컴포넌트 구조

#### 5.3.1 리드 목록 페이지 (/leads)

```
+---------------------------------------------------------------------+
| Header                                                              |
| +----------------------------------------------------------------+ |
| | 리드 관리                          [CSV 업로드] [Excel 내보내기] | |
| +----------------------------------------------------------------+ |
+---------------------------------------------------------------------+
| Filters                                                             |
| +-----------+ +-----------+ +-----------+ +-----------+ +--------+ |
| | 기간 선택 | | 등급 전체v| | 팀 전체 v| | 상태 전체v| | 검색   | |
| +-----------+ +-----------+ +-----------+ +-----------+ +--------+ |
+---------------------------------------------------------------------+
| Table                                                               |
| +---+--------+--------+--------+------+------+------+------+-----+ |
| |   | 신청일 | 업체명 | 대표자 | 등급 | 팀장 | 상태 | 미팅 | ... | |
| +---+--------+--------+--------+------+------+------+------+-----+ |
| | o | 01/08  | ABC    | 김철수 | [A]  |[선택]| 미연락|  -   |     | |
| | o | 01/08  | DEF    | 이영희 | [B]  | 박팀장| 통화완| 예정 |     | |
| | o | 01/07  | GHI    | 박민수 | [C]  | 김팀장| 부재  |  -   |     | |
| +---+--------+--------+--------+------+------+------+------+-----+ |
+---------------------------------------------------------------------+
| Pagination                                                          |
|              < 1 2 3 ... 25 >    총 1,234건                         |
+---------------------------------------------------------------------+
| Bulk Actions (선택 시 표시)                                         |
| +----------------------------------------------------------------+ |
| | 3건 선택됨    [일괄 등급 변경 v]    [일괄 배분 v]    [선택 해제] | |
| +----------------------------------------------------------------+ |
+---------------------------------------------------------------------+
```

**컴포넌트 구조:**

```typescript
// app/(dashboard)/leads/page.tsx
import { Upload, Download } from "lucide-react";

export default function LeadsPage() {
  return (
    <div className="space-y-4">
      <PageHeader
        title="리드 관리"
        actions={
          <>
            <Link href="/leads/upload">
              <Button>
                <Upload className="w-4 h-4 mr-2" />
                CSV 업로드
              </Button>
            </Link>
            <Button variant="outline">
              <Download className="w-4 h-4 mr-2" />
              Excel 내보내기
            </Button>
          </>
        }
      />
      <LeadFilters />
      <LeadTable />
      <Pagination />
      <BulkActionBar /> {/* 선택 시에만 표시 */}
    </div>
  );
}
```

#### 5.3.2 등급 규칙 설정 페이지 (/settings/grades)

```
+---------------------------------------------------------------------+
| 등급 규칙 설정                                                      |
+---------------------------------------------------------------------+
| +----------------------------------------------------------------+ |
| | Tabs: [등급 정의] [분류 규칙] [규칙 테스트]                      | |
| +----------------------------------------------------------------+ |
+---------------------------------------------------------------------+
|                                                                     |
| [등급 정의 탭 선택 시]                                              |
| +----------------------------------------------------------------+ |
| | 등급 목록                                        [+ 등급 추가]  | |
| | +------+--------------------+--------+------+--------+-------+ | |
| | | 순서 | 등급명             | 설명   | 색상 | 기본값 | 액션  | | |
| | +------+--------------------+--------+------+--------+-------+ | |
| | | = 1  | A                  | 고매출.| 녹색 |   -    | 수정  | | |
| | | = 2  | B                  | 중규모.| 파랑 |   -    | 수정  | | |
| | | = 3  | C                  | 소규모.| 노랑 |   -    | 수정  | | |
| | | = 4  | D                  | 정보.. | 회색 |   v    | 수정  | | |
| | +------+--------------------+--------+------+--------+-------+ | |
| +----------------------------------------------------------------+ |
|                                                                     |
| [분류 규칙 탭 선택 시]                                              |
| +----------------------------------------------------------------+ |
| | A등급 규칙                                       [+ 조건 추가]  | |
| | +-------------------------------------------------------------+ | |
| | | 조건 1: [연매출 v] [이상(>=) v] [10    ] [억원]    [삭제]    | | |
| | |                                              [AND v]        | | |
| | | 조건 2: [종업원수v] [이상(>=) v] [50    ] [명]     [삭제]    | | |
| | +-------------------------------------------------------------+ | |
| |                                                                 | |
| | B등급 규칙                                       [+ 조건 추가]  | |
| | +-------------------------------------------------------------+ | |
| | | 조건 1: [연매출 v] [범위    v] [5 ] ~ [10] [억원]  [삭제]    | | |
| | |                                              [OR v]         | | |
| | | 조건 2: [종업원수v] [범위    v] [20] ~ [50] [명]   [삭제]    | | |
| | +-------------------------------------------------------------+ | |
| |                                                                 | |
| | [저장] [기존 리드 재분류...]                                    | |
| +----------------------------------------------------------------+ |
|                                                                     |
| [규칙 테스트 탭 선택 시]                                            |
| +----------------------------------------------------------------+ |
| | 테스트 데이터 입력                                              | |
| | 연매출: [12     ] 억원                                          | |
| | 종업원수: [35   ] 명                                            | |
| | 업종: [제조업        v]                                         | |
| |                                                                 | |
| | [테스트 실행]                                                   | |
| | --------------------------------------------------------------- | |
| | 결과: [B등급]                                                   | |
| |                                                                 | |
| | 평가 로그:                                                      | |
| | X A등급: 연매출 >=10 충족, 종업원 >=50 미충족 (35 < 50)         | |
| | O B등급: 종업원 20~50 충족 (20 <= 35 <= 50)                     | |
| +----------------------------------------------------------------+ |
+---------------------------------------------------------------------+
```

#### 5.3.3 동행 요청 페이지 (/accompany)

```
+---------------------------------------------------------------------+
| 동행 요청                                                           |
+---------------------------------------------------------------------+
| +----------------------------------------------------------------+ |
| | Tabs: [받은 요청 (3)] [보낸 요청 (2)] [전체 이력]               | |
| +----------------------------------------------------------------+ |
+---------------------------------------------------------------------+
| [받은 요청 탭]                                                      |
| +----------------------------------------------------------------+ |
| | [Bell] 신규 요청                                                | |
| | +-------------------------------------------------------------+ | |
| | | 김팀장 -> 나                          2026-01-08 10:30       | | |
| | | 리드: ABC 컴퍼니 (A등급)                                     | | |
| | | 미팅: 2026-01-15 14:00 @ 강남역 근처                         | | |
| | | 사유: "대규모 계약 예상, 기술 지원 필요합니다"               | | |
| | |                                                              | | |
| | |                              [거절] [수락]                    | | |
| | +-------------------------------------------------------------+ | |
| |                                                                 | |
| | +-------------------------------------------------------------+ | |
| | | 박팀장 -> 나                          2026-01-07 16:00       | | |
| | | 리드: DEF 주식회사 (B등급)                                   | | |
| | | 미팅: 2026-01-12 10:00 @ 판교                                | | |
| | |                                                              | | |
| | |                              [거절] [수락]                    | | |
| | +-------------------------------------------------------------+ | |
| +----------------------------------------------------------------+ |
+---------------------------------------------------------------------+
```

---

## 6. 인증 및 권한 관리

### 6.1 Supabase Auth 설정

```typescript
// lib/supabase/client.ts
import { createBrowserClient } from "@supabase/ssr";

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}

// lib/supabase/server.ts
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

export function createClient() {
  const cookieStore = cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value;
        },
        set(name: string, value: string, options) {
          cookieStore.set({ name, value, ...options });
        },
        remove(name: string, options) {
          cookieStore.delete({ name, ...options });
        },
      },
    }
  );
}
```

### 6.2 미들웨어 (인증 체크)

```typescript
// middleware.ts
import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return request.cookies.get(name)?.value;
        },
        set(name: string, value: string, options: CookieOptions) {
          response.cookies.set({ name, value, ...options });
        },
        remove(name: string, options: CookieOptions) {
          response.cookies.set({ name, value: "", ...options });
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  // 인증되지 않은 사용자 -> 로그인 페이지로
  if (!user && !request.nextUrl.pathname.startsWith("/login")) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  // 인증된 사용자가 로그인 페이지 접근 -> 대시보드로
  if (user && request.nextUrl.pathname.startsWith("/login")) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|api/auth).*)"],
};
```

### 6.3 역할 기반 접근 제어

```typescript
// lib/auth/check-role.ts
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

type Role = "system_admin" | "sales_manager" | "team_leader";

export async function checkRole(allowedRoles: Role[]) {
  const supabase = createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: member } = await supabase
    .from("members")
    .select("role")
    .eq("user_id", user.id)
    .single();

  if (!member || !allowedRoles.includes(member.role)) {
    redirect("/unauthorized");
  }

  return member;
}

// 사용 예시 (페이지에서)
// app/(dashboard)/leads/page.tsx
export default async function LeadsPage() {
  await checkRole(["system_admin"]);

  // ... 페이지 렌더링
}
```

### 6.4 현재 사용자 정보 훅

```typescript
// hooks/use-user.ts
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Member } from "@/types";

export function useUser() {
  const [user, setUser] = useState<Member | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const supabase = createClient();

    async function getUser() {
      const {
        data: { user: authUser },
      } = await supabase.auth.getUser();

      if (authUser) {
        const { data: member } = await supabase
          .from("members")
          .select(
            `
            *,
            team:teams(*),
            manager_teams(team:teams(*))
          `
          )
          .eq("user_id", authUser.id)
          .single();

        setUser(member);
      }

      setLoading(false);
    }

    getUser();
  }, []);

  return { user, loading };
}
```

---

## 7. 환경 변수

```bash
# .env.local

# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# App
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

---

## 8. 배포 설정

### 8.1 Vercel 설정

```json
// vercel.json
{
  "framework": "nextjs",
  "regions": ["icn1"],
  "env": {
    "NEXT_PUBLIC_SUPABASE_URL": "@supabase-url",
    "NEXT_PUBLIC_SUPABASE_ANON_KEY": "@supabase-anon-key",
    "SUPABASE_SERVICE_ROLE_KEY": "@supabase-service-key"
  }
}
```

### 8.2 배포 체크리스트

- [ ] Supabase 프로젝트 생성
- [ ] 데이터베이스 스키마 적용 (SQL 실행)
- [ ] RLS 정책 확인
- [ ] Vercel 프로젝트 연결
- [ ] 환경 변수 설정
- [ ] 도메인 설정 (선택)
- [ ] 초기 관리자 계정 생성

---

## 9. 개발 순서 가이드

### Phase 1: 프로젝트 초기 설정 (1주)

```bash
# 1. 프로젝트 생성
npx create-next-app@latest leadflow --typescript --tailwind --app

# 2. 의존성 설치
npm install @supabase/supabase-js @supabase/ssr
npm install zustand react-hook-form @hookform/resolvers zod
npm install @tanstack/react-table recharts
npm install lucide-react
npm install papaparse  # CSV 파싱

# 3. shadcn/ui 설정
npx shadcn@latest init
npx shadcn@latest add button input select table dialog dropdown-menu badge card tabs toast

# 4. Supabase 설정
# - 프로젝트 생성
# - SQL 스키마 실행
# - 환경 변수 설정
```

### Phase 2-8: 기능별 개발

각 Phase에서 Claude Code에게 요청할 때:

```
"LeadFlow 프로젝트의 [기능명]을 구현해주세요.

기술 스택: Next.js 14 (App Router), Supabase, Tailwind CSS, shadcn/ui
아이콘: lucide-react만 사용 (이모지 사용 금지)

참고 문서:
- DB 스키마: [해당 테이블 SQL]
- API 명세: [해당 API 엔드포인트]
- 화면 설계: [해당 화면 구조]

구현해야 할 것:
1. API Route: /api/xxx
2. 페이지: /app/(dashboard)/xxx/page.tsx
3. 컴포넌트: /components/xxx/
"
```

---

## 부록: 컴포넌트 아이콘 사용 예시

### A. 사이드바 네비게이션

```tsx
// components/layout/sidebar.tsx
import {
  LayoutDashboard,
  Users,
  Upload,
  Building,
  UserCog,
  Settings,
  UserPlus,
  BarChart,
} from "lucide-react";

const navItems = [
  { icon: LayoutDashboard, label: "대시보드", href: "/dashboard" },
  { icon: Users, label: "리드 관리", href: "/leads" },
  { icon: Upload, label: "CSV 업로드", href: "/leads/upload" },
  // ...
];

export function Sidebar() {
  return (
    <nav>
      {navItems.map((item) => (
        <Link key={item.href} href={item.href}>
          <item.icon className="w-5 h-5 mr-3" />
          {item.label}
        </Link>
      ))}
    </nav>
  );
}
```

### B. 등급 뱃지

```tsx
// components/leads/grade-badge.tsx
import { Badge } from "@/components/ui/badge";

interface GradeBadgeProps {
  grade: {
    name: string;
    color: string;
  };
}

export function GradeBadge({ grade }: GradeBadgeProps) {
  return (
    <Badge
      style={{ backgroundColor: grade.color }}
      className="text-white font-medium"
    >
      {grade.name}
    </Badge>
  );
}
```

### C. 상태 아이콘

```tsx
// components/common/status-icon.tsx
import { CheckCircle, XCircle, Clock, AlertCircle } from "lucide-react";

const statusIcons = {
  success: CheckCircle,
  error: XCircle,
  pending: Clock,
  warning: AlertCircle,
};

interface StatusIconProps {
  status: keyof typeof statusIcons;
  className?: string;
}

export function StatusIcon({ status, className }: StatusIconProps) {
  const Icon = statusIcons[status];
  return <Icon className={className} />;
}
```

### D. 빈 상태 컴포넌트

```tsx
// components/common/empty-state.tsx
import { Inbox } from "lucide-react";

interface EmptyStateProps {
  title: string;
  description?: string;
  action?: React.ReactNode;
}

export function EmptyState({ title, description, action }: EmptyStateProps) {
  return (
    <div className="text-center py-12">
      <Inbox className="w-12 h-12 mx-auto text-gray-400" />
      <h3 className="mt-4 text-lg font-medium">{title}</h3>
      {description && <p className="mt-2 text-gray-500">{description}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}
```

---

_- 문서 끝 -_
