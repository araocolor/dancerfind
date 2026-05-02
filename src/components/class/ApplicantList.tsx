"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

interface Applicant {
  id: string;
  status: "pending" | "approved" | "cancelled";
  created_at: string;
  applicant: {
    id: string;
    nickname: string;
    profile_image_url: string | null;
  };
}

interface ApplicantListProps {
  classId: string;
  initialApplicants: Applicant[];
}

const STATUS_LABEL = {
  pending: "대기",
  approved: "승인",
  cancelled: "취소",
};

export default function ApplicantList({ classId, initialApplicants }: ApplicantListProps) {
  const router = useRouter();
  const [applicants, setApplicants] = useState(initialApplicants);
  const [loadingId, setLoadingId] = useState<string | null>(null);

  void classId;

  async function handleApprove(applicationId: string) {
    setLoadingId(applicationId);
    try {
      const res = await fetch(`/api/applications/${applicationId}`, {
        method: "PATCH",
      });
      if (res.ok) {
        setApplicants((prev) =>
          prev.map((a) =>
            a.id === applicationId ? { ...a, status: "approved" } : a
          )
        );
        router.refresh();
      } else {
        alert("승인에 실패했습니다.");
      }
    } finally {
      setLoadingId(null);
    }
  }

  const visible = applicants.filter((a) => a.status !== "cancelled");

  if (visible.length === 0) {
    return (
      <p className="text-sm text-gray-400 py-4">아직 신청자가 없습니다.</p>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {visible.map((a) => (
        <div key={a.id} className="flex items-center gap-3">
          {a.applicant.profile_image_url ? (
            <img
              src={a.applicant.profile_image_url}
              alt={a.applicant.nickname}
              className="w-9 h-9 rounded-full object-cover"
            />
          ) : (
            <div className="w-9 h-9 rounded-full bg-gray-100 flex items-center justify-center text-sm font-medium text-gray-500">
              {a.applicant.nickname[0]}
            </div>
          )}
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-gray-900">
              {a.applicant.nickname}
            </p>
            <p className="text-xs text-gray-400">
              {new Date(a.created_at).toLocaleDateString("ko-KR")}
            </p>
          </div>
          <span
            className={`text-xs font-medium px-2 py-1 rounded-full ${
              a.status === "approved"
                ? "bg-green-50 text-green-600"
                : "bg-gray-100 text-gray-600"
            }`}
          >
            {STATUS_LABEL[a.status]}
          </span>
          {a.status === "pending" && (
            <button
              type="button"
              onClick={() => handleApprove(a.id)}
              disabled={loadingId === a.id}
              className="text-xs font-medium px-3 py-1.5 bg-[#FEE500] rounded-full text-gray-900 disabled:opacity-50"
            >
              {loadingId === a.id ? "..." : "승인"}
            </button>
          )}
        </div>
      ))}
    </div>
  );
}
