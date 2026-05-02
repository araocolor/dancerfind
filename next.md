# LOCO — 개발 현황 & 다음 세션 인계문서

> 작성일: 2026-05-03  
> 현재 완료: Phase 1-9 (전체 코드 구현 완료)  
> 남은 작업: 외부 설정 (Supabase RLS 검증, 카카오맵 도메인 등록, 모바일 테스트, 카카오 알림톡 채널 승인 후 활성화)

---

## 프로젝트 개요

**서비스명:** LOCO (Latin dance class platform)  
**목적:** 댄스 강사가 클래스를 개설하고, 사용자가 검색·신청하는 플랫폼  
**장르:** 살사 / 바차타 / 페스티벌 / 이벤트 / 기타  
**대상:** 국내(한국) 전용, 한국어 전용, 모바일 우선

---

## 기술 스택

| 항목 | 결정사항 |
|---|---|
| 프레임워크 | Next.js 16 (App Router) |
| 백엔드 | Next.js API Routes + Supabase |
| DB | PostgreSQL (Supabase) |
| 인증 | 현재: 이메일/비밀번호 (테스트용) → 추후: 카카오 소셜 로그인 대체 |
| CSS | Tailwind CSS v4 + globals.css 전역 컴포넌트 클래스 |
| 패키지 매니저 | npm |
| 배포 | Vercel (GitHub 연동) |
| 스토리지 | Supabase Storage (버킷: class-images, avatars) |

---

## 핵심 기획 결정사항 (Q1~Q15 확정)

| # | 항목 | 결정 |
|---|---|---|
| Q1 | 검색 리스트 | 무한 스크롤 / 20개씩 / 다음 20개 prefetch |
| Q2 | 기본 검색 조건 저장 | 로그인 → profiles 테이블 / 비로그인 → sessionStorage |
| Q3 | 레벨 옵션 | 입문/초급/중급/고급/올레벨 (DB: beginner/elementary/intermediate/advanced/all) |
| Q4 | 닉네임 | 중복 불허, DB UNIQUE 인덱스, 실시간 중복확인 API |
| Q5 | 개설자 취소 알림 | 알림톡 + 사이트 알림 / 승인된 신청자 전원 |
| Q6 | 프로 등급 신청 | 마이페이지 신청 버튼 → 관리자 페이지 검토/승인 |
| Q7 | D-1 리마인더 | MVP 제외 |
| Q8 | 이미지 없는 클래스 | 목록형=아바타, 카드형=480px, 없으면 장르별 기본이미지 3장 |
| Q9 | 회원 프로필 클래스 | 모집중인 클래스만 표시 |
| Q10 | 1:1 클래스 정원 | 개설자 직접 입력 (라벨만 1:1) |
| Q11 | 거절 상태 | 없음 (미승인=암묵적 거절) / 마감 D-1 미승인 자동취소 (Vercel Cron 포함) |
| Q12 | 장르 옵션 | 살사/바차타/페스티벌/이벤트/기타 |
| Q13 | 장르 검색 필터 | 검색 2단계 리스트 칩 필터 |
| Q14 | 실시간 알림 | MVP 미포함 (새로고침 시 갱신) |
| Q15 | 카카오 알림톡 | 코드 구현 + feature flag 비활성화 (채널 승인 후 활성화) |

---

## URL 구조

```
/                    홈
/login               로그인
/signup              회원가입
/onboarding          최초 활동지역+장르 입력
/search              검색 1단계 (조건 선택)
/search/results      검색 2단계 (리스트)
/classes/new         클래스 개설
/classes/[id]        클래스 상세
/classes/[id]/edit   클래스 수정
/mypage              마이페이지
/notifications       알림함
/users/[id]          회원 프로필
/admin               관리자 페이지
/auth/callback       카카오 OAuth 콜백 (추후 사용)
```

**middleware.ts 보호 경로:** `/classes/new`, `/mypage`, `/notifications`, `/admin`, `/onboarding`

---

## 디자인 시스템 (globals.css)

```
컬러: 카카오 옐로우 #FEE500 (primary), 배경 #F6F8FB, 카드 #FFFFFF
버튼: 알약형 (border-radius: 9999px)
카드: border-radius 16px, shadow 0 2px 8px rgba(0,0,0,0.08)
인풋: border-radius 12px, focus 시 border #FEE500
폰트: -apple-system, BlinkMacSystemFont, Apple SD Gothic Neo, Malgun Gothic
```

