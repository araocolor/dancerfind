import MessagesHeader from "@/components/layout/MessagesHeader";

export default function MessagesLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <MessagesHeader />
      {children}
    </>
  );
}
