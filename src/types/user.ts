export type UserRole = "member" | "pro" | "admin";

export interface User {
  id: string;
  email: string;
  name: string;
  nickname: string;
  role: UserRole;
  profile_image_url: string | null;
  phone: string | null;
  kakao_id: string | null;
  bio: string | null;
  region: string | null;
  created_at: string;
}
