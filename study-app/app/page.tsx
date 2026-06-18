"use client";

import Link from "next/link";
import { useEffect, useState, type CSSProperties } from "react";
import { useHydrated, useStoredValue } from "@/hooks/useStoredValue";
import { AccountProfile } from "@/lib/account";
import { KEYS } from "@/lib/storage";

const STARS = [
  { left: 4, top: 20, size: 2, delay: "0s", duration: "4.6s" },
  { left: 8, top: 74, size: 1, delay: "1.8s", duration: "5.8s" },
  { left: 12, top: 48, size: 2, delay: "1.2s", duration: "5.2s" },
  { left: 16, top: 12, size: 1, delay: "2.9s", duration: "6.2s" },
  { left: 22, top: 36, size: 2, delay: "2.1s", duration: "4.8s" },
  { left: 27, top: 83, size: 1, delay: "3.1s", duration: "5.5s" },
  { left: 32, top: 17, size: 2, delay: "0.7s", duration: "5.6s" },
  { left: 38, top: 68, size: 2, delay: "1.7s", duration: "4.9s" },
  { left: 43, top: 7, size: 1, delay: "4.1s", duration: "6.4s" },
  { left: 47, top: 31, size: 3, delay: "0.4s", duration: "5.8s" },
  { left: 52, top: 88, size: 2, delay: "2.8s", duration: "4.7s" },
  { left: 57, top: 16, size: 2, delay: "1.1s", duration: "6s" },
  { left: 61, top: 55, size: 1, delay: "3.6s", duration: "5.1s" },
  { left: 66, top: 43, size: 2, delay: "0.2s", duration: "4.4s" },
  { left: 70, top: 23, size: 2, delay: "2.2s", duration: "5.4s" },
  { left: 74, top: 92, size: 1, delay: "4.8s", duration: "6.1s" },
  { left: 79, top: 64, size: 3, delay: "1.5s", duration: "5.1s" },
  { left: 84, top: 79, size: 1, delay: "5.7s", duration: "6.3s" },
  { left: 88, top: 32, size: 2, delay: "0.9s", duration: "4.5s" },
  { left: 92, top: 9, size: 1, delay: "3.9s", duration: "5.6s" },
  { left: 95, top: 52, size: 2, delay: "2.5s", duration: "5.7s" },
  { left: 98, top: 24, size: 1, delay: "4.7s", duration: "5.4s" },
];

const INPUT_TILES = [
  { label: "PDF", className: "home-source-card-a" },
  { label: "DOC", className: "home-source-card-b" },
  { label: "TXT", className: "home-source-card-c" },
  { label: "AUDIO", className: "home-source-card-d" },
  { label: "NOTES", className: "home-source-card-e" },
];

const HOW_IT_WORKS = [
  {
    title: "Choose your CCNY context",
    desc: "Pick your major and saved courses so every tool understands what you are studying.",
    icon: "CC",
  },
  {
    title: "Add notes or ask a question",
    desc: "Upload material, paste lecture notes, or type the exact unit you want to review.",
    icon: "01",
  },
  {
    title: "Generate study tools",
    desc: "Create course-aware tutor answers, flashcards, quizzes, and study summaries.",
    icon: "AI",
  },
  {
    title: "Return to your dashboard",
    desc: "Your courses, chats, flashcards, notes, and progress stay organized in one workspace.",
    icon: "04",
  },
];

const FOOTER_LINKS = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/notes", label: "Notes" },
  { href: "/progress", label: "Progress" },
  { href: "https://github.com/Ragheds/ccny-study-ai", label: "GitHub" },
];

