# LeadFlow 테마 분석 리포트

## 분석 대상: shadcn-admin

| 항목      | 내용                                                 |
| --------- | ---------------------------------------------------- |
| URL       | https://shadcn-admin.netlify.app                     |
| GitHub    | https://github.com/satnaing/shadcn-admin             |
| 기술 스택 | Vite + React + TypeScript + shadcn/ui + Tailwind CSS |

---

## 1. 컬러 시스템

### 1.1 Light Mode (라이트 모드)

```css
:root {
  /* 배경/전경 */
  --background: oklch(100% 0 0); /* 흰색 */
  --foreground: oklch(12.9% 0.042 264.695); /* 거의 검정 */

  /* 카드 */
  --card: oklch(100% 0 0);
  --card-foreground: oklch(12.9% 0.042 264.695);

  /* 팝오버 */
  --popover: oklch(100% 0 0);
  --popover-foreground: oklch(12.9% 0.042 264.695);

  /* Primary - 주요 액션 버튼 */
  --primary: oklch(20.8% 0.042 265.755); /* 진한 네이비 */
  --primary-foreground: oklch(98.4% 0.003 247.858);

  /* Secondary */
  --secondary: oklch(96.8% 0.007 247.896); /* 연한 회색 */
  --secondary-foreground: oklch(20.8% 0.042 265.755);

  /* Muted - 비활성/보조 텍스트 */
  --muted: oklch(96.8% 0.007 247.896);
  --muted-foreground: oklch(55.4% 0.046 257.417);

  /* Accent - 호버/포커스 */
  --accent: oklch(96.8% 0.007 247.896);
  --accent-foreground: oklch(20.8% 0.042 265.755);

  /* Destructive - 삭제/위험 */
  --destructive: oklch(57.7% 0.245 27.325); /* 빨간색 */

  /* Border & Input */
  --border: oklch(92.9% 0.013 255.508); /* 연한 회색 테두리 */
  --input: oklch(92.9% 0.013 255.508);
  --ring: oklch(70.4% 0.04 256.788); /* 포커스 링 */

  /* Radius */
  --radius: 0.625rem; /* 10px */
}
```

### 1.2 Dark Mode (다크 모드)

```css
.dark {
  /* 배경/전경 */
  --background: oklch(12.9% 0.042 264.695); /* 진한 네이비 */
  --foreground: oklch(98.4% 0.003 247.858); /* 거의 흰색 */

  /* 카드 */
  --card: oklch(14% 0.04 259.21); /* 배경보다 약간 밝음 */
  --card-foreground: oklch(98.4% 0.003 247.858);

  /* 팝오버 */
  --popover: oklch(20.8% 0.042 265.755);
  --popover-foreground: oklch(98.4% 0.003 247.858);

  /* Primary */
  --primary: oklch(92.9% 0.013 255.508); /* 밝은 회색 (반전) */
  --primary-foreground: oklch(20.8% 0.042 265.755);

  /* Secondary */
  --secondary: oklch(27.9% 0.041 260.031);
  --secondary-foreground: oklch(98.4% 0.003 247.858);

  /* Muted */
  --muted: oklch(27.9% 0.041 260.031);
  --muted-foreground: oklch(70.4% 0.04 256.788);

  /* Accent */
  --accent: oklch(27.9% 0.041 260.031);
  --accent-foreground: oklch(98.4% 0.003 247.858);

  /* Destructive */
  --destructive: oklch(70.4% 0.191 22.216);

  /* Border & Input */
  --border: oklch(100% 0 0 / 0.1); /* 투명도 10% 흰색 */
  --input: oklch(100% 0 0 / 0.15);
  --ring: oklch(55.1% 0.027 264.364);

  /* Chart Colors */
  --chart-1: oklch(48.8% 0.243 264.376); /* 파란색 계열 */
  --chart-2: oklch(69.6% 0.17 162.48); /* 청록색 */
  --chart-3: oklch(76.9% 0.188 70.08); /* 주황색 */
  --chart-4: oklch(62.7% 0.265 303.9); /* 보라색 */
  --chart-5: oklch(64.5% 0.246 16.439); /* 빨간색 */
}
```

