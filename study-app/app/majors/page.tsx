"use client";

import { useState } from "react";
import Link from "next/link";
import { schools } from "../../data/ccny";

const SCHOOL_COLORS = [
  "#f59e0b",
  "#ec4899",
  "#10b981",
  "#3b82f6",
  "#06b6d4",
  "#f97316",
  "#8b5cf6",
  "#84cc16",
];

function getDegreeCode(planCode: string): string {
  return planCode.split("-").at(-1) ?? planCode;
}

function getTotalPlans(): number {
  return schools.reduce((total, school) => total + school.plans.length, 0);
}

export default function MajorsPage() {
  const [query, setQuery] = useState("");
  const normalizedQuery = query.toLowerCase().trim();
  const totalPlans = getTotalPlans();

  const filtered = schools
    .map((school, index) => ({
      ...school,
      color: SCHOOL_COLORS[index % SCHOOL_COLORS.length],
      plans: school.plans.filter(
        (plan) =>
          plan.name.toLowerCase().includes(normalizedQuery) ||
          plan.code.toLowerCase().includes(normalizedQuery) ||
          getDegreeCode(plan.code).toLowerCase().includes(normalizedQuery)
      ),
    }))
    .filter((school) => school.plans.length > 0);

  return (
    <main className="min-h-screen bg-black text-white">
      <section className="border-b border-white/10 px-6 py-14">
        <div className="mx-auto grid max-w-7xl gap-10 lg:grid-cols-[minmax(0,1fr)_360px] lg:items-end">
          <div>
            <p className="mb-4 text-xs font-semibold uppercase tracking-widest text-blue-300">
              Academic explorer
            </p>

            <h1 className="max-w-4xl text-4xl font-bold leading-tight tracking-tight sm:text-5xl lg:text-6xl">
              Find the CCNY program that matches how you want to study.
            </h1>

            <p className="mt-5 max-w-2xl text-lg leading-relaxed text-gray-400">
              Browse undergraduate plans by school, degree type, and academic direction before
              building a course-aware AI workspace.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
              <p className="text-3xl font-bold">{totalPlans}</p>
              <p className="mt-1 text-sm text-gray-500">Programs</p>
            </div>

            <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
              <p className="text-3xl font-bold">{schools.length}</p>
              <p className="mt-1 text-sm text-gray-500">Schools</p>
            </div>
          </div>
        </div>
      </section>

      <section className="sticky top-[65px] z-20 border-b border-white/10 bg-black/95 px-6 py-4 backdrop-blur">
        <div className="mx-auto max-w-7xl">
          <div className="relative">
            <svg
              className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
              />
            </svg>

            <input
              placeholder="Search by program, code, or degree type..."
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              className="w-full rounded-2xl border border-white/10 bg-white/5 py-3 pl-11 pr-11 text-sm text-white outline-none transition placeholder:text-gray-600 focus:border-white/25"
            />

            {query && (
              <button
                onClick={() => setQuery("")}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white"
              >
                ✕
              </button>
            )}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-6 py-10">
        {filtered.length === 0 && (
          <div className="rounded-2xl border border-white/10 bg-white/5 p-10 text-center text-gray-500">
            No academic plans found for &ldquo;{query}&rdquo;.
          </div>
        )}

        <div className="space-y-12">
          {filtered.map((school) => (
            <section key={school.name}>
              <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                <div>
                  <div className="mb-3 flex items-center gap-3">
                    <span
                      className="h-9 w-1 rounded-full"
                      style={{ backgroundColor: school.color }}
                    />

                    <div>
                      <h2 className="text-2xl font-bold">{school.name}</h2>
                      <p className="mt-1 text-sm text-gray-500">
                        {school.plans.length} matching program
                        {school.plans.length !== 1 ? "s" : ""}
                      </p>
                    </div>
                  </div>
                </div>

                <p className="max-w-md text-sm leading-relaxed text-gray-500">
                  Choose a plan to connect major context with the CCNY course catalog.
                </p>
              </div>

              <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                {school.plans.map((plan) => (
                  <Link
                    key={`${school.name}-${plan.code}`}
                    href={`/dashboard/${plan.code}`}
                    className="group block rounded-2xl border border-white/10 bg-white/5 p-5 transition hover:-translate-y-0.5 hover:border-white/25 hover:bg-white/10"
                  >
                    <div className="mb-4 flex items-start justify-between gap-3">
                      <span
                        className="rounded-lg border px-2.5 py-1 text-xs font-bold"
                        style={{
                          borderColor: `${school.color}66`,
                          color: school.color,
                        }}
                      >
                        {getDegreeCode(plan.code)}
                      </span>

                      <span className="font-mono text-xs text-gray-600 group-hover:text-gray-400">
                        {plan.code}
                      </span>
                    </div>

                    <h3 className="text-lg font-semibold leading-snug text-white">
                      {plan.name}
                    </h3>

                    <p className="mt-4 text-sm text-gray-500 group-hover:text-gray-400">
                      Select major and continue to course planning →
                    </p>
                  </Link>
                ))}
              </div>
            </section>
          ))}
        </div>
      </section>
    </main>
  );
}