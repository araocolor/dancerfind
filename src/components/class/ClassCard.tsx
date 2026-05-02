import Link from "next/link";
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
      <Link href={`/classes/${id}`} className="card block overflow-hidden">
        <div
          className="w-full h-[200px] flex items-center justify-center bg-cover bg-center"
          style={
            imageUrl
              ? { backgroundImage: `url(${imageUrl})` }
              : { backgroundColor: GENRE_BG[genre] ?? GENRE_BG.other }
          }
        >
          {!imageUrl && (
            <span className="text-5xl opacity-30">
              {genre === "salsa" ? "💃" : genre === "bachata" ? "🕺" : "🎵"}
            </span>
          )}
        </div>
        <div className="p-3">
          <div className="flex items-center gap-1.5 mb-1.5 flex-wrap">
            <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${chipCls}`}>
              {genreLabel}
            </span>
            <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${statusInfo.cls}`}>
              {statusInfo.label}
            </span>
            {is_modified && (
              <span className="text-xs text-orange-500 font-medium">수정됨</span>
            )}
          </div>
          <p className="font-semibold text-sm text-gray-900 line-clamp-2 mb-1">{title}</p>
          <p className="text-xs text-gray-500">
            {levelLabel} · {formatDate(datetime)} · {region}
          </p>
          {host && (
            <div className="flex items-center gap-1.5 mt-2">
              {host.profile_image_url ? (
                <img
                  src={host.profile_image_url}
                  alt={host.nickname}
                  className="w-5 h-5 rounded-full object-cover"
                />
              ) : (
                <div className="w-5 h-5 rounded-full bg-gray-200 flex items-center justify-center text-gray-500 text-[10px] font-medium">
                  {host.nickname[0]}
                </div>
              )}
              <span className="text-xs text-gray-500">{host.nickname}</span>
            </div>
          )}
        </div>
      </Link>
    );
  }

  // list mode
  return (
    <Link href={`/classes/${id}`} className="card flex items-start gap-3 p-3">
      <div className="flex-shrink-0 mt-0.5">
        {host?.profile_image_url ? (
          <img
            src={host.profile_image_url}
            alt={host.nickname}
            className="w-10 h-10 rounded-full object-cover"
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