**전역 CSS 클래스:** `.card` `.btn-primary` `.btn-outline` `.chip` `.chip.active` `.input-field` `.field-label` `.error-text`

**참고 이미지:** `docs/design_refer.png`

---

## DB 스키마 핵심 (supabase/schema.sql)

### profiles
```
id, email, name, nickname(UNIQUE), role(member/pro/admin)
profile_image_url, phone, kakao_id, bio, region
default_search_options(JSONB), preferred_genres(JSONB)
kakao_notification_enabled(BOOLEAN)
```

### classes
```
id, host_id, title, genre(살사/바차타/페스티벌/이벤트/기타)
level(beginner/elementary/intermediate/advanced/all)
class_type(group/private), type(class/event), status(recruiting/closed/cancelled)
description, datetime, deadline, location_address, location_lat, location_lng
capacity, contact, price, images(JSONB), region
is_modified(BOOLEAN), view_count(INTEGER)
```

### applications
```
id, class_id, applicant_id, status(pending/approved/cancelled)
```

### notifications
```
id, user_id, message, is_read, type(application/approved/cancelled/notice/modified)
link_url, related_id
```

### pro_requests
```
id, user_id, status(pending/approved/rejected), message
UNIQUE INDEX: status='pending'인 요청 1개만 허용
```

**이미지 압축 스펙:** icon 200px / card 480px / full 1034px (DB는 URL만 저장)

---

## 상수 파일 (src/lib/constants.ts)

- `REGIONS`: 서울강남/서울강북/경기도/부산/대구/대전/광주/창원/전주/제주
- `REGIONS_WITH_ALL`: 전체 포함
- `GENRES`: salsa/bachata/festival/event/other (한글 라벨 포함)
- `LEVELS`: beginner~all (한글 라벨 포함)
- `CLASS_STATUSES`, `CLASS_TYPES`

---

## 현재 파일 구조

```
src/
├── app/
│   ├── (auth)/
│   │   ├── layout.tsx          ✅
│   │   ├── login/page.tsx      ✅ 완성
│   │   ├── signup/page.tsx     ✅ 완성
│   │   └── onboarding/page.tsx ✅ 완성
│   ├── (main)/
│   │   ├── layout.tsx          ✅ Header + BottomNav 연결
│   │   ├── page.tsx            ✅ 홈
│   │   ├── loading.tsx         ✅
│   │   ├── search/
│   │   │   ├── layout.tsx      ✅
│   │   │   ├── page.tsx        ✅ 검색 1단계
│   │   │   └── results/
│   │   │       ├── layout.tsx  ✅
│   │   │       └── page.tsx    ✅ 검색 2단계
│   │   ├── classes/
│   │   │   ├── new/page.tsx    ✅ 개설 폼
│   │   │   └── [id]/
│   │   │       ├── page.tsx    ✅ 상세
│   │   │       ├── edit/page.tsx ✅ 수정 폼
│   │   │       └── loading.tsx ✅
│   │   ├── mypage/page.tsx     ✅
│   │   ├── notifications/
│   │   │   ├── layout.tsx      ✅
│   │   │   └── page.tsx        ✅
│   │   └── users/[id]/page.tsx ✅
│   ├── admin/page.tsx          ✅
│   ├── api/
│   │   ├── classes/            ✅
│   │   ├── applications/       ✅
│   │   ├── storage/            ✅
│   │   ├── admin/              ✅
│   │   └── cron/auto-cancel/   ✅ D-1 자동취소
│   ├── robots.ts               ✅
│   ├── sitemap.ts              ✅
│   ├── auth/callback/route.ts  ✅ (카카오 추후 사용)
│   ├── globals.css             ✅ 디자인 시스템
│   └── layout.tsx              ✅
├── components/
│   ├── layout/
│   │   ├── Header.tsx          ✅
│   │   └── BottomNav.tsx       ✅
│   ├── class/                  ✅
│   ├── user/                   ✅
│   └── admin/                  ✅
├── lib/
│   ├── constants.ts            ✅
│   ├── kakao/notify.ts         ✅ (feature flag)
│   ├── supabase/
│   │   ├── client.ts           ✅
│   │   └── server.ts           ✅
└── types/
    ├── class.ts                ✅
    ├── user.ts                 ✅
    ├── application.ts          ✅
    └── notification.ts         ✅ (modified 포함)
```

