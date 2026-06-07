"use client";

import { useState } from "react";
import { schools } from "../../data/ccny";

export default function MajorsPage() {
  const [query, setQuery] = useState("");

  const filtered = schools
    .map((school) => ({
      ...school,
      plans: school.plans.filter(
        (plan) =>
          plan.name.toLowerCase().includes(query.toLowerCase()) ||
          plan.code.toLowerCase().includes(query.toLowerCase())
      ),
    }))
    .filter((school) => school.plans.length > 0);

  return (
    <main className="min-h-screen bg-black text-white">
      <div className="max-w-7xl mx-auto px-6 py-16">

        <h1 className="text-6xl font-bold mb-4">
          CCNY Academic Plans
        </h1>

        <p className="text-gray-400 text-lg mb-8">
          Browse all undergraduate programs and connect them to AI study tools.
        </p>
        <p className="text-gray-500 mb-10">
  {schools.reduce(
    (total, school) => total + school.plans.length,
    0
  )} plans available
</p>
   <div className="sticky top-4 z-20 mb-12">
  <input
    placeholder="Search plans..."
    value={query}
    onChange={(e) => setQuery(e.target.value)}
    className="w-full bg-zinc-900/95 backdrop-blur border border-white/10 rounded-2xl px-6 py-4 outline-none"
  />
</div>

        {filtered.map((school) => (
          <section key={school.name} className="mb-16">

            <div className="mb-6">
              <h2 className="text-3xl font-bold">
                {school.name}
              </h2>

              <p className="text-gray-500">
                {school.plans.length} plans
              </p>
            </div>

            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">

              {school.plans.map((plan) => (
                <button
                 key={plan.code}
                 className="group rounded-2xl border border-white/10 bg-white/5 p-5 hover:bg-white/10 hover:border-blue-500 transition duration-300 hover:-translate-y-1 text-left w-full"
                >
                  <p className="text-sm text-blue-400 mb-2">
                    {plan.code}
                  </p>

                  <h3 className="font-semibold text-lg">
                    {plan.name}
                  </h3>
                </button>
              ))}

            </div>

          </section>
        ))}

      </div>
    </main>
  );
}