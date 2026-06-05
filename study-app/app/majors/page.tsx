import { schools } from "../../data/ccny";

export default function MajorsPage() {
  return (
    <main className="min-h-screen bg-black text-white p-8">
      <div className="max-w-6xl mx-auto">

        <h1 className="text-5xl font-bold mb-4">
          CCNY Schools & Divisions
        </h1>

        <p className="text-gray-400 mb-10">
          Choose a school to explore majors and AI-powered study tools.
        </p>

        <div className="grid md:grid-cols-2 gap-6">
          {schools.map((school) => (
            <div
              key={school.name}
              className="bg-white/5 border border-white/10 rounded-2xl p-6 hover:bg-white/10 transition"
            >
              <h2 className="text-2xl font-semibold mb-3">
                {school.name}
              </h2>

              <p className="text-gray-400">
                {school.majors.length} programs
              </p>
            </div>
          ))}
        </div>

      </div>
    </main>
  );
}