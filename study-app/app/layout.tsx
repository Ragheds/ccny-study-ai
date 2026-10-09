import { AccountServices } from "@/components/AccountServices";
import type { Metadata } from "next";
import { Inter, Lora, Geist_Mono } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/components/ThemeProvider";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

const lora = Lora({
  variable: "--font-voice",
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
        className={`${inter.variable} ${lora.variable} ${geistMono.variable} bg-[var(--app-bg)] text-[var(--app-text)] antialiased`}
      >
        <ThemeProvider>
          <AccountServices />{children}
        </ThemeProvider>
      </body>
    </html>
  );
}