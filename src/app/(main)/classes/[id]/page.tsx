import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { createClient } from "@/lib/supabase/server";
import { DANCE_GENRE_LABELS, CLASS_LEVEL_LABELS } from "@/types/class";
import ApplyButton from "@/components/class/ApplyButton";
import ApplicantList from "@/components/class/ApplicantList";
import CancelClassButton from "@/components/class/CancelClassButton";

type Props = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const supabase = await createClient();
  const { data: cls } = await supabase
    .from("classes")
    .select("title, description, images")
    .eq("id", id)
    .single();

  if (!cls) return { title: "클래스를 찾을 수 없습니다" };

  const images = (cls.images as { card_url?: string; full_url?: string }[]) ?? [];
  const ogImage = images[0]?.card_url ?? images[0]?.full_url;

  return {
    title: cls.title,
    description: cls.description?.slice(0, 160) ?? undefined,
    openGraph: {
      title: cls.title,
      description: cls.description?.slice(0, 160) ?? undefined,
      ...(ogImage ? { images: [ogImage] } : {}),
    },
  };
}

const GENRE_CHIP: Record<string, string> = {
  salsa: "bg-red-50 text-red-600",
  bachata: "bg-purple-50 text-purple-600",
  festival: "bg-yellow-50 text-yellow-700",
  event: "bg-blue-50 text-blue-600",
  other: "bg-gray-100 text-gray-600",
};

function formatDateTime(dateStr: string) {
  const d = new Date(dateStr);
  const days = ["일", "월", "화", "수", "목", "금", "토"];
  return `${d.getFullYear()}년 ${d.getMonth() + 1}월 ${d.getDate()}일 (${days[d.getDay()]}) ${d.getHours().toString().padStart(2, "0")}:${d.getMinutes().toString().padStart(2, "0")}`;
}

