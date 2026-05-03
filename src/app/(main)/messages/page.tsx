import type { Metadata } from "next";

export const metadata: Metadata = { title: "메시지" };

export default function MessagesPage() {
  return (
    <div className="px-4 py-6 max-w-xl mx-auto text-sm text-gray-700">
      이곳은 메시지가 표시되는 페이지입니다.
    </div>
  );
}
