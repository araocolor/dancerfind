export const SEARCH_DEFAULTS_STORAGE_KEY = "loco_search_defaults";
export const HOME_CLASSES_CACHE_KEY = "loco_home_classes_cache";
export const HOME_SEARCH_CONDITION_CACHE_KEY = "loco_home_search_condition_cache";

export interface SearchOptions {
  region: string;
  status: string;
  class_type: string;
  genre: string[];
}

export const DEFAULT_SEARCH_OPTIONS: SearchOptions = {
  region: "전체",
  status: "recruiting",
  class_type: "전체",
  genre: [],
};

export function buildSearchQuery(opts: SearchOptions) {
  const params = new URLSearchParams();
  if (opts.region !== "전체") params.set("region", opts.region);
  if (opts.status !== "전체") params.set("status", opts.status);
  if (opts.class_type !== "전체") params.set("class_type", opts.class_type);
  opts.genre.forEach((g) => params.append("genre", g));
  return params.toString();
}
