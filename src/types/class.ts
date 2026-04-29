export type ClassStatus = "recruiting" | "closed" | "cancelled";
export type ClassType = "group" | "private";
export type DanceGenre = "salsa" | "bachata" | "other";
export type ClassLevel = "beginner" | "intermediate" | "advanced" | "all";

export interface ClassImage {
  icon_url: string;   // 너비 200px
  full_url: string;   // 너비 1034px
}

export interface DanceClass {
  id: string;
  host_id: string;
  title: string;
  genre: DanceGenre;
  level: ClassLevel;
  class_type: ClassType;
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
  created_at: string;
  updated_at: string;
}
