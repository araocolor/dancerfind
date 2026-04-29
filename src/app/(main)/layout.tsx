export default function MainLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col min-h-screen">
      {/* TODO: Header */}
      <main className="flex-1 pb-16">{children}</main>
      {/* TODO: BottomNav */}
    </div>
  );
}
