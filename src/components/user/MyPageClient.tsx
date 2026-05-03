"use client";

import imageCompression from "browser-image-compression";
import Link from "next/link";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { REGIONS } from "@/lib/constants";
import type { ClassStatus } from "@/types/class";
import type { ApplicationStatus } from "@/types/application";
import type { UserRole } from "@/types/user";

type HostedFilter = "all" | ClassStatus;

interface MyProfile {
  id: string;
  nickname: string;
  bio: string | null;
  region: string | null;
  role: UserRole;
  profile_image_url: string | null;
  kakao_notification_enabled: boolean;
}

interface HostedClassItem {
  id: string;
  title: string;
  status: ClassStatus;
  datetime: string;
  region: string;
}

interface AppliedClassInfo {
  id: string;
  title: string;
  datetime: string;
  region: string;
  status: ClassStatus;
}

interface AppliedClassItem {
  id: string;
  status: ApplicationStatus;
  created_at: string;
  class: AppliedClassInfo | null;
}

interface MyPageClientProps {
  initialProfile: MyProfile;
  initialHostedClasses: HostedClassItem[];
  initialAppliedClasses: AppliedClassItem[];
  hasPendingProRequest: boolean;
}

const CLASS_STATUS_LABELS: Record<ClassStatus, string> = {
  recruiting: "모집중",
  closed: "마감",
  cancelled: "취소",
};

const APPLICATION_STATUS_LABELS: Record<ApplicationStatus, string> = {
  pending: "신청대기",
  approved: "승인",
  cancelled: "취소",
};

