import { getCurrentUser } from "@/lib/auth";
import { redirect } from "next/navigation";
import { Navbar } from "@/components/Navbar";
import { ExamResultsView } from "@/components/teacher/ExamResultsView";
import { prisma } from "@/lib/prisma";

export default async function ResultsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const user = await getCurrentUser();

  if (!user || (user.role !== "TEACHER" && user.role !== "ADMIN")) {
    redirect("/login");
  }

  const exam = await prisma.exam.findUnique({
    where: { id },
    include: {
      examQuestions: {
        include: {
          question: {
            select: { id: true, title: true, difficulty: true, defaultMarks: true },
          },
        },
        orderBy: { orderIndex: "asc" },
      },
      attempts: {
        include: {
          student: {
            select: { id: true, name: true, usn: true, email: true },
          },
          submissions: {
            select: {
              id: true,
              questionId: true,
              status: true,
              score: true,
            },
          },
          violations: {
            select: { id: true, type: true, severity: true, timestamp: true },
          },
        },
        orderBy: { totalScore: "desc" },
      },
    },
  });

  if (!exam) {
    redirect("/teacher");
  }

  const totalAttempts = exam.attempts.length;
  const scores = exam.attempts.map((a) => a.totalScore);
  const avgScore =
    totalAttempts > 0 ? scores.reduce((a, b) => a + b, 0) / totalAttempts : 0;
  const passThreshold = (exam.passPercentage / 100) * exam.totalMarks;
  const passedCount = exam.attempts.filter(
    (a) => a.totalScore >= passThreshold
  ).length;

  const data = {
    exam: {
      id: exam.id,
      title: exam.title,
      status: exam.status,
      duration: exam.duration,
      totalMarks: exam.totalMarks,
      passPercentage: exam.passPercentage,
      startTime: exam.startTime.toISOString(),
      endTime: exam.endTime.toISOString(),
    },
    summary: {
      totalAttempts,
      avgScore: Number(avgScore.toFixed(1)),
      maxScore: totalAttempts > 0 ? Math.max(...scores) : 0,
      minScore: totalAttempts > 0 ? Math.min(...scores) : 0,
      passRate:
        totalAttempts > 0
          ? Number(((passedCount / totalAttempts) * 100).toFixed(1))
          : 0,
      totalViolations: exam.attempts.reduce(
        (sum, a) => sum + a.violationCount,
        0
      ),
    },
    questionAnalytics: exam.examQuestions.map((eq) => {
      const qSubmissions = exam.attempts.flatMap((a) =>
        a.submissions.filter((s) => s.questionId === eq.questionId)
      );
      const accepted = qSubmissions.filter((s) => s.status === "ACCEPTED");
      return {
        questionId: eq.question.id,
        title: eq.question.title,
        difficulty: eq.question.difficulty as string,
        marks: eq.marks,
        totalSubmissions: qSubmissions.length,
        acceptedCount: accepted.length,
        accuracy:
          qSubmissions.length > 0
            ? Math.round((accepted.length / qSubmissions.length) * 100)
            : 0,
      };
    }),
    attempts: exam.attempts.map((att) => ({
      id: att.id,
      studentName: att.student.name,
      usn: att.student.usn,
      email: att.student.email,
      status: att.status,
      startedAt: att.startedAt ? att.startedAt.toISOString() : null,
      submittedAt: att.submittedAt ? att.submittedAt.toISOString() : null,
      totalScore: att.totalScore,
      percentage: Number(att.percentage.toFixed(1)),
      isPassed: att.totalScore >= passThreshold,
      violationCount: att.violationCount,
      submissionsCount: att.submissions.length,
    })),
  };

  return (
    <div className="min-h-screen bg-[#070b12] text-slate-100 flex flex-col">
      <Navbar user={user} />
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <ExamResultsView data={data} />
      </main>
    </div>
  );
}
