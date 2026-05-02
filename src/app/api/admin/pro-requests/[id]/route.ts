import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

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

  const { data: adminProfile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (adminProfile?.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { action } = (await request.json()) as { action?: "approve" | "reject" };

  if (action !== "approve" && action !== "reject") {
    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  }

  const { data: target } = await supabase
    .from("pro_requests")
    .select("id, user_id, status")
    .eq("id", id)
    .single();

  if (!target) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  if (target.status !== "pending") {
    return NextResponse.json({ error: "Already processed" }, { status: 409 });
  }

  const nextStatus = action === "approve" ? "approved" : "rejected";

  const { error: reqUpdateError } = await supabase
    .from("pro_requests")
    .update({ status: nextStatus })
    .eq("id", id);

  if (reqUpdateError) {
    return NextResponse.json({ error: reqUpdateError.message }, { status: 500 });
  }

  if (action === "approve") {
    const { error: roleUpdateError } = await supabase
      .from("profiles")
      .update({ role: "pro" })
      .eq("id", target.user_id);

    if (roleUpdateError) {
      return NextResponse.json({ error: roleUpdateError.message }, { status: 500 });
    }
  }

  return NextResponse.json({ ok: true, status: nextStatus, user_id: target.user_id });
}
