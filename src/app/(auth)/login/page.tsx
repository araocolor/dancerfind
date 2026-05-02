"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

const DEFAULT_PW = "loco1234";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    const supabase = createClient();
    const { error: authError } = await supabase.auth.signInWithPassword({
      email,
      password: password || DEFAULT_PW,
    });

    if (authError) {
      setError("이메일 또는 비밀번호가 올바르지 않습니다.");
    } else {
      router.push("/");
      router.refresh();
    }
    setLoading(false);
  }

  return (
    <main className="flex min-h-screen items-center justify-center p-4">
      <div className="w-full max-w-sm card p-8">
        <h1 className="text-2xl font-bold text-center mb-1">LOCO</h1>
        <p className="text-sm text-center mb-8" style={{ color: "#999999" }}>
          라틴 댄스 클래스 플랫폼
        </p>

        <form onSubmit={handleLogin} className="flex flex-col gap-4">
          <div>
            <label className="field-label">이메일</label>
            <input
              type="email"
              className="input-field"
              placeholder="email@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          <div>
            <label className="field-label">비밀번호</label>
            <input
              type="password"
              className="input-field"
              placeholder="비워두면 loco1234 자동 적용"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>

          {error && <p className="error-text">{error}</p>}

          <button type="submit" disabled={loading} className="btn-primary mt-2">
            {loading ? "로그인 중..." : "로그인"}
          </button>
        </form>

        <p className="text-center text-sm mt-6" style={{ color: "#999999" }}>
          계정이 없으신가요?{" "}
          <Link
            href="/signup"
            className="font-bold underline"
            style={{ color: "#111111" }}
          >
            회원가입
          </Link>
        </p>
      </div>
    </main>
  );
}
