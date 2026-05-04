"use client";

import Image from "next/image";
import { UserCircle } from "lucide-react";

interface Profile {
  id: string;
  nickname: string;
  profile_image_url: string | null;
}

interface Props {
  profile: Profile;
}

export default function MyPageClient({ profile }: Props) {
  return (
    <div className="flex flex-col h-full">
      {/* 상단 30% */}
      <div className="h-[30vh] bg-white flex items-start px-4 pt-5">
        <div className="flex items-center gap-3">
          {profile.profile_image_url ? (
            <Image
              src={profile.profile_image_url}
              alt="프로필"
              width={40}
              height={40}
              className="rounded-full object-cover"
            />
          ) : (
            <UserCircle size={40} className="text-gray-400" />
          )}
          <span className="text-[15px] font-semibold text-[#333333]">
            {profile.nickname}
          </span>
        </div>
      </div>

      {/* 하단 70% */}
      <div className="flex-1 bg-gray-50" />
    </div>
  );
}
