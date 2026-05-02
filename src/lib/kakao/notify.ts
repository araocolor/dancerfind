export type KakaoNotifyEvent = "application" | "approved" | "modified" | "cancelled";

interface KakaoNotifyPayload {
  event: KakaoNotifyEvent;
  recipients: string[];
  message: string;
  linkUrl: string;
}

export async function sendKakaoAlimtalk(payload: KakaoNotifyPayload) {
  void payload;
  const enabled = process.env.KAKAO_ALIMTALK_ENABLED === "true";

  // MVP: OFF 상태에서는 웹 알림만 사용
  if (!enabled) {
    return { skipped: true as const, reason: "feature_flag_off" as const };
  }

  // ON 상태 연동은 카카오 채널 준비 후 추가
  return { skipped: true as const, reason: "provider_not_configured" as const };
}