---

## ✅ Phase 1 — 기반설정 (완료)

- [x] schema.sql 보완 (type/is_modified/view_count/preferred_genres/닉네임UNIQUE/pro_requests)
- [x] 폴더 구조 확정 URL로 재정비 (14개 라우트)
- [x] middleware.ts (보호경로 5개, admin role 검사)
- [x] Header, BottomNav 기본 구조
- [x] constants.ts, 타입 파일 업데이트
- [x] globals.css 디자인 시스템

---

## ✅ Phase 2 — 인증 (완료)

- [x] 로그인 페이지 (이메일 + 비밀번호, 빈칸 시 loco1234)
- [x] 회원가입 페이지 (이메일 + 닉네임 실시간 중복확인 + 비밀번호)
- [x] 온보딩 페이지 (활동지역 select + 관심장르 칩 최대 3개)
- [x] auth/callback route (카카오 소셜 로그인 추후 사용)

> **Supabase 설정 필요:** Authentication → Email → "Confirm email" 비활성화

---

## ✅ Phase 3 — 홈 + 공통 레이아웃

### 3-1. Header 완성 (`src/components/layout/Header.tsx`)
- 로그인 상태에 따라 로그인 버튼 or 프로필 아바타 표시
- 알림 배지: notifications 테이블에서 `is_read=false` 개수 조회
- Supabase server client로 SSR 조회 (또는 client 조회)

### 3-2. BottomNav 완성 (`src/components/layout/BottomNav.tsx`)
- `usePathname()`으로 현재 경로 감지 → 활성 탭 스타일 적용
- 비로그인 시 '개설' 탭 클릭 → `/login?next=/classes/new` 이동

### 3-3. 홈 페이지 (`src/app/(main)/page.tsx`)
- 상단: 검색창 (클릭 시 `/search` 이동, 실제 검색 아님)
- 하단: 추천 클래스 리스트
  - 로그인: 내 region + preferred_genres 기반 → deadline 임박순
  - 비로그인: view_count 높은순 (전체)
- `ClassCard` 컴포넌트 사용 (목록형: 아바타 + 텍스트)

### 3-4. ClassCard 컴포넌트 (`src/components/class/ClassCard.tsx`)
```
props: class 데이터, viewMode: 'list' | 'card'
list 모드: 개설자 아바타, 장르칩, 제목, 레벨, 일시, 지역, 모집상태
card 모드: 이미지 480px (없으면 장르별 기본이미지), + 동일 정보
이미지 없을 때 기본 이미지: /public/defaults/salsa.jpg, bachata.jpg, other.jpg
```

---

## ✅ Phase 4 — 검색

### 4-1. 검색 1단계 (`/search`)
- 지역 select (REGIONS_WITH_ALL)
- 모집상태 select (전체/모집중/마감)
- 클래스구분 select (전체/그룹/1:1)
- 장르 칩 (전체 + 5개)
- "기본으로 저장" 체크박스
  - 로그인: profiles.default_search_options UPDATE
  - 비로그인: sessionStorage 저장
- 기본옵션 있으면 → 바로 `/search/results`로 redirect
- "검색하기" 버튼 → 쿼리스트링으로 `/search/results?region=서울강남&status=recruiting...`

### 4-2. 검색 2단계 (`/search/results`)
- URL 쿼리스트링 파싱 (useSearchParams)
- 장르 칩 필터 (상단 가로 스크롤)
- 정렬 select: 최신순/마감임박순/인기순(view_count)
- 목록형/카드형 전환 버튼
- 무한 스크롤 (React Query useInfiniteQuery, 20개씩, 다음 20개 prefetch)
- 텍스트 검색란 (제목+설명 ilike)
- 빈 결과 EmptyState 컴포넌트

### 4-3. 검색 API (`/api/classes/search` 또는 Supabase 직접 쿼리)
```typescript
// Supabase 쿼리 조합 예시
query
  .eq('status', status)
  .eq('region', region)
  .eq('class_type', classType)
  .eq('genre', genre)
  .ilike('title', `%${keyword}%`)
  .order('created_at', { ascending: false })
  .range(from, to)  // 무한스크롤 페이징
```

---

## ✅ Phase 5 — 클래스 개설/수정/상세