function formatDate(dateStr: string) {
  const d = new Date(dateStr);
  return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, "0")}.${String(d.getDate()).padStart(2, "0")}`;
}

function InfoRow({ icon, label, value }: { icon: string; label: string; value: string }) {
  return (
    <div className="flex gap-3 text-sm">
      <span className="w-5 text-center flex-shrink-0">{icon}</span>
      <span className="text-gray-500 w-16 flex-shrink-0">{label}</span>
      <span className="text-gray-900 flex-1">{value}</span>
    </div>
  );
}

export default async function ClassDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: cls } = await supabase
    .from("classes")
    .select("*, host:profiles!host_id(id, nickname, profile_image_url)")
    .eq("id", id)
    .single();

  if (!cls) notFound();

  const { count: approvedCount } = await supabase
    .from("applications")
    .select("id", { count: "exact", head: true })
    .eq("class_id", id)
    .eq("status", "approved");

  let myApplication: { id: string; status: string } | null = null;
  if (user) {
    const { data } = await supabase
      .from("applications")
      .select("id, status")
      .eq("class_id", id)
      .eq("applicant_id", user.id)
      .neq("status", "cancelled")
      .maybeSingle();
    myApplication = data;
  }

  const isHost = user?.id === cls.host_id;

  type Applicant = {
    id: string;
    status: "pending" | "approved" | "cancelled";
    created_at: string;
    applicant: { id: string; nickname: string; profile_image_url: string | null };
  };

  let applicants: Applicant[] = [];
  if (isHost) {
    const { data } = await supabase
      .from("applications")
      .select(
        "id, status, created_at, applicant:profiles!applicant_id(id, nickname, profile_image_url)"
      )
      .eq("class_id", id)
      .order("created_at", { ascending: true });
    applicants = (data as unknown as Applicant[]) ?? [];
  }

  const host = cls.host as {
    id: string;
    nickname: string;
    profile_image_url: string | null;
  } | null;

  const images: { card_url?: string; full_url?: string }[] = cls.images ?? [];
  const genreLabel = DANCE_GENRE_LABELS[cls.genre as keyof typeof DANCE_GENRE_LABELS] ?? cls.genre;
  const levelLabel = CLASS_LEVEL_LABELS[cls.level as keyof typeof CLASS_LEVEL_LABELS] ?? cls.level;
  const chipCls = GENRE_CHIP[cls.genre] ?? GENRE_CHIP.other;

  return (
    <div className="max-w-xl mx-auto pb-32">
      {/* 이미지 갤러리 */}
      {images.length > 0 ? (
        <div className="flex overflow-x-auto snap-x snap-mandatory">
          {images.map((img, i) => (
            <div key={i} className="flex-shrink-0 w-full snap-start">
              <Image
                src={img.full_url ?? img.card_url ?? ""}
                alt={`클래스 이미지 ${i + 1}`}
                width={1200}
                height={900}
                style={{ width: "100%", height: "auto", maxHeight: "70vh", objectFit: "contain" }}
                className="bg-black/5"
              />
            </div>
          ))}
        </div>
      ) : (
        <div className="w-full h-[160px] bg-gray-100 flex items-center justify-center text-5xl opacity-30">
          🎵
        </div>
      )}

      <div className="px-4 pt-4">
        {/* 뱃지 */}
        <div className="flex items-center gap-2 flex-wrap mb-2">
          <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${chipCls}`}>
            {genreLabel}
          </span>
          {cls.status === "recruiting" && (
            <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-green-50 text-green-600">
              모집중
            </span>
          )}
          {cls.status === "closed" && (
            <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-gray-100 text-gray-500">
              마감
            </span>
          )}
          {cls.status === "cancelled" && (
            <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-red-50 text-red-500">
              취소됨
            </span>
          )}
          {cls.is_modified && (
            <span className="text-xs font-medium text-orange-500">수정됨</span>
          )}
        </div>

        <h1 className="text-xl font-bold text-gray-900 mb-3">{cls.title}</h1>

        {/* 개설자 */}
        {host && (
          <Link
            href={`/users/${host.id}`}
            className="flex items-center gap-2 mb-4"
          >
            {host.profile_image_url ? (
              <Image
                src={host.profile_image_url}
                alt={host.nickname}
                width={36}
                height={36}
                className="rounded-full object-cover"
              />
            ) : (
              <div className="w-9 h-9 rounded-full bg-gray-100 flex items-center justify-center text-sm font-medium text-gray-500">
                {host.nickname[0]}
              </div>
            )}
            <span className="text-sm font-medium text-gray-700">
              {host.nickname}
            </span>
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="text-gray-400"
            >
              <path d="m9 18 6-6-6-6" />
            </svg>
          </Link>
        )}

        {/* 정보 카드 */}
        <div className="card p-4 space-y-3 mb-4">
          <InfoRow icon="📅" label="일시" value={formatDateTime(cls.datetime)} />
          <InfoRow icon="⏰" label="신청 마감" value={formatDate(cls.deadline)} />
          <InfoRow icon="📍" label="장소" value={cls.location_address} />
          <InfoRow icon="🎯" label="레벨" value={levelLabel} />
          <InfoRow
            icon="👥"
            label="정원"
            value={`${approvedCount ?? 0}/${cls.capacity}명`}
          />
          <InfoRow
            icon="💰"
            label="수강료"
            value={
              cls.price === 0
                ? "무료"
                : `${(cls.price as number).toLocaleString()}원`
            }
          />
          <InfoRow icon="📞" label="연락처" value={cls.contact} />
        </div>

        {/* 설명 */}
        {cls.description && (
          <div className="mb-5">
            <h2 className="font-semibold text-sm text-gray-700 mb-2">
              클래스 소개
            </h2>
            <p className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">
              {cls.description}
            </p>
          </div>
        )}

        {/* 개설자 수정/취소 */}
        {isHost && (
          <div className="flex gap-2 mb-6">
            <Link
              href={`/classes/${id}/edit`}
              className="flex-1 btn-outline text-sm py-3 text-center"
            >
              수정
            </Link>
            <CancelClassButton classId={id} />
          </div>
        )}

        {/* 신청자 관리 (개설자) */}
        {isHost && (
          <div>
            <h2 className="font-semibold text-base mb-3">
              신청자 관리{" "}
              <span className="text-sm font-normal text-gray-500">
                ({applicants.filter((a) => a.status !== "cancelled").length}명)
              </span>
            </h2>
            <ApplicantList classId={id} initialApplicants={applicants} />
          </div>
        )}
      </div>

      {/* 신청 버튼 (비개설자) */}
      {!isHost && (
        <div className="fixed bottom-16 left-0 right-0 z-40 bg-white border-t border-[#e5e7eb] px-4 py-3">
          <div className="max-w-xl mx-auto">
            <ApplyButton
              classId={id}
              classStatus={cls.status}
              capacity={cls.capacity}
              approvedCount={approvedCount ?? 0}
              datetime={cls.datetime}
              myApplication={myApplication}
              isLoggedIn={!!user}
            />
          </div>
        </div>
      )}
    </div>
  );
}
