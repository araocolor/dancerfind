import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import ClassForm from "@/components/class/ClassForm";

export default async function ClassNewPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login?next=/classes/new");

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  const role = (profile?.role as "member" | "pro" | "admin") ?? "member";

  return (
    <div>
      <div className="sticky top-14 z-30 bg-white border-b border-[#e5e7eb] px-4 h-12 flex items-center">
        <h1 className="font-semibold text-base">클래스 개설</h1>
      </div>
      <ClassForm userRole={role} />
    </div>
  );
}
