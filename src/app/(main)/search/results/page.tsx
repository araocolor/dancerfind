"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { useSearchParams, useRouter, usePathname } from "next/navigation";
import ClassCard, { ClassWithHost } from "@/components/class/ClassCard";

const SEARCH_RESULTS_CACHE_KEY = "loco_search_results_cache_v1";

interface CachedSearchResult {
  data: ClassWithHost[];
  count: number;
  hasMore: boolean;
}

type SearchResultsCacheStore = Record<string, CachedSearchResult>;

export default function SearchResultsPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  const [viewMode, setViewMode] = useState<"list" | "card">("card");

  const [classes, setClasses] = useState<ClassWithHost[]>([]);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(false);
  const [total, setTotal] = useState<number | null>(null);

  const observerRef = useRef<IntersectionObserver | null>(null);
  const sentinelRef = useRef<HTMLDivElement | null>(null);

  function buildFetchUrl(p: number) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("page", String(p));
    params.delete("view");
    params.delete("search");
    return `/api/classes/search?${params.toString()}`;
  }

  function buildCacheKey() {
    const params = new URLSearchParams(searchParams.toString());
    params.delete("page");
    params.delete("view");
    params.delete("search");
    return params.toString();
  }

  const fetchPage = useCallback(
    async (p: number, replace = false, cacheOnly = false) => {
      if (loading) return;
      const cacheKey = buildCacheKey();

      if (p === 0 && replace) {
        const raw = sessionStorage.getItem(SEARCH_RESULTS_CACHE_KEY);
        if (raw) {
          try {
            const store = JSON.parse(raw) as SearchResultsCacheStore;
            const cached = store[cacheKey];
            if (cached) {
              setClasses(cached.data ?? []);
              setHasMore(cacheOnly ? false : !!cached.hasMore);
              setTotal(cached.count ?? 0);
              return;
            }
          } catch {}
        }
        if (cacheOnly) return;
      }

      setLoading(true);
      try {
        const res = await fetch(buildFetchUrl(p));
        const json = await res.json();
        if (json.error) return;
        setClasses((prev) => (replace ? json.data : [...prev, ...json.data]));
        setHasMore(json.hasMore);
        if (p === 0) setTotal(json.count);

        if (p === 0 && replace) {
          const raw = sessionStorage.getItem(SEARCH_RESULTS_CACHE_KEY);
          let store: SearchResultsCacheStore = {};
          if (raw) {
            try { store = JSON.parse(raw) as SearchResultsCacheStore; } catch { store = {}; }
          }
          store[cacheKey] = { data: json.data ?? [], count: json.count ?? 0, hasMore: !!json.hasMore };
          sessionStorage.setItem(SEARCH_RESULTS_CACHE_KEY, JSON.stringify(store));
        }
      } finally {
        setLoading(false);
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [searchParams.toString()]
  );

  useEffect(() => {
    setPage(0);
    setClasses([]);
    setHasMore(true);
    fetchPage(0, true, false);
  }, [searchParams.toString()]);

  useEffect(() => {
    if (observerRef.current) observerRef.current.disconnect();
    observerRef.current = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !loading) {
          const next = page + 1;
          setPage(next);
          fetchPage(next);
        }
      },
      { rootMargin: "200px" }
    );
    if (sentinelRef.current) observerRef.current.observe(sentinelRef.current);
    return () => observerRef.current?.disconnect();
  }, [hasMore, loading, page, fetchPage]);

  return (
    <div className="max-w-xl mx-auto">
      {/* 뷰 전환 */}
      <div className="flex items-center justify-between px-4 pt-3 pb-2">
        {total !== null && <span className="text-xs text-gray-400">총 {total}개</span>}
        <button
          type="button"
          onClick={() => setViewMode((v) => (v === "list" ? "card" : "list"))}
          className="ml-auto p-2 border border-[#e5e7eb] rounded-xl bg-white text-gray-600"
          aria-label="뷰 전환"
        >
          {viewMode === "list" ? (
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="3" width="7" height="7" /><rect x="14" y="3" width="7" height="7" />
              <rect x="3" y="14" width="7" height="7" /><rect x="14" y="14" width="7" height="7" />
            </svg>
          ) : (
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="8" y1="6" x2="21" y2="6" /><line x1="8" y1="12" x2="21" y2="12" />
              <line x1="8" y1="18" x2="21" y2="18" /><line x1="3" y1="6" x2="3.01" y2="6" />
              <line x1="3" y1="12" x2="3.01" y2="12" /><line x1="3" y1="18" x2="3.01" y2="18" />
            </svg>
          )}
        </button>
      </div>

      <div className={`pt-2 pb-6 ${viewMode === "card" ? "flex flex-col divide-y divide-[#e5e7eb]" : "flex flex-col gap-3 px-4"}`}>
        {classes.map((c) => (
          <ClassCard key={c.id} classData={c} viewMode={viewMode} />
        ))}
      </div>

      {!loading && classes.length === 0 && (
        <div className="text-center py-16 text-gray-400 text-sm px-4">
          <p className="text-3xl mb-3">🔍</p>
          <p>조건에 맞는 클래스가 없습니다</p>
        </div>
      )}

      {loading && (
        <div className="text-center py-6 text-gray-400 text-sm">로딩 중...</div>
      )}

      <div ref={sentinelRef} className="h-1" />

      <button
        type="button"
        onClick={() => router.push(`${pathname}?search=open`)}
        className={`fixed bottom-20 left-1/2 -translate-x-1/2 z-40 px-6 py-3 bg-[#FEE500] rounded-full shadow-lg text-sm font-semibold text-gray-900 transition-transform duration-300 ease-in-out ${
          searchParams.get("search") === "open" ? "translate-y-40" : "translate-y-0"
        }`}
      >
        상세검색
      </button>
    </div>
  );
}