export default function Home() {
  const hydrated = useHydrated();
  const [account] = useStoredValue<AccountProfile | null>(KEYS.ACCOUNT, null);
  const isSignedIn = hydrated && Boolean(account);
  const primaryHref = isSignedIn ? "/dashboard" : "/login";
  const primaryLabel = isSignedIn ? "Dashboard" : "Get Started - It's Free";
  const [assistantShift, setAssistantShift] = useState(0);

  useEffect(() => {
    const updateShift = () => {
      const nextShift = Math.min(44, Math.max(-10, window.scrollY * 0.08 - 6));
      setAssistantShift(nextShift);
    };

    updateShift();
    window.addEventListener("scroll", updateShift, { passive: true });

    return () => window.removeEventListener("scroll", updateShift);
  }, []);

  return (
    <main className="home-landing relative min-h-screen overflow-hidden bg-[#030405] text-white">
      <div className="home-space-bg" aria-hidden="true" />
      <div className="home-star-field" aria-hidden="true">
        {STARS.map((star) => (
          <span
            key={`${star.left}-${star.top}`}
            className="home-star"
            style={{
              left: `${star.left}%`,
              top: `${star.top}%`,
              width: `${star.size}px`,
              height: `${star.size}px`,
              animationDelay: star.delay,
              animationDuration: star.duration,
            }}
          />
        ))}
      </div>

      <section className="relative z-10 mx-auto flex min-h-screen max-w-7xl flex-col px-6 pb-14 pt-28 sm:pt-36">
        <div className="mx-auto max-w-5xl text-center">
          <p className="mx-auto mb-6 inline-flex items-center gap-2 rounded-full border border-[#7c4dff]/45 bg-[#180f2f]/80 px-3 py-2.5 text-[11px] font-semibold text-white shadow-[0_0_42px_rgba(124,77,255,0.22)] backdrop-blur sm:mb-8 sm:gap-3 sm:px-5 sm:py-3 sm:text-sm">
            <span className="home-pulse-dot" />
            <span className="whitespace-nowrap">Course-aware for CCNY students</span>
            <span className="text-[#c7a7ff]">→</span>
          </p>

          <h1 className="mx-auto max-w-5xl text-[2.8rem] font-extrabold leading-[1.02] tracking-normal text-white min-[430px]:text-[3.2rem] sm:text-6xl lg:text-[5rem]">
            Meet CCNY Study AI
          </h1>

          <p className="mx-auto mt-6 max-w-3xl text-xl font-semibold leading-8 text-white/[0.7] sm:mt-8 sm:text-3xl sm:leading-tight">
            Turn your courses into tutoring, flashcards, quizzes, and more.
          </p>

          <div className="mt-8 flex flex-col items-center justify-center gap-4 sm:mt-10 sm:flex-row">
            <Link
              href={primaryHref}
              className="w-full max-w-[17rem] rounded-[1.35rem] bg-[#6f2cff] px-7 py-3.5 text-center text-base font-black text-white shadow-[0_18px_70px_rgba(111,44,255,0.42)] transition hover:bg-[#7c3cff] sm:w-auto sm:px-8 sm:py-4 sm:text-lg"
            >
              {primaryLabel}
            </Link>
          </div>
        </div>

        <div className="home-assistant-copy mx-auto mt-16 max-w-4xl text-center text-2xl font-extrabold leading-tight text-white sm:mt-20 sm:text-4xl">
          <p>Ask questions, review notes, and study like a</p>
          <span
            className="home-moving-highlight"
            style={{ "--home-assistant-shift": `${assistantShift}px` } as CSSProperties}
          >
            real assistant.
            <span className="home-type-cursor" />
          </span>
        </div>

        <div id="features" className="home-showcase-card mt-16 rounded-[2rem] border border-[#372d63] bg-[#080914]/78 p-6 shadow-[0_34px_140px_rgba(70,36,180,0.32)] backdrop-blur-xl sm:p-8">
          <div className="mb-10">
            <h2 className="text-3xl font-black tracking-normal text-white">
              Turn class material into study tools.
            </h2>
            <p className="mt-4 max-w-2xl text-lg leading-8 text-white/[0.62]">
              Transform PDFs, notes, and course questions into tutoring, flashcards,
              quizzes, and study plans built around your CCNY course context.
            </p>
          </div>

          <div className="grid min-h-[340px] items-center gap-8 lg:grid-cols-[1fr_220px_1fr]">
            <div className="home-source-orbit relative mx-auto h-64 w-full max-w-sm">
              {INPUT_TILES.map((tile) => (
                <div
                  key={tile.label}
                  className={`home-source-card absolute flex h-20 w-20 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.07] text-sm font-black text-white shadow-[0_18px_60px_rgba(0,0,0,0.42)] backdrop-blur ${tile.className}`}
                >
                  {tile.label}
                </div>
              ))}
            </div>

            <div className="home-process-line relative mx-auto flex h-32 w-full max-w-sm items-center justify-center">
              <span className="home-process-ray" />
              <span className="relative z-10 rounded-full border border-white/10 bg-white/[0.12] px-5 py-3 text-sm font-bold text-white shadow-[0_0_34px_rgba(124,77,255,0.34)] backdrop-blur">
                Generating...
              </span>
            </div>

            <div className="home-output-panel rounded-[1.5rem] border border-white/[0.12] bg-[#121026]/[0.86] p-6 shadow-[0_20px_70px_rgba(0,0,0,0.46)]">
              <div className="mb-5 flex items-center justify-between gap-4">
                <div>
                  <p className="text-xs font-bold uppercase tracking-widest text-[#c7a7ff]">
                    CSC 10300
                  </p>
                  <h3 className="mt-2 text-2xl font-black text-white">
                    Loops study set
                  </h3>
                </div>
                <span className="rounded-full bg-[#6f2cff]/24 px-3 py-1 text-xs font-bold text-[#d9c7ff]">
                  20 cards
                </span>
              </div>

              <div className="space-y-3 text-sm leading-6 text-white/[0.64]">
                <p className="rounded-xl bg-white/[0.055] p-4">
                  Explain iteration using an intro programming example.
                </p>
                <p className="rounded-xl bg-white/[0.055] p-4">
                  Compare while loops and for loops in pseudocode.
                </p>
                <p className="rounded-xl bg-white/[0.055] p-4">
                  Create a five-question review quiz for loop conditions.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section id="how-it-works" className="relative z-10 px-6 py-28">
        <div className="mx-auto max-w-5xl text-center">
          <h2 className="text-5xl font-black tracking-normal text-white sm:text-6xl">
            How It Works - It&apos;s Simple.
          </h2>
          <p className="mx-auto mt-6 max-w-3xl text-xl leading-9 text-white/[0.56]">
            Choose your academic context once, then use the dashboard whenever you need
            help studying.
          </p>
        </div>

        <div className="home-steps mx-auto mt-20 grid max-w-3xl gap-16">
          {HOW_IT_WORKS.map((step, index) => (
            <div key={step.title} className="relative text-center">
              <div className="home-step-node mx-auto flex h-32 w-32 items-center justify-center rounded-full border border-[#8d5cff]/50 bg-[#29135a]/72 text-3xl font-black text-[#d3bdff] shadow-[0_0_80px_rgba(111,44,255,0.32)]">
                {step.icon}
              </div>
              <span className="absolute left-1/2 top-0 flex h-10 w-10 -translate-x-[-34px] items-center justify-center rounded-full border border-[#8d5cff]/70 bg-black text-lg font-black text-white">
                {index + 1}
              </span>
              <h3 className="mt-8 text-3xl font-black text-white">{step.title}</h3>
              <p className="mx-auto mt-4 max-w-xl text-lg leading-8 text-white/[0.56]">
                {step.desc}
              </p>
            </div>
          ))}
        </div>
      </section>

      <footer className="relative z-10 border-t border-white/10 px-6 py-12">
        <div className="mx-auto grid max-w-7xl gap-8 md:grid-cols-[1fr_auto] md:items-end">
          <div>
            <Link href="/" className="inline-flex items-center gap-3">
              <span className="flex h-11 w-11 items-center justify-center rounded-xl border border-white/[0.12] bg-white/[0.07] text-sm font-black text-white">
                CC
              </span>
              <span>
                <span className="block text-lg font-black text-white">CCNY Study AI</span>
                <span className="block text-sm text-white/50">
                  Built for students at The City College of New York.
                </span>
              </span>
            </Link>
            <p className="mt-5 text-sm font-semibold text-white/[0.58]">
              Made by Raghed Soliman.
            </p>
          </div>

          <div className="flex flex-wrap gap-4 text-sm font-semibold text-white/[0.58] md:justify-end">
            {FOOTER_LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                target={link.href.startsWith("http") ? "_blank" : undefined}
                rel={link.href.startsWith("http") ? "noopener noreferrer" : undefined}
                className="transition hover:text-white"
              >
                {link.label}
              </Link>
            ))}
          </div>
        </div>
      </footer>
    </main>
  );
}
