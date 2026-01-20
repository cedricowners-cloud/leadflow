# LeadFlow 클라이언트 포털 테마 분석

## 분석 대상: Stripe

| 항목      | 내용                                   |
| --------- | -------------------------------------- |
| URL       | https://stripe.com                     |
| 특징      | 신뢰감, 프리미엄, 클린한 디자인        |
| 적용 대상 | LeadFlow 클라이언트 포털 (외부 고객용) |

---

## 1. 컬러 시스템

### 1.1 Primary Colors

```css
:root {
  /* Stripe Purple - Primary Action */
  --primary: #635bff; /* rgb(99, 91, 255) */
  --primary-hover: #7a73ff;
  --primary-foreground: #ffffff;

  /* Dark Navy - Secondary/Text */
  --secondary: #0a2540; /* rgb(10, 37, 64) */
  --secondary-foreground: #ffffff;
}
```

### 1.2 Background Colors

```css
:root {
  /* 배경 그라데이션 (Light) */
  --background: #f6f9fc; /* rgb(246, 249, 252) - 메인 배경 */
  --background-alt: #f6f9fb; /* rgb(246, 249, 251) - 대체 배경 */
  --background-white: #ffffff; /* 카드, 모달 */

  /* 섹션 배경 */
  --section-light: #eff3f9; /* rgb(239, 243, 249) */
  --section-dark: #0a2540; /* rgb(10, 37, 64) - 다크 섹션 */
}
```

### 1.3 Text Colors

```css
:root {
  /* 텍스트 계층 */
  --text-primary: #0a2540; /* rgb(10, 37, 64) - 제목 */
  --text-secondary: #425466; /* rgb(66, 84, 102) - 본문 */
  --text-tertiary: #3f4b66; /* rgb(63, 75, 102) - 보조 */
  --text-muted: #727f96; /* rgb(114, 127, 150) - 비활성 */
  --text-placeholder: #bdc6d2; /* rgb(189, 198, 210) */
}
```

### 1.4 Accent Colors

```css
:root {
  /* 강조 색상 */
  --accent-purple: #9966ff; /* rgb(153, 102, 255) */
  --accent-blue: #0073e6; /* rgb(0, 115, 230) */
  --accent-cyan: #00c4c4; /* rgb(0, 196, 196) */
  --accent-green: #15be53; /* rgb(21, 190, 83) - 성공 */

  /* 상태 색상 */
  --success: #15be53;
  --warning: #f5a623;
  --error: #d0344b;
  --info: #0073e6;
}
```

### 1.5 Border & Shadow

```css
:root {
  /* 테두리 */
  --border-light: rgba(171, 181, 197, 0.3);
  --border-default: #ebf1f7; /* rgb(235, 238, 241) */

  /* 그림자 */
  --shadow-sm: 0 2px 4px -1px rgba(50, 50, 93, 0.25), 0 1px 3px -1px rgba(0, 0, 0, 0.3);
  --shadow-md: 0 4px 6px -1px rgba(50, 50, 93, 0.1), 0 2px 4px -1px rgba(50, 50, 93, 0.06);
  --shadow-lg: 0 50px 100px -20px rgba(50, 50, 93, 0.25), 0 30px 60px -30px rgba(0, 0, 0, 0.3);
}
```

---

## 2. 타이포그래피

### 2.1 폰트 설정

```css
:root {
  /* Stripe 커스텀 폰트 - 대체 가능 */
  --font-primary: "sohne-var", "Helvetica Neue", Arial, sans-serif;

  /* 추천 대체 폰트 (한글 지원) */
  --font-korean: "Pretendard", "Apple SD Gothic Neo", "Noto Sans KR", sans-serif;

  /* 코드/숫자 */
  --font-mono: "Menlo", "Consolas", monospace;
}
```

### 2.2 폰트 스케일

