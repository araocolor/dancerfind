import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import MyPageClient from "@/components/user/MyPageClient";
import type { ClassStatus } from "@/types/class";
import type { ApplicationStatus } from "@/types/application";
import type { UserRole } from "@/types/user";

interface HostedClassRow {
  id: string;
  title: string;
  status: ClassStatus;
  datetime: string;
  region: string;
}

interface AppliedClassInfo {
  id: string;
  title: string;
  datetime: string;
  region: string;
  status: ClassStatus;
}

interface AppliedClassRow {
  id: string;
  status: ApplicationStatus;
  created_at: string;
  class: AppliedClassInfo | null;
}

export default async function MyPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login?next=/mypage");
  }

  const [profileResult, hostedResult, appliedResult, proRequestResult] = await Promise.all([
    supabase
      .from("profiles")
      .select("id, nickname, bio, region, role, profile_image_url, kakao_notification_enabled")
      .eq("id", user.id)
      .single(),
    supabase
      .from("classes")
      .select("id, title, status, datetime, region")
      .eq("host_id", user.id)
      .order("datetime", { ascending: false }),
    supabase
      .from("applications")
      .select("id, status, created_at, class:classes(id, title, datetime, region, status)")
      .eq("applicant_id", user.id)
      .order("created_at", { ascending: false }),
    supabase
      .from("pro_requests")
      .select("id")
      .eq("user_id", user.id)
      .eq("status", "pending")
      .maybeSingle(),
  ]);

  if (!profileResult.data) {
    redirect("/onboarding");
  }

  const initialHostedClasses: HostedClassRow[] = (hostedResult.data ?? []).map((row) => ({
    id: row.id,
    title: row.title,
    status: row.status as ClassStatus,
    datetime: row.datetime,
    region: row.region,
  }));

  const initialAppliedClasses: AppliedClassRow[] = (appliedResult.data ?? []).map((row) => {
    const cls = row.class as AppliedClassInfo | null;

    return {
      id: row.id,
      status: row.status as ApplicationStatus,
      created_at: row.created_at,
      class: cls
        ? {
            id: cls.id,
            title: cls.title,
            datetime: cls.datetime,
            region: cls.region,
            status: cls.status as ClassStatus,
          }
        : null,
    };
  });

  const profile = profileResult.data;

  return (
    <MyPageClient
      initialProfile={{
        id: profile.id,
        nickname: profile.nickname,
        bio: profile.bio,
        region: profile.region,
        role: profile.role as UserRole,
        profile_image_url: profile.profile_image_url,
        kakao_notification_enabled: profile.kakao_notification_enabled,
      }}
      initialHostedClasses={initialHostedClasses}
      initialAppliedClasses={initialAppliedClasses}
      hasPendingProRequest={!!proRequestResult.data}
    />
  );
}
