export default function Home() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center text-center px-6">
  <h1 className="text-6xl font-bold mb-6">
    CCNY Study AI
  </h1>

  <p className="text-2xl text-gray-600 max-w-3xl mb-8">
    The AI-powered study platform built for students.
  </p>

  <div className="space-y-2 mb-10">
    <p>📚 Generate quizzes</p>
    <p>📝 Summarize notes</p>
    <p>🧠 Master concepts faster</p>
  </div>

  <div className="flex gap-4">
    <button className="bg-black text-white px-6 py-3 rounded-full">
      Join Waitlist
    </button>

    <a
  href="/progress"
  className="border px-6 py-3 rounded-full"
>
  View Progress
</a>
  </div>

  <p className="mt-12 text-sm text-gray-500">
    Built by Raghed while studying Computer Science at CCNY.
  </p>
</main>
  );
}