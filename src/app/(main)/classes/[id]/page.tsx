import type { Metadata } from "next";
import CachedClassDetailPage from "@/components/class/CachedClassDetailPage";
import MainHeader from "@/components/layout/MainHeader";

export const metadata: Metadata = { title: "클래스 상세" };

export default function ClassDetailPage() {
  return (
    <>
      <MainHeader showBackButton />
      <CachedClassDetailPage />
    </>
  );
}
