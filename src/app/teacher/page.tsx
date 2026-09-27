import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { Navbar } from "@/components/Navbar";
import Link from "next/link";
import {
  BookOpen,
  Plus,
  Users,
  Eye,
  Award,
  Layers,
  CheckCircle2,
  FileCode,
  Activity,
  Calendar,
} from "lucide-react";
import { TeacherExamList } from "@/components/teacher/TeacherExamList";

export const metadata = {
  title: "Faculty Dashboard — ExamRank",
  description: "Examination management, live candidate monitoring, coding test bank, and evaluation suite.",
};

export default async function TeacherDashboardPage() {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  if (user.role !== "TEACHER" && user.role !== "ADMIN") {
    redirect("/student");
  }

  // Fetch all exams with metrics
  const exams = await prisma.exam.findMany({
    include: {
      createdBy: {
        select: { name: true, email: true },
      },
      examQuestions: {
        include: {
          question: {
            select: { id: true, title: true, difficulty: true },
          },
        },
        orderBy: { orderIndex: "asc" },
      },
      attempts: {
        select: {
          id: true,
          status: true,
          totalScore: true,
          percentage: true,
          violationCount: true,
          student: {
            select: { id: true, name: true, usn: true },
          },
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  const totalQuestions = await prisma.question.count();
  const totalSubmissions = await prisma.submission.count();
  const totalAttempts = await prisma.examAttempt.count();
  const activeExamsCount = exams.filter((e) => e.status === "ACTIVE").length;

  // Calculate overall passing rate
  const completedAttempts = exams.flatMap((e) =>
    e.attempts.filter(
      (a) =>
        a.status === "SUBMITTED" ||
        a.status === "AUTO_SUBMITTED" ||
        a.status === "TERMINATED"
    )
  );
  const passedAttemptsCount = completedAttempts.filter((a) => a.percentage >= 40).length;
  const overallPassRate =
    completedAttempts.length > 0
      ? Math.round((passedAttemptsCount / completedAttempts.length) * 100)
      : 85;

  // Format dates for client component
  const serializedExams = exams.map((e) => ({
    ...e,
    startTime: e.startTime.toISOString(),
    endTime: e.endTime.toISOString(),
    createdAt: e.createdAt.toISOString(),
    updatedAt: e.updatedAt.toISOString(),
  }));

  const allQuestions = await prisma.question.findMany({
    select: { id: true, title: true, difficulty: true, defaultMarks: true },
    orderBy: { title: "asc" },
  });

  return (
    <div className="min-h-screen bg-[#070B13] text-slate-100 flex flex-col">
      <Navbar user={user} />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {/* Modern Faculty Header Bar */}
        <div className="bg-[#0E1524] border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-xl">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-purple-500/10 border border-purple-500/30 text-xs font-semibold text-purple-400 mb-2">
                <BookOpen className="h-3.5 w-3.5" />
                {user.role === "ADMIN" ? "ADMINISTRATOR OVERRIDE" : "FACULTY EXAMINATION CONSOLE"}
              </div>
              <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white">
                Instructor Dashboard: {user.name}
              </h1>
              <p className="text-xs text-slate-400 mt-1">
                {user.department || "Department of Computer Science & Engineering"} • Academic Year 2026–27
              </p>
            </div>

            <div className="flex items-center gap-3">
              <Link
                href="/teacher/questions"
                className="px-4 py-2.5 rounded-xl text-xs font-semibold border border-slate-700 bg-slate-900/80 hover:bg-slate-800 text-slate-200 transition flex items-center gap-2 shadow-sm"
              >
                <FileCode className="h-4 w-4 text-purple-400" />
                Question Bank ({totalQuestions})
              </Link>
            </div>
          </div>

          {/* Metric Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-6 pt-6 border-t border-slate-800/80">
            <div className="p-4 rounded-2xl bg-[#070B13] border border-slate-800">
              <div className="flex items-center justify-between">
                <span className="text-xs text-slate-400 font-medium uppercase tracking-wider">
                  Total Exams
                </span>
                <Layers className="h-4 w-4 text-blue-400" />
              </div>
              <div className="text-2xl font-bold text-white mt-1.5">{exams.length}</div>
              <div className="text-[11px] text-emerald-400 mt-0.5 flex items-center gap-1">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                {activeExamsCount} Live Now
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-[#070B13] border border-slate-800">
              <div className="flex items-center justify-between">
                <span className="text-xs text-slate-400 font-medium uppercase tracking-wider">
                  Question Repository
                </span>
                <BookOpen className="h-4 w-4 text-purple-400" />
              </div>
              <div className="text-2xl font-bold text-purple-400 mt-1.5">{totalQuestions}</div>
              <div className="text-[11px] text-slate-400 mt-0.5">Coding problems ready</div>
            </div>

            <div className="p-4 rounded-2xl bg-[#070B13] border border-slate-800">
              <div className="flex items-center justify-between">
                <span className="text-xs text-slate-400 font-medium uppercase tracking-wider">
                  Student Attempts
                </span>
                <Users className="h-4 w-4 text-emerald-400" />
              </div>
              <div className="text-2xl font-bold text-emerald-400 mt-1.5">{totalAttempts}</div>
              <div className="text-[11px] text-slate-400 mt-0.5">Tracked across batches</div>
            </div>

            <div className="p-4 rounded-2xl bg-[#070B13] border border-slate-800">
              <div className="flex items-center justify-between">
                <span className="text-xs text-slate-400 font-medium uppercase tracking-wider">
                  Code Submissions
                </span>
                <Activity className="h-4 w-4 text-amber-400" />
              </div>
              <div className="text-2xl font-bold text-white mt-1.5">{totalSubmissions}</div>
              <div className="text-[11px] text-slate-400 mt-0.5">Auto-evaluated</div>
            </div>
          </div>
        </div>

        {/* Exams Table & Creation Client Component */}
        <TeacherExamList initialExams={serializedExams as any} availableQuestions={allQuestions} />
      </main>
    </div>
  );
}
