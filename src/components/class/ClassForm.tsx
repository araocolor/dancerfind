"use client";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { createClient } from "@/lib/supabase/client";
import { GENRES, LEVELS, REGIONS } from "@/lib/constants";
import type { ClassImage, DanceClass } from "@/types/class";

declare global {
  interface Window {
    daum?: {
      Postcode: new (opts: {
        oncomplete: (d: { roadAddress: string; address: string }) => void;
      }) => { open: () => void };
    };
    kakao?: { maps: { services: { Geocoder: new () => { addressSearch: (addr: string, cb: (r: { x: string; y: string }[], s: string) => void) => void } }; LatLng: new (lat: number, lng: number) => unknown; Map: new (el: HTMLElement | null, opts: object) => unknown; Marker: new (opts: object) => unknown; load: (cb: () => void) => void } };
  }
}

interface FormState {
  genres: string[];
  title: string;
  level: string;
  class_type: string;
  type: string;
  datetime: string;
  deadline: string;
  location_address: string;
  location_lat: number | null;
  location_lng: number | null;
  capacity: string;
  price: string;
  price_type: "free" | "paid";
  contact: string;
  description: string;
  region: string;
  is_public: boolean;
}

const EMPTY: FormState = {
  genres: [],
  title: "",
  level: "",
  class_type: "group",
  type: "class",
  datetime: "",
  deadline: "",
  location_address: "",
  location_lat: null,
  location_lng: null,
  capacity: "",
  price: "0",
  price_type: "free",
  contact: "",
  description: "",
  region: "",
  is_public: true,
};

function toFormState(d: Partial<DanceClass>): FormState {
  return {
    genres: d.genres ?? [],
    title: d.title ?? "",
    level: d.level ?? "",
    class_type: d.class_type ?? "group",
    type: d.type ?? "class",
    datetime: d.datetime ? d.datetime.slice(0, 16) : "",
    deadline: d.deadline ? d.deadline.slice(0, 10) : "",
    location_address: d.location_address ?? "",
    location_lat: d.location_lat ?? null,
    location_lng: d.location_lng ?? null,
    capacity: d.capacity?.toString() ?? "",
    price: d.price?.toString() ?? "0",
    price_type: d.price === 0 ? "free" : "paid",
    contact: d.contact ?? "",
    description: d.description ?? "",
    region: d.region ?? "",
    is_public: (d as Record<string, unknown>).is_public !== false,
  };
}

interface ClassFormProps {
  initialData?: Partial<DanceClass>;
  classId?: string;
  userRole: "member" | "pro" | "admin";
}

type SubmitModalState =
  | null
  | { kind: "success"; newClassId: string }
  | { kind: "failure"; message: string };

function toCreateFailureMessage(message: string) {
  if (message.includes("classes_genre_check")) return "장르를 선택해주세요.";
  if (message.includes("violates check constraint")) return "입력한 항목을 다시 확인해주세요.";
  return message;
}

async function loadImage(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new window.Image();
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

async function canvasToWebpFile(
  canvas: HTMLCanvasElement,
  fileName: string,
  quality: number
): Promise<File> {
  const blob = await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (result) => {
        if (!result) {
          reject(new Error("이미지 변환에 실패했습니다."));
          return;
        }
        resolve(result);
      },
      "image/webp",
      quality
    );
  });

  return new File([blob], fileName, { type: "image/webp" });
}

async function resizeImageToWidth(file: File, width: number): Promise<File> {
  const image = await loadImage(file);
  const targetWidth = Math.min(width, image.width);
  const targetHeight = Math.round((image.height * targetWidth) / image.width);

  const canvas = document.createElement("canvas");
  canvas.width = targetWidth;
  canvas.height = targetHeight;

  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("이미지 처리에 실패했습니다.");

  ctx.drawImage(image, 0, 0, targetWidth, targetHeight);

  return canvasToWebpFile(canvas, `${file.name.replace(/\.[^.]+$/, "") || "image"}.webp`, 0.9);
}

