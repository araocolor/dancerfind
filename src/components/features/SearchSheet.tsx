"use client";
import { useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { REGIONS_WITH_ALL, GENRES } from "@/lib/constants";
import {
  DEFAULT_SEARCH_OPTIONS,
  SEARCH_DEFAULTS_STORAGE_KEY,
  buildSearchQuery,
  type SearchOptions,
} from "@/lib/search-defaults";

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

function readStoredSearchOptions(): SearchOptions {
  if (typeof window === "undefined") return DEFAULT_SEARCH_OPTIONS;

  const raw = sessionStorage.getItem(SEARCH_DEFAULTS_STORAGE_KEY);
  if (!raw) return DEFAULT_SEARCH_OPTIONS;

  try {
    const parsed = JSON.parse(raw) as SearchOptions | (Omit<SearchOptions, "genre"> & { genre: string });
    return {
      ...parsed,
      genre: Array.isArray(parsed.genre)
        ? parsed.genre
        : parsed.genre && parsed.genre !== "전체"
        ? [parsed.genre]
        : [],
    };
  } catch {
    return DEFAULT_SEARCH_OPTIONS;
  }
}


export default function SearchSheet() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const isOpen = searchParams.get("search") === "open";

  const [opts, setOpts] = useState<SearchOptions>(readStoredSearchOptions);
  const [saveDefault, setSaveDefault] = useState(false);

  function close() {
    const params = new URLSearchParams(searchParams.toString());
    params.delete("search");
    const next = params.toString();
    router.replace(next ? `${pathname}?${next}` : pathname);
  }

  async function handleResetSearch() {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      await supabase.from("profiles").update({ default_search_options: null }).eq("id", user.id);
    }
    sessionStorage.removeItem(SEARCH_DEFAULTS_STORAGE_KEY);
    setOpts(DEFAULT_SEARCH_OPTIONS);
  }

  async function handleSearch() {
    sessionStorage.setItem(SEARCH_DEFAULTS_STORAGE_KEY, JSON.stringify(opts));

    if (saveDefault) {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        await supabase.from("profiles").update({ default_search_options: opts }).eq("id", user.id);
      }
    }

    const qs = buildSearchQuery(opts);
    router.push(`/?${qs}`);
  }

  function set(key: "region" | "status" | "class_type", value: string) {
    setSaveDefault(true);
    setOpts((prev) => ({ ...prev, [key]: value }));

    if (key === "region" && pathname === "/") {
      const params = new URLSearchParams(searchParams.toString());
      if (value === "전체") params.delete("region");
      else params.set("region", value);
      params.set("search", "open");
      const next = params.toString();
      router.replace(next ? `/?${next}` : "/?search=open");
    }
  }

  function toggleGenre(value: string) {
    setSaveDefault(true);
    const exists = opts.genre.includes(value);
    if (!exists && opts.genre.length >= 3) {
      alert("장르는 최대 3개까지 선택할 수 있습니다.");
      return;
    }
    const nextGenres = exists
      ? opts.genre.filter((g) => g !== value)
      : [...opts.genre, value];

    setOpts((prev) => ({ ...prev, genre: nextGenres }));

    if (pathname === "/") {
      const params = new URLSearchParams(searchParams.toString());
      params.delete("genre");
      nextGenres.forEach((genre) => params.append("genre", genre));
      params.set("search", "open");
      const next = params.toString();
      router.replace(next ? `/?${next}` : "/?search=open");
    }
  }

  function selectAllGenres() {
    setSaveDefault(true);
    setOpts((prev) => ({ ...prev, genre: [] }));

    if (pathname === "/") {
      const params = new URLSearchParams(searchParams.toString());
      params.delete("genre");
      params.set("search", "open");
      const next = params.toString();
      router.replace(next ? `/?${next}` : "/?search=open");
    }
  }

  if (!isOpen) return null;

  return (
    <>
      <button
        type="button"
        aria-label="검색창 닫기"
        onClick={close}
        className="fixed inset-0 z-[9998]"
      />
      <div className="search-slide-in search-half-panel px-4 py-6 pb-36">
        <h1 className="text-lg font-bold mb-6">클래스 검색</h1>

        {/* 지역 / 클래스구분 / 모집상태 */}
        <div className="mb-5 grid grid-cols-3 gap-2 items-end text-center">
          <div>
            <label className="field-label">지역</label>
            <div>
              <select
                className="w-full h-11 rounded-xl border border-[#d2d2d7] bg-white px-3 text-sm text-[#1d1d1f] appearance-auto"
                value={opts.region}
                onChange={(e) => set("region", e.target.value)}
              >
                {REGIONS_WITH_ALL.map((r) => <option key={r} value={r}>{r}</option>)}
              </select>
            </div>
          </div>
          <div>
            <label className="field-label">클래스 구분</label>
            <div>
              <select
                className="w-full h-11 rounded-xl border border-[#d2d2d7] bg-white px-3 text-sm text-[#1d1d1f] appearance-auto"
                value={opts.class_type}
                onChange={(e) => set("class_type", e.target.value)}
              >
                {CLASS_TYPE_OPTIONS.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
            </div>
          </div>
          <div>
            <label className="field-label">모집 상태</label>
            <div>
              <select
                className="w-full h-11 rounded-xl border border-[#d2d2d7] bg-white px-3 text-sm text-[#1d1d1f] appearance-auto"
                value={opts.status}
                onChange={(e) => set("status", e.target.value)}
              >
                {STATUS_OPTIONS.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
              </select>
            </div>
          </div>
        </div>

        {/* 장르 */}
        <div className="mb-5">
          <label className="field-label">장르</label>
          <div className="flex gap-2 flex-wrap">
            <button
              type="button"
              onClick={selectAllGenres}
              className={`chip ${opts.genre.length === 0 ? "active" : ""}`}
            >
              전체
            </button>
            {GENRES.map((g) => (
              <button
                key={g.value}
                type="button"
                onClick={() => toggleGenre(g.value)}
                className={`chip ${opts.genre.includes(g.value) ? "active" : ""}`}
              >
                {g.label}
              </button>
            ))}
          </div>
        </div>

        {/* 검색초기화 */}
        <div className="flex items-center mb-5">
          <button
            type="button"
            onClick={handleResetSearch}
            className="text-xs text-gray-400 underline"
          >
            검색초기화
          </button>
        </div>

        {/* 기본으로 저장 */}
        <label className="flex items-center gap-2 cursor-pointer select-none">
          <input
            type="checkbox"
            checked={saveDefault}
            onChange={(e) => setSaveDefault(e.target.checked)}
            className="w-4 h-4 accent-[#FEE500]"
          />
          <span className="text-sm text-gray-600">이 조건을 기본으로 저장</span>
        </label>
      </div>

      {/* 하단 고정 영역 */}
      <div className="fixed bottom-0 left-0 right-0 z-[10000] bg-white border-t border-[#e5e7eb] px-4 pt-3 pb-4">
        {/* 닫기 + 검색하기 */}
        <div className="flex gap-3">
          <button
            type="button"
            onClick={close}
            className="flex-1 h-12 rounded-xl border border-gray-300 text-gray-600 font-semibold text-sm"
          >
            닫기
          </button>
          <button
            type="button"
            onClick={handleSearch}
            className="flex-1 h-12 rounded-xl bg-[#FEE500] text-gray-900 font-semibold text-sm"
          >
            검색하기
          </button>
        </div>
      </div>
    </>
  );
}
