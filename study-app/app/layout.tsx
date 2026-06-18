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

export const metadata: Metadata = {
  title: "CCNY Study AI",
  description: "AI-powered study platform built for CCNY students",
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
