import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import ClassCard, { ClassWithHost } from "@/components/class/ClassCard";

interface ProfileRow {
  id: string;
  nickname: string;
  profile_image_url: string | null;
  bio: string | null;
  region: string | null;
}

export default async function UserProfilePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, nickname, profile_image_url, bio, region")
    .eq("id", id)
    .single();

  if (!profile) {
    notFound();
  }

  const { data: classes } = await supabase
    .from("classes")
    .select("*, host:profiles!host_id(id, nickname, profile_image_url)")
    .eq("host_id", id)
    .eq("status", "recruiting")
    .order("deadline", { ascending: true })
    .limit(20);

  const isMe = user?.id === id;
  const hostProfile = profile as ProfileRow;
  const recruitingClasses = (classes as ClassWithHost[]) ?? [];
  const nickname = hostProfile.nickname || "사용자";

  return (
    <div className="max-w-xl mx-auto px-4 py-4 pb-24 space-y-4">
      <section className="card p-4">
        <div className="flex items-start gap-3">
          {hostProfile.profile_image_url ? (
            <img
              src={hostProfile.profile_image_url}
              alt={nickname}
              className="w-14 h-14 rounded-full object-cover"
            />
          ) : (
            <div className="w-14 h-14 rounded-full bg-gray-100 flex items-center justify-center text-gray-500 font-semibold text-lg">
              {nickname[0]}
            </div>
          )}

          <div className="flex-1 min-w-0">
            <h1 className="text-lg font-bold text-gray-900">{nickname}</h1>
            <p className="text-sm text-gray-500 mt-1">
              활동지역: {hostProfile.region || "미입력"}
            </p>
            {hostProfile.bio ? (
              <p className="text-sm text-gray-700 mt-2 whitespace-pre-wrap">
                {hostProfile.bio}
              </p>
            ) : (
              <p className="text-sm text-gray-400 mt-2">자기소개가 없습니다.</p>
            )}
          </div>
        </div>

        {isMe && (
          <Link href="/mypage" className="btn-outline w-full mt-4 text-sm py-2">
            내 프로필 편집
          </Link>
        )}
      </section>

      <section>
        <h2 className="font-semibold text-base text-gray-800 mb-3">모집중 클래스</h2>
        {recruitingClasses.length === 0 ? (
          <div className="card p-6 text-center text-sm text-gray-400">
            현재 모집중인 클래스가 없습니다.
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {recruitingClasses.map((cls) => (
              <ClassCard key={cls.id} classData={cls} viewMode="list" />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
