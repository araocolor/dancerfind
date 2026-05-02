"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { GENRES } from "@/lib/constants";
import ClassCard, { ClassWithHost } from "@/components/class/ClassCard";

const SORT_OPTIONS = [
  { value: "latest", label: "최신순" },
  { value: "deadline", label: "마감임박순" },
  { value: "popular", label: "인기순" },
];

export default function SearchResultsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [genre, setGenre] = useState(searchParams.get("genre") ?? "전체");
  const [sort, setSort] = useState("latest");
  const [keyword, setKeyword] = useState("");
  const [viewMode, setViewMode] = useState<"list" | "card">("list");

  const [classes, setClasses] = useState<ClassWithHost[]>([]);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(false);
  const [total, setTotal] = useState<number | null>(null);

  const observerRef = useRef<IntersectionObserver | null>(null);
  const sentinelRef = useRef<HTMLDivElement | null>(null);
  const keywordTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  function buildFetchUrl(p: number, g: string, s: string, kw: string) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("page", String(p));
    params.set("sort", s);
    if (g !== "전체") params.set("genre", g);
    else params.delete("genre");
    if (kw) params.set("keyword", kw);
    else params.delete("keyword");
    return `/api/classes/search?${params.toString()}`;
  }

  const fetchPage = useCallback(
    async (p: number, g: string, s: string, kw: string, replace = false) => {
      if (loading) return;
      setLoading(true);
      try {
        const res = await fetch(buildFetchUrl(p, g, s, kw));
        const json = await res.json();
        if (json.error) return;
        setClasses((prev) => (replace ? json.data : [...prev, ...json.data]));
        setHasMore(json.hasMore);
        if (p === 0) setTotal(json.count);
      } finally {
        setLoading(false);
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  );

  // 초기 로드
  useEffect(() => {
    setPage(0);
    setClasses([]);
    setHasMore(true);
    fetchPage(0, genre, sort, keyword, true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [genre, sort]);

  // 키워드 디바운스
  useEffect(() => {
    if (keywordTimerRef.current) clearTimeout(keywordTimerRef.current);
    keywordTimerRef.current = setTimeout(() => {
      setPage(0);
      setClasses([]);
      setHasMore(true);
      fetchPage(0, genre, sort, keyword, true);
    }, 400);
    return () => {
      if (keywordTimerRef.current) clearTimeout(keywordTimerRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [keyword]);

  // 무한스크롤 sentinel 관찰
  useEffect(() => {
    if (observerRef.current) observerRef.current.disconnect();

    observerRef.current = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !loading) {
          const next = page + 1;
          setPage(next);
          fetchPage(next, genre, sort, keyword);
        }
      },
      { rootMargin: "200px" }
    );

    if (sentinelRef.current) {
      observerRef.current.observe(sentinelRef.current);
    }

    return () => observerRef.current?.disconnect();
  }, [hasMore, loading, page, genre, sort, keyword, fetchPage]);

  // 다음 페이지 prefetch
  useEffect(() => {
    if (hasMore && !loading && classes.length > 0) {
      fetch(buildFetchUrl(page + 1, genre, sort, keyword));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [classes.length]);

  return (
    <div className="max-w-xl mx-auto">
      {/* 검색어 + 뷰 전환 */}
      <div className="sticky top-14 z-40 bg-[#f6f8fb] px-4 pt-3 pb-2">
        <div className="flex items-center gap-2 mb-2">
          <div className="flex-1 flex items-center gap-2 px-3 py-2 rounded-[12px] border border-[#e5e7eb] bg-white">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="text-gray-400 flex-shrink-0"
            >
              <circle cx="11" cy="11" r="8" />
              <path d="m21 21-4.3-4.3" />
            </svg>
            <input
              type="text"
              placeholder="제목으로 검색"
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              className="flex-1 text-sm outline-none bg-transparent text-gray-800 placeholder:text-gray-400"
            />
          </div>

          {/* 정렬 */}
          <select
            value={sort}
            onChange={(e) => setSort(e.target.value)}
            className="text-sm border border-[#e5e7eb] rounded-[10px] px-2 py-2 bg-white text-gray-700 outline-none"
          >
            {SORT_OPTIONS.map((s) => (
              <option key={s.value} value={s.value}>
                {s.label}
              </option>
            ))}
          </select>

          {/* 목록/카드 전환 */}
          <button
            type="button"
            onClick={() => setViewMode((v) => (v === "list" ? "card" : "list"))}
            className="p-2 border border-[#e5e7eb] rounded-[10px] bg-white text-gray-600"
            aria-label="뷰 전환"
          >
            {viewMode === "list" ? (
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="3" width="7" height="7" /><rect x="14" y="3" width="7" height="7" />
                <rect x="3" y="14" width="7" height="7" /><rect x="14" y="14" width="7" height="7" />
              </svg>
            ) : (
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="8" y1="6" x2="21" y2="6" /><line x1="8" y1="12" x2="21" y2="12" />
                <line x1="8" y1="18" x2="21" y2="18" /><line x1="3" y1="6" x2="3.01" y2="6" />
                <line x1="3" y1="12" x2="3.01" y2="12" /><line x1="3" y1="18" x2="3.01" y2="18" />
              </svg>
            )}
          </button>
        </div>

        {/* 장르 칩 가로 스크롤 */}
        <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
          <button
            type="button"
            onClick={() => setGenre("전체")}
            className={`chip flex-shrink-0 text-sm py-1.5 px-3 ${genre === "전체" ? "active" : ""}`}
          >
            전체
          </button>
          {GENRES.map((g) => (
            <button
              key={g.value}
              type="button"
              onClick={() => setGenre(g.value)}
              className={`chip flex-shrink-0 text-sm py-1.5 px-3 ${genre === g.value ? "active" : ""}`}
            >
              {g.label}
            </button>
          ))}
        </div>

        {/* 필터 변경 링크 */}
        <div className="flex items-center justify-between mt-1.5">
          {total !== null && (
            <span className="text-xs text-gray-500">총 {total}개</span>
          )}
          <button
            type="button"
            onClick={() => router.push("/search")}
            className="text-xs text-gray-400 underline ml-auto"
          >
            필터 변경
          </button>
        </div>
      </div>

      {/* 결과 목록 */}
      <div className={`px-4 pt-3 pb-6 ${viewMode === "card" ? "grid grid-cols-2 gap-3" : "flex flex-col gap-3"}`}>
        {classes.map((c) => (
          <ClassCard key={c.id} classData={c} viewMode={viewMode} />
        ))}
      </div>

      {/* 빈 결과 */}
      {!loading && classes.length === 0 && (
        <div className="text-center py-16 text-gray-400 text-sm px-4">
          <p className="text-3xl mb-3">🔍</p>
          <p>조건에 맞는 클래스가 없습니다</p>
          <button
            type="button"
            onClick={() => router.push("/search")}
            className="mt-4 text-sm text-gray-500 underline"
          >
            필터 변경하기
          </button>
        </div>
      )}

      {/* 로딩 */}
      {loading && (
        <div className="text-center py-6 text-gray-400 text-sm">로딩 중...</div>
      )}

      {/* 무한스크롤 sentinel */}
      <div ref={sentinelRef} className="h-1" />
    </div>
  );
}
