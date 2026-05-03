import type { Metadata } from "next";
import Header from "@/components/layout/Header";
import SearchResultsPage from "./search/results/page";

export const metadata: Metadata = { title: "검색 결과" };

export default function MainPage() {
  return (
    <>
      <Header />
      <SearchResultsPage />
    </>
  );
}
