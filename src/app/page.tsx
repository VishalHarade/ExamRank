import Link from "next/link";
import { getCurrentUser } from "@/lib/auth";
import { Navbar } from "@/components/Navbar";
import {
  Code,
  Shield,
  Clock,
  ArrowRight,
  Database,
  BarChart3,
  Users,
  CheckCircle,
  FileCode2,
  TerminalSquare,
} from "lucide-react";
import { redirect } from "next/navigation";

export default async function HomePage() {
  const user = await getCurrentUser();

  if (user) {
    if (user.role === "STUDENT") {
      redirect("/student");
    } else if (user.role === "ADMIN") {
      redirect("/admin");
    } else {
      redirect("/teacher");
    }
  }

  return (
    <div className="min-h-screen bg-[#0B0F17] text-slate-100 flex flex-col">
      <Navbar user={user} />

      <main className="flex-1">
        {/* Hero Section */}
        <section className="relative border-b border-slate-800/80 pt-16 pb-20 lg:pt-24 lg:pb-28">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex flex-col items-center text-center max-w-3xl mx-auto space-y-6">
              {/* Institution Tag */}
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-blue-500/30 bg-blue-500/10 text-xs font-medium text-blue-400">
                <span className="h-1.5 w-1.5 rounded-full bg-blue-400" />
                Department of Computer Science &amp; Engineering
              </div>

              {/* Title */}
              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-semibold tracking-tight text-white leading-tight">
                Computer Laboratory <br />
                <span className="text-blue-500">Online Examination Portal</span>
              </h1>

              {/* Description */}
              <p className="text-base sm:text-lg text-slate-300 max-w-2xl font-normal leading-relaxed">
                A robust, local-first coding exam environment for engineering colleges. Features in-browser Monaco IDE, multi-language sandbox compiler, real-time tab &amp; window monitoring, and automated test-case evaluation.
              </p>

              {/* Action Buttons */}
              <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
                <Link
                  href="/login"
                  className="px-6 py-3 rounded-lg text-sm font-medium bg-blue-600 hover:bg-blue-500 text-white transition-colors flex items-center gap-2 shadow-sm"
                >
                  Sign In to Examination
                  <ArrowRight className="h-4 w-4" />
                </Link>
                <a
                  href="#demo-credentials"
                  className="px-5 py-3 rounded-lg text-sm font-medium border border-slate-700 bg-slate-900/60 hover:bg-slate-800 text-slate-200 transition-colors"
                >
                  Quick Demo Access
                </a>
              </div>

              {/* Tech Spec Badges */}
              <div className="pt-6 grid grid-cols-2 sm:grid-cols-4 gap-3 w-full">
                <div className="bg-[#111722] p-3.5 rounded-xl border border-slate-800 text-center">
                  <div className="text-[11px] text-slate-400 font-medium uppercase tracking-wider">Languages</div>
                  <div className="text-xs font-semibold text-slate-200 mt-1">C, C++, Python, JavaScript</div>
                </div>
                <div className="bg-[#111722] p-3.5 rounded-xl border border-slate-800 text-center">
                  <div className="text-[11px] text-slate-400 font-medium uppercase tracking-wider">Proctoring</div>
                  <div className="text-xs font-semibold text-emerald-400 mt-1">Tab, Window &amp; Fullscreen Guard</div>
                </div>
                <div className="bg-[#111722] p-3.5 rounded-xl border border-slate-800 text-center">
                  <div className="text-[11px] text-slate-400 font-medium uppercase tracking-wider">Evaluation</div>
                  <div className="text-xs font-semibold text-blue-400 mt-1">Hidden &amp; Visible Test Suites</div>
                </div>
                <div className="bg-[#111722] p-3.5 rounded-xl border border-slate-800 text-center">
                  <div className="text-[11px] text-slate-400 font-medium uppercase tracking-wider">Server Architecture</div>
                  <div className="text-xs font-semibold text-slate-200 mt-1">Next.js · Prisma · MySQL</div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Demo Portals Section */}
        <section id="demo-credentials" className="py-16 bg-[#0E131E] border-b border-slate-800/80">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-10">
              <h2 className="text-2xl font-semibold tracking-tight text-white">
                Platform Demo Profiles
              </h2>
              <p className="text-slate-400 text-sm mt-1.5">
                Select a user role to explore live examination, monitoring, or platform analytics.
              </p>
            </div>

            <div className="grid md:grid-cols-3 gap-5 max-w-5xl mx-auto">
              {/* Student Card */}
              <div className="bg-[#111722] rounded-xl p-6 border border-slate-800 flex flex-col justify-between hover:border-slate-700 transition-colors">
                <div className="space-y-3">
                  <div className="h-9 w-9 rounded-lg bg-blue-600/10 border border-blue-500/20 flex items-center justify-center text-blue-400">
                    <FileCode2 className="h-5 w-5" />
                  </div>
                  <div>
                    <span className="text-[11px] font-medium text-blue-400 uppercase tracking-wider">Candidate</span>
                    <h3 className="text-base font-semibold text-white mt-0.5">Student Portal</h3>
                    <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                      Attend live lab tests with code editor, run against public test cases, and submit answers under proctoring.
                    </p>
                  </div>
                  <div className="pt-2 text-xs text-slate-400 space-y-1 font-mono">
                    <p className="text-slate-300">student1@college.edu</p>
                    <p className="text-slate-500">password123</p>
                  </div>
                </div>

                <div className="pt-5 mt-4 border-t border-slate-800">
                  <Link
                    href="/login?email=student1@college.edu"
                    className="w-full py-2 px-3 rounded-lg text-xs font-medium bg-blue-600 hover:bg-blue-500 text-white flex items-center justify-center gap-1.5 transition-colors"
                  >
                    Open Student Desk <ArrowRight className="h-3.5 w-3.5" />
                  </Link>
                </div>
              </div>

              {/* Teacher Card */}
              <div className="bg-[#111722] rounded-xl p-6 border border-slate-800 flex flex-col justify-between hover:border-slate-700 transition-colors">
                <div className="space-y-3">
                  <div className="h-9 w-9 rounded-lg bg-purple-600/10 border border-purple-500/20 flex items-center justify-center text-purple-400">
                    <TerminalSquare className="h-5 w-5" />
                  </div>
                  <div>
                    <span className="text-[11px] font-medium text-purple-400 uppercase tracking-wider">Faculty / Examiner</span>
                    <h3 className="text-base font-semibold text-white mt-0.5">Teacher Dashboard</h3>
                    <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                      Create exams, manage problem repositories with test cases, and monitor students in real time with incident tracking.
                    </p>
                  </div>
                  <div className="pt-2 text-xs text-slate-400 space-y-1 font-mono">
                    <p className="text-slate-300">teacher@college.edu</p>
                    <p className="text-slate-500">password123</p>
                  </div>
                </div>

                <div className="pt-5 mt-4 border-t border-slate-800">
                  <Link
                    href="/login?email=teacher@college.edu"
                    className="w-full py-2 px-3 rounded-lg text-xs font-medium bg-purple-600 hover:bg-purple-500 text-white flex items-center justify-center gap-1.5 transition-colors"
                  >
                    Open Examiner Console <ArrowRight className="h-3.5 w-3.5" />
                  </Link>
                </div>
              </div>

              {/* Admin Card */}
              <div className="bg-[#111722] rounded-xl p-6 border border-slate-800 flex flex-col justify-between hover:border-slate-700 transition-colors">
                <div className="space-y-3">
                  <div className="h-9 w-9 rounded-lg bg-emerald-600/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
                    <BarChart3 className="h-5 w-5" />
                  </div>
                  <div>
                    <span className="text-[11px] font-medium text-emerald-400 uppercase tracking-wider">Department Head</span>
                    <h3 className="text-base font-semibold text-white mt-0.5">Admin Analytics</h3>
                    <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                      View class-wide pass rates, violation breakdowns, exam performance distributions, and top student rankings.
                    </p>
                  </div>
                  <div className="pt-2 text-xs text-slate-400 space-y-1 font-mono">
                    <p className="text-slate-300">admin@college.edu</p>
                    <p className="text-slate-500">admin123</p>
                  </div>
                </div>

                <div className="pt-5 mt-4 border-t border-slate-800">
                  <Link
                    href="/login?email=admin@college.edu"
                    className="w-full py-2 px-3 rounded-lg text-xs font-medium bg-emerald-600 hover:bg-emerald-500 text-white flex items-center justify-center gap-1.5 transition-colors"
                  >
                    Open Admin Analytics <ArrowRight className="h-3.5 w-3.5" />
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Feature Highlights Grid */}
        <section className="py-16">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center max-w-2xl mx-auto mb-12">
              <h2 className="text-2xl font-semibold tracking-tight text-white">
                Engineered for Academic Integrity
              </h2>
              <p className="text-sm text-slate-400 mt-1.5">
                Every component is configured for zero-dependency local lab deployment without reliance on expensive third-party APIs.
              </p>
            </div>

            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
              <div className="bg-[#111722] p-5 rounded-xl border border-slate-800">
                <Shield className="h-5 w-5 text-blue-400 mb-3" />
                <h3 className="text-sm font-semibold text-white">Proctoring &amp; Tab Lock</h3>
                <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                  Automatic event hooks detect tab navigation, window blurring, and exiting fullscreen. Violations escalate with warnings.
                </p>
              </div>

              <div className="bg-[#111722] p-5 rounded-xl border border-slate-800">
                <Clock className="h-5 w-5 text-purple-400 mb-3" />
                <h3 className="text-sm font-semibold text-white">Server-Authoritative Clock</h3>
                <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                  Deadlines are calculated and locked on the server. Refreshing or manipulating local browser time cannot extend the test duration.
                </p>
              </div>

              <div className="bg-[#111722] p-5 rounded-xl border border-slate-800">
                <Code className="h-5 w-5 text-emerald-400 mb-3" />
                <h3 className="text-sm font-semibold text-white">Monaco Code Editor</h3>
                <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                  Industry-standard VS Code editor with syntax coloring, bracket matching, line numbering, and autosave every 8 seconds.
                </p>
              </div>

              <div className="bg-[#111722] p-5 rounded-xl border border-slate-800">
                <TerminalSquare className="h-5 w-5 text-amber-400 mb-3" />
                <h3 className="text-sm font-semibold text-white">Isolated Subprocess Runner</h3>
                <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                  Executes student code natively through clang, clang++, python3, and node with strict memory limits and execution timeouts.
                </p>
              </div>

              <div className="bg-[#111722] p-5 rounded-xl border border-slate-800">
                <CheckCircle className="h-5 w-5 text-teal-400 mb-3" />
                <h3 className="text-sm font-semibold text-white">Automated Grading</h3>
                <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                  Grades submissions against private hidden test cases with whitespace normalization and partial marks allocation.
                </p>
              </div>

              <div className="bg-[#111722] p-5 rounded-xl border border-slate-800">
                <Database className="h-5 w-5 text-indigo-400 mb-3" />
                <h3 className="text-sm font-semibold text-white">MySQL + Prisma Relational Store</h3>
                <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                  Persistent audit logging, full submission version history, violation incidents, and department-wise reporting.
                </p>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-800/80 bg-[#0B0F17] py-6 text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-slate-300">ExamRank</span>
            <span>· College Coding Examination System</span>
          </div>
          <div>
            <span>Local Deployment Edition · Node.js + MySQL</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
