import Link from "next/link";
import BackButton from "@/components/layout/BackButton";
import { createClient } from "@/lib/supabase/server";

export default async function Header() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let unreadCount = 0;
  let profileImageUrl: string | null = null;

  if (user) {
    const [notifResult, profileResult] = await Promise.all([
      supabase
        .from("notifications")
        .select("id", { count: "exact", head: true })
        .eq("user_id", user.id)
        .eq("is_read", false),
      supabase
        .from("profiles")
        .select("profile_image_url")
        .eq("id", user.id)
        .single(),
    ]);
    unreadCount = notifResult.count ?? 0;
    profileImageUrl = profileResult.data?.profile_image_url ?? null;
  }

  return (
    <header className="sticky top-0 z-50 bg-white border-b border-[#e5e7eb] h-14 px-4 relative flex items-center">
      <div className="w-10 flex items-center justify-start">
        <BackButton />
      </div>
      <Link
        href="/"
        className="absolute left-1/2 -translate-x-1/2 font-bold text-xl text-[#FEE500] leading-none"
      >
        LOCO
      </Link>
      <div className="ml-auto flex items-center gap-4">
        <Link href="/search" aria-label="검색" className="text-gray-500">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="22"
            height="22"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <circle cx="11" cy="11" r="8" />
            <path d="m21 21-4.3-4.3" />
          </svg>
        </Link>

        <Link href="/notifications" aria-label="알림" className="relative text-gray-500">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="22"
            height="22"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" />
            <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" />
          </svg>
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 min-w-[16px] h-4 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center px-0.5">
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          )}
        </Link>

        {user ? (
          <Link href="/mypage" aria-label="마이페이지">
            {profileImageUrl ? (
              <img
                src={profileImageUrl}
                alt="프로필"
                className="w-8 h-8 rounded-full object-cover border border-gray-100"
              />
            ) : (
              <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-gray-400">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" />
                  <circle cx="12" cy="7" r="4" />
                </svg>
              </div>
            )}
          </Link>
        ) : (
          <Link
            href="/login"
            className="text-sm font-medium px-3 py-1.5 rounded-full border border-gray-200 text-gray-700"
          >
            로그인
          </Link>
        )}
      </div>
    </header>
  );
}
