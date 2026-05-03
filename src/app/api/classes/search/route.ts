import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);

  const region = searchParams.get("region");
  const status = searchParams.get("status");
  const class_type = searchParams.get("class_type");
  const genres = searchParams.getAll("genre");
  const keyword = searchParams.get("keyword");
  const sort = searchParams.get("sort") ?? "latest";
  const page = parseInt(searchParams.get("page") ?? "0");

  const limit = 20;
  const from = page * limit;
  const to = from + limit - 1;

  const supabase = await createClient();

  let query = supabase
    .from("classes")
    .select("*, host:profiles!host_id(id, nickname, profile_image_url)", {
      count: "exact",
    });

  if (region && region !== "전체") query = query.eq("region", region);
  if (status && status !== "전체") query = query.eq("status", status);
  if (class_type && class_type !== "전체") query = query.eq("class_type", class_type);
  if (genres.length > 0) {
    const filteredGenres = genres.filter((g) => g && g !== "전체");
    if (filteredGenres.length > 0) query = query.in("genre", filteredGenres);
  }
  if (keyword) {
    query = query.or(`title.ilike.%${keyword}%,description.ilike.%${keyword}%`);
  }

  if (sort === "deadline") {
    query = query.order("deadline", { ascending: true });
  } else if (sort === "popular") {
    query = query.order("view_count", { ascending: false });
  } else {
    query = query.order("created_at", { ascending: false });
  }

  const { data, error, count } = await query.range(from, to);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({
    data,
    count,
    hasMore: (count ?? 0) > to + 1,
  });
}
