"use client";

import { useEffect } from "react";
import {
  DEFAULT_SEARCH_OPTIONS,
  HOME_CLASSES_CACHE_KEY,
  HOME_SEARCH_CONDITION_CACHE_KEY,
  SEARCH_DEFAULTS_STORAGE_KEY,
  type SearchOptions,
} from "@/lib/search-defaults";

interface HomeClassCacheItem {
  id: string;
  title: string;
  poster: string | null;
  status: string;
  genre: string;
  region: string;
}

export default function HomeCacheHydrator({
  classes,
  searchCondition,
}: {
  classes: HomeClassCacheItem[];
  searchCondition: SearchOptions;
}) {
  useEffect(() => {
    sessionStorage.setItem(HOME_CLASSES_CACHE_KEY, JSON.stringify(classes));
    sessionStorage.setItem(
      HOME_SEARCH_CONDITION_CACHE_KEY,
      JSON.stringify(searchCondition)
    );
    sessionStorage.setItem(
      SEARCH_DEFAULTS_STORAGE_KEY,
      JSON.stringify(searchCondition ?? DEFAULT_SEARCH_OPTIONS)
    );
  }, [classes, searchCondition]);

  return null;
}