| 용도             | 크기 | 굵기 | Line Height |
| ---------------- | ---- | ---- | ----------- |
| H1 (페이지 제목) | 32px | 700  | 40px        |
| H2 (섹션 제목)   | 21px | 700  | normal      |
| Body (본문)      | 16px | 400  | 24px        |
| Small (보조)     | 14px | 400  | 20px        |
| Caption          | 12px | 400  | 16px        |

### 2.3 폰트 굵기

| 용도        | 굵기    |
| ----------- | ------- |
| 일반 텍스트 | 400     |
| 네비게이션  | 425-500 |
| 버튼/강조   | 500     |
| 제목        | 600-700 |

---

## 3. 컴포넌트 스타일

### 3.1 Button

```css
/* Primary Button */
.btn-primary {
  background-color: #635bff;
  color: #ffffff;
  border-radius: 16.5px; /* Pill shape */
  padding: 3px 12px 6px 16px;
  font-weight: 500;
  transition: background-color 0.2s;
}

.btn-primary:hover {
  background-color: #7a73ff;
}

/* Secondary Button */
.btn-secondary {
  background-color: #0a2540;
  color: #ffffff;
  border-radius: 16.5px;
  padding: 3px 12px 6px 16px;
  font-weight: 500;
}

/* Ghost Button */
.btn-ghost {
  background-color: transparent;
  color: #425466;
  border-radius: 4px;
  padding: 8px 16px;
}
```

### 3.2 Input

```css
/* Text Input */
.input {
  background-color: transparent;
  border: 1px solid rgba(171, 181, 197, 0.3);
  border-radius: 4px;
  padding: 8px 16px;
  height: 44px;
  font-size: 16px;
  color: #3c4257;
  transition: border-color 0.2s, box-shadow 0.2s;
}

.input:focus {
  border-color: #635bff;
  box-shadow: 0 0 0 3px rgba(99, 91, 255, 0.1);
  outline: none;
}

/* Search Input (Pill) */
.input-search {
  background-color: #f6f9fb;
  border: 1px solid rgba(171, 181, 197, 0.3);
  border-radius: 32px;
  padding: 9.5px 18px;
  height: 45px;
}
```

### 3.3 Card

```css
/* 기본 카드 */
.card {
  background-color: #ffffff;
  border-radius: 8px;
  box-shadow: 0 2px 4px -1px rgba(50, 50, 93, 0.25), 0 1px 3px -1px rgba(0, 0, 0, 0.3);
}

/* 호버 카드 */
.card-hover {
  background-color: #ffffff;
  border-radius: 8px;
  transition: box-shadow 0.2s, transform 0.2s;
}

.card-hover:hover {
  box-shadow: 0 50px 100px -20px rgba(50, 50, 93, 0.25), 0 30px 60px -30px rgba(0, 0, 0, 0.3);
  transform: translateY(-2px);
}

/* 다크 카드 */
.card-dark {
  background-color: #0a2540;
  border-radius: 4px;
  color: #ffffff;
}
```

### 3.4 Badge / Status

```css
/* 상태 뱃지 */
.badge {
  display: inline-flex;
  align-items: center;
  padding: 2px 8px;
  border-radius: 4px;
  font-size: 12px;
  font-weight: 500;
}

.badge-success {
  background-color: rgba(21, 190, 83, 0.1);
  color: #15be53;
}

.badge-warning {
  background-color: rgba(245, 166, 35, 0.1);
  color: #f5a623;
}

.badge-error {
  background-color: rgba(208, 52, 75, 0.1);
  color: #d0344b;
}

.badge-info {
  background-color: rgba(99, 91, 255, 0.1);
  color: #635bff;
}
```

### 3.5 Link

```css
.link {
  color: #635bff;
  text-decoration: none;
  transition: color 0.2s;
}

.link:hover {
  color: #7a73ff;
  text-decoration: underline;
}
```

---

## 4. 레이아웃

### 4.1 클라이언트 포털 구조

