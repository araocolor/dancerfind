import type { Metadata } from "next";
import CachedClassDetailPage from "@/components/class/CachedClassDetailPage";
import ClassHeader from "@/components/layout/ClassHeader";

export const metadata: Metadata = { title: "클래스 상세" };

export default function ClassDetailPage() {
  return (
    <>
      <ClassHeader />
      <CachedClassDetailPage />
    </>
  );
}
