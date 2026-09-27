import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { Navbar } from "@/components/Navbar";
import Link from "next/link";
import {
  Clock,
  CheckCircle2,
  Calendar,
  AlertTriangle,
  PlayCircle,
  FileCode,
  ShieldAlert,
  ChevronRight,
  Award,
  Sparkles,
  Layers,
} from "lucide-react";
import { formatDate, formatDuration } from "@/lib/utils";

export default async function StudentDashboardPage() {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  if (user.role !== "STUDENT") {
    redirect("/teacher");
  }

  // Fetch all exams with student's attempt state
  const exams = await prisma.exam.findMany({
    where: {
      status: {
        in: ["ACTIVE", "PUBLISHED", "SCHEDULED", "ENDED", "RESULT_PUBLISHED"],
      },
    },
    include: {
      createdBy: {
        select: { name: true, department: true },
      },
      examQuestions: {
        select: { id: true, marks: true },
      },
      attempts: {
        where: { studentId: user.id },
        select: {
          id: true,
          status: true,
          totalScore: true,
          percentage: true,
          violationCount: true,
          startedAt: true,
          submittedAt: true,
          endTime: true,
        },
      },
    },
    orderBy: { startTime: "asc" },
  });

  const now = new Date();

  // Categorize exams
  const activeExams = exams.filter(
    (e) => (e.status === "ACTIVE" || (e.status === "PUBLISHED" && now >= e.startTime && now <= e.endTime)) &&
      (!e.attempts[0] || (e.attempts[0].status === "IN_PROGRESS" || e.attempts[0].status === "NOT_STARTED"))
  );

  const upcomingExams = exams.filter(
    (e) => (e.status === "SCHEDULED" || now < e.startTime) && (!e.attempts[0] || e.attempts[0].status === "NOT_STARTED")
  );

  const completedExams = exams.filter(
    (e) =>
      e.attempts[0] &&
      (e.attempts[0].status === "SUBMITTED" ||
        e.attempts[0].status === "AUTO_SUBMITTED" ||
        e.attempts[0].status === "TERMINATED")
  );

  return (
    <div className="min-h-screen bg-[#070b12] text-slate-100 flex flex-col">
      <Navbar user={user} />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {/* Welcome Banner */}
        <div className="glass-panel p-6 sm:p-8 rounded-3xl border border-white/10 relative overflow-hidden">
          <div className="absolute -right-10 -bottom-10 w-80 h-80 bg-blue-600/10 rounded-full blur-[90px] pointer-events-none" />

          <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-xs font-mono text-blue-400 mb-3">
                <span className="h-2 w-2 rounded-full bg-blue-400 animate-pulse" />
                STUDENT EXAMINATION PORTAL
              </div>
              <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white">
                Welcome back, {user.name}
              </h1>
              <p className="text-sm text-slate-400 mt-1 flex flex-wrap items-center gap-x-3 gap-y-1">
                <span>USN: <strong className="text-slate-200">{user.usn || "1MS21CS001"}</strong></span>
                <span>•</span>
                <span>{user.department || "Computer Science & Engineering"}</span>
              </p>
            </div>

            {/* Anti-cheat status pill */}
            <div className="flex items-center gap-4 bg-slate-900/80 border border-white/10 px-4 py-3 rounded-2xl">
              <div className="h-10 w-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
                <ShieldAlert className="h-5 w-5" />
              </div>
              <div>
                <div className="text-xs font-mono uppercase tracking-wider text-slate-400">Integrity Sentinel</div>
                <div className="text-xs font-semibold text-emerald-400 mt-0.5">Fullscreen & Tab Sentinel Ready</div>
              </div>
            </div>
          </div>

          {/* Quick Metrics */}
          <div className="grid grid-cols-3 gap-4 mt-6 pt-6 border-t border-white/5">
            <div>
              <div className="text-xs text-slate-400 font-mono uppercase">Active Exams</div>
              <div className="text-2xl font-black text-blue-400 mt-0.5">{activeExams.length}</div>
            </div>
            <div>
              <div className="text-xs text-slate-400 font-mono uppercase">Scheduled</div>
              <div className="text-2xl font-black text-purple-400 mt-0.5">{upcomingExams.length}</div>
            </div>
            <div>
              <div className="text-xs text-slate-400 font-mono uppercase">Completed</div>
              <div className="text-2xl font-black text-emerald-400 mt-0.5">{completedExams.length}</div>
            </div>
          </div>
        </div>

        {/* Section 1: Active Examinations */}
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold tracking-tight text-white flex items-center gap-2">
              <PlayCircle className="h-5 w-5 text-blue-400" />
              Active Examinations
            </h2>
            <span className="text-xs font-mono text-slate-400">
              {activeExams.length} Available Now
            </span>
          </div>

          {activeExams.length === 0 ? (
            <div className="glass-card p-8 rounded-2xl border border-white/5 text-center text-slate-400 text-sm">
              No examinations are active right now. Please check scheduled exams below.
            </div>
          ) : (
            <div className="grid md:grid-cols-2 gap-6">
              {activeExams.map((exam) => {
                const attempt = exam.attempts[0];
                const isStarted = attempt?.status === "IN_PROGRESS";

                return (
                  <div
                    key={exam.id}
                    className="glass-card rounded-2xl p-6 border border-blue-500/30 hover:border-blue-500/60 transition shadow-xl flex flex-col justify-between relative group"
                  >
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="px-2.5 py-0.5 rounded-full text-xs font-mono font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center gap-1.5">
                          <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                          LIVE NOW
                        </span>
                        <span className="text-xs font-mono text-slate-400 flex items-center gap-1">
                          <Clock className="h-3.5 w-3.5" />
                          {exam.duration} Minutes
                        </span>
                      </div>

                      <h3 className="text-lg font-bold text-white group-hover:text-blue-400 transition">
                        {exam.title}
                      </h3>

                      <p className="text-xs text-slate-300 line-clamp-2 leading-relaxed">
                        {exam.description}
                      </p>

                      <div className="flex flex-wrap items-center gap-2 text-xs font-mono text-slate-400 pt-2">
                        <span className="px-2 py-1 rounded-md bg-slate-800/80 border border-white/5">
                          {exam.examQuestions.length} Questions
                        </span>
                        <span className="px-2 py-1 rounded-md bg-slate-800/80 border border-white/5">
                          {exam.totalMarks} Marks
                        </span>
                        <span className="px-2 py-1 rounded-md bg-slate-800/80 border border-white/5">
                          Limit: {exam.violationLimit} Violations
                        </span>
                      </div>
                    </div>

                    <div className="pt-6 mt-4 border-t border-white/5 flex items-center justify-between">
                      <div className="text-xs text-slate-400">
                        Deadline: <span className="text-slate-200">{formatDate(exam.endTime)}</span>
                      </div>

                      <Link
                        href={`/student/exam/${exam.id}`}
                        className={`px-5 py-2.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-lg ${
                          isStarted
                            ? "bg-amber-500 hover:bg-amber-400 text-slate-950 shadow-amber-500/20"
                            : "bg-blue-600 hover:bg-blue-500 text-white shadow-blue-600/30"
                        }`}
                      >
                        {isStarted ? (
                          <>Resume Attempt <ChevronRight className="h-4 w-4" /></>
                        ) : (
                          <>Start Examination <ChevronRight className="h-4 w-4" /></>
                        )}
                      </Link>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        {/* Section 2: Upcoming Scheduled Exams */}
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold tracking-tight text-white flex items-center gap-2">
              <Calendar className="h-5 w-5 text-purple-400" />
              Upcoming Scheduled Exams
            </h2>
            <span className="text-xs font-mono text-slate-400">{upcomingExams.length} Scheduled</span>
          </div>

          {upcomingExams.length === 0 ? (
            <div className="glass-card p-6 rounded-2xl border border-white/5 text-center text-slate-400 text-xs">
              No upcoming exams scheduled at this time.
            </div>
          ) : (
            <div className="grid md:grid-cols-2 gap-4">
              {upcomingExams.map((exam) => (
                <div key={exam.id} className="glass-card rounded-2xl p-5 border border-white/5 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="px-2 py-0.5 rounded-full text-xs font-mono bg-purple-500/10 text-purple-400 border border-purple-500/20">
                      SCHEDULED
                    </span>
                    <span className="text-xs text-slate-400 font-mono">
                      Starts {formatDate(exam.startTime)}
                    </span>
                  </div>
                  <h3 className="font-bold text-white text-base">{exam.title}</h3>
                  <p className="text-xs text-slate-400 line-clamp-2">{exam.description}</p>
                  <div className="text-xs font-mono text-slate-400 pt-2 flex items-center gap-3">
                    <span>Duration: {exam.duration} mins</span>
                    <span>•</span>
                    <span>Total: {exam.totalMarks} marks</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Section 3: Completed Examination Results */}
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold tracking-tight text-white flex items-center gap-2">
              <Award className="h-5 w-5 text-emerald-400" />
              Completed Examinations & Results
            </h2>
            <span className="text-xs font-mono text-slate-400">{completedExams.length} Records</span>
          </div>

          {completedExams.length === 0 ? (
            <div className="glass-card p-6 rounded-2xl border border-white/5 text-center text-slate-400 text-xs">
              You haven&apos;t submitted any exams yet. Completed exam scores will appear here.
            </div>
          ) : (
            <div className="grid md:grid-cols-2 gap-4">
              {completedExams.map((exam) => {
                const attempt = exam.attempts[0];
                return (
                  <div key={exam.id} className="glass-card rounded-2xl p-5 border border-white/5 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="px-2 py-0.5 rounded-full text-xs font-mono font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                        {attempt?.status}
                      </span>
                      <span className="text-xs text-slate-400 font-mono">
                        Submitted: {formatDate(attempt?.submittedAt || exam.endTime)}
                      </span>
                    </div>

                    <h3 className="font-bold text-white text-base">{exam.title}</h3>

                    <div className="flex items-center justify-between p-3 rounded-xl bg-slate-900/60 border border-white/5">
                      <div>
                        <div className="text-[10px] uppercase font-mono text-slate-400">Score Achieved</div>
                        <div className="text-lg font-bold text-emerald-400">
                          {attempt?.totalScore} / {exam.totalMarks}
                          <span className="text-xs text-slate-400 ml-1.5">({attempt?.percentage.toFixed(0)}%)</span>
                        </div>
                      </div>

                      <div className="text-right">
                        <div className="text-[10px] uppercase font-mono text-slate-400">Integrity Log</div>
                        <div className={`text-xs font-semibold ${attempt?.violationCount === 0 ? "text-emerald-400" : "text-amber-400"}`}>
                          {attempt?.violationCount} Violations Recorded
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
