import Link from "next/link";

const FEATURES = [
  {
    icon: "🤖",
    title: "AI Tutor",
    desc: "Ask anything about your course. Get instant, course-specific answers powered by AI.",
  },
  {
    icon: "📚",
    title: "Course-Specific Learning",
    desc: "AI that knows your major, your school, and your exact CCNY course.",
  },
  {
    icon: "🎴",
    title: "Flashcards",
    desc: "Auto-generate flashcards from your course materials in seconds.",
  },
  {
    icon: "❓",
    title: "Quiz Generator",
    desc: "Practice with AI-generated quizzes tailored to your course.",
  },
  {
    icon: "📝",
    title: "Notes Generator",
    desc: "Upload lectures or paste notes — get a clean study guide instantly.",
  },
  {
    icon: "📈",
    title: "Progress Tracking",
    desc: "Track what you've studied, what quizzes you've taken, and your scores.",
  },
];

const STEPS = [
  { num: "01", title: "Choose Your Major", desc: "Select from all 71 CCNY undergraduate majors." },
  { num: "02", title: "Select Your Courses", desc: "Pick the courses you're taking this semester from 2083+ real CCNY courses." },
  { num: "03", title: "Ask AI Anything", desc: "Get course-specific answers, not generic AI responses." },
  { num: "04", title: "Generate Study Materials", desc: "Create notes, quizzes, and flashcards from your own materials." },
];

const BENEFITS = [
  { title: "Personalized Help", desc: "AI knows your major, school, and course — not just your question." },
  { title: "Faster Studying", desc: "Get summaries and flashcards in seconds instead of hours." },
  { title: "Better Exam Prep", desc: "Practice with quizzes built for your exact CCNY course." },
  { title: "Organized Learning", desc: "All your courses, notes, and progress in one place." },
];

