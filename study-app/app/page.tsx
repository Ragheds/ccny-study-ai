export default function Home() {
  return (
    <main className="relative min-h-screen bg-black text-white overflow-hidden">
      <div className="absolute top-0 left-0 w-[500px] h-[500px] bg-blue-500/20 blur-3xl rounded-full" />
      <div className="absolute bottom-0 right-0 w-[500px] h-[500px] bg-purple-500/20 blur-3xl rounded-full" />
      <div className="relative z-10 max-w-7xl mx-auto px-8 py-24">

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
<section className="mt-32">
  <h2 className="text-4xl font-bold text-center mb-12">
    Everything You Need To Study Smarter
  </h2>

  <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">

    <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
      <h3 className="text-xl font-semibold mb-2">
        📚 AI Summaries
      </h3>
      <p className="text-gray-400">
        Turn long notes into concise summaries.
      </p>
    </div>

    <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
      <h3 className="text-xl font-semibold mb-2">
        🧠 Quiz Generator
      </h3>
      <p className="text-gray-400">
        Create practice questions instantly.
      </p>
    </div>

    <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
      <h3 className="text-xl font-semibold mb-2">
        🎴 Flashcards
      </h3>
      <p className="text-gray-400">
        Learn concepts faster with flashcards.
      </p>
    </div>

    <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
      <h3 className="text-xl font-semibold mb-2">
        📅 Study Plans
      </h3>
      <p className="text-gray-400">
        Build personalized study schedules.
      </p>
    </div>

  </div>
</section>
<section className="mt-32 text-center">

  <h2 className="text-4xl font-bold mb-12">
    Built Around CCNY Students
  </h2>

  <div className="grid grid-cols-2 md:grid-cols-4 gap-8">

    <div>
      <p className="text-5xl font-bold text-blue-400">
        73
      </p>
      <p className="text-gray-400 mt-2">
        Undergraduate Majors
      </p>
    </div>

    <div>
      <p className="text-5xl font-bold text-purple-400">
        47
      </p>
      <p className="text-gray-400 mt-2">
        Master's Programs
      </p>
    </div>

    <div>
      <p className="text-5xl font-bold text-green-400">
        100+
      </p>
      <p className="text-gray-400 mt-2">
        Courses Supported
      </p>
    </div>

    <div>
      <p className="text-5xl font-bold text-yellow-400">
        24/7
      </p>
      <p className="text-gray-400 mt-2">
        AI Assistance
      </p>
    </div>

  </div>

</section>
<section className="mt-32">

  <h2 className="text-4xl font-bold text-center mb-12">
    How It Works
  </h2>

  <div className="grid md:grid-cols-4 gap-6">

    <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
      <h3 className="text-xl font-semibold mb-3">
        1. Choose Major
      </h3>
      <p className="text-gray-400">
        Select your CCNY major and academic path.
      </p>
    </div>

    <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
      <h3 className="text-xl font-semibold mb-3">
        2. Pick Course
      </h3>
      <p className="text-gray-400">
        Choose the course you're currently studying.
      </p>
    </div>

    <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
      <h3 className="text-xl font-semibold mb-3">
        3. Upload Notes
      </h3>
      <p className="text-gray-400">
        Add lectures, notes, PDFs, and study materials.
      </p>
    </div>

    <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
      <h3 className="text-xl font-semibold mb-3">
        4. Learn Faster
      </h3>
      <p className="text-gray-400">
        Get summaries, quizzes, flashcards, and study plans.
      </p>
    </div>

  </div>

</section>
      </div>
    </main>
  );
}