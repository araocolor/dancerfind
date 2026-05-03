"use client";

import { useEffect, useState } from "react";

export default function CachedClassCardImage() {
  const [cardUrl, setCardUrl] = useState<string | null>(null);

  useEffect(() => {
    try {
      const cached = window.sessionStorage.getItem("cached_class_card_url");
      setCardUrl(cached);
    } catch {
      setCardUrl(null);
    }
  }, []);

  if (!cardUrl) return null;

  return (
    <img
      src={cardUrl}
      alt="클래스 이미지"
      loading="eager"
      className="w-full h-auto max-h-[70vh] object-contain bg-black/5"
    />
  );
}
