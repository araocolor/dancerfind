export const SEARCH_DEFAULTS_STORAGE_KEY = "loco_search_defaults";
export const HOME_CLASSES_CACHE_KEY = "loco_home_classes_cache";
export const HOME_SEARCH_CONDITION_CACHE_KEY = "loco_home_search_condition_cache";

export interface SearchOptions {
  region: string;
  status: string;
  venue: string;
  genre: string[];
}

export const DEFAULT_SEARCH_OPTIONS: SearchOptions = {
  region: "전체",
  status: "recruiting",
  venue: "전체",
  genre: [],
};

export function buildSearchQuery(opts: SearchOptions) {
  const params = new URLSearchParams();
  if (opts.region !== "전체") params.set("region", opts.region);
  if (opts.status !== "전체") params.set("status", opts.status);
  if (opts.venue !== "전체") params.set("venue", opts.venue);
  opts.genre.forEach((g) => params.append("genre", g));
  return params.toString();
}