export default function ClassForm({ initialData, classId, userRole }: ClassFormProps) {
  const router = useRouter();
  const isCreateMode = !classId;
  const [form, setForm] = useState<FormState>(
    initialData ? toFormState(initialData) : EMPTY
  );
  const [existingImages, setExistingImages] = useState<ClassImage[]>(
    initialData?.images ?? []
  );
  const [deletedImages, setDeletedImages] = useState<ClassImage[]>([]);
  const [newFiles, setNewFiles] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [submitModal, setSubmitModal] = useState<SubmitModalState>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const preResizeRef = useRef<Map<File, Promise<{ icon: File; card: File; full: File }>>>(new Map());
  const genreSelectedRef = useRef(false);
  const [showDetail, setShowDetail] = useState(!!initialData);

  // daum postcode 스크립트 로드
  useEffect(() => {
    if (document.getElementById("daum-postcode")) return;
    const s = document.createElement("script");
    s.id = "daum-postcode";
    s.src = "https://t1.daumcdn.net/mapjsapi/bundle/postcode/prod/postcode.v2.js";
    document.head.appendChild(s);
  }, []);

  function scheduleResize(files: File[]) {
    for (const file of files) {
      if (!preResizeRef.current.has(file)) {
        preResizeRef.current.set(
          file,
          Promise.all([
            resizeImageToWidth(file, 200),
            resizeImageToWidth(file, 600),
            resizeImageToWidth(file, 1024),
          ]).then(([icon, card, full]) => ({ icon, card, full }))
        );
      }
    }
  }

  function set<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
    if (key === "genres" && !genreSelectedRef.current) {
      genreSelectedRef.current = true;
      scheduleResize(newFiles);
    }
  }

  function openAddressSearch() {
    if (!window.daum?.Postcode) {
      alert("주소 검색 서비스를 불러오는 중입니다. 잠시 후 다시 시도하세요.");
      return;
    }
    new window.daum.Postcode({
      oncomplete: (data) => {
        const addr = data.roadAddress || data.address;
        set("location_address", addr);
        set("location_lat", null);
        set("location_lng", null);
        // 카카오맵 API 키가 있으면 좌표 변환
        const key = process.env.NEXT_PUBLIC_KAKAO_MAP_API_KEY;
        if (key && window.kakao?.maps?.services) {
          const gc = new window.kakao.maps.services.Geocoder();
          gc.addressSearch(addr, (result, status) => {
            if (status === "OK" && result[0]) {
              set("location_lat", parseFloat(result[0].y));
              set("location_lng", parseFloat(result[0].x));
            }
          });
        }
      },
    }).open();
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    const remaining = 5 - existingImages.length - newFiles.length;
    const picked = files.slice(0, remaining);
    setNewFiles((p) => [...p, ...picked]);
    setPreviews((p) => [...p, ...picked.map((f) => URL.createObjectURL(f))]);
    if (genreSelectedRef.current) scheduleResize(picked);
    e.target.value = "";
  }

  function removeExisting(i: number) {
    setDeletedImages((p) => [...p, existingImages[i]]);
    setExistingImages((p) => p.filter((_, idx) => idx !== i));
  }

  function removeNew(i: number) {
    preResizeRef.current.delete(newFiles[i]);
    URL.revokeObjectURL(previews[i]);
    setNewFiles((p) => p.filter((_, idx) => idx !== i));
    setPreviews((p) => p.filter((_, idx) => idx !== i));
  }

  async function uploadImages(files: File[], userId: string): Promise<ClassImage[]> {
    const result: ClassImage[] = [];
    const failed: string[] = [];
    const uploadViaApi = async (file: File, path: string) => {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("path", path);
      const res = await fetch("/api/storage/class-images", {
        method: "POST",
        body: fd,
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error ?? "이미지 업로드 중 오류가 발생했습니다.");
      }
      return data.publicUrl as string;
    };

    for (const file of files) {
      const base = `${userId}/${Date.now()}-${Math.random().toString(36).slice(2)}`;
      try {
        const pending = preResizeRef.current.get(file);
        const { icon, card, full } = pending
          ? await pending
          : {
              icon: await resizeImageToWidth(file, 200),
              card: await resizeImageToWidth(file, 600),
              full: await resizeImageToWidth(file, 1024),
            };
        const [iconUrl, cardUrl, fullUrl] = await Promise.all([
          uploadViaApi(icon, `${base}-icon.webp`),
          uploadViaApi(card, `${base}-card.webp`),
          uploadViaApi(full, `${base}-full.webp`),
        ]);
        result.push({
          icon_url: iconUrl,
          card_url: cardUrl,
          full_url: fullUrl,
        });
      } catch (error) {
        failed.push(error instanceof Error ? error.message : "이미지 업로드 중 오류가 발생했습니다.");
      }
    }

    if (failed.length > 0) {
      throw new Error(`이미지 업로드 실패: ${failed[0]}`);
    }

    return result;
  }

  async function handleSubmit(e: React.SyntheticEvent) {
    e.preventDefault();

    const required: (keyof FormState)[] = [
      "title", "level", "region",
    ];
    if (required.some((k) => !form[k]) || form.genres.length === 0) {
      setError("필수 항목을 모두 입력해주세요.");
      return;
    }

    setSubmitting(true);
    setError("");

    try {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("로그인이 필요합니다.");

      // 삭제된 이미지 Storage에서 제거
      if (deletedImages.length > 0) {
        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
        const paths = deletedImages.flatMap((img) =>
          [img.icon_url, img.card_url, img.full_url].map((url) =>
            url.replace(`${supabaseUrl}/storage/v1/object/public/class-images/`, "")
          )
        );
        await fetch("/api/storage/class-images", {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ paths }),
        });
      }

      const uploaded = newFiles.length > 0 ? await uploadImages(newFiles, user.id) : [];
      const images = [...existingImages, ...uploaded];

      const payload = {
        genres: form.genres,
        title: form.title,
        level: form.level,
        class_type: form.class_type,
        type: form.type,
        datetime: form.datetime,
        deadline: form.deadline,
        location_address: form.location_address,
        location_lat: form.location_lat,
        location_lng: form.location_lng,
        capacity: parseInt(form.capacity),
        price: parseInt(form.price) || 0,
        contact: form.contact,
        description: form.description,
        region: form.region,
        is_public: form.is_public,
        images,
      };

      const url = classId ? `/api/classes/${classId}` : "/api/classes";
      const res = await fetch(url, {
        method: classId ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "오류가 발생했습니다.");

      if (isCreateMode) {
        setSubmitModal({ kind: "success", newClassId: data.id as string });
        return;
      }

      router.push(`/classes/${classId}`);
      router.refresh();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "오류가 발생했습니다.";
      if (isCreateMode) {
        setSubmitModal({ kind: "failure", message: toCreateFailureMessage(message) });
      } else {
        setError(message);
      }
    } finally {
      setSubmitting(false);
    }
  }

  const canEvent = userRole === "pro" || userRole === "admin";
  const totalImages = existingImages.length + newFiles.length;

  return (
    <>
      <form onSubmit={handleSubmit} className="max-w-xl mx-auto pb-16 bg-[#f4f4f4] min-h-screen">

        {/* 섹션 1 — 이미지 */}
        <div className="mx-4 mt-3 bg-white rounded-2xl px-4 py-5">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">이미지</p>
          {totalImages > 0 && (
            <div className="flex gap-3 mb-3 flex-wrap justify-center">
              {existingImages.map((img, i) => (
                <div key={`e-${i}`} className="relative">
                  <Image src={img.card_url} alt="" width={100} height={0} style={{ width: 100, height: "auto" }} className="rounded-[10px]" />
                  <button type="button" onClick={() => removeExisting(i)} className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-gray-700 text-white rounded-full text-xs leading-none">×</button>
                </div>
              ))}
              {previews.map((url, i) => (
                <div key={`n-${i}`} className="relative">
                  <img src={url} alt="" style={{ width: 100, height: "auto" }} className="rounded-[10px]" />
                  <button type="button" onClick={() => removeNew(i)} className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-gray-700 text-white rounded-full text-xs leading-none">×</button>
                </div>
              ))}
            </div>
          )}
          <div className="flex justify-center">
            {totalImages < 5 && (
              <button type="button" onClick={() => fileInputRef.current?.click()} className="btn-outline text-sm py-2 px-6 w-auto">
                + 이미지 추가&nbsp;&nbsp;{totalImages}/5
              </button>
            )}
          </div>
          <input ref={fileInputRef} type="file" accept="image/*" multiple onChange={handleFileChange} className="hidden" />
        </div>

        {/* 섹션 2 — 장르 */}
        <div className="mx-4 mt-3 bg-white rounded-2xl px-4 py-5">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">장르 (최대 3개)</p>
          <div className="flex gap-2 flex-wrap">
            {GENRES.map((g) => (
              <button
                key={g.value}
                type="button"
                className={`chip ${form.genres.includes(g.value) ? "active" : ""}`}
                onClick={() => {
                  const exists = form.genres.includes(g.value);
                  const next = exists
                    ? form.genres.filter((v) => v !== g.value)
                    : form.genres.length >= 3
                    ? [...form.genres.slice(1), g.value]
                    : [...form.genres, g.value];
                  set("genres", next);
                }}
              >
                {g.label}
              </button>
            ))}
          </div>
          {canEvent && (
            <div className="flex gap-2 mt-3">
              {(["class", "event"] as const).map((v) => (
                <button key={v} type="button" className={`chip ${form.type === v ? "active" : ""}`} onClick={() => set("type", v)}>
                  {v === "class" ? "클래스" : "이벤트"}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* 섹션 3 — 제목 + 본문 */}
        <div className="mx-4 mt-3 bg-white rounded-2xl px-4 py-5 space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">제목 / 본문</p>
            <div className="flex gap-1">
              {(["오픈", "비공개"] as const).map((v) => {
                const active = v === "오픈" ? form.is_public : !form.is_public;
                return (
                  <button
                    key={v}
                    type="button"
                    onClick={() => set("is_public", v === "오픈")}
                    className={`px-2.5 py-0.5 rounded-full text-xs font-semibold transition-colors ${active ? "bg-black text-white" : "text-gray-400"}`}
                  >
                    {v}
                  </button>
                );
              })}
            </div>
          </div>
          <input
            type="text"
            className="input-field"
            placeholder="클래스 제목을 입력하세요"
            value={form.title}
            onChange={(e) => set("title", e.target.value)}
            maxLength={100}
          />
          <textarea
            className="input-field resize-none"
            placeholder="클래스 상세 내용을 입력하세요"
            value={form.description}
            onChange={(e) => set("description", e.target.value)}
            rows={4}
          />
        </div>

        {/* 섹션 4 — 지역 / 레벨 / 비용 */}
        <div className="mx-4 mt-3 bg-white rounded-2xl px-4 py-5">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">지역 / 레벨 / 비용</p>
          <div className="grid grid-cols-3 gap-2">
            <div>
              <label className="field-label">지역 *</label>
              <select className="input-field" value={form.region} onChange={(e) => set("region", e.target.value)}>
                <option value="">선택</option>
                {REGIONS.map((r) => <option key={r} value={r}>{r}</option>)}
              </select>
            </div>
            <div>
              <label className="field-label">레벨 *</label>
              <select className="input-field" value={form.level} onChange={(e) => set("level", e.target.value)}>
                <option value="">선택</option>
                {LEVELS.map((l) => <option key={l.value} value={l.value}>{l.label}</option>)}
              </select>
            </div>
            <div>
              <label className="field-label">비용 *</label>
              <select className="input-field" value={form.price_type} onChange={(e) => { set("price_type", e.target.value as "free" | "paid"); if (e.target.value === "free") set("price", "0"); }}>
                <option value="free">무료</option>
                <option value="paid">유료</option>
              </select>
            </div>
          </div>
          {form.price_type === "paid" && (
            <div className="mt-3">
              <label className="field-label">수강료 *</label>
              <input type="number" className="input-field" placeholder="금액 입력" value={form.price} onChange={(e) => set("price", e.target.value)} min={0} step={1000} />
            </div>
          )}
        </div>

        {/* 섹션 5+6 — 장소 상세 */}
        <div className="mx-4 mt-3 bg-white rounded-2xl px-4 py-5 space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">상세 정보</p>
            <button
              type="button"
              onClick={() => setShowDetail((v) => !v)}
              className="text-xs text-gray-400 underline"
            >
              {showDetail ? "상세접기" : "상세 정보 입력"}
            </button>
          </div>
          {showDetail && (
            <>
              {/* 일시 */}
              <div>
                <label className="field-label">일시 *</label>
                <input type="datetime-local" className="input-field" value={form.datetime} onChange={(e) => set("datetime", e.target.value)} />
              </div>

              {/* 신청 마감일 */}
              <div>
                <label className="field-label">신청 마감일 *</label>
                <input type="date" className="input-field" value={form.deadline} onChange={(e) => set("deadline", e.target.value)} />
              </div>

              {/* 장소 */}
              <div>
                <label className="field-label">장소 *</label>
                <div className="flex gap-2">
                  <input type="text" className="input-field cursor-pointer" placeholder="주소 검색" value={form.location_address} readOnly onClick={openAddressSearch} />
                  <button type="button" onClick={openAddressSearch} className="flex-shrink-0 px-4 py-3 bg-gray-100 text-gray-700 text-sm font-medium rounded-[12px] whitespace-nowrap">검색</button>
                </div>
              </div>

              {/* 연락처 */}
              <div>
                <label className="field-label">연락처 *</label>
                <input type="tel" className="input-field" placeholder="카카오톡 ID 또는 전화번호" value={form.contact} onChange={(e) => set("contact", e.target.value)} />
              </div>
            </>
          )}
        </div>

        <div className="mx-4 mt-3">
          {error && <p className="error-text mb-3">{error}</p>}
          <button type="submit" className="btn-primary" disabled={submitting}>
            {submitting ? "저장 중..." : classId ? "수정 완료" : "클래스 개설"}
          </button>
        </div>
      </form>

      {submitModal?.kind === "success" && (
        <div className="fixed inset-0 z-[120] bg-black/35 flex items-end sm:items-center justify-center p-4">
          <div className="w-full max-w-sm rounded-2xl bg-white shadow-xl overflow-hidden">
            <div className="px-6 pt-6 pb-5 flex flex-col items-center text-center">
              <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mb-3">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="28"
                  height="28"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="#16a34a"
                  strokeWidth="3"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path className="modal-check-path" d="m5 12 5 5 9-10" />
                </svg>
              </div>
              <p className="text-base font-semibold text-gray-900">클래스 등록이 완료되었습니다.</p>
            </div>
            <div className="grid grid-cols-2 border-t border-gray-200">
              <button
                type="button"
                className="h-12 text-sm font-semibold text-gray-700 border-r border-gray-200"
                onClick={() => {
                  setSubmitModal(null);
                  router.push("/");
                  router.refresh();
                }}
              >
                전체목록
              </button>
              <button
                type="button"
                className="h-12 text-sm font-semibold text-[#111111]"
                onClick={() => {
                  if (submitModal?.kind !== "success") return;
                  const id = submitModal.newClassId;
                  setSubmitModal(null);
                  router.push(`/classes/${id}`);
                  router.refresh();
                }}
              >
                상세확인
              </button>
            </div>
          </div>
        </div>
      )}

      {submitModal?.kind === "failure" && (
        <div className="fixed inset-0 z-[120] bg-black/35 flex items-end sm:items-center justify-center p-4">
          <div className="w-full max-w-sm rounded-2xl bg-white shadow-xl overflow-hidden">
            <div className="px-6 pt-6 pb-5 flex flex-col items-center text-center">
              <div className="w-16 h-16 rounded-full bg-red-100 flex items-center justify-center mb-3">
                <span className="text-red-500 text-2xl font-bold leading-none">!</span>
              </div>
              <p className="text-base font-semibold text-gray-900 mb-1">등록에 실패했습니다.</p>
              <p className="text-sm text-gray-500">{submitModal.message}</p>
            </div>
            <div className="border-t border-gray-200">
              <button
                type="button"
                className="w-full h-12 text-sm font-semibold text-[#111111]"
                onClick={() => {
                  setSubmitModal(null);
                  router.push("/classes/new");
                  router.refresh();
                }}
              >
                만들기 페이지로 이동
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