### 1.3 Sidebar 전용 변수

```css
:root {
  --sidebar-width: 16rem; /* 256px */
  --sidebar-width-icon: 3rem; /* 48px (접힌 상태) */

  --sidebar-foreground: oklch(12.9% 0.042 264.695);
  --sidebar-primary: oklch(20.8% 0.042 265.755);
  --sidebar-primary-foreground: oklch(98.4% 0.003 247.858);
  --sidebar-accent: oklch(96.8% 0.007 247.896);
  --sidebar-accent-foreground: oklch(20.8% 0.042 265.755);
  --sidebar-border: oklch(92.9% 0.013 255.508);
  --sidebar-ring: oklch(70.4% 0.04 256.788);
}
```

---

## 2. 타이포그래피

### 2.1 폰트 설정

```css
:root {
  font-family: "Inter", sans-serif;
  font-size: 16px;
  line-height: 24px; /* 1.5 */
}
```

### 2.2 폰트 사이즈 스케일 (Tailwind 기본)

| 클래스      | 크기 | 용도               |
| ----------- | ---- | ------------------ |
| `text-xs`   | 12px | 뱃지, 보조 텍스트  |
| `text-sm`   | 14px | 본문, 테이블, 메뉴 |
| `text-base` | 16px | 기본 본문          |
| `text-lg`   | 18px | 소제목             |
| `text-xl`   | 20px | 카드 제목          |
| `text-2xl`  | 24px | 페이지 제목        |

### 2.3 폰트 굵기

| 클래스          | 굵기 | 용도       |
| --------------- | ---- | ---------- |
| `font-normal`   | 400  | 본문       |
| `font-medium`   | 500  | 메뉴, 라벨 |
| `font-semibold` | 600  | 제목, 강조 |
| `font-bold`     | 700  | 대제목     |

---

## 3. 레이아웃 구조

### 3.1 전체 레이아웃

```
+------------------------------------------------------------------+
|                        전체 컨테이너                              |
| +------------+ +-----------------------------------------------+ |
| |            | |                                               | |
| |  Sidebar   | |              Main Content                     | |
| |  (256px)   | |              (flex-1)                         | |
| |            | |                                               | |
| |            | | +-------------------------------------------+ | |
| |            | | |  Header (h-16, 64px)                      | | |
| |            | | +-------------------------------------------+ | |
| |            | | |  Content Area                             | | |
| |            | | |  - padding: 1rem (16px)                   | | |
| |            | | |  - gap: 1rem                              | | |
| |            | | +-------------------------------------------+ | |
| +------------+ +-----------------------------------------------+ |
+------------------------------------------------------------------+
```

### 3.2 Sidebar 구조

```
+------------------+
| Header (h-12)    |
| - Logo           |
| - Dropdown       |
+------------------+
| Content          |
| - Group Label    |
| - Menu Items     |
|   - Icon + Text  |
|   - Badge        |
+------------------+
| Footer (h-12)    |
| - User Avatar    |
| - User Info      |
+------------------+
```

### 3.3 주요 간격

| 용도           | 값   | Tailwind    |
| -------------- | ---- | ----------- |
| 컴포넌트 간격  | 16px | `gap-4`     |
| 카드 내부 패딩 | 24px | `p-6`       |
| 섹션 간격      | 24px | `space-y-6` |
| 작은 간격      | 8px  | `gap-2`     |

---

## 4. 컴포넌트 스타일

### 4.1 Card

```tsx
// 기본 Card 클래스
<Card className="flex flex-col gap-6 rounded-xl border bg-card py-6 text-card-foreground shadow-sm">
  <CardHeader>...</CardHeader>
  <CardContent>...</CardContent>
</Card>
```

| 속성          | 값                               |
| ------------- | -------------------------------- |
| Border Radius | `rounded-xl`(12px)               |
| Border        | `border`(1px solid border-color) |
| Shadow        | `shadow-sm`                      |
| Padding       | `py-6`(상하 24px)                |
| Gap           | `gap-6`(24px)                    |

### 4.2 Button Variants