function formatDate(dateStr: string) {
  const d = new Date(dateStr);
  const days = ["일", "월", "화", "수", "목", "금", "토"];
  return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, "0")}.${String(d.getDate()).padStart(2, "0")} (${days[d.getDay()]})`;
}

function getStatusClass(status: ClassStatus) {
  if (status === "recruiting") return "bg-green-50 text-green-600";
  if (status === "closed") return "bg-gray-100 text-gray-600";
  return "bg-red-50 text-red-600";
}

function getApplicationStatusClass(status: ApplicationStatus) {
  if (status === "approved") return "bg-green-50 text-green-600";
  if (status === "pending") return "bg-yellow-50 text-yellow-700";
  return "bg-gray-100 text-gray-600";
}

function canCancelByDatetime(datetime: string) {
  const classTime = new Date(datetime).getTime();
  const now = Date.now();
  return (classTime - now) / (1000 * 60 * 60) > 24;
}

async function loadImage(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("이미지를 불러올 수 없습니다."));
    };
    img.src = url;
  });
}

async function canvasToBlob(canvas: HTMLCanvasElement, quality: number): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (!blob) {
          reject(new Error("이미지 변환에 실패했습니다."));
          return;
        }
        resolve(blob);
      },
      "image/jpeg",
      quality
    );
  });
}

async function toAvatarFile(file: File): Promise<File> {
  const img = await loadImage(file);
  const size = Math.min(img.width, img.height);
  const sx = (img.width - size) / 2;
  const sy = (img.height - size) / 2;

  const canvas = document.createElement("canvas");
  canvas.width = 300;
  canvas.height = 300;

  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("이미지 처리에 실패했습니다.");

  ctx.drawImage(img, sx, sy, size, size, 0, 0, 300, 300);

  const baseBlob = await canvasToBlob(canvas, 0.92);
  const baseFile = new File([baseBlob], "avatar.jpg", { type: "image/jpeg" });

  const compressed = await imageCompression(baseFile, {
    maxSizeMB: 0.195,
    maxWidthOrHeight: 300,
    useWebWorker: true,
    initialQuality: 0.8,
    fileType: "image/jpeg",
  });

  if (compressed.size > 200 * 1024) {
    throw new Error("프로필 이미지는 200KB 이하로 업로드해주세요.");
  }

  return new File([compressed], "avatar.jpg", { type: "image/jpeg" });
}

export default function MyPageClient({
  initialProfile,
  initialHostedClasses,
  initialAppliedClasses,
  hasPendingProRequest,
}: MyPageClientProps) {
  const router = useRouter();

  const [nickname, setNickname] = useState(initialProfile.nickname);
  const [bio, setBio] = useState(initialProfile.bio ?? "");
  const [region, setRegion] = useState(initialProfile.region ?? "");
  const [kakaoNotificationEnabled, setKakaoNotificationEnabled] = useState(
    initialProfile.kakao_notification_enabled
  );

  const [hostedClasses, setHostedClasses] = useState(initialHostedClasses);
  const [appliedClasses, setAppliedClasses] = useState(initialAppliedClasses);
  const [pendingProRequest, setPendingProRequest] = useState(hasPendingProRequest);

  const [hostedFilter, setHostedFilter] = useState<HostedFilter>("all");

  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreviewUrl, setAvatarPreviewUrl] = useState<string | null>(null);

  const [nicknameStatus, setNicknameStatus] = useState<"idle" | "checking" | "ok" | "taken">("idle");
  const [savingProfile, setSavingProfile] = useState(false);
  const [savingNotification, setSavingNotification] = useState(false);
  const [submittingProRequest, setSubmittingProRequest] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const [runningHostedActionId, setRunningHostedActionId] = useState<string | null>(null);
  const [runningAppliedActionId, setRunningAppliedActionId] = useState<string | null>(null);

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const filteredHostedClasses = useMemo(() => {
    if (hostedFilter === "all") return hostedClasses;
    return hostedClasses.filter((cls) => cls.status === hostedFilter);
  }, [hostedClasses, hostedFilter]);

  async function checkNickname() {
    if (!nickname || nickname.length < 2) {
      setNicknameStatus("idle");
      return true;
    }

    if (nickname === initialProfile.nickname) {
      setNicknameStatus("ok");
      return true;
    }

    setNicknameStatus("checking");
    const supabase = createClient();
    const { data } = await supabase
      .from("profiles")
      .select("id")
      .eq("nickname", nickname)
      .neq("id", initialProfile.id)
      .maybeSingle();

    if (data) {
      setNicknameStatus("taken");
      return false;
    }

    setNicknameStatus("ok");
    return true;
  }

  function moveToSection(sectionId: string) {
    const el = document.getElementById(sectionId);
    if (!el) return;
    el.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function handleAvatarChange(file: File | null) {
    setAvatarFile(file);

    if (avatarPreviewUrl) {
      URL.revokeObjectURL(avatarPreviewUrl);
      setAvatarPreviewUrl(null);
    }

    if (!file) return;
    const preview = URL.createObjectURL(file);
    setAvatarPreviewUrl(preview);
  }

  async function uploadAvatarIfNeeded(userId: string): Promise<string | null> {
    if (!avatarFile) return null;

    const processedFile = await toAvatarFile(avatarFile);
    const supabase = createClient();
    const filePath = `${userId}/avatar-${Date.now()}.jpg`;

    const { error: uploadError } = await supabase.storage
      .from("avatars")
      .upload(filePath, processedFile, {
        contentType: "image/jpeg",
        upsert: true,
      });

    if (uploadError) {
      throw new Error(uploadError.message);
    }

    const { data } = supabase.storage.from("avatars").getPublicUrl(filePath);
    return data.publicUrl;
  }

  async function handleSaveProfile() {
    setError("");
    setSuccess("");

    if (!nickname || nickname.length < 2) {
      setError("닉네임은 2자 이상 입력해주세요.");
      return;
    }

    setSavingProfile(true);

    try {
      const isNicknameOk = await checkNickname();
      if (!isNicknameOk) {
        setError("이미 사용 중인 닉네임입니다.");
        return;
      }

      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        router.push("/login?next=/mypage");
        return;
      }

      const uploadedImageUrl = await uploadAvatarIfNeeded(user.id);

      const updates: {
        nickname: string;
        bio: string;
        region: string;
        profile_image_url?: string;
      } = {
        nickname,
        bio,
        region,
      };

      if (uploadedImageUrl) {
        updates.profile_image_url = uploadedImageUrl;
      }

      const { error: updateError } = await supabase
        .from("profiles")
        .update(updates)
        .eq("id", user.id);

      if (updateError) {
        setError(updateError.message);
        return;
      }

      setSuccess("프로필이 저장되었습니다.");
      setAvatarFile(null);
      setNicknameStatus("idle");
      router.refresh();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "프로필 저장 중 오류가 발생했습니다.");
    } finally {
      setSavingProfile(false);
    }
  }

  async function handleSaveNotificationSetting() {
    setError("");
    setSuccess("");
    setSavingNotification(true);

    try {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        router.push("/login?next=/mypage");
        return;
      }

      const { error: updateError } = await supabase
        .from("profiles")
        .update({ kakao_notification_enabled: kakaoNotificationEnabled })
        .eq("id", user.id);

      if (updateError) {
        setError(updateError.message);
        return;
      }

      setSuccess("알림 설정이 저장되었습니다.");
      router.refresh();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "설정 저장 중 오류가 발생했습니다.");
    } finally {
      setSavingNotification(false);
    }
  }

  async function handleCancelHostedClass(classId: string) {
    const confirmed = confirm(
      "신청자가 있는 경우 취소 처리되고, 없는 경우 즉시 삭제됩니다. 계속할까요?"
    );
    if (!confirmed) return;

    setRunningHostedActionId(classId);
    try {
      const res = await fetch(`/api/classes/${classId}`, { method: "DELETE" });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error ?? "처리 중 오류가 발생했습니다.");
        return;
      }

      if (data.deleted) {
        setHostedClasses((prev) => prev.filter((cls) => cls.id !== classId));
      } else {
        setHostedClasses((prev) =>
          prev.map((cls) =>
            cls.id === classId ? { ...cls, status: "cancelled" } : cls
          )
        );
      }

      setSuccess("요청이 반영되었습니다.");
    } catch {
      setError("처리 중 오류가 발생했습니다.");
    } finally {
      setRunningHostedActionId(null);
    }
  }

  async function handleCancelApplication(applicationId: string) {
    const confirmed = confirm("신청을 취소할까요?");
    if (!confirmed) return;

    setRunningAppliedActionId(applicationId);
    try {
      const res = await fetch(`/api/applications/${applicationId}`, {
        method: "DELETE",
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error ?? "신청 취소에 실패했습니다.");
        return;
      }

      setAppliedClasses((prev) =>
        prev.map((app) =>
          app.id === applicationId ? { ...app, status: "cancelled" } : app
        )
      );
      setSuccess("신청이 취소되었습니다.");
    } catch {
      setError("신청 취소 중 오류가 발생했습니다.");
    } finally {
      setRunningAppliedActionId(null);
    }
  }

  async function handleProRequest() {
    setError("");
    setSuccess("");
    setSubmittingProRequest(true);

    try {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        router.push("/login?next=/mypage");
        return;
      }

      const { error: insertError } = await supabase
        .from("pro_requests")
        .insert({ user_id: user.id, status: "pending" });

      if (insertError) {
        setError(insertError.message);
        return;
      }

      setPendingProRequest(true);
      setSuccess("프로 신청이 접수되었습니다.");
      router.refresh();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "프로 신청 중 오류가 발생했습니다.");
    } finally {
      setSubmittingProRequest(false);
    }
  }

  async function handleLogout() {
    setError("");
    setSuccess("");
    setLoggingOut(true);
    try {
      const supabase = createClient();
      await supabase.auth.signOut();
      router.replace("/");
      router.refresh();
    } catch {
      setError("로그아웃 중 오류가 발생했습니다.");
    } finally {
      setLoggingOut(false);
    }
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-4 pb-24 space-y-5">
      <div className="sticky top-14 z-30 bg-[#f6f8fb] py-2">
        <div className="card p-2 overflow-x-auto">
          <div className="flex gap-2 min-w-max">
            <button type="button" className="chip" onClick={() => moveToSection("profile")}>프로필</button>
            <button type="button" className="chip" onClick={() => moveToSection("hosted")}>내 개설 클래스</button>
            <button type="button" className="chip" onClick={() => moveToSection("applied")}>내 신청 클래스</button>
            <button type="button" className="chip" onClick={() => moveToSection("notification")}>알림 설정</button>
            <button type="button" className="chip" onClick={() => moveToSection("pro-request")}>프로 신청</button>
          </div>
        </div>
      </div>

      {error && <p className="error-text">{error}</p>}
      {success && <p className="text-sm text-green-600">{success}</p>}

      <section id="profile" className="card p-4 space-y-4 scroll-mt-32">
        <h2 className="text-base font-semibold">프로필 편집</h2>

        <div className="flex items-center gap-3">
          <div className="w-16 h-16 rounded-full overflow-hidden bg-gray-100 flex items-center justify-center text-gray-500">
            {avatarPreviewUrl || initialProfile.profile_image_url ? (
              <img
                src={avatarPreviewUrl ?? initialProfile.profile_image_url ?? ""}
                alt="프로필"
                className="w-full h-full object-cover"
              />
            ) : (
              <span className="text-xl">?</span>
            )}
          </div>

          <label className="btn-outline text-sm px-4 py-2 cursor-pointer">
            이미지 선택
            <input
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => handleAvatarChange(e.target.files?.[0] ?? null)}
            />
          </label>
        </div>
        <p className="text-xs text-gray-500">300x300 / 200KB 이하로 저장됩니다.</p>

        <div>
          <label className="field-label">닉네임</label>
          <div className="flex gap-2">
            <input
              type="text"
              className="input-field"
              value={nickname}
              onChange={(e) => {
                setNickname(e.target.value);
                setNicknameStatus("idle");
              }}
            />
            <button type="button" className="btn-outline shrink-0" onClick={checkNickname}>
              확인
            </button>
          </div>
          {nicknameStatus === "checking" && <p className="text-xs mt-1 text-gray-500">확인 중...</p>}
          {nicknameStatus === "ok" && <p className="text-xs mt-1 text-green-600">사용 가능한 닉네임입니다.</p>}
          {nicknameStatus === "taken" && <p className="error-text">이미 사용 중인 닉네임입니다.</p>}
        </div>

        <div>
          <label className="field-label">활동지역</label>
          <select
            className="input-field"
            value={region}
            onChange={(e) => setRegion(e.target.value)}
          >
            <option value="">선택해주세요</option>
            {REGIONS.map((r) => (
              <option key={r} value={r}>
                {r}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="field-label">자기소개</label>
          <textarea
            className="input-field min-h-24"
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            placeholder="간단한 소개를 입력해주세요"
          />
        </div>

        <button type="button" className="btn-primary" onClick={handleSaveProfile} disabled={savingProfile}>
          {savingProfile ? "저장 중..." : "프로필 저장"}
        </button>
      </section>

      <section id="hosted" className="card p-4 space-y-4 scroll-mt-32">
        <h2 className="text-base font-semibold">내가 개설한 클래스</h2>

        <div className="flex gap-2 overflow-x-auto pb-1">
          <button type="button" className={`chip ${hostedFilter === "all" ? "active" : ""}`} onClick={() => setHostedFilter("all")}>
            전체
          </button>
          <button type="button" className={`chip ${hostedFilter === "recruiting" ? "active" : ""}`} onClick={() => setHostedFilter("recruiting")}>
            모집중
          </button>
          <button type="button" className={`chip ${hostedFilter === "closed" ? "active" : ""}`} onClick={() => setHostedFilter("closed")}>
            마감
          </button>
          <button type="button" className={`chip ${hostedFilter === "cancelled" ? "active" : ""}`} onClick={() => setHostedFilter("cancelled")}>
            취소
          </button>
        </div>

        {filteredHostedClasses.length === 0 ? (
          <p className="text-sm text-gray-500">표시할 클래스가 없습니다.</p>
        ) : (
          <div className="space-y-3">
            {filteredHostedClasses.map((cls) => (
              <div key={cls.id} className="border border-gray-100 rounded-xl p-3 bg-white">
                <div className="flex items-center gap-2 mb-2">
                  <span className={`text-xs px-2 py-0.5 rounded-full ${getStatusClass(cls.status)}`}>
                    {CLASS_STATUS_LABELS[cls.status]}
                  </span>
                </div>
                <Link href={`/classes/${cls.id}`} className="font-semibold text-sm text-gray-900 block">
                  {cls.title}
                </Link>
                <p className="text-xs text-gray-500 mt-1">
                  {formatDate(cls.datetime)} · {cls.region}
                </p>
                <div className="flex gap-2 mt-3">
                  <Link href={`/classes/${cls.id}/edit`} className="btn-outline text-sm py-2 flex-1 text-center">
                    수정
                  </Link>
                  <button
                    type="button"
                    className="btn-outline text-sm py-2 flex-1 text-red-500 border-red-200"
                    onClick={() => handleCancelHostedClass(cls.id)}
                    disabled={runningHostedActionId === cls.id}
                  >
                    {runningHostedActionId === cls.id ? "처리 중..." : "취소/삭제"}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      <section id="applied" className="card p-4 space-y-4 scroll-mt-32">
        <h2 className="text-base font-semibold">내가 신청한 클래스</h2>

        {appliedClasses.length === 0 ? (
          <p className="text-sm text-gray-500">신청한 클래스가 없습니다.</p>
        ) : (
          <div className="space-y-3">
            {appliedClasses.map((app) => {
              const canCancel =
                app.class &&
                canCancelByDatetime(app.class.datetime) &&
                (app.status === "pending" || app.status === "approved");

              return (
                <div key={app.id} className="border border-gray-100 rounded-xl p-3 bg-white">
                  <div className="flex items-center gap-2 mb-2">
                    <span
                      className={`text-xs px-2 py-0.5 rounded-full ${getApplicationStatusClass(app.status)}`}
                    >
                      {APPLICATION_STATUS_LABELS[app.status]}
                    </span>
                  </div>

                  {app.class ? (
                    <>
                      <Link href={`/classes/${app.class.id}`} className="font-semibold text-sm text-gray-900 block">
                        {app.class.title}
                      </Link>
                      <p className="text-xs text-gray-500 mt-1">
                        {formatDate(app.class.datetime)} · {app.class.region}
                      </p>
                    </>
                  ) : (
                    <p className="text-sm text-gray-500">삭제된 클래스입니다.</p>
                  )}

                  {canCancel && (
                    <button
                      type="button"
                      className="btn-outline text-sm py-2 w-full mt-3 text-red-500 border-red-200"
                      onClick={() => handleCancelApplication(app.id)}
                      disabled={runningAppliedActionId === app.id}
                    >
                      {runningAppliedActionId === app.id ? "처리 중..." : "신청 취소"}
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </section>

      <section id="notification" className="card p-4 space-y-4 scroll-mt-32">
        <h2 className="text-base font-semibold">알림 설정</h2>

        <label className="flex items-center justify-between gap-3">
          <span className="text-sm text-gray-700">카카오 알림 수신</span>
          <input
            type="checkbox"
            checked={kakaoNotificationEnabled}
            onChange={(e) => setKakaoNotificationEnabled(e.target.checked)}
            className="w-4 h-4"
          />
        </label>

        <button
          type="button"
          className="btn-primary"
          onClick={handleSaveNotificationSetting}
          disabled={savingNotification}
        >
          {savingNotification ? "저장 중..." : "알림 설정 저장"}
        </button>
      </section>

      <section id="pro-request" className="card p-4 space-y-3 scroll-mt-32">
        <h2 className="text-base font-semibold">프로 신청</h2>

        {initialProfile.role === "member" ? (
          pendingProRequest ? (
            <p className="text-sm text-gray-600">프로 신청 검토 중입니다.</p>
          ) : (
            <button
              type="button"
              className="btn-primary"
              onClick={handleProRequest}
              disabled={submittingProRequest}
            >
              {submittingProRequest ? "신청 중..." : "프로 신청하기"}
            </button>
          )
        ) : (
          <p className="text-sm text-gray-600">
            현재 등급은 {initialProfile.role === "pro" ? "프로" : "관리자"}입니다.
          </p>
        )}
      </section>

      <button
        type="button"
        className="btn-outline btn-logout-center text-red-500 border-red-200"
        onClick={handleLogout}
        disabled={loggingOut}
      >
        {loggingOut ? "로그아웃 중..." : "로그아웃"}
      </button>
    </div>
  );
}
