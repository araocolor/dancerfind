"use client";

import { useState } from "react";
import { useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function LoginPage() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const searchParams = useSearchParams();
  const next = searchParams.get("next") || "/";

  async function handleKakaoLogin() {
    setLoading(true);
    setError("");
    const supabase = createClient();
    const { error: authError } = await supabase.auth.signInWithOAuth({
      provider: "kakao",
      options: {
        redirectTo: `${window.location.origin}/auth/callback?next=${next}`,
      },
    });
    if (authError) {
      setError("카카오 로그인에 실패했습니다.");
      setLoading(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center p-4">
      <div className="w-full max-w-sm card p-8">
        <h1 className="text-2xl font-bold text-center mb-1">LOCO</h1>
        <p className="text-sm text-center mb-8" style={{ color: "#999999" }}>
          라틴 댄스 클래스 플랫폼
        </p>

        {error && <p className="error-text mb-4">{error}</p>}

        <button
          onClick={handleKakaoLogin}
          disabled={loading}
          className="w-full flex items-center justify-center gap-2 rounded-full py-3 font-bold text-[#111111]"
          style={{ backgroundColor: "#FEE500" }}
        >
          {loading ? "로그인 중..." : "카카오로 로그인"}
        </button>
      </div>
    </main>
  );
}
