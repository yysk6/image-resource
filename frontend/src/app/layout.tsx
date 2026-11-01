import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = { title: "素材制作", description: "素材制作网站" };

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="zh-CN"><body>{children}</body></html>;
}