export default function Home() {
  return (
    <main className="overflow-hidden bg-[var(--app-bg)] text-[var(--app-text)]">

      {/* Hero */}
      <section className="relative min-h-[90vh] flex items-center justify-center px-6 py-24">
        <div className="relative z-10 text-center max-w-4xl mx-auto">
          <div className="inline-flex items-center gap-2 border border-[var(--app-border)] bg-[var(--app-surface-muted)] px-4 py-2 rounded-full text-sm text-[var(--app-muted)] mb-8">
            <span className="w-2 h-2 rounded-full bg-[var(--app-accent)] animate-pulse" />
            Built for CCNY Students
          </div>

          <h1 className="text-6xl md:text-7xl font-bold mb-6 leading-tight tracking-tight">
            Study Smarter
            <br />
            <span className="text-[var(--app-accent)]">
              at CCNY
            </span>
          </h1>

          <p className="text-[var(--app-muted)] text-xl max-w-2xl mx-auto mb-10 leading-relaxed">
            AI-powered tutoring that knows your major, your courses, and your
            university. Get instant help, generate study materials, and ace your
            exams.
          </p>

          <div className="flex flex-col sm:flex-row justify-center gap-4">
            <Link
              href="/majors"
              className="bg-[var(--app-text)] text-[var(--app-bg)] font-semibold px-8 py-4 rounded-2xl hover:opacity-90 transition text-lg"
            >
              Get Started →
            </Link>
            <Link
              href="#features"
              className="border border-[var(--app-border)] text-[var(--app-text)] font-medium px-8 py-4 rounded-2xl hover:bg-[var(--app-surface-muted)] transition text-lg"
            >
              Explore Features
            </Link>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mt-20 pt-12 border-t border-[var(--app-border)]">
            {[
              { num: "71", label: "Undergraduate Majors" },
              { num: "2083+", label: "Real CCNY Courses" },
              { num: "Free", label: "AI Models" },
              { num: "24/7", label: "Available" },
            ].map((stat) => (
              <div key={stat.label}>
                <p className="text-4xl font-bold text-[var(--app-text)] mb-1">{stat.num}</p>
                <p className="text-[var(--app-muted)] text-sm">{stat.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="px-6 py-24 max-w-7xl mx-auto">
        <div className="text-center mb-16">
          <p className="text-[var(--app-accent)] font-medium mb-3 text-sm uppercase tracking-widest">Features</p>
          <h2 className="text-4xl md:text-5xl font-bold mb-4">Everything You Need to Study Smarter</h2>
          <p className="text-[var(--app-muted)] text-lg max-w-2xl mx-auto">
            One platform for all your CCNY coursework — powered by AI that actually knows your courses.
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {FEATURES.map((f) => (
            <div
              key={f.title}
              className="group bg-[var(--app-surface)] border border-[var(--app-border)] rounded-2xl p-6 hover:bg-[var(--app-surface-muted)] hover:border-[var(--app-border-strong)] transition"
            >
              <div className="text-3xl mb-4">{f.icon}</div>
              <h3 className="text-xl font-semibold mb-2">{f.title}</h3>
              <p className="text-[var(--app-muted)] leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* How It Works */}
      <section className="px-6 py-24 border-t border-[var(--app-border)]">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <p className="text-[var(--app-accent)] font-medium mb-3 text-sm uppercase tracking-widest">How It Works</p>
            <h2 className="text-4xl md:text-5xl font-bold mb-4">From Zero to Studying in 4 Steps</h2>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {STEPS.map((step) => (
              <div key={step.num} className="relative">
                <div className="text-6xl font-bold text-[var(--app-surface-strong)] mb-4">{step.num}</div>
                <h3 className="text-xl font-semibold mb-2">{step.title}</h3>
                <p className="text-[var(--app-muted)] leading-relaxed">{step.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Benefits */}
      <section className="px-6 py-24 border-t border-[var(--app-border)]">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <p className="text-[var(--app-accent)] font-medium mb-3 text-sm uppercase tracking-widest">Benefits</p>
            <h2 className="text-4xl md:text-5xl font-bold mb-4">Why CCNY Students Love It</h2>
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            {BENEFITS.map((b) => (
              <div
                key={b.title}
                className="flex gap-4 bg-[var(--app-surface)] border border-[var(--app-border)] rounded-2xl p-6"
              >
                <div className="w-2 rounded-full bg-[var(--app-accent)] shrink-0" />
                <div>
                  <h3 className="text-lg font-semibold mb-1">{b.title}</h3>
                  <p className="text-[var(--app-muted)]">{b.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="px-6 py-24 border-t border-[var(--app-border)]">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-4xl md:text-5xl font-bold mb-6">
            Ready to Study Smarter?
          </h2>
          <p className="text-[var(--app-muted)] text-lg mb-10">
            Join CCNY students already using AI to study faster, score higher, and stress less.
          </p>
          <Link
            href="/majors"
            className="bg-[var(--app-text)] text-[var(--app-bg)] font-semibold px-10 py-4 rounded-2xl hover:opacity-90 transition text-lg inline-block"
          >
            Get Started Free →
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-[var(--app-border)] px-6 py-12">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
          <div>
            <p className="text-lg font-bold mb-1">CCNY Study AI</p>
            <p className="text-[var(--app-muted)] text-sm">Built for students at The City College of New York.</p>
          </div>
          <div className="flex gap-6 text-sm text-[var(--app-muted)]">
            <Link href="/majors" className="hover:text-[var(--app-text)] transition">Majors</Link>
            <Link href="/courses" className="hover:text-[var(--app-text)] transition">Courses</Link>
            <Link href="/dashboard" className="hover:text-[var(--app-text)] transition">Dashboard</Link>
            <a href="https://github.com/Ragheds/ccny-study-ai" target="_blank" rel="noopener noreferrer" className="hover:text-[var(--app-text)] transition">GitHub</a>
          </div>
          <p className="text-[var(--app-muted)] text-sm">© 2026 CCNY Study AI</p>
        </div>
      </footer>

    </main>
  );
}
