import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { Navbar } from "@/components/Navbar";
import Link from "next/link";
import {
  Clock,
  Calendar,
  PlayCircle,
  ShieldAlert,
  ChevronRight,
  Award,
} from "lucide-react";
import { formatDate } from "@/lib/utils";

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
    (e) => e.attempts[0]?.status === "NOT_STARTED" ||
      ((e.status === "ACTIVE" || e.status === "PUBLISHED") && now >= e.startTime && now <= e.endTime &&
      (!e.attempts[0] || e.attempts[0].status === "IN_PROGRESS"))
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
    <div className="min-h-screen bg-[#f4f7f5] text-[#1c2923] flex flex-col">
      <Navbar user={user} />

      <main className="flex-1 max-w-6xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-9">
        {/* Welcome Banner */}
        <div className="border-b border-[#dce5df] pb-6">
          <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-5">
            <div>
              <div className="text-xs font-semibold uppercase tracking-wider text-[#14885a] mb-2">
                Student portal
              </div>
              <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-[#18251f]">
                Welcome back, {user.name}
              </h1>
              <p className="text-sm text-[#64736b] mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1">
                <span>{user.usn || "Student account"}</span>
                <span aria-hidden="true">·</span>
                <span>{user.department || "Computer Science & Engineering"}</span>
              </p>
            </div>

            <div className="flex items-center gap-2 text-xs text-[#52645a]">
              <ShieldAlert className="h-4 w-4 text-[#14885a]" />
              <span>Exam integrity monitoring enabled</span>
            </div>
          </div>

          {/* Quick Metrics */}
          <div className="grid grid-cols-3 gap-4 mt-6 pt-5 border-t border-[#dce5df]">
            <div>
              <div className="text-xs text-[#6b7b72]">Active exams</div>
              <div className="text-2xl font-semibold text-[#14885a] mt-1">{activeExams.length}</div>
            </div>
            <div>
              <div className="text-xs text-[#6b7b72]">Scheduled</div>
              <div className="text-2xl font-semibold text-[#8b641d] mt-1">{upcomingExams.length}</div>
            </div>
            <div>
              <div className="text-xs text-[#6b7b72]">Completed</div>
              <div className="text-2xl font-semibold text-[#405f91] mt-1">{completedExams.length}</div>
            </div>
          </div>
        </div>

        {/* Section 1: Active Examinations */}
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold tracking-tight text-[#1c2923] flex items-center gap-2">
              <PlayCircle className="h-5 w-5 text-[#14885a]" />
              Active Examinations
            </h2>
            <span className="text-xs text-[#718078]">
              {activeExams.length} Available Now
            </span>
          </div>

          {activeExams.length === 0 ? (
            <div className="bg-white p-7 rounded-lg border border-[#dce5df] text-center text-[#68776f] text-sm">
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
                    className="bg-white rounded-lg p-5 border border-[#dce5df] hover:border-[#82bca0] transition flex flex-col justify-between group"
                  >
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="px-2 py-1 rounded-md text-[11px] font-semibold bg-[#e8f5ed] text-[#167446] flex items-center gap-1.5">
                          <span className="h-1.5 w-1.5 rounded-full bg-[#16884f]" />
                          LIVE NOW
                        </span>
                        <span className="text-xs text-[#68776f] flex items-center gap-1">
                          <Clock className="h-3.5 w-3.5" />
                          {exam.duration} Minutes
                        </span>
                      </div>

                      <h3 className="text-base font-semibold text-[#1c2923] group-hover:text-[#087b49] transition">
                        {exam.title}
                      </h3>

                      <p className="text-sm text-[#68776f] line-clamp-2 leading-relaxed">
                        {exam.description}
                      </p>

                      <div className="flex flex-wrap items-center gap-2 text-xs text-[#68776f] pt-2">
                        <span className="px-2 py-1 rounded-md bg-[#f3f6f4] border border-[#e4ebe6]">
                          {exam.examQuestions.length} Questions
                        </span>
                        <span className="px-2 py-1 rounded-md bg-[#f3f6f4] border border-[#e4ebe6]">
                          {exam.totalMarks} Marks
                        </span>
                        <span className="px-2 py-1 rounded-md bg-[#f3f6f4] border border-[#e4ebe6]">
                          Limit: {exam.violationLimit} Violations
                        </span>
                      </div>
                    </div>

                    <div className="pt-4 mt-4 border-t border-[#e9eeeb] flex items-center justify-between gap-3">
                      <div className="text-xs text-[#68776f]">
                        Ends <span className="text-[#34463c]">{formatDate(exam.endTime)}</span>
                      </div>

                      <Link
                        href={`/student/exam/${exam.id}`}
                        className={`px-4 py-2 rounded-md text-xs font-semibold transition flex items-center gap-1.5 ${
                          isStarted
                            ? "bg-[#f1e8d7] hover:bg-[#e9d9bc] text-[#614516]"
                            : "bg-[#14885a] hover:bg-[#0c7449] text-white"
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
            <h2 className="text-lg font-semibold tracking-tight text-[#1c2923] flex items-center gap-2">
              <Calendar className="h-5 w-5 text-[#8b641d]" />
              Upcoming Scheduled Exams
            </h2>
            <span className="text-xs text-[#718078]">{upcomingExams.length} scheduled</span>
          </div>

          {upcomingExams.length === 0 ? (
            <div className="bg-white p-6 rounded-lg border border-[#dce5df] text-center text-[#68776f] text-sm">
              No upcoming exams scheduled at this time.
            </div>
          ) : (
            <div className="grid md:grid-cols-2 gap-3">
              {upcomingExams.map((exam) => (
                <div key={exam.id} className="bg-white rounded-lg p-5 border border-[#dce5df] space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="px-2 py-1 rounded-md text-[11px] font-semibold bg-[#f1e8d7] text-[#72551f]">
                      SCHEDULED
                    </span>
                    <span className="text-xs text-[#68776f]">
                      Starts {formatDate(exam.startTime)}
                    </span>
                  </div>
                  <h3 className="font-semibold text-[#1c2923] text-base">{exam.title}</h3>
                  <p className="text-sm text-[#68776f] line-clamp-2">{exam.description}</p>
                  <div className="text-xs text-[#68776f] pt-2 flex items-center gap-3">
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
            <h2 className="text-lg font-semibold tracking-tight text-[#1c2923] flex items-center gap-2">
              <Award className="h-5 w-5 text-[#405f91]" />
              Completed Examinations & Results
            </h2>
            <span className="text-xs text-[#718078]">{completedExams.length} records</span>
          </div>

          {completedExams.length === 0 ? (
            <div className="bg-white p-6 rounded-lg border border-[#dce5df] text-center text-[#68776f] text-sm">
              You haven&apos;t submitted any exams yet. Completed exam scores will appear here.
            </div>
          ) : (
            <div className="grid md:grid-cols-2 gap-4">
              {completedExams.map((exam) => {
                const attempt = exam.attempts[0];
                return (
                  <div key={exam.id} className="bg-white rounded-lg p-5 border border-[#dce5df] space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="px-2 py-1 rounded-md text-[11px] font-semibold bg-[#e8f5ed] text-[#167446]">
                        {attempt?.status}
                      </span>
                      <span className="text-xs text-[#68776f]">
                        Submitted: {formatDate(attempt?.submittedAt || exam.endTime)}
                      </span>
                    </div>

                    <h3 className="font-semibold text-[#1c2923] text-base">{exam.title}</h3>

                    <div className="flex items-center justify-between gap-4 pt-3 border-t border-[#e9eeeb]">
                      <div>
                        <div className="text-[10px] uppercase font-semibold text-[#718078]">Score achieved</div>
                        <div className="text-lg font-semibold text-[#14885a]">
                          {attempt?.totalScore} / {exam.totalMarks}
                          <span className="text-xs text-[#718078] ml-1.5">({attempt?.percentage.toFixed(0)}%)</span>
                        </div>
                      </div>

                      <div className="text-right">
                        <div className="text-[10px] uppercase font-semibold text-[#718078]">Integrity log</div>
                        <div className={`text-xs font-medium ${attempt?.violationCount === 0 ? "text-[#14885a]" : "text-[#9b6e20]"}`}>
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
