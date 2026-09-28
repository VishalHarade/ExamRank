import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { Role } from "@prisma/client";

// POST /api/admin/attempts/retry — Allow exam retry for student(s)
export async function POST(req: NextRequest) {
  try {
    const admin = await getCurrentUser();
    if (!admin || admin.role !== Role.ADMIN) {
      return NextResponse.json({ error: "Unauthorized: Administrator access required" }, { status: 403 });
    }

    const body = await req.json();
    const { attemptId, attemptIds } = body;

    const idsToProcess: string[] = [];
    if (attemptId && typeof attemptId === "string") {
      idsToProcess.push(attemptId);
    }
    if (Array.isArray(attemptIds)) {
      idsToProcess.push(...attemptIds.filter((id) => typeof id === "string"));
    }

    const uniqueIds = Array.from(new Set(idsToProcess));

    if (uniqueIds.length === 0) {
      return NextResponse.json({ error: "attemptId or attemptIds array is required" }, { status: 400 });
    }

    // Fetch existing attempts with student and exam info for auditing
    const existingAttempts = await prisma.examAttempt.findMany({
      where: { id: { in: uniqueIds } },
      include: {
        student: { select: { id: true, name: true, email: true, usn: true } },
        exam: { select: { id: true, title: true } },
      },
    });

    if (existingAttempts.length === 0) {
      return NextResponse.json({ error: "No matching exam attempts found" }, { status: 404 });
    }

    const validAttemptIds = existingAttempts.map((a) => a.id);

    const resetResult = await prisma.$transaction(async (tx) => {
      await tx.submissionTestResult.deleteMany({
        where: { submission: { attemptId: { in: validAttemptIds } } },
      });
      await tx.submission.deleteMany({ where: { attemptId: { in: validAttemptIds } } });
      await tx.violation.deleteMany({ where: { attemptId: { in: validAttemptIds } } });

      const updatedAttempts = await tx.examAttempt.updateMany({
        where: { id: { in: validAttemptIds } },
        data: {
          status: "NOT_STARTED",
          startedAt: null,
          submittedAt: null,
          endTime: null,
          totalScore: 0,
          percentage: 0,
          violationCount: 0,
          currentQuestionId: null,
          autosavedCode: null,
        },
      });

      await tx.auditLog.createMany({
        data: existingAttempts.map((att) => ({
          userId: admin.id,
          action: "ALLOW_EXAM_RETRY",
          entity: "ExamAttempt",
          entityId: att.id,
          details: JSON.stringify({
            studentId: att.student.id,
            studentName: att.student.name,
            studentEmail: att.student.email,
            studentUsn: att.student.usn,
            examId: att.exam.id,
            examTitle: att.exam.title,
            adminId: admin.id,
            adminName: admin.name,
            timestamp: new Date().toISOString(),
          }),
        })),
      });

      return updatedAttempts;
    });

    return NextResponse.json({
      success: true,
      unlockedCount: resetResult.count,
      message: `Exam retry successfully granted for ${resetResult.count} student attempt(s). They can now retake the exam immediately.`,
      retriedStudents: existingAttempts.map((a) => ({
        studentName: a.student.name,
        examTitle: a.exam.title,
        usn: a.student.usn,
      })),
    });
  } catch (err: unknown) {
    console.error("POST /api/admin/attempts/retry error:", err);
    return NextResponse.json({ error: "Failed to allow exam retry" }, { status: 500 });
  }
}
