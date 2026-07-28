import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "求职工作台",
  description: "Local First AI 求职工作台",
  icons: { icon: "/favicon.svg", shortcut: "/favicon.svg" },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="zh-CN">
      <body>{children}</body>
    </html>
  );
}
