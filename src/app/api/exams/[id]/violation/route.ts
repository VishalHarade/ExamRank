import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { AttemptStatus, Severity, ViolationType } from "@prisma/client";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id: examId } = await params;
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { type, metadata } = await req.json();

    const attempt = await prisma.examAttempt.findUnique({
      where: {
        examId_studentId: {
          examId,
          studentId: user.id,
        },
      },
      include: {
        exam: true,
      },
    });

    if (!attempt || attempt.status !== AttemptStatus.IN_PROGRESS) {
      return NextResponse.json({ error: "No active attempt to log violation" }, { status: 400 });
    }

    const currentCount = attempt.violationCount + 1;
    const limit = attempt.exam.violationLimit || 3;

    let severity: Severity = Severity.WARNING;
    if (currentCount >= limit) {
      severity = Severity.CRITICAL;
    } else if (currentCount === limit - 1) {
      severity = Severity.FINAL_WARNING;
    }

    // Record violation entry
    const violation = await prisma.violation.create({
      data: {
        attemptId: attempt.id,
        studentId: user.id,
        type: (type as ViolationType) || ViolationType.TAB_SWITCH,
        severity,
        metadata: metadata || `Violation #${currentCount}: ${type}`,
      },
    });

    let isTerminated = false;

    if (currentCount >= limit) {
      isTerminated = true;
      await prisma.examAttempt.update({
        where: { id: attempt.id },
        data: {
          violationCount: currentCount,
          status: AttemptStatus.TERMINATED,
          submittedAt: new Date(),
        },
      });
    } else {
      await prisma.examAttempt.update({
        where: { id: attempt.id },
        data: {
          violationCount: currentCount,
        },
      });
    }

    return NextResponse.json({
      success: true,
      violationCount: currentCount,
      violationLimit: limit,
      severity,
      isTerminated,
      message: isTerminated
        ? `Maximum violation limit reached (${currentCount}/${limit}). Exam has been terminated.`
        : `Violation logged (${currentCount}/${limit}). Please maintain exam integrity.`,
    });
  } catch (err: any) {
    console.error("Violation logging error:", err);
    return NextResponse.json({ error: "Failed to record violation" }, { status: 500 });
  }
}
