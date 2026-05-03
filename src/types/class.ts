export type ClassStatus = "recruiting" | "closed" | "cancelled";
export type ClassType = "group" | "private";
export type ContentType = "class" | "event";
export type DanceGenre = "salsa" | "bachata" | "festival" | "event" | "other";
export type ClassLevel = "beginner" | "elementary" | "intermediate" | "advanced" | "all";

export const DANCE_GENRE_LABELS: Record<DanceGenre, string> = {
  salsa: "살사",
  bachata: "바차타",
  festival: "페스티벌",
  event: "이벤트",
  other: "기타",
};

export const CLASS_LEVEL_LABELS: Record<ClassLevel, string> = {
  beginner: "입문",
  elementary: "초급",
  intermediate: "중급",
  advanced: "고급",
  all: "올레벨",
};

export interface ClassImage {
  icon_url: string;  // 너비 200px
  card_url: string;  // 너비 480px
  full_url: string;  // 너비 1024px
}

export interface DanceClass {
  id: string;
  host_id: string;
  title: string;
  genre: DanceGenre;
  level: ClassLevel;
  class_type: ClassType;
  type: ContentType;
  status: ClassStatus;
  description: string;
  datetime: string;
  deadline: string;
  location_address: string;
  location_lat: number | null;
  location_lng: number | null;
  capacity: number;
  contact: string;
  price: number;
  images: ClassImage[];
  region: string;
  is_modified: boolean;
  view_count: number;
  created_at: string;
  updated_at: string;
}