```tsx
// Primary (기본)
<Button>Primary</Button>
// className: bg-primary text-primary-foreground

// Secondary
<Button variant="secondary">Secondary</Button>

// Outline
<Button variant="outline">Outline</Button>

// Ghost (투명)
<Button variant="ghost">Ghost</Button>

// Destructive (삭제/위험)
<Button variant="destructive">Delete</Button>
```

### 4.3 Badge Variants

```tsx
// 상태별 Badge
<Badge>active</Badge>      // 기본
<Badge variant="outline">invited</Badge>
<Badge variant="secondary">inactive</Badge>
<Badge variant="destructive">suspended</Badge>
```

Badge 스타일:

- `rounded-md` (6px)
- `px-2 py-0.5`
- `text-xs font-medium`

### 4.4 Table

```tsx
<Table className="w-full caption-bottom text-sm">
  <TableHeader>
    <TableRow>
      <TableHead>Column</TableHead>
    </TableRow>
  </TableHeader>
  <TableBody>
    <TableRow>
      <TableCell>Data</TableCell>
    </TableRow>
  </TableBody>
</Table>
```

| 속성      | 스타일              |
| --------- | ------------------- |
| 헤더 배경 | `bg-muted/50`       |
| 행 호버   | `hover:bg-muted/50` |
| 테두리    | `border-b`          |
| 셀 패딩   | `p-4`               |

### 4.5 Input

```tsx
<Input
  className="h-10 rounded-md border border-input bg-transparent px-3 py-2 text-sm"
  placeholder="Search..."
/>
```

### 4.6 Select / Dropdown

```tsx
<Select>
  <SelectTrigger className="w-[180px]">
    <SelectValue placeholder="Select..." />
  </SelectTrigger>
  <SelectContent>
    <SelectItem value="option1">Option 1</SelectItem>
  </SelectContent>
</Select>
```

---

## 5. Sidebar 메뉴 패턴

### 5.1 메뉴 아이템 구조

```tsx
<SidebarMenuItem>
  <SidebarMenuButton asChild isActive={isActive}>
    <Link href={href}>
      <Icon className="size-4" />
      <span>{label}</span>
      {badge && <Badge>{badge}</Badge>}
    </Link>
  </SidebarMenuButton>
</SidebarMenuItem>
```

### 5.2 메뉴 그룹

```tsx
<SidebarGroup>
  <SidebarGroupLabel>General</SidebarGroupLabel>
  <SidebarMenu>
    {items.map((item) => (
      <SidebarMenuItem key={item.href}>...</SidebarMenuItem>
    ))}
  </SidebarMenu>
</SidebarGroup>
```

### 5.3 접히는 서브메뉴

```tsx
<Collapsible>
  <CollapsibleTrigger asChild>
    <SidebarMenuButton>
      <Icon />
      <span>Settings</span>
      <ChevronRight className="ms-auto transition-transform group-data-[state=open]:rotate-90" />
    </SidebarMenuButton>
  </CollapsibleTrigger>
  <CollapsibleContent>
    <SidebarMenuSub>
      {subItems.map(...)}
    </SidebarMenuSub>
  </CollapsibleContent>
</Collapsible>
```

---

## 6. LeadFlow 적용 가이드

### 6.1 globals.css 설정

