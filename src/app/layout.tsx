import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "LOCO 라틴세계에 오신걸 환영합니다",
  description: "댄스 클래스를 찾고 개설하는 플랫폼",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko" className="h-full">
      <body className="min-h-full flex flex-col antialiased">{children}</body>
    </html>
  );
}
