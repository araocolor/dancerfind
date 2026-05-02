import { createClient } from "@/lib/supabase/server";
import Header from "@/components/layout/Header";
import BottomNav from "@/components/layout/BottomNav";

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
      <Header />
      <main className="flex-1 pb-16">{children}</main>
      <BottomNav isLoggedIn={!!user} />
    </div>
  );
}
