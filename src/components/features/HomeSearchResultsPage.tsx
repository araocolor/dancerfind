"use client";

import { useEffect, useRef, useState } from "react";
import ClassCard, { ClassWithHost } from "@/components/class/ClassCard";

const HOME_RESULTS_CACHE_KEY = "loco_home_results_cache_v3";

interface CachedHomeResult {
  data: ClassWithHost[];
  count: number;
}

export default function HomeSearchResultsPage() {
  const [classes, setClasses] = useState<ClassWithHost[]>([]);
  const [loading, setLoading] = useState(true);
  const warmedImageUrlsRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    let cancelled = false;

    async function load() {
      const cachedRaw = sessionStorage.getItem(HOME_RESULTS_CACHE_KEY);
      if (cachedRaw) {
        try {
          const cached = JSON.parse(cachedRaw) as CachedHomeResult;
          const cachedList = (cached.data ?? []).slice(0, 10);
          if (!cancelled) {
            setClasses(cachedList);
            setLoading(false);
          }
          warmImages(cachedList);
          return;
        } catch {}
      }

      try {
        const res = await fetch("/api/classes/search?page=0");
        const json = await res.json();
        if (json.error) {
          if (!cancelled) setLoading(false);
          return;
        }

        const incoming = ((json.data ?? []) as ClassWithHost[]).slice(0, 10);

        if (!cancelled) {
          setClasses(incoming);
          setLoading(false);
        }

        sessionStorage.setItem(
          HOME_RESULTS_CACHE_KEY,
          JSON.stringify({ data: incoming, count: json.count ?? 0 } satisfies CachedHomeResult)
        );

        warmImages(incoming);
      } catch {
        if (!cancelled) setLoading(false);
      }
    }

    function warmImages(items: ClassWithHost[]) {
      items.forEach((item) => {
        const url = item.images?.[0]?.card_url;
        if (!url) return;
        if (warmedImageUrlsRef.current.has(url)) return;

        warmedImageUrlsRef.current.add(url);
        const img = new window.Image();
        img.decoding = "async";
        img.src = url;
      });
    }

    void load();

    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="max-w-xl mx-auto bg-white">
      <div className="flex flex-col divide-y divide-[#e9eaec] pb-6">
        {classes.map((c) => (
          <ClassCard key={c.id} classData={c} viewMode="card" />
        ))}
      </div>

      {!loading && classes.length === 0 && (
        <div className="text-center py-16 text-gray-400 text-sm px-4">
          <p className="text-3xl mb-3">🔍</p>
          <p>표시할 클래스가 없습니다.</p>
        </div>
      )}

      {loading && <div className="text-center py-6 text-gray-400 text-sm">로딩 중...</div>}
    </div>
  );
}