```
+------------------------------------------------------------------+
|                         Header (68px)                             |
|  [Logo]                                    [Profile] [Settings]   |
+------------------------------------------------------------------+
|                                                                    |
|  +------------------------------------------------------------+  |
|  |                     Profile Card                            |  |
|  |  [Avatar]  Name                              [Edit Button]  |  |
|  |            email@example.com                                |  |
|  |            Status: Active                                   |  |
|  +------------------------------------------------------------+  |
|                                                                    |
|  +---------------------------+  +-----------------------------+   |
|  |    Information Card       |  |     Contact Card            |   |
|  |    (회사 정보)             |  |     (담당자 정보)            |   |
|  +---------------------------+  +-----------------------------+   |
|                                                                    |
|  +------------------------------------------------------------+  |
|  |                    Activity / History                       |  |
|  |    상담 이력, 변경 로그 등                                    |  |
|  +------------------------------------------------------------+  |
|                                                                    |
+------------------------------------------------------------------+
|                         Footer                                    |
+------------------------------------------------------------------+
```

### 4.2 간격 시스템

| 용도                | 값     | 비고         |
| ------------------- | ------ | ------------ |
| Container max-width | 1200px | 중앙 정렬    |
| Section padding     | 80px   | 상하 여백    |
| Card padding        | 24px   | 내부 여백    |
| Card gap            | 24px   | 카드 간 간격 |
| Element gap         | 16px   | 요소 간 간격 |
| Small gap           | 8px    | 작은 간격    |

---

## 5. LeadFlow 클라이언트 포털 적용

### 5.1 globals.css

```css
@import url("https://cdn.jsdelivr.net/gh/orioncactus/pretendard/dist/web/static/pretendard.css");

:root {
  /* Primary - Stripe Purple */
  --primary: 243 89% 67%; /* #635BFF */
  --primary-foreground: 0 0% 100%;

  /* Secondary - Dark Navy */
  --secondary: 210 66% 15%; /* #0A2540 */
  --secondary-foreground: 0 0% 100%;

  /* Background */
  --background: 210 33% 98%; /* #F6F9FC */
  --foreground: 210 66% 15%; /* #0A2540 */

  /* Card */
  --card: 0 0% 100%;
  --card-foreground: 210 66% 15%;

  /* Muted */
  --muted: 213 27% 94%; /* #EFF3F9 */
  --muted-foreground: 213 20% 33%; /* #425466 */

  /* Accent */
  --accent: 243 89% 67%;
  --accent-foreground: 0 0% 100%;

  /* Border */
  --border: 213 33% 93%;
  --input: 213 33% 93%;
  --ring: 243 89% 67%;

  /* Radius */
  --radius: 8px;
  --radius-pill: 9999px;

  /* Status Colors */
  --success: 145 63% 42%; /* #15BE53 */
  --warning: 38 91% 55%; /* #F5A623 */
  --destructive: 350 62% 51%; /* #D0344B */
  --info: 211 100% 45%; /* #0073E6 */
}

body {
  font-family: "Pretendard", -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
  background-color: hsl(var(--background));
  color: hsl(var(--foreground));
}
```

### 5.2 클라이언트 포털 vs 어드민 비교