```css
@tailwind base;
@tailwind components;
@tailwind utilities;

@layer base {
  :root {
    --background: 0 0% 100%;
    --foreground: 240 10% 3.9%;
    --card: 0 0% 100%;
    --card-foreground: 240 10% 3.9%;
    --popover: 0 0% 100%;
    --popover-foreground: 240 10% 3.9%;
    --primary: 240 5.9% 10%;
    --primary-foreground: 0 0% 98%;
    --secondary: 240 4.8% 95.9%;
    --secondary-foreground: 240 5.9% 10%;
    --muted: 240 4.8% 95.9%;
    --muted-foreground: 240 3.8% 46.1%;
    --accent: 240 4.8% 95.9%;
    --accent-foreground: 240 5.9% 10%;
    --destructive: 0 84.2% 60.2%;
    --destructive-foreground: 0 0% 98%;
    --border: 240 5.9% 90%;
    --input: 240 5.9% 90%;
    --ring: 240 5.9% 10%;
    --radius: 0.625rem;

    /* 사이드바 */
    --sidebar-background: 0 0% 98%;
    --sidebar-foreground: 240 5.3% 26.1%;
    --sidebar-primary: 240 5.9% 10%;
    --sidebar-primary-foreground: 0 0% 98%;
    --sidebar-accent: 240 4.8% 95.9%;
    --sidebar-accent-foreground: 240 5.9% 10%;
    --sidebar-border: 220 13% 91%;
    --sidebar-ring: 217.2 91.2% 59.8%;
  }

  .dark {
    --background: 240 10% 3.9%;
    --foreground: 0 0% 98%;
    --card: 240 10% 3.9%;
    --card-foreground: 0 0% 98%;
    --popover: 240 10% 3.9%;
    --popover-foreground: 0 0% 98%;
    --primary: 0 0% 98%;
    --primary-foreground: 240 5.9% 10%;
    --secondary: 240 3.7% 15.9%;
    --secondary-foreground: 0 0% 98%;
    --muted: 240 3.7% 15.9%;
    --muted-foreground: 240 5% 64.9%;
    --accent: 240 3.7% 15.9%;
    --accent-foreground: 0 0% 98%;
    --destructive: 0 62.8% 30.6%;
    --destructive-foreground: 0 0% 98%;
    --border: 240 3.7% 15.9%;
    --input: 240 3.7% 15.9%;
    --ring: 240 4.9% 83.9%;

    /* 사이드바 */
    --sidebar-background: 240 5.9% 10%;
    --sidebar-foreground: 240 4.8% 95.9%;
    --sidebar-primary: 224.3 76.3% 48%;
    --sidebar-primary-foreground: 0 0% 100%;
    --sidebar-accent: 240 3.7% 15.9%;
    --sidebar-accent-foreground: 240 4.8% 95.9%;
    --sidebar-border: 240 3.7% 15.9%;
    --sidebar-ring: 217.2 91.2% 59.8%;
  }
}

@layer base {
  * {
    @apply border-border;
  }
  body {
    @apply bg-background text-foreground;
    font-family: "Inter", sans-serif;
  }
}
```

### 6.2 LeadFlow 등급 색상 추가

```css
:root {
  /* Lead Grade Colors */
  --grade-a: 142.1 76.2% 36.3%; /* Green */
  --grade-b: 217.2 91.2% 59.8%; /* Blue */
  --grade-c: 47.9 95.8% 53.1%; /* Yellow */
  --grade-d: 220 8.9% 46.1%; /* Gray */
}
```

### 6.3 tailwind.config.js 확장

```js
module.exports = {
  theme: {
    extend: {
      colors: {
        grade: {
          a: "hsl(var(--grade-a))",
          b: "hsl(var(--grade-b))",
          c: "hsl(var(--grade-c))",
          d: "hsl(var(--grade-d))",
        },
      },
    },
  },
};
```

---

## 7. 권장 shadcn/ui 컴포넌트 설치

```bash
npx shadcn@latest add button
npx shadcn@latest add input
npx shadcn@latest add select
npx shadcn@latest add table
npx shadcn@latest add card
npx shadcn@latest add badge
npx shadcn@latest add dialog
npx shadcn@latest add dropdown-menu
npx shadcn@latest add tabs
npx shadcn@latest add toast
npx shadcn@latest add sidebar
npx shadcn@latest add collapsible
npx shadcn@latest add separator
npx shadcn@latest add avatar
npx shadcn@latest add tooltip
npx shadcn@latest add popover
npx shadcn@latest add command
```

---

## 8. 스크린샷 참고

분석 과정에서 촬영한 스크린샷:

1. **Dashboard (Light)** - 카드 레이아웃, 통계 위젯
2. **Dashboard (Dark)** - 다크 모드 색상 적용
3. **Users Table** - 데이터 테이블, 필터, 페이지네이션
4. **Tasks Page** - 필터 UI, 뱃지 variants

---

_분석일: 2026.01.09_
_분석 도구: Playwright_
