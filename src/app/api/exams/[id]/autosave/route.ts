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

    const { questionId, language, code } = await req.json();

    const attempt = await prisma.examAttempt.findUnique({
      where: {
        examId_studentId: {
          examId,
          studentId: user.id,
        },
      },
    });

    if (!attempt || attempt.status !== AttemptStatus.IN_PROGRESS) {
      return NextResponse.json({ error: "No active exam attempt found." }, { status: 400 });
    }

    // Check timer expiration
    if (attempt.endTime && new Date() > attempt.endTime) {
      await prisma.examAttempt.update({
        where: { id: attempt.id },
        data: { status: AttemptStatus.AUTO_SUBMITTED, submittedAt: new Date() },
      });
      return NextResponse.json({ error: "Exam time has expired.", isExpired: true }, { status: 403 });
    }

    // Parse existing autosavedCode JSON
    let autosavedData: Record<string, { code: string; language: string; updatedAt: string }> = {};
    if (attempt.autosavedCode) {
      try {
        autosavedData = JSON.parse(attempt.autosavedCode);
      } catch {
        autosavedData = {};
      }
    }

    if (questionId) {
      autosavedData[questionId] = {
        code: code || "",
        language: language || "python",
        updatedAt: new Date().toISOString(),
      };
    }

    await prisma.examAttempt.update({
      where: { id: attempt.id },
      data: {
        currentQuestionId: questionId || attempt.currentQuestionId,
        autosavedCode: JSON.stringify(autosavedData),
      },
    });

    return NextResponse.json({ success: true, savedAt: new Date() });
  } catch (err: any) {
    console.error("Autosave error:", err);
    return NextResponse.json({ error: "Autosave failed" }, { status: 500 });
  }
}
