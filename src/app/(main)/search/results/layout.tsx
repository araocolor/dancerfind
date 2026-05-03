import type { Metadata } from "next";
import Header from "@/components/layout/Header";

export const metadata: Metadata = { title: "검색 결과" };

export default function ResultsLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <Header />
      {children}
    </>
  );
}
