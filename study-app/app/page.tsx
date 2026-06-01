export default function Home() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center text-center p-8">
      <h1 className="text-5xl font-bold mb-4">
        CCNY Study AI
      </h1>

      <p className="text-xl text-gray-600 mb-8 max-w-2xl">
        AI-powered study assistant designed to help students learn concepts,
        generate quizzes, summarize notes, and organize study sessions.
      </p>

      <div className="bg-black text-white px-6 py-3 rounded-full">
        Coming Soon 🚀
      </div>

      <p className="mt-10 text-sm text-gray-500">
        Built by Raghed while studying Computer Science at CCNY.
      </p>
    </main>
  );
}