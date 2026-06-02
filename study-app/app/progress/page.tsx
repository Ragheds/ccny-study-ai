export default function ProgressPage() {
  return (
    <main className="min-h-screen p-8 max-w-4xl mx-auto">
      <h1 className="text-5xl font-bold mb-3">
        Product Roadmap
      </h1>

      <p className="text-gray-600 mb-10">
        Development progress for CCNY Study AI.
      </p>

      <div className="space-y-6">
        <div className="border rounded-xl p-5">
          <h2 className="font-semibold text-lg">✅ Phase 1</h2>
          <p>Project Setup</p>
        </div>

        <div className="border rounded-xl p-5">
          <h2 className="font-semibold text-lg">✅ Phase 2</h2>
          <p>Landing Page</p>
        </div>

        <div className="border rounded-xl p-5">
          <h2 className="font-semibold text-lg">🔄 Phase 3</h2>
          <p>Study Notes Input</p>
        </div>

        <div className="border rounded-xl p-5">
          <h2 className="font-semibold text-lg">🔄 Phase 4</h2>
          <p>AI Summaries</p>
        </div>

        <div className="border rounded-xl p-5">
          <h2 className="font-semibold text-lg">🔄 Phase 5</h2>
          <p>Quiz Generator</p>
        </div>

        <div className="border rounded-xl p-5">
          <h2 className="font-semibold text-lg">🔄 Phase 6</h2>
          <p>Course-Aware Learning</p>
        </div>

        <div className="border rounded-xl p-5">
          <h2 className="font-semibold text-lg">🔄 Phase 7</h2>
          <p>User Accounts & Saved History</p>
        </div>
      </div>
    </main>
  );
}