### 5-1. 클래스 개설 폼 (`/classes/new`)
필드 목록:
```
장르(칩 선택) / 제목(text) / 레벨(칩 or select) / 클래스구분(그룹/1:1)
이벤트 여부(프로/admin만 표시, type 필드)
일시(datetime-local) / 마감일(date)
장소(카카오맵 팝업 → location_address, lat, lng 자동)
정원(number) / 비용(number, 0=무료) / 연락처(tel)
설명(textarea)
이미지(최대 5장, 클라이언트 압축 후 Supabase Storage 업로드)
```

이미지 업로드 로직:
```
1. browser-image-compression 라이브러리로 480px/1034px/200px 3벌 생성
2. Supabase Storage class-images/{classId}/{uuid}.jpg 업로드
3. URL 배열을 JSONB로 저장
```

카카오맵 연동:
```
NEXT_PUBLIC_KAKAO_MAP_API_KEY 필요
장소 입력 필드 클릭 → 카카오 주소검색 팝업(daum.postcode)
선택 시 address + 좌표(geocoder) 자동 저장
```

완료 후: 토스트 메시지 + `/classes/{id}` 이동

### 5-2. 클래스 수정 폼 (`/classes/[id]/edit`)
- 기존 데이터 prefill
- 수정 완료 시: `is_modified = true` 업데이트
- 승인된 신청자에게 `modified` 타입 알림 INSERT
- 완료 후: 클래스 상세로 이동

### 5-3. 클래스 상세 (`/classes/[id]`)

**표시 정보:**
```
이미지 갤러리 / 장르칩 / 레벨 / 일시 / 마감일
정원(현재신청수/총정원) / 비용(0=무료 표시) / 연락처 / 설명
is_modified=true → "수정됨" 뱃지
개설자: 아바타 + 닉네임(클릭 → /users/{id})
카카오맵 위젯 (위도/경도 기반)
모집 상태 뱃지
```

**신청 버튼 로직:**
```
비로그인 → /login?next=/classes/{id}
이미 신청(pending/approved) → "신청완료" 비활성화
정원 초과(approved 수 >= capacity) → "마감" 비활성화
강습 1일 이내 → 취소 불가
```

**신청자 관리 (개설자 전용):**
- 상세 페이지 하단에만 노출 (host_id === 현재 유저)
- 신청자 목록: 닉네임, 신청일, 상태
- 승인 버튼 → status='approved' + `approved` 알림 INSERT
- 거절 없음 (미승인 = 암묵적 거절)

**클래스 삭제/취소:**
- 신청자 0명 → 즉시 삭제
- 신청자 있음 → status='cancelled' + 승인자에게 알림(알림톡+사이트)
- 취소 후 모든 신청자가 취소하면 자동 삭제 (서버로직 필요)

---

## ✅ Phase 6 — 마이페이지 + 회원 프로필

### 6-1. 마이페이지 (`/mypage`)
탭 구성: 프로필 편집 / 내가 개설한 클래스 / 내가 신청한 클래스 / 알림 설정

**프로필 편집:**
- 닉네임(중복확인) / 프로필 사진 / 자기소개 / 활동지역
- 이미지: Supabase Storage avatars 버킷

**내가 개설한 클래스:**
- 상태 필터: 전체/모집중/마감/취소
- 각 카드에 수정/취소 버튼

**내가 신청한 클래스:**
- 상태: 신청대기/승인/취소 표시
- 취소 버튼: 강습일 1일 이상 남은 경우만 활성화

**알림 설정:**
- 카카오톡 알림 수신 토글 (kakao_notification_enabled)

**프로 신청:**
- role='member'인 경우 "프로 신청" 버튼 노출
- 신청 중(pending)이면 "신청 검토 중" 표시
- pro_requests INSERT

### 6-2. 회원 프로필 (`/users/[id]`)
- 닉네임 + 프로필 사진
- 자기소개 / 활동지역
- 모집중인 클래스 목록
- 본인 접근 시 "편집" 버튼 → /mypage

---

## ✅ Phase 7 — 알림 시스템

### 7-1. 알림함 (`/notifications`)
- 알림 목록 최신순 (읽음/안읽음 구분)
- 클릭 시 link_url 이동 + is_read=true UPDATE
- 전체 읽음 처리 버튼

### 7-2. Header 알림 배지
- 페이지 로드 시 is_read=false 개수 조회
- 새로고침 시 갱신 (Realtime MVP 미포함)

