import { createClient } from "@/lib/supabase/server";
import BottomNav from "@/components/layout/BottomNav";
import SearchSheet from "@/components/features/SearchSheet";

export default async function MainLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <div className="flex flex-col min-h-screen">
      <main className="flex-1 pb-16">{children}</main>
      <SearchSheet />
      <BottomNav isLoggedIn={!!user} />
    </div>
  );
}
