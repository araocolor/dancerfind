import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import AdminPageClient from "@/components/admin/AdminPageClient";
import type { UserRole } from "@/types/user";
import type { ClassStatus, ContentType } from "@/types/class";
import type { ProRequestStatus } from "@/types/user";

interface AdminUserItem {
  id: string;
  email: string | null;
  nickname: string;
  role: UserRole;
  created_at: string;
}

interface ProRequestItem {
  id: string;
  user_id: string;
  status: ProRequestStatus;
  message: string | null;
  created_at: string;
  user: {
    id: string;
    nickname: string;
    email: string | null;
  } | null;
}

interface AdminClassItem {
  id: string;
  title: string;
  type: ContentType;
  status: ClassStatus;
  created_at: string;
  host: {
    id: string;
    nickname: string;
  } | null;
}

export default async function AdminPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login?next=/admin");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (profile?.role !== "admin") {
    redirect("/");
  }

  const [usersResult, proRequestResult, classesResult] = await Promise.all([
    supabase
      .from("profiles")
      .select("id, email, nickname, role, created_at")
      .order("created_at", { ascending: false })
      .limit(100),
    supabase
      .from("pro_requests")
      .select("id, user_id, status, message, created_at, user:profiles!user_id(id, nickname, email)")
      .order("created_at", { ascending: true })
      .limit(100),
    supabase
      .from("classes")
      .select("id, title, type, status, created_at, host:profiles!host_id(id, nickname)")
      .order("created_at", { ascending: false })
      .limit(100),
  ]);

  const users: AdminUserItem[] = (usersResult.data ?? []).map((item) => ({
    id: item.id,
    email: item.email,
    nickname: item.nickname,
    role: item.role as UserRole,
    created_at: item.created_at,
  }));

  const proRequests: ProRequestItem[] = (proRequestResult.data ?? []).map((item) => {
    const requestUser = item.user as ProRequestItem["user"];
    return {
      id: item.id,
      user_id: item.user_id,
      status: item.status as ProRequestStatus,
      message: item.message,
      created_at: item.created_at,
      user: requestUser
        ? {
            id: requestUser.id,
            nickname: requestUser.nickname,
            email: requestUser.email,
          }
        : null,
    };
  });

  const classes: AdminClassItem[] = (classesResult.data ?? []).map((item) => {
    const classHost = item.host as AdminClassItem["host"];

    return {
      id: item.id,
      title: item.title,
      type: item.type as ContentType,
      status: item.status as ClassStatus,
      created_at: item.created_at,
      host: classHost
        ? {
            id: classHost.id,
            nickname: classHost.nickname,
          }
        : null,
    };
  });

  return (
    <AdminPageClient
      initialUsers={users}
      initialProRequests={proRequests}
      initialClasses={classes}
    />
  );
}
