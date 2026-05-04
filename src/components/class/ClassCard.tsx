import Link from "next/link";
import Image from "next/image";
import { DanceClass, DANCE_GENRE_LABELS, CLASS_LEVEL_LABELS } from "@/types/class";

interface ClassHost {
  id: string;
  nickname: string;
  profile_image_url: string | null;
}

export interface ClassWithHost extends DanceClass {
  host?: ClassHost;
}

interface ClassCardProps {
  classData: ClassWithHost;
  viewMode: "list" | "card";
}

const GENRE_BG: Record<string, string> = {
  salsa: "#FFE4E4",
  bachata: "#EDE4FF",
  festival: "#FFF9D9",
  event: "#E4EEFF",
  other: "#F0F0F0",
};

const GENRE_CHIP: Record<string, string> = {
  salsa: "bg-red-50 text-red-600",
  bachata: "bg-purple-50 text-purple-600",
  festival: "bg-yellow-50 text-yellow-700",
  event: "bg-blue-50 text-blue-600",
  other: "bg-gray-100 text-gray-600",
};

const STATUS_MAP = {
  recruiting: { label: "모집중", cls: "bg-green-50 text-green-600" },
  closed: { label: "마감", cls: "bg-gray-100 text-gray-500" },
  cancelled: { label: "취소", cls: "bg-red-50 text-red-500" },
} as const;

function formatDate(dateStr: string) {
  const d = new Date(dateStr);
  const days = ["일", "월", "화", "수", "목", "금", "토"];
  const m = d.getMonth() + 1;
  const dd = d.getDate();
  const day = days[d.getDay()];
  const hh = d.getHours().toString().padStart(2, "0");
  const mm = d.getMinutes().toString().padStart(2, "0");
  return `${m}/${dd}(${day}) ${hh}:${mm}`;
}

export default function ClassCard({ classData, viewMode }: ClassCardProps) {
  const { id, title, genre, level, datetime, region, status, images, host, is_modified } =
    classData;

  const imageUrl = images?.[0]?.card_url ?? null;
  const genreLabel = DANCE_GENRE_LABELS[genre] ?? genre;
  const levelLabel = CLASS_LEVEL_LABELS[level] ?? level;
  const statusInfo = STATUS_MAP[status] ?? STATUS_MAP.recruiting;
  const chipCls = GENRE_CHIP[genre] ?? GENRE_CHIP.other;

  if (viewMode === "card") {
    return (
      <div className="bg-white">
        <Link href={`/classes/${id}?from=home`} className="block w-full overflow-hidden">
          {imageUrl ? (
            <Image
              src={imageUrl}
              alt={title}
              width={0}
              height={0}
              sizes="100vw"
              style={{ width: "100%", height: "auto" }}
            />
          ) : (
            <div
              className="w-full aspect-[3/4] flex items-center justify-center"
              style={{ backgroundColor: GENRE_BG[genre] ?? GENRE_BG.other }}
            >
              <span className="text-6xl opacity-30">
                {genre === "salsa" ? "💃" : genre === "bachata" ? "🕺" : "🎵"}
              </span>
            </div>
          )}
        </Link>

        {/* 액션 아이콘 */}
        <div className="flex items-center justify-between px-3 pt-3">
          <div className="flex items-center gap-4">
            {/* 좋아요 */}
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-gray-800">
              <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
            </svg>
            {/* 댓글 */}
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-gray-800">
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
            </svg>
            {/* 메세지 */}
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-gray-800">
              <line x1="22" y1="2" x2="11" y2="13" /><polygon points="22 2 15 22 11 13 2 9 22 2" />
            </svg>
          </div>
          {/* 북마크 */}
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-gray-800">
            <polygon points="19 21 12 16 5 21 5 3 19 3" />
          </svg>
        </div>

        {/* 개설자 아이콘 + 제목/정보 */}
        <div className="flex items-center gap-2 px-3 pt-2 pb-3">
          {host?.profile_image_url ? (
            <Image
              src={host.profile_image_url}
              alt={host?.nickname ?? ""}
              width={30}
              height={30}
              className="rounded-full object-cover flex-shrink-0"
            />
          ) : (
            <div className="w-[30px] h-[30px] rounded-full bg-gray-200 flex items-center justify-center text-gray-500 text-xs font-medium flex-shrink-0">
              {host?.nickname?.[0] ?? "?"}
            </div>
          )}
          <div className="flex flex-col min-w-0">
            <p className="text-base text-gray-900 font-semibold line-clamp-1">{title}</p>
            <p className="text-gray-500" style={{ fontSize: "13px" }}>
              {levelLabel} · {formatDate(datetime)} · {genreLabel}
            </p>
          </div>
        </div>
      </div>
    );
  }

  // list mode
  return (
    <Link href={`/classes/${id}`} className="card flex items-start gap-3 p-3">
      <div className="flex-shrink-0 mt-0.5">
        {host?.profile_image_url ? (
          <Image
            src={host.profile_image_url}
            alt={host.nickname}
            width={40}
            height={40}
            className="rounded-full object-cover"
          />
        ) : (
          <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center text-gray-500 text-sm font-medium">
            {host?.nickname?.[0] ?? "?"}
          </div>
        )}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5 mb-1 flex-wrap">
          <span className={`text-xs font-medium px-1.5 py-0.5 rounded-full ${chipCls}`}>
            {genreLabel}
          </span>
          <span className={`text-xs font-medium px-1.5 py-0.5 rounded-full ${statusInfo.cls}`}>
            {statusInfo.label}
          </span>
          {is_modified && (
            <span className="text-xs text-orange-500 font-medium">수정됨</span>
          )}
        </div>
        <p className="font-semibold text-sm text-gray-900 line-clamp-1">{title}</p>
        <p className="text-xs text-gray-500 mt-0.5">
          {levelLabel} · {formatDate(datetime)}
        </p>
        <p className="text-xs text-gray-400 mt-0.5">{region}</p>
      </div>
    </Link>
  );
}
