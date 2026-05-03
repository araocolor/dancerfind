"use client";

import { useRouter } from "next/navigation";

export default function SearchNavButton({ isLoggedIn }: { isLoggedIn: boolean }) {
  const router = useRouter();

  function handleClick() {
    router.push("/search?slide=1");
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      className="w-10 h-10 -ml-1 flex items-center justify-center text-gray-500 cursor-pointer"
      aria-label="검색"
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width="22"
        height="22"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <circle cx="11" cy="11" r="8" />
        <path d="m21 21-4.3-4.3" />
      </svg>
    </button>
  );
}
