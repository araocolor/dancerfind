import MyPageHeader from "@/components/layout/MyPageHeader";

export default function MyPageLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <MyPageHeader />
      {children}
    </>
  );
}
