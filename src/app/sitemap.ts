import type { MetadataRoute } from "next";
import { createClient } from "@/lib/supabase/server";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://loco.kr";

  const supabase = await createClient();
  const { data: classes } = await supabase
    .from("classes")
    .select("id, updated_at")
    .eq("status", "recruiting");

  const classUrls: MetadataRoute.Sitemap = (classes ?? []).map((cls) => ({
    url: `${baseUrl}/classes/${cls.id}`,
    lastModified: cls.updated_at,
  }));

  return [
    { url: baseUrl, lastModified: new Date() },
    { url: `${baseUrl}/search`, lastModified: new Date() },
    ...classUrls,
  ];
}
