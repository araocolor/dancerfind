"use client";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import imageCompression from "browser-image-compression";
import { createClient } from "@/lib/supabase/client";
import { GENRES, LEVELS, CLASS_TYPES, REGIONS } from "@/lib/constants";
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
  genre: string;
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
  contact: string;
  description: string;
  region: string;
}

const EMPTY: FormState = {
  genre: "",
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
  contact: "",
  description: "",
  region: "",
};

function toFormState(d: Partial<DanceClass>): FormState {
  return {
    genre: d.genre ?? "",
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
    contact: d.contact ?? "",
    description: d.description ?? "",
    region: d.region ?? "",
  };
}

interface ClassFormProps {
  initialData?: Partial<DanceClass>;
  classId?: string;
  userRole: "member" | "pro" | "admin";
}

export default function ClassForm({ initialData, classId, userRole }: ClassFormProps) {
  const router = useRouter();
  const [form, setForm] = useState<FormState>(
    initialData ? toFormState(initialData) : EMPTY
  );
  const [existingImages, setExistingImages] = useState<ClassImage[]>(
    initialData?.images ?? []
  );
  const [newFiles, setNewFiles] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  // daum postcode 스크립트 로드
  useEffect(() => {
    if (document.getElementById("daum-postcode")) return;
    const s = document.createElement("script");
    s.id = "daum-postcode";
    s.src = "https://t1.daumcdn.net/mapjsapi/bundle/postcode/prod/postcode.v2.js";
    document.head.appendChild(s);
  }, []);

  function set<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
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
    e.target.value = "";
  }

  function removeExisting(i: number) {
    setExistingImages((p) => p.filter((_, idx) => idx !== i));
  }

  function removeNew(i: number) {
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
        const [icon, card, full] = await Promise.all([
          imageCompression(file, { maxWidthOrHeight: 200, useWebWorker: true }),
          imageCompression(file, { maxWidthOrHeight: 480, useWebWorker: true }),
          imageCompression(file, { maxWidthOrHeight: 1034, useWebWorker: true }),
        ]);
        const [iconUrl, cardUrl, fullUrl] = await Promise.all([
          uploadViaApi(icon as File, `${base}-icon.jpg`),
          uploadViaApi(card as File, `${base}-card.jpg`),
          uploadViaApi(full as File, `${base}-full.jpg`),
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

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    const required: (keyof FormState)[] = [
      "genre", "title", "level", "datetime", "deadline",
      "location_address", "capacity", "contact", "region",
    ];
    if (required.some((k) => !form[k])) {
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

      const uploaded = newFiles.length > 0 ? await uploadImages(newFiles, user.id) : [];
      const images = [...existingImages, ...uploaded];

      const payload = {
        genre: form.genre,
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

      router.push(`/classes/${classId ?? data.id}`);
      router.refresh();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "오류가 발생했습니다.");
    } finally {
      setSubmitting(false);
    }
  }

  const canEvent = userRole === "pro" || userRole === "admin";
  const totalImages = existingImages.length + newFiles.length;

  return (
    <form onSubmit={handleSubmit} className="px-4 py-6 max-w-xl mx-auto space-y-5 pb-10">
      {/* 장르 */}
      <div>
        <label className="field-label">장르 *</label>
        <div className="flex gap-2 flex-wrap">
          {GENRES.map((g) => (
            <button
              key={g.value}
              type="button"
              className={`chip ${form.genre === g.value ? "active" : ""}`}
              onClick={() => set("genre", g.value)}
            >
              {g.label}
            </button>
          ))}
        </div>
      </div>

      {/* 제목 */}
      <div>
        <label className="field-label">제목 *</label>
        <input
          type="text"
          className="input-field"
          placeholder="클래스 제목을 입력하세요"
          value={form.title}
          onChange={(e) => set("title", e.target.value)}
          maxLength={100}
        />
      </div>

      {/* 레벨 */}
      <div>
        <label className="field-label">레벨 *</label>
        <div className="flex gap-2 flex-wrap">
          {LEVELS.map((l) => (
            <button
              key={l.value}
              type="button"
              className={`chip ${form.level === l.value ? "active" : ""}`}
              onClick={() => set("level", l.value)}
            >
              {l.label}
            </button>
          ))}
        </div>
      </div>

      {/* 클래스 구분 */}
      <div>
        <label className="field-label">구분 *</label>
        <div className="flex gap-2">
          {CLASS_TYPES.map((t) => (
            <button
              key={t.value}
              type="button"
              className={`chip ${form.class_type === t.value ? "active" : ""}`}
              onClick={() => set("class_type", t.value)}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* 종류 (pro/admin만) */}
      {canEvent && (
        <div>
          <label className="field-label">종류</label>
          <div className="flex gap-2">
            {(["class", "event"] as const).map((v) => (
              <button
                key={v}
                type="button"
                className={`chip ${form.type === v ? "active" : ""}`}
                onClick={() => set("type", v)}
              >
                {v === "class" ? "클래스" : "이벤트"}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* 일시 */}
      <div>
        <label className="field-label">일시 *</label>
        <input
          type="datetime-local"
          className="input-field"
          value={form.datetime}
          onChange={(e) => set("datetime", e.target.value)}
        />
      </div>

      {/* 신청 마감일 */}
      <div>
        <label className="field-label">신청 마감일 *</label>
        <input
          type="date"
          className="input-field"
          value={form.deadline}
          onChange={(e) => set("deadline", e.target.value)}
        />
      </div>

      {/* 지역 */}
      <div>
        <label className="field-label">지역 *</label>
        <select
          className="input-field"
          value={form.region}
          onChange={(e) => set("region", e.target.value)}
        >
          <option value="">선택하세요</option>
          {REGIONS.map((r) => (
            <option key={r} value={r}>
              {r}
            </option>
          ))}
        </select>
      </div>

      {/* 장소 */}
      <div>
        <label className="field-label">장소 *</label>
        <div className="flex gap-2">
          <input
            type="text"
            className="input-field cursor-pointer"
            placeholder="주소 검색"
            value={form.location_address}
            readOnly
            onClick={openAddressSearch}
          />
          <button
            type="button"
            onClick={openAddressSearch}
            className="flex-shrink-0 px-4 py-3 bg-gray-100 text-gray-700 text-sm font-medium rounded-[12px] whitespace-nowrap"
          >
            검색
          </button>
        </div>
      </div>

      {/* 정원 */}
      <div>
        <label className="field-label">정원 *</label>
        <input
          type="number"
          className="input-field"
          placeholder="최대 인원 수"
          value={form.capacity}
          onChange={(e) => set("capacity", e.target.value)}
          min={1}
        />
      </div>

      {/* 수강료 */}
      <div>
        <label className="field-label">수강료 (0 = 무료)</label>
        <input
          type="number"
          className="input-field"
          placeholder="0"
          value={form.price}
          onChange={(e) => set("price", e.target.value)}
          min={0}
          step={1000}
        />
      </div>

      {/* 연락처 */}
      <div>
        <label className="field-label">연락처 *</label>
        <input
          type="tel"
          className="input-field"
          placeholder="카카오톡 ID 또는 전화번호"
          value={form.contact}
          onChange={(e) => set("contact", e.target.value)}
        />
      </div>

      {/* 설명 */}
      <div>
        <label className="field-label">설명</label>
        <textarea
          className="input-field resize-none"
          placeholder="클래스 상세 내용을 입력하세요"
          value={form.description}
          onChange={(e) => set("description", e.target.value)}
          rows={5}
        />
      </div>

      {/* 이미지 */}
      <div>
        <label className="field-label">이미지 (최대 5장)</label>
        {totalImages > 0 && (
          <div className="flex gap-2 mb-3 flex-wrap">
            {existingImages.map((img, i) => (
              <div key={`e-${i}`} className="relative">
                <Image
                  src={img.card_url}
                  alt=""
                  width={80}
                  height={80}
                  className="object-cover rounded-[10px]"
                />
                <button
                  type="button"
                  onClick={() => removeExisting(i)}
                  className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-gray-700 text-white rounded-full text-xs leading-none"
                >
                  ×
                </button>
              </div>
            ))}
            {previews.map((url, i) => (
              <div key={`n-${i}`} className="relative">
                <img
                  src={url}
                  alt=""
                  className="w-20 h-20 object-cover rounded-[10px]"
                />
                <button
                  type="button"
                  onClick={() => removeNew(i)}
                  className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-gray-700 text-white rounded-full text-xs leading-none"
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        )}
        {totalImages < 5 && (
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="btn-outline text-sm py-2 px-6 w-auto"
          >
            + 이미지 추가
          </button>
        )}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          multiple
          onChange={handleFileChange}
          className="hidden"
        />
        <p className="text-xs text-gray-400 mt-1">{totalImages}/5</p>
      </div>

      {error && <p className="error-text">{error}</p>}

      <button type="submit" className="btn-primary" disabled={submitting}>
        {submitting ? "저장 중..." : classId ? "수정 완료" : "클래스 개설"}
      </button>
    </form>
  );
}