| 요소          | 어드민 (shadcn-admin) | 클라이언트 포털 (Stripe) |
| ------------- | --------------------- | ------------------------ |
| 배경색        | 진한 다크/라이트      | 밝은 회색-블루 (#F6F9FC) |
| Primary       | 네이비 (#1a1a2e)      | 보라색 (#635BFF)         |
| Border Radius | 10px                  | 8px (카드), pill (버튼)  |
| 정보 밀도     | 높음 (테이블, 필터)   | 낮음 (카드 중심)         |
| 사이드바      | 있음                  | 없음 (헤더만)            |
| 그림자        | 최소                  | 풍부한 그림자            |
| 폰트          | Inter                 | Pretendard/Sohne         |

### 5.3 LeadFlow 등급별 색상

```css
:root {
  /* A등급 - Primary Purple */
  --grade-a: 243 89% 67%; /* #635BFF */
  --grade-a-bg: 243 89% 97%;

  /* B등급 - Blue */
  --grade-b: 211 100% 45%; /* #0073E6 */
  --grade-b-bg: 211 100% 97%;

  /* C등급 - Cyan */
  --grade-c: 180 100% 38%; /* #00C4C4 */
  --grade-c-bg: 180 100% 97%;

  /* D등급 - Gray */
  --grade-d: 213 20% 45%; /* #727F96 */
  --grade-d-bg: 213 20% 97%;
}
```

---

## 6. 컴포넌트 예시 (React)

### 6.1 Profile Card

```tsx
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Pencil } from "lucide-react";

export function ProfileCard({ lead }) {
  return (
    <Card className="bg-white shadow-md">
      <CardContent className="p-6">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-4">
            <Avatar className="h-16 w-16">
              <AvatarFallback className="bg-primary text-white text-xl">
                {lead.name.slice(0, 2)}
              </AvatarFallback>
            </Avatar>
            <div>
              <h2 className="text-xl font-semibold text-secondary">
                {lead.name}
              </h2>
              <p className="text-muted-foreground">{lead.email}</p>
              <div className="mt-2 flex items-center gap-2">
                <Badge variant={lead.grade === "A" ? "default" : "secondary"}>
                  {lead.grade}등급
                </Badge>
                <Badge
                  variant="outline"
                  className="text-success border-success"
                >
                  활성
                </Badge>
              </div>
            </div>
          </div>
          <Button variant="ghost" size="icon">
            <Pencil className="h-4 w-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
```

### 6.2 Info Card

```tsx
export function InfoCard({ title, children }) {
  return (
    <Card className="bg-white shadow-sm hover:shadow-md transition-shadow">
      <CardHeader className="pb-2">
        <CardTitle className="text-lg font-semibold text-secondary">
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  );
}
```

### 6.3 Pill Button

```tsx
// Primary Pill Button
<Button className="rounded-full bg-primary hover:bg-primary/90 px-6">
  저장하기
</Button>

// Secondary Pill Button
<Button className="rounded-full bg-secondary hover:bg-secondary/90 px-6">
  문의하기
</Button>

// Outline Pill Button
<Button variant="outline" className="rounded-full px-6">
  취소
</Button>
```

---

## 7. 권장 shadcn/ui 설정

```bash
# 컴포넌트 설치
npx shadcn@latest add button card avatar badge
npx shadcn@latest add input label textarea
npx shadcn@latest add dialog sheet
npx shadcn@latest add separator

# 추가 권장
npx shadcn@latest add alert toast
```

### tailwind.config.js 확장

```js
module.exports = {
  theme: {
    extend: {
      colors: {
        // Stripe 색상
        stripe: {
          purple: "#635BFF",
          navy: "#0A2540",
          bg: "#F6F9FC",
        },
        // 등급 색상
        grade: {
          a: "hsl(var(--grade-a))",
          b: "hsl(var(--grade-b))",
          c: "hsl(var(--grade-c))",
          d: "hsl(var(--grade-d))",
        },
      },
      borderRadius: {
        pill: "9999px",
      },
      boxShadow: {
        stripe:
          "0 2px 4px -1px rgba(50, 50, 93, 0.25), 0 1px 3px -1px rgba(0, 0, 0, 0.3)",
        "stripe-hover":
          "0 50px 100px -20px rgba(50, 50, 93, 0.25), 0 30px 60px -30px rgba(0, 0, 0, 0.3)",
      },
    },
  },
};
```

---

## 8. 스크린샷 참고

| 페이지          | 설명                                      |
| --------------- | ----------------------------------------- |
| stripe-home     | 메인 페이지, 그라데이션 배경, 히어로 섹션 |
| stripe-section2 | 카드 레이아웃, 섀도우 스타일              |
| stripe-login    | 로그인 폼, 입력 필드 스타일               |
| stripe-docs     | 문서 레이아웃, 타이포그래피               |

---

_분석일: 2026.01.09_
_분석 도구: Playwright_
_적용 대상: LeadFlow 클라이언트 포털_
