export default function NotesPage() {
  return (
    <main className="min-h-screen max-w-4xl mx-auto p-8">
      <h1 className="text-5xl font-bold mb-4">
        Study Notes
      </h1>

      <p className="text-gray-600 mb-8">
        Paste your notes below and prepare them for AI analysis.
      </p>

      <textarea
        className="w-full h-64 border rounded-xl p-4"
        placeholder="Paste your notes here..."
      />

      <button className="mt-4 bg-black text-white px-6 py-3 rounded-full">
        Summarize Notes
      </button>
    </main>
  );
}