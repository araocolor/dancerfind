"use client";

import { useRouter } from "next/navigation";

export default function BackButton() {
  const router = useRouter();

  return (
    <button
      type="button"
      aria-label="뒤로가기"
      onClick={() => router.back()}
      className="text-[18px] font-bold leading-none text-gray-900 px-1 py-1"
    >
      {"<"}
    </button>
  );
}

