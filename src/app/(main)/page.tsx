import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import ClassCard, { ClassWithHost } from "@/components/class/ClassCard";
import Link from "next/link";

export const metadata: Metadata = { title: "홈" };

export default async function HomePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let classes: ClassWithHost[] = [];
  let isPersonalized = false;

  if (user) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("region, preferred_genres")
      .eq("id", user.id)
      .single();

    let query = supabase
      .from("classes")
      .select("*, host:profiles!host_id(id, nickname, profile_image_url)")
      .eq("status", "recruiting");

    if (profile?.region) {
      query = query.eq("region", profile.region);
      isPersonalized = true;
    }
    const genres = profile?.preferred_genres as string[] | null;
    if (genres && genres.length > 0) {
      query = query.in("genre", genres);
    }

    const { data } = await query
      .order("deadline", { ascending: true })
      .limit(20);
    classes = (data as ClassWithHost[]) ?? [];
  } else {
    const { data } = await supabase
      .from("classes")
      .select("*, host:profiles!host_id(id, nickname, profile_image_url)")
      .eq("status", "recruiting")
      .order("view_count", { ascending: false })
      .limit(20);
    classes = (data as ClassWithHost[]) ?? [];
  }

  return (
    <div className="px-4 py-4 max-w-xl mx-auto">
      {/* 검색창 */}
      <Link href="/search" className="block mb-5">
        <div className="flex items-center gap-2 px-4 py-3 rounded-[12px] border border-[#e5e7eb] bg-white text-[#999] text-sm cursor-pointer">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="17"
            height="17"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="flex-shrink-0"
          >
            <circle cx="11" cy="11" r="8" />
            <path d="m21 21-4.3-4.3" />
          </svg>
          <span>지역, 장르로 클래스를 찾아보세요</span>
        </div>
      </Link>

      {/* 섹션 제목 */}
      <h2 className="font-semibold text-base text-gray-800 mb-3">
        {isPersonalized ? "내 지역 추천 클래스" : "인기 클래스"}
      </h2>

      {/* 클래스 목록 */}
      {classes.length === 0 ? (
        <div className="text-center py-14 text-gray-400 text-sm">
          아직 등록된 클래스가 없습니다
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {classes.map((c) => (
            <ClassCard key={c.id} classData={c} viewMode="list" />
          ))}
        </div>
      )}
    </div>
  );
}