### 7-3. 알림 발송 서버 로직 (API Routes)
이벤트별 notifications INSERT:
```
신청 수령 → 개설자에게 type='application'
승인 완료 → 신청자에게 type='approved'
클래스 수정 → 승인된 신청자 전원 type='modified'
클래스 취소 → 승인된 신청자 전원 type='cancelled'
```

### 7-4. 카카오 알림톡 (`/api/kakao/notify`)
```typescript
// feature flag로 비활성화
const KAKAO_ENABLED = process.env.KAKAO_ALIMTALK_ENABLED === 'true'
if (!KAKAO_ENABLED) return  // 채널 승인 전까지 skip

// 활성화 후: 카카오 알림톡 REST API 호출
// 발송 실패 시 사이트 알림만 유지 (fallback)
```

### 7-5. Vercel Cron — D-1 자동취소 (`/api/cron/auto-cancel`)
```
schedule: 0 18 * * *  (매일 18:00, 강습 다음날 기준)
동작:
  1. datetime이 지금으로부터 24시간 이내인 클래스 조회
  2. 해당 클래스의 pending 신청 → status='cancelled' UPDATE
  3. 취소된 신청자에게 cancelled 알림 INSERT
vercel.json에 cron 설정 추가 필요
```

---

## ✅ Phase 8 — 관리자 페이지 (`/admin`)

접근 조건: role='admin' (middleware에서 처리됨)

### 기능 목록
1. **회원 목록** — 전체 가입자, 닉네임/이메일/역할/가입일
2. **등급 변경** — member ↔ pro (SELECT + UPDATE)
3. **프로 신청 목록** — pending 목록, 승인/거절 버튼
   - 승인: pro_requests.status='approved' + profiles.role='pro'
   - 거절: pro_requests.status='rejected'
4. **클래스/이벤트 전체 목록** — 강제 삭제 가능
5. **공지 알림** — MVP 이후 추가

---

## ✅ Phase 9 — 마무리 및 배포

### SEO
- 각 페이지 metadata (title, description)
- 클래스 상세 OG 태그 (이미지 썸네일 포함)
- robots.txt, sitemap.xml

### 성능
- Next.js Image 컴포넌트로 이미지 최적화
- 리스트 Suspense + loading.tsx
- 클라이언트 컴포넌트 최소화

### 배포 체크리스트
- [ ] Vercel 환경변수 설정 (Production/Preview 분리)
- [ ] Supabase schema.sql 실행 확인
- [ ] Supabase RLS 정책 실제 동작 검증
- [ ] Supabase Storage 버킷 생성 (class-images, avatars)
- [ ] 카카오 소셜 로그인 → 카카오 디벨로퍼 앱 Redirect URI 등록 후 교체
- [ ] 카카오맵 API Key Production 도메인 등록
- [ ] Vercel Cron 동작 확인
- [ ] 모바일 실기기 테스트

---

## 환경변수 목록 (`.env.local`)

```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
NEXT_PUBLIC_KAKAO_MAP_API_KEY=
KAKAO_REST_API_KEY=
KAKAO_CLIENT_SECRET=
KAKAO_ALIMTALK_ENABLED=false
NEXT_PUBLIC_SITE_URL=http://localhost:3000
```

---

---

## 다음 세션 시작 명령

```
"next.md 파일 읽고 Phase 3부터 이어서 진행해주세요"
```

또는 특정 Phase만 요청:
```
"next.md 읽고 Phase 5 클래스 상세 페이지 구현해주세요"
```

---

## 완성도 현황

| Phase | 내용 | 상태 |
|---|---|---|
| Phase 1 | 기반설정 (스키마, 폴더, 미들웨어, 레이아웃) | ✅ 완료 |
| Phase 2 | 인증 (로그인, 회원가입, 온보딩) | ✅ 완료 |
| Phase 3 | 홈 + 공통 레이아웃 완성 | ✅ 완료 |
| Phase 4 | 클래스 검색 (1단계, 2단계, 무한스크롤) | ✅ 완료 |
| Phase 5 | 클래스 개설/수정/상세/신청 | ✅ 완료 |
| Phase 6 | 마이페이지 + 회원 프로필 | ✅ 완료 |
| Phase 7 | 알림 시스템 + Cron 자동취소 | ✅ 완료 |
| Phase 8 | 관리자 페이지 | ✅ 완료 |
| Phase 9 | SEO + 성능 + 배포 | ✅ 완료 (외부 설정 제외) |
