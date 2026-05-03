"use client";

import { useEffect, useMemo, useState } from "react";

type GalleryImage = {
  card_url?: string;
  full_url?: string;
};

interface ClassDetailImageGalleryProps {
  images: GalleryImage[];
}

export default function ClassDetailImageGallery({ images }: ClassDetailImageGalleryProps) {
  const [readyForFull, setReadyForFull] = useState(false);
  const [loadedFullMap, setLoadedFullMap] = useState<Record<string, boolean>>({});

  const imageKeys = useMemo(
    () => images.map((img, index) => `${index}-${img.full_url ?? img.card_url ?? "image"}`),
    [images]
  );

  useEffect(() => {
    if (document.readyState === "complete") {
      setReadyForFull(true);
      return;
    }

    const onLoad = () => setReadyForFull(true);
    window.addEventListener("load", onLoad, { once: true });
    return () => window.removeEventListener("load", onLoad);
  }, []);

  useEffect(() => {
    if (!readyForFull) return;

    const preloaders: HTMLImageElement[] = [];

    images.forEach((img, index) => {
      const fullUrl = img.full_url;
      if (!fullUrl) return;

      const key = imageKeys[index];
      if (loadedFullMap[key]) return;

      const preloader = new window.Image();
      preloader.onload = () => {
        setLoadedFullMap((prev) => ({ ...prev, [key]: true }));
      };
      preloader.src = fullUrl;
      preloaders.push(preloader);
    });

    return () => {
      preloaders.forEach((item) => {
        item.onload = null;
      });
    };
  }, [images, imageKeys, loadedFullMap, readyForFull]);

  return (
    <div className="flex overflow-x-auto snap-x snap-mandatory">
      {images.map((img, i) => {
        const key = imageKeys[i];
        const showFull = readyForFull && !!img.full_url && !!loadedFullMap[key];
        const src = showFull ? img.full_url : (img.card_url ?? img.full_url ?? "");

        return (
          <div key={key} className="flex-shrink-0 w-full snap-start">
            <img
              src={src}
              alt={`클래스 이미지 ${i + 1}`}
              loading="eager"
              decoding="async"
              style={{ width: "100%", height: "auto", maxHeight: "70vh", objectFit: "contain" }}
              className="bg-black/5"
            />
          </div>
        );
      })}
    </div>
  );
}
