export default function Home() {
  return (
    <main className="min-h-screen bg-black text-white">
      <div className="max-w-7xl mx-auto px-8 py-24">

        <nav className="flex justify-between items-center mb-24">
          <h1 className="text-2xl font-bold">
            CCNY Study AI
          </h1>

          <div className="flex gap-4">
            <a href="/notes">Demo</a>
            <a href="/progress">Roadmap</a>
          </div>
        </nav>

        <section className="text-center">

          <p className="text-blue-400 font-medium mb-4">
            AI-Powered Study Platform
          </p>

          <h1 className="text-7xl font-bold mb-6">
            Learn Faster.
            <br />
            Study Smarter.
          </h1>

          <p className="text-gray-400 text-xl max-w-3xl mx-auto mb-10">
            Course-aware AI designed for university students.
            Summaries, quizzes, flashcards, study plans,
            and academic guidance built around your major.
          </p>

          <div className="flex justify-center gap-4">
            <a
              href="/notes"
              className="bg-white text-black px-6 py-3 rounded-full"
            >
              Try Demo
            </a>

            <a
              href="/progress"
              className="border border-white px-6 py-3 rounded-full"
            >
              View Roadmap
            </a>
          </div>

        </section>

      </div>
    </main>
  );
}