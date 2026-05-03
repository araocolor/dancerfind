import type { Metadata } from "next";
import MyPageCacheLoader from "@/components/user/MyPageCacheLoader";

export const metadata: Metadata = { title: "마이페이지" };

export default function MyPage() {
  return <MyPageCacheLoader />;
}
