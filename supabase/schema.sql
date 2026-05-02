-- ============================================================
-- dancerfind DB 스키마
-- Supabase SQL Editor에 전체 복사 후 실행
-- ============================================================


-- ============================================================
-- 1. profiles (회원)
-- auth.users와 1:1 연결 — Supabase Auth가 기본 인증 담당
-- ============================================================
CREATE TABLE profiles (
  id                UUID        PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email             TEXT,
  name              TEXT,
  nickname          TEXT        NOT NULL DEFAULT '',
  default_search_options JSONB DEFAULT NULL,
  preferred_genres  JSONB       NOT NULL DEFAULT '[]',
  kakao_notification_enabled BOOLEAN NOT NULL DEFAULT TRUE,
  role              TEXT        NOT NULL DEFAULT 'member'
                                CHECK (role IN ('member', 'pro', 'admin')),
  profile_image_url TEXT,
  phone             TEXT,
  kakao_id          TEXT        UNIQUE,
  bio               TEXT,
  region            TEXT,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- 본인 프로필만 수정 가능, 전체 조회는 허용
CREATE POLICY "profiles: 전체 조회 허용"
  ON profiles FOR SELECT USING (true);

CREATE POLICY "profiles: 본인만 수정"
  ON profiles FOR UPDATE USING (
    auth.uid() = id
    OR EXISTS (
      SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin'
    )
  );

CREATE POLICY "profiles: 본인만 삽입"
  ON profiles FOR INSERT WITH CHECK (auth.uid() = id);


-- ============================================================
-- 2. classes (댄스 클래스)
-- ============================================================
CREATE TABLE classes (
  id               UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  host_id          UUID        NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  title            TEXT        NOT NULL,
  genre            TEXT        NOT NULL CHECK (genre IN ('salsa', 'bachata', 'festival', 'event', 'other')),
  level            TEXT        NOT NULL CHECK (level IN ('beginner', 'elementary', 'intermediate', 'advanced', 'all')),
  class_type       TEXT        NOT NULL DEFAULT 'group'
                               CHECK (class_type IN ('group', 'private')),
  status           TEXT        NOT NULL DEFAULT 'recruiting'
                               CHECK (status IN ('recruiting', 'closed', 'cancelled')),
  description      TEXT        NOT NULL DEFAULT '',
  datetime         TIMESTAMPTZ NOT NULL,
  deadline         TIMESTAMPTZ NOT NULL,
  location_address TEXT        NOT NULL DEFAULT '',
  location_lat     FLOAT8,
  location_lng     FLOAT8,
  capacity         INTEGER     NOT NULL CHECK (capacity > 0),
  contact          TEXT        NOT NULL DEFAULT '',
  price            INTEGER     NOT NULL DEFAULT 0 CHECK (price >= 0),
  images           JSONB       NOT NULL DEFAULT '[]',
  type             TEXT        NOT NULL DEFAULT 'class'
                               CHECK (type IN ('class', 'event')),
  is_modified      BOOLEAN     NOT NULL DEFAULT FALSE,
  view_count       INTEGER     NOT NULL DEFAULT 0,
  region           TEXT        NOT NULL DEFAULT '',
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE classes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "classes: 전체 조회 허용"
  ON classes FOR SELECT USING (true);

CREATE POLICY "classes: 로그인 사용자만 개설"
  ON classes FOR INSERT WITH CHECK (auth.uid() = host_id);

CREATE POLICY "classes: 개설자 또는 관리자만 수정"
  ON classes FOR UPDATE USING (
    auth.uid() = host_id
    OR EXISTS (
      SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "classes: 개설자 또는 관리자만 삭제"
  ON classes FOR DELETE USING (
    auth.uid() = host_id
    OR EXISTS (
      SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'
    )
  );


-- ============================================================
-- 3. applications (참여 신청)
-- ============================================================
CREATE TABLE applications (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  class_id     UUID        NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
  applicant_id UUID        NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  status       TEXT        NOT NULL DEFAULT 'pending'
                           CHECK (status IN ('pending', 'approved', 'cancelled')),
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (class_id, applicant_id)
);

ALTER TABLE applications ENABLE ROW LEVEL SECURITY;

-- 신청자 본인 + 해당 클래스 개설자만 조회
CREATE POLICY "applications: 본인 신청 조회"
  ON applications FOR SELECT USING (
    auth.uid() = applicant_id
    OR EXISTS (
      SELECT 1 FROM classes WHERE id = class_id AND host_id = auth.uid()
    )
  );

CREATE POLICY "applications: 로그인 사용자만 신청"
  ON applications FOR INSERT WITH CHECK (auth.uid() = applicant_id);

-- 신청자(취소) 또는 개설자(승인/거절) 만 상태 변경
CREATE POLICY "applications: 신청자 또는 개설자만 수정"
  ON applications FOR UPDATE USING (
    auth.uid() = applicant_id
    OR EXISTS (
      SELECT 1 FROM classes WHERE id = class_id AND host_id = auth.uid()
    )
  );


-- ============================================================
-- 4. notifications (알림)
-- ============================================================
CREATE TABLE notifications (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID        NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  message    TEXT        NOT NULL,
  is_read    BOOLEAN     NOT NULL DEFAULT FALSE,
  type       TEXT        NOT NULL
             CHECK (type IN ('application', 'approved', 'cancelled', 'notice', 'modified')),
  link_url   TEXT,
  related_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "notifications: 본인 알림만 조회"
  ON notifications FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "notifications: 본인 알림만 수정 (읽음 처리)"
  ON notifications FOR UPDATE USING (auth.uid() = user_id);


-- ============================================================
-- updated_at 자동 갱신 트리거
-- ============================================================
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER classes_updated_at
  BEFORE UPDATE ON classes
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER applications_updated_at
  BEFORE UPDATE ON applications
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();


-- ============================================================
-- 신규 회원 생성 시 profiles 자동 생성 트리거
-- ============================================================
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  nickname_candidate TEXT;
BEGIN
  nickname_candidate := COALESCE(trim(NEW.raw_user_meta_data->>'nickname'), '');

  IF nickname_candidate != '' AND EXISTS (
    SELECT 1 FROM public.profiles WHERE nickname = nickname_candidate
  ) THEN
    nickname_candidate := '';
  END IF;

  BEGIN
    INSERT INTO public.profiles (id, email, nickname)
    VALUES (NEW.id, NEW.email, nickname_candidate)
    ON CONFLICT (id) DO NOTHING;
  EXCEPTION
    WHEN unique_violation THEN
      INSERT INTO public.profiles (id, email, nickname)
      VALUES (NEW.id, NEW.email, '')
      ON CONFLICT (id) DO NOTHING;
  END;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();


-- ============================================================
-- 인덱스
-- ============================================================
CREATE INDEX idx_classes_host_id   ON classes (host_id);
CREATE INDEX idx_classes_status    ON classes (status);
CREATE INDEX idx_classes_region    ON classes (region);
CREATE INDEX idx_classes_datetime  ON classes (datetime);
CREATE INDEX idx_applications_class_id     ON applications (class_id);
CREATE INDEX idx_applications_applicant_id ON applications (applicant_id);
CREATE INDEX idx_notifications_user_id     ON notifications (user_id);
CREATE INDEX idx_notifications_is_read     ON notifications (user_id, is_read);
CREATE INDEX idx_classes_type              ON classes (type);
CREATE INDEX idx_classes_view_count        ON classes (view_count DESC);

-- 닉네임 중복 방지 (빈 문자열 제외)
CREATE UNIQUE INDEX profiles_nickname_unique ON profiles (nickname) WHERE nickname != '';


-- ============================================================
-- 5. pro_requests (프로 등급 신청)
-- ============================================================
CREATE TABLE pro_requests (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID        NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  status     TEXT        NOT NULL DEFAULT 'pending'
             CHECK (status IN ('pending', 'approved', 'rejected')),
  message    TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 동시에 여러 pending 요청 방지
CREATE UNIQUE INDEX pro_requests_unique_pending ON pro_requests (user_id) WHERE status = 'pending';

ALTER TABLE pro_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "pro_requests: 본인 및 관리자만 조회"
  ON pro_requests FOR SELECT USING (
    auth.uid() = user_id
    OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "pro_requests: 본인만 신청"
  ON pro_requests FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "pro_requests: 관리자만 상태 변경"
  ON pro_requests FOR UPDATE USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

CREATE TRIGGER pro_requests_updated_at
  BEFORE UPDATE ON pro_requests
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE INDEX idx_pro_requests_user_id ON pro_requests (user_id);
CREATE INDEX idx_pro_requests_status  ON pro_requests (status);
