import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { AttemptStatus } from "@prisma/client";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id: examId } = await params;
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { isAutoSubmit } = await req.json().catch(() => ({ isAutoSubmit: false }));

    const attempt = await prisma.examAttempt.findUnique({
      where: {
        examId_studentId: {
          examId,
          studentId: user.id,
        },
      },
      include: {
        submissions: true,
      },
    });

    if (!attempt) {
      return NextResponse.json({ error: "Attempt not found" }, { status: 404 });
    }

    if (attempt.status === AttemptStatus.SUBMITTED || attempt.status === AttemptStatus.AUTO_SUBMITTED || attempt.status === AttemptStatus.TERMINATED) {
      return NextResponse.json({
        success: true,
        message: "Exam was already submitted",
        attempt,
      });
    }

    const finalStatus = isAutoSubmit ? AttemptStatus.AUTO_SUBMITTED : AttemptStatus.SUBMITTED;

    const updated = await prisma.examAttempt.update({
      where: { id: attempt.id },
      data: {
        status: finalStatus,
        submittedAt: new Date(),
      },
      include: {
        exam: {
          select: {
            title: true,
            totalMarks: true,
            passPercentage: true,
          },
        },
      },
    });

    return NextResponse.json({
      success: true,
      message: isAutoSubmit ? "Exam automatically submitted" : "Exam submitted successfully",
      attempt: updated,
    });
  } catch (err: any) {
    console.error("Submit Exam error:", err);
    return NextResponse.json({ error: "Failed to submit exam" }, { status: 500 });
  }
}
