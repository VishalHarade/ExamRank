import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { ThemeProvider } from "@/components/ThemeProvider";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "ExamRank — College Coding Examination Portal",
  description:
    "HackerRank-grade online programming exam system for colleges. Features Monaco editor, anti-cheat tab monitoring, server-authoritative timer, local judge, and MySQL-backed analytics.",
  keywords: ["college exam", "coding exam", "online programming test", "anti-cheat", "judge"],
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-[#070b12] text-slate-100">
        <ThemeProvider>{children}</ThemeProvider>
      </body>
    </html>
  );
}
