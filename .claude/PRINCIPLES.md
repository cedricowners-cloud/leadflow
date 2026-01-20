# PRINCIPLES.md - LeadFlow 개발 원칙

## Core Philosophy

**Primary Directive**: "Evidence > assumptions | Code > documentation | Efficiency > verbosity"

## LeadFlow Specific Principles

### 1. 사용자 중심 설계
- 시스템 관리자의 업무 효율성 최우선
- 팀장의 이중 입력 제거
- 실시간 현황 파악 가능

### 2. 단일 시스템 원칙
- Zapier + Flow.team 완전 대체
- 모든 데이터는 LeadFlow 내에서 관리
- 외부 의존성 최소화

### 3. 자동화 우선
- 등급 분류 자동화 (규칙 기반)
- 배분 즉시 반영
- 대시보드 실시간 갱신

## Development Principles

### SOLID Principles
- **Single Responsibility**: 각 컴포넌트는 하나의 책임만
- **Open/Closed**: 확장에 열림, 수정에 닫힘
- **Liskov Substitution**: 하위 타입 대체 가능
- **Interface Segregation**: 인터페이스 분리
- **Dependency Inversion**: 추상화에 의존

### Code Quality
- **DRY**: 중복 제거, 공통 기능 추상화
- **KISS**: 단순함 유지
- **YAGNI**: 현재 필요한 것만 구현

### Security First
- RLS (Row Level Security) 필수 적용
- JWT 기반 인증
- 역할 기반 접근 제어 (RBAC)
- 개인정보 마스킹

### Performance
- 페이지 로딩: 3초 이내
- CSV 1,000건 처리: 10초 이내
- 등급 규칙 적용: 건당 10ms 이내
- 동시 접속: 50명 지원

## UI/UX Principles

### Design System
- shadcn/ui 컴포넌트 우선 사용
- Tailwind CSS 유틸리티 클래스
- 일관된 색상 체계 (등급별 색상)

### Icon Usage
- lucide-react 전용 (이모지 금지)
- 일관된 아이콘 크기 (w-4 h-4, w-5 h-5)
- 의미 있는 아이콘 선택

### Accessibility
- 반응형 디자인 (1280x720 이상)
- 한국어 인터페이스
- 명확한 에러 메시지

## Data Principles

### Database
- UUID 기본키 사용
- soft delete (is_active 플래그)
- 변경 이력 추적 (lead_histories)
- 타임스탬프 자동 관리

### API Design
- RESTful 엔드포인트
- 일관된 응답 형식
- 적절한 HTTP 상태 코드
- 페이지네이션 지원

### Validation
- Zod 스키마 검증
- 서버/클라이언트 이중 검증
- 명확한 에러 메시지

## Testing Philosophy

- 핵심 비즈니스 로직 테스트
- 등급 분류 로직 테스트
- API 엔드포인트 테스트
- 권한 검증 테스트
