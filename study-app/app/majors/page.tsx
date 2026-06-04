export default function MajorsPage() {
  const majors = [
    "Computer Science",
    "Mechanical Engineering",
    "Electrical Engineering",
    "Civil Engineering",
    "Biology",
    "Chemistry",
    "Physics",
    "Psychology",
    "Economics",
  ];

  return (
    <main className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-5xl mx-auto bg-white p-8 rounded-2xl shadow">
        <h1 className="text-5xl font-bold mb-4">
          CCNY Majors
        </h1>

        <p className="text-gray-600 mb-8">
          Select your major to access course-aware AI tools.
        </p>

        <div className="grid md:grid-cols-2 gap-4">
          {majors.map((major) => (
            <div
              key={major}
              className="border rounded-xl p-4 hover:shadow cursor-pointer"
            >
              <h2 className="font-semibold text-lg">
                {major}
              </h2>
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}