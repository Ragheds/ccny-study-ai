import { schools } from "../../data/ccny";

export default function MajorsPage() {
  return (
    <main className="min-h-screen bg-black text-white">
      <div className="max-w-7xl mx-auto px-6 py-16">

        <h1 className="text-6xl font-bold mb-4">
          CCNY Academic Plans
        </h1>

        <p className="text-gray-400 text-lg mb-8">
          Browse all undergraduate programs and connect them to AI study tools.
        </p>

        <input
          placeholder="Search plans..."
          className="w-full bg-white/5 border border-white/10 rounded-2xl px-6 py-4 mb-12 outline-none"
        />

        {schools.map((school) => (
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
                <div
                  key={plan.code}
                  className="group rounded-2xl border border-white/10 bg-white/5 p-5 hover:bg-white/10 hover:border-white/20 transition"
                >
                  <p className="text-sm text-blue-400 mb-2">
                    {plan.code}
                  </p>

                  <h3 className="font-semibold text-lg">
                    {plan.name}
                  </h3>
                </div>
              ))}

            </div>

          </section>
        ))}

      </div>
    </main>
  );
}