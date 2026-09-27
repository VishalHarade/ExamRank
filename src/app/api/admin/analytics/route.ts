import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { Role } from "@prisma/client";

export async function GET() {
  const user = await getCurrentUser();
  if (!user || user.role !== Role.ADMIN) {
    return NextResponse.json({ error: "Unauthorized. Admin only." }, { status: 403 });
  }

  // ─── Platform Totals ────────────────────────────────────────────────────────
  const [totalStudents, totalTeachers, totalExams, totalQuestions, totalSubmissions] =
    await Promise.all([
      prisma.user.count({ where: { role: Role.STUDENT } }),
      prisma.user.count({ where: { role: { in: [Role.TEACHER, Role.ADMIN] } } }),
      prisma.exam.count(),
      prisma.question.count(),
      prisma.submission.count(),
    ]);

  // ─── Exam Status Distribution ────────────────────────────────────────────────
  const examsByStatus = await prisma.exam.groupBy({
    by: ["status"],
    _count: { id: true },
  });

  // ─── All Attempts with Scoring ───────────────────────────────────────────────
  const allAttempts = await prisma.examAttempt.findMany({
    select: {
      id: true,
      status: true,
      totalScore: true,
      percentage: true,
      violationCount: true,
      startedAt: true,
      submittedAt: true,
      student: {
        select: {
          id: true,
          name: true,
          usn: true,
          department: true,
          semester: true,
        },
      },
      exam: {
        select: {
          id: true,
          title: true,
          totalMarks: true,
          passPercentage: true,
          targetDepartment: true,
          status: true,
        },
      },
    },
    orderBy: { startedAt: "desc" },
  });

  const finishedAttempts = allAttempts.filter(
    (a) => a.status === "SUBMITTED" || a.status === "AUTO_SUBMITTED" || a.status === "TERMINATED"
  );
  const activeAttempts = allAttempts.filter((a) => a.status === "IN_PROGRESS");
  const terminatedAttempts = allAttempts.filter((a) => a.status === "TERMINATED");

  // ─── Pass / Fail Rates ───────────────────────────────────────────────────────
  const totalEvaluated = finishedAttempts.length;
  const passedAttempts = finishedAttempts.filter(
    (a) => a.totalScore >= ((a.exam as any).passPercentage / 100) * (a.exam as any).totalMarks
  );
  const overallPassRate =
    totalEvaluated > 0 ? Math.round((passedAttempts.length / totalEvaluated) * 100) : 0;

  // ─── Average Scores ──────────────────────────────────────────────────────────
  const avgScore =
    finishedAttempts.length > 0
      ? Number(
          (
            finishedAttempts.reduce((sum, a) => sum + a.totalScore, 0) /
            finishedAttempts.length
          ).toFixed(1)
        )
      : 0;

  // ─── Violation Analytics ─────────────────────────────────────────────────────
  const violationGroups = await prisma.violation.groupBy({
    by: ["type"],
    _count: { id: true },
    orderBy: { _count: { id: "desc" } },
  });

  const totalViolations = await prisma.violation.count();
  const avgViolationsPerAttempt =
    allAttempts.length > 0
      ? Number((totalViolations / allAttempts.length).toFixed(2))
      : 0;

  // ─── Department-wise Participation ──────────────────────────────────────────
  const studentsByDept = await prisma.user.groupBy({
    by: ["department"],
    where: { role: Role.STUDENT },
    _count: { id: true },
  });

  // ─── Submission Status Distribution ─────────────────────────────────────────
  const submissionsByStatus = await prisma.submission.groupBy({
    by: ["status"],
    _count: { id: true },
    orderBy: { _count: { id: "desc" } },
  });

  // ─── Difficulty Distribution in Question Bank ────────────────────────────────
  const questionsByDifficulty = await prisma.question.groupBy({
    by: ["difficulty"],
    _count: { id: true },
  });

  // ─── Recent Exams Performance ────────────────────────────────────────────────
  const allExams = await prisma.exam.findMany({
    include: {
      attempts: {
        select: {
          id: true,
          status: true,
          totalScore: true,
          violationCount: true,
        },
      },
      _count: { select: { examQuestions: true } },
    },
    orderBy: { startTime: "desc" },
    take: 10,
  });

  const examPerformance = allExams.map((exam) => {
    const finished = exam.attempts.filter(
      (a) => a.status === "SUBMITTED" || a.status === "AUTO_SUBMITTED" || a.status === "TERMINATED"
    );
    const avgExamScore =
      finished.length > 0
        ? Number((finished.reduce((s, a) => s + a.totalScore, 0) / finished.length).toFixed(1))
        : 0;
    const examPassThreshold = (exam.passPercentage / 100) * exam.totalMarks;
    const passed = finished.filter((a) => a.totalScore >= examPassThreshold);
    return {
      id: exam.id,
      title: exam.title,
      status: exam.status,
      totalMarks: exam.totalMarks,
      attemptCount: exam.attempts.length,
      activeCount: exam.attempts.filter((a) => a.status === "IN_PROGRESS").length,
      submittedCount: finished.length,
      avgScore: avgExamScore,
      passRate:
        finished.length > 0 ? Math.round((passed.length / finished.length) * 100) : 0,
      questionCount: exam._count.examQuestions,
      totalViolations: exam.attempts.reduce((s, a) => s + a.violationCount, 0),
    };
  });

  // ─── Top Performing Students ─────────────────────────────────────────────────
  const topStudents = await prisma.examAttempt.groupBy({
    by: ["studentId"],
    where: { status: { in: ["SUBMITTED", "AUTO_SUBMITTED"] } },
    _avg: { percentage: true },
    _count: { id: true },
    orderBy: { _avg: { percentage: "desc" } },
    take: 5,
  });

  const topStudentDetails = await Promise.all(
    topStudents.map(async (ts) => {
      const student = await prisma.user.findUnique({
        where: { id: ts.studentId },
        select: { name: true, usn: true, department: true },
      });
      return {
        name: student?.name || "Unknown",
        usn: student?.usn || "N/A",
        department: student?.department || "N/A",
        avgPercentage: Number((ts._avg.percentage || 0).toFixed(1)),
        examsTaken: ts._count.id,
      };
    })
  );

  // ─── Recent Activity Feed ────────────────────────────────────────────────────
  const recentAttempts = allAttempts.slice(0, 8).map((a) => ({
    studentName: a.student.name,
    usn: a.student.usn,
    examTitle: (a.exam as any).title,
    status: a.status,
    score: a.totalScore,
    timestamp: a.submittedAt || a.startedAt,
  }));

  return NextResponse.json({
    overview: {
      totalStudents,
      totalTeachers,
      totalExams,
      totalQuestions,
      totalSubmissions,
      totalAttempts: allAttempts.length,
      activeAttempts: activeAttempts.length,
      terminatedAttempts: terminatedAttempts.length,
      overallPassRate,
      avgScore,
      totalViolations,
      avgViolationsPerAttempt,
    },
    examsByStatus: examsByStatus.map((e) => ({ status: e.status, count: e._count.id })),
    violationsByType: violationGroups.map((v) => ({ type: v.type, count: v._count.id })),
    submissionsByStatus: submissionsByStatus.map((s) => ({
      status: s.status,
      count: s._count.id,
    })),
    questionsByDifficulty: questionsByDifficulty.map((q) => ({
      difficulty: q.difficulty,
      count: q._count.id,
    })),
    studentsByDepartment: studentsByDept.map((d) => ({
      department: d.department || "Unknown",
      count: d._count.id,
    })),
    examPerformance,
    topStudents: topStudentDetails,
    recentActivity: recentAttempts,
  });
}
