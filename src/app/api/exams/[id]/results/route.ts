import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { Role } from "@prisma/client";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id: examId } = await params;
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const exam = await prisma.exam.findUnique({
      where: { id: examId },
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
              select: { id: true, name: true, usn: true, email: true, department: true },
            },
            submissions: {
              select: {
                id: true,
                questionId: true,
                status: true,
                score: true,
                language: true,
                executionTime: true,
                submittedAt: true,
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
      return NextResponse.json({ error: "Exam not found" }, { status: 404 });
    }

    // If student, check if results are published or if they can only see their own attempt
    if (user.role === Role.STUDENT) {
      if (exam.status !== "RESULT_PUBLISHED") {
        return NextResponse.json({
          isPublished: false,
          message: "Results for this examination have not been published yet.",
        });
      }

      const myAttempt = exam.attempts.find((a) => a.studentId === user.id);
      return NextResponse.json({
        isPublished: true,
        exam: {
          id: exam.id,
          title: exam.title,
          totalMarks: exam.totalMarks,
          passPercentage: exam.passPercentage,
        },
        attempt: myAttempt || null,
      });
    }

    // Teacher & Admin Analytics Calculation
    const totalAttempts = exam.attempts.length;
    const scores = exam.attempts.map((a) => a.totalScore);
    const avgScore = totalAttempts > 0 ? (scores.reduce((a, b) => a + b, 0) / totalAttempts) : 0;
    const maxScore = totalAttempts > 0 ? Math.max(...scores) : 0;
    const minScore = totalAttempts > 0 ? Math.min(...scores) : 0;

    const passThreshold = (exam.passPercentage / 100) * exam.totalMarks;
    const passedCount = exam.attempts.filter((a) => a.totalScore >= passThreshold).length;
    const passRate = totalAttempts > 0 ? (passedCount / totalAttempts) * 100 : 0;

    const totalViolations = exam.attempts.reduce((sum, a) => sum + a.violationCount, 0);

    // Question analytics
    const questionAnalytics = exam.examQuestions.map((eq) => {
      const qSubmissions = exam.attempts.flatMap((a) => a.submissions.filter((s) => s.questionId === eq.questionId));
      const acceptedSubmissions = qSubmissions.filter((s) => s.status === "ACCEPTED");
      const studentsWhoAttempted = new Set(qSubmissions.map((s) => s.id)).size;

      return {
        questionId: eq.question.id,
        title: eq.question.title,
        difficulty: eq.question.difficulty,
        marks: eq.marks,
        totalSubmissions: qSubmissions.length,
        acceptedCount: acceptedSubmissions.length,
        accuracy: qSubmissions.length > 0 ? Math.round((acceptedSubmissions.length / qSubmissions.length) * 100) : 0,
      };
    });

    return NextResponse.json({
      exam: {
        id: exam.id,
        title: exam.title,
        status: exam.status,
        duration: exam.duration,
        totalMarks: exam.totalMarks,
        passPercentage: exam.passPercentage,
        startTime: exam.startTime,
        endTime: exam.endTime,
      },
      summary: {
        totalAttempts,
        avgScore: Number(avgScore.toFixed(1)),
        maxScore,
        minScore,
        passRate: Number(passRate.toFixed(1)),
        totalViolations,
      },
      questionAnalytics,
      attempts: exam.attempts.map((att) => ({
        id: att.id,
        studentName: att.student.name,
        usn: att.student.usn,
        email: att.student.email,
        status: att.status,
        startedAt: att.startedAt,
        submittedAt: att.submittedAt,
        totalScore: att.totalScore,
        percentage: Number(att.percentage.toFixed(1)),
        isPassed: att.totalScore >= passThreshold,
        violationCount: att.violationCount,
        submissionsCount: att.submissions.length,
      })),
    });
  } catch (err: any) {
    console.error("Results API error:", err);
    return NextResponse.json({ error: "Failed to generate results" }, { status: 500 });
  }
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id: examId } = await params;
    const user = await getCurrentUser();
    if (!user || (user.role !== Role.TEACHER && user.role !== Role.ADMIN)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const { action } = await req.json();

    if (action === "PUBLISH_RESULTS") {
      await prisma.exam.update({
        where: { id: examId },
        data: { status: "RESULT_PUBLISHED" },
      });
      return NextResponse.json({ success: true, message: "Results published to students." });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (err: any) {
    console.error("Results update error:", err);
    return NextResponse.json({ error: "Failed to process results action" }, { status: 500 });
  }
}
