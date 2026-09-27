import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { Role } from "@prisma/client";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id: examId } = await params;
    const user = await getCurrentUser();
    if (!user || (user.role !== Role.TEACHER && user.role !== Role.ADMIN)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const exam = await prisma.exam.findUnique({
      where: { id: examId },
      include: {
        examQuestions: {
          include: {
            question: {
              select: { id: true, title: true },
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
                passedCount: true,
                totalTestCases: true,
                submittedAt: true,
              },
              orderBy: { submittedAt: "desc" },
            },
            violations: {
              select: {
                id: true,
                type: true,
                severity: true,
                metadata: true,
                timestamp: true,
              },
              orderBy: { timestamp: "desc" },
            },
          },
          orderBy: { startedAt: "desc" },
        },
      },
    });

    if (!exam) {
      return NextResponse.json({ error: "Exam not found" }, { status: 404 });
    }

    const now = new Date();

    const studentLiveStats = exam.attempts.map((att) => {
      let secondsRemaining = 0;
      if (att.endTime) {
        secondsRemaining = Math.max(0, Math.floor((att.endTime.getTime() - now.getTime()) / 1000));
      }

      // Check current question title
      const currentQ = exam.examQuestions.find((eq) => eq.questionId === att.currentQuestionId);

      return {
        attemptId: att.id,
        studentId: att.student.id,
        studentName: att.student.name,
        usn: att.student.usn,
        email: att.student.email,
        department: att.student.department,
        status: att.status,
        startedAt: att.startedAt,
        submittedAt: att.submittedAt,
        totalScore: att.totalScore,
        percentage: att.percentage,
        violationCount: att.violationCount,
        violations: att.violations,
        secondsRemaining,
        currentQuestionId: att.currentQuestionId,
        currentQuestionTitle: currentQ?.question.title || "Not started",
        totalSubmissions: att.submissions.length,
        latestSubmission: att.submissions[0] || null,
        ipAddress: att.ipAddress,
      };
    });

    return NextResponse.json({
      examId: exam.id,
      title: exam.title,
      status: exam.status,
      duration: exam.duration,
      totalMarks: exam.totalMarks,
      violationLimit: exam.violationLimit,
      totalRegisteredOrAttempted: exam.attempts.length,
      activeNow: exam.attempts.filter((a) => a.status === "IN_PROGRESS").length,
      submittedCount: exam.attempts.filter((a) => a.status === "SUBMITTED" || a.status === "AUTO_SUBMITTED").length,
      terminatedCount: exam.attempts.filter((a) => a.status === "TERMINATED").length,
      students: studentLiveStats,
      serverTime: now.toISOString(),
    });
  } catch (err: any) {
    console.error("Live monitor error:", err);
    return NextResponse.json({ error: "Failed to load live monitor" }, { status: 500 });
  }
}
