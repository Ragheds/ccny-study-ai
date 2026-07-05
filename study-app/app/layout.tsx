import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import Navbar from "@/components/Navbar";
import { SupabaseAccountBridge } from "@/components/SupabaseAccountBridge";
import { ThemeProvider } from "@/components/ThemeProvider";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://ccny-study-ai.vercel.app";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "CCNY Study AI",
    template: "%s · CCNY Study AI",
  },
  description:
    "AI-powered study platform built for CCNY students — course-aware tutoring, flashcards, quizzes, and notes for every major at The City College of New York.",
  applicationName: "CCNY Study AI",
  keywords: [
    "CCNY",
    "City College of New York",
    "study app",
    "AI tutor",
    "flashcards",
    "college study tools",
  ],
  openGraph: {
    title: "CCNY Study AI",
    description: "Turn your CCNY courses into tutoring, flashcards, quizzes, and more.",
    url: SITE_URL,
    siteName: "CCNY Study AI",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "CCNY Study AI",
    description: "Turn your CCNY courses into tutoring, flashcards, quizzes, and more.",
  },
};

export const viewport = {
  themeColor: "#111827",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} bg-[var(--app-bg)] text-[var(--app-text)] antialiased`}
      >
        <ThemeProvider>
          <SupabaseAccountBridge />
          <Navbar />
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}