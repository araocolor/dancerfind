import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  // Vercel Cron 인증 확인
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = await createClient();
  const now = new Date();
  const in24h = new Date(now.getTime() + 24 * 60 * 60 * 1000);

  // 24시간 이내 시작하는 클래스 조회
  const { data: classes, error: classError } = await supabase
    .from("classes")
    .select("id")
    .eq("status", "recruiting")
    .gte("datetime", now.toISOString())
    .lte("datetime", in24h.toISOString());

  if (classError) {
    return NextResponse.json({ error: classError.message }, { status: 500 });
  }

  if (!classes || classes.length === 0) {
    return NextResponse.json({ cancelled: 0 });
  }

  const classIds = classes.map((c) => c.id);

  // 해당 클래스들의 pending 신청 조회
  const { data: applications, error: appError } = await supabase
    .from("applications")
    .select("id, applicant_id, class_id")
    .in("class_id", classIds)
    .eq("status", "pending");

  if (appError) {
    return NextResponse.json({ error: appError.message }, { status: 500 });
  }

  if (!applications || applications.length === 0) {
    return NextResponse.json({ cancelled: 0 });
  }

  const applicationIds = applications.map((a) => a.id);

  // pending → cancelled 업데이트
  const { error: updateError } = await supabase
    .from("applications")
    .update({ status: "cancelled" })
    .in("id", applicationIds);

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 });
  }

  // 취소된 신청자들에게 알림 INSERT
  const notifications = applications.map((a) => ({
    user_id: a.applicant_id,
    type: "cancelled",
    message: "신청 마감 D-1로 인해 미승인 신청이 자동 취소되었습니다.",
    link_url: `/classes/${a.class_id}`,
    related_id: a.class_id,
    is_read: false,
  }));

  const { error: notifError } = await supabase
    .from("notifications")
    .insert(notifications);

  if (notifError) {
    return NextResponse.json({ error: notifError.message }, { status: 500 });
  }

  return NextResponse.json({ cancelled: applications.length });
}
