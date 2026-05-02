import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { sendKakaoAlimtalk } from "@/lib/kakao/notify";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: existing } = await supabase
    .from("classes")
    .select("host_id")
    .eq("id", id)
    .single();

  if (!existing || existing.host_id !== user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await request.json();

  const { data, error } = await supabase
    .from("classes")
    .update({ ...body, is_modified: true })
    .eq("id", id)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // 승인된 신청자들에게 수정 알림
  const { data: approved } = await supabase
    .from("applications")
    .select("applicant_id")
    .eq("class_id", id)
    .eq("status", "approved");

  if (approved && approved.length > 0) {
    const message = `신청한 클래스 "${data.title}"의 내용이 수정되었습니다.`;
    const linkUrl = `/classes/${id}`;

    await supabase.from("notifications").insert(
      approved.map((a) => ({
        user_id: a.applicant_id,
        type: "modified",
        message,
        link_url: linkUrl,
        related_id: id,
      }))
    );

    await sendKakaoAlimtalk({
      event: "modified",
      recipients: approved.map((a) => a.applicant_id),
      message,
      linkUrl,
    });
  }

  return NextResponse.json(data);
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: cls } = await supabase
    .from("classes")
    .select("host_id, title")
    .eq("id", id)
    .single();

  if (!cls || cls.host_id !== user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // 신청자 수 확인
  const { data: applications } = await supabase
    .from("applications")
    .select("applicant_id, status")
    .eq("class_id", id)
    .neq("status", "cancelled");

  if (!applications || applications.length === 0) {
    // 신청자 없으면 즉시 삭제
    await supabase.from("classes").delete().eq("id", id);
    return NextResponse.json({ deleted: true });
  }

  // 신청자 있으면 취소 처리
  await supabase
    .from("classes")
    .update({ status: "cancelled" })
    .eq("id", id);

  // 승인된 신청자에게 취소 알림
  const approved = applications.filter((a) => a.status === "approved");
  if (approved.length > 0) {
    const message = `신청한 클래스 "${cls.title}"이 취소되었습니다.`;
    const linkUrl = `/classes/${id}`;

    await supabase.from("notifications").insert(
      approved.map((a) => ({
        user_id: a.applicant_id,
        type: "cancelled",
        message,
        link_url: linkUrl,
        related_id: id,
      }))
    );

    await sendKakaoAlimtalk({
      event: "cancelled",
      recipients: approved.map((a) => a.applicant_id),
      message,
      linkUrl,
    });
  }

  return NextResponse.json({ cancelled: true });
}
