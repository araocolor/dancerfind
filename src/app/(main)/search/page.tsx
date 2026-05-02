"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { REGIONS_WITH_ALL, GENRES } from "@/lib/constants";

const STATUS_OPTIONS = [
  { value: "전체", label: "전체" },
  { value: "recruiting", label: "모집중" },
  { value: "closed", label: "마감" },
];

const CLASS_TYPE_OPTIONS = [
  { value: "전체", label: "전체" },
  { value: "group", label: "그룹" },
  { value: "private", label: "1:1" },
];

const STORAGE_KEY = "loco_search_defaults";

interface SearchOptions {
  region: string;
  status: string;
  class_type: string;
  genre: string;
}

const DEFAULT_OPTIONS: SearchOptions = {
  region: "전체",
  status: "recruiting",
  class_type: "전체",
  genre: "전체",
};

function buildQueryString(opts: SearchOptions) {
  const params = new URLSearchParams();
  if (opts.region !== "전체") params.set("region", opts.region);
  if (opts.status !== "전체") params.set("status", opts.status);
  if (opts.class_type !== "전체") params.set("class_type", opts.class_type);
  if (opts.genre !== "전체") params.set("genre", opts.genre);
  return params.toString();
}

export default function SearchPage() {
  const router = useRouter();
  const [opts, setOpts] = useState<SearchOptions>(DEFAULT_OPTIONS);
  const [saveDefault, setSaveDefault] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadDefaults() {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();

      let saved: SearchOptions | null = null;

      if (user) {
        const { data } = await supabase
          .from("profiles")
          .select("default_search_options")
          .eq("id", user.id)
          .single();
        if (data?.default_search_options) {
          saved = data.default_search_options as SearchOptions;
        }
      } else {
        const raw = sessionStorage.getItem(STORAGE_KEY);
        if (raw) {
          try {
            saved = JSON.parse(raw) as SearchOptions;
          } catch {
            // ignore
          }
        }
      }

      if (saved) {
        const qs = buildQueryString(saved);
        router.replace(`/search/results${qs ? `?${qs}` : ""}`);
        return;
      }

      setLoading(false);
    }

    loadDefaults();
  }, [router]);

  async function handleSearch() {
    if (saveDefault) {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (user) {
        await supabase
          .from("profiles")
          .update({ default_search_options: opts })
          .eq("id", user.id);
      } else {
        sessionStorage.setItem(STORAGE_KEY, JSON.stringify(opts));
      }
    }

    const qs = buildQueryString(opts);
    router.push(`/search/results${qs ? `?${qs}` : ""}`);
  }

  function set(key: keyof SearchOptions, value: string) {
    setOpts((prev) => ({ ...prev, [key]: value }));
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-40 text-gray-400 text-sm">
        로딩 중...
      </div>
    );
  }

  return (
    <div className="px-4 py-6 max-w-xl mx-auto">
      <h1 className="text-lg font-bold mb-6">클래스 검색</h1>

      {/* 지역 */}
      <div className="mb-5">
        <label className="field-label">지역</label>
        <select
          className="input-field"
          value={opts.region}
          onChange={(e) => set("region", e.target.value)}
        >
          {REGIONS_WITH_ALL.map((r) => (
            <option key={r} value={r}>
              {r}
            </option>
          ))}
        </select>
      </div>

      {/* 모집상태 */}
      <div className="mb-5">
        <label className="field-label">모집 상태</label>
        <div className="flex gap-2 flex-wrap">
          {STATUS_OPTIONS.map((s) => (
            <button
              key={s.value}
              type="button"
              onClick={() => set("status", s.value)}
              className={`chip ${opts.status === s.value ? "active" : ""}`}
            >
              {s.label}
            </button>
          ))}
        </div>
      </div>

      {/* 클래스 구분 */}
      <div className="mb-5">
        <label className="field-label">클래스 구분</label>
        <div className="flex gap-2 flex-wrap">
          {CLASS_TYPE_OPTIONS.map((t) => (
            <button
              key={t.value}
              type="button"
              onClick={() => set("class_type", t.value)}
              className={`chip ${opts.class_type === t.value ? "active" : ""}`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* 장르 */}
      <div className="mb-6">
        <label className="field-label">장르</label>
        <div className="flex gap-2 flex-wrap">
          <button
            type="button"
            onClick={() => set("genre", "전체")}
            className={`chip ${opts.genre === "전체" ? "active" : ""}`}
          >
            전체
          </button>
          {GENRES.map((g) => (
            <button
              key={g.value}
              type="button"
              onClick={() => set("genre", g.value)}
              className={`chip ${opts.genre === g.value ? "active" : ""}`}
            >
              {g.label}
            </button>
          ))}
        </div>
      </div>

      {/* 기본으로 저장 */}
      <label className="flex items-center gap-2 mb-6 cursor-pointer select-none">
        <input
          type="checkbox"
          checked={saveDefault}
          onChange={(e) => setSaveDefault(e.target.checked)}
          className="w-4 h-4 accent-[#FEE500]"
        />
        <span className="text-sm text-gray-600">이 조건을 기본으로 저장</span>
      </label>

      <button type="button" className="btn-primary" onClick={handleSearch}>
        검색하기
      </button>
    </div>
  );
}
