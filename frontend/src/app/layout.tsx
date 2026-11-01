import type { Metadata } from "next";
import "./globals.css";
import { Providers } from "@/components/user-provider";

export const metadata: Metadata = { title: "素材制作", description: "素材制作网站" };

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="zh-CN"><body><Providers>{children}</Providers></body></html>;
}
