import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { AttemptStatus } from "@prisma/client";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const exam = await prisma.exam.findUnique({
      where: { id },
      include: {
        examQuestions: {
          include: {
            question: {
              include: {
                testCases: {
                  where: { isHidden: false }, // Only sample test cases for students
                  orderBy: { orderIndex: "asc" },
                },
              },
            },
          },
          orderBy: { orderIndex: "asc" },
        },
      },
    });

    if (!exam) {
      return NextResponse.json({ error: "Exam not found" }, { status: 404 });
    }

    const now = new Date();

    // Check if exam is within valid time bounds
    if (exam.status !== "ACTIVE" && exam.status !== "PUBLISHED") {
      return NextResponse.json({ error: "This exam is currently not open for attempts." }, { status: 403 });
    }

    if (now < exam.startTime) {
      return NextResponse.json({ error: "This exam has not started yet." }, { status: 403 });
    }

    if (now > exam.endTime) {
      return NextResponse.json({ error: "This exam deadline has already passed." }, { status: 403 });
    }

    // Check for existing attempt
    let attempt = await prisma.examAttempt.findUnique({
      where: {
        examId_studentId: {
          examId: exam.id,
          studentId: user.id,
        },
      },
      include: {
        submissions: true,
      },
    });

    if (attempt) {
      // If already submitted or terminated, reject or return state
      if (attempt.status === AttemptStatus.SUBMITTED || attempt.status === AttemptStatus.AUTO_SUBMITTED || attempt.status === AttemptStatus.TERMINATED) {
        return NextResponse.json({
          attempt,
          exam,
          isFinished: true,
          message: `Exam attempt was previously ${attempt.status.toLowerCase()}.`,
        });
      }

      // Check if authoritative end time has passed
      if (attempt.endTime && now > attempt.endTime) {
        attempt = await prisma.examAttempt.update({
          where: { id: attempt.id },
          data: { status: AttemptStatus.AUTO_SUBMITTED, submittedAt: now },
          include: { submissions: true },
        });
        return NextResponse.json({
          attempt,
          exam,
          isFinished: true,
          message: "Exam time has expired. Your submission was recorded.",
        });
      }

      return NextResponse.json({
        attempt,
        exam,
        isFinished: false,
      });
    }

    // Create fresh attempt with authoritative end time
    const durationMs = exam.duration * 60 * 1000;
    const computedDeadline = new Date(Math.min(now.getTime() + durationMs, exam.endTime.getTime()));

    const ip = req.headers.get("x-forwarded-for") || req.headers.get("x-real-ip") || "127.0.0.1";
    const userAgent = req.headers.get("user-agent") || "Browser";

    attempt = await prisma.examAttempt.create({
      data: {
        examId: exam.id,
        studentId: user.id,
        status: AttemptStatus.IN_PROGRESS,
        startedAt: now,
        endTime: computedDeadline,
        currentQuestionId: exam.examQuestions[0]?.questionId || null,
        ipAddress: ip,
        userAgent: userAgent,
      },
      include: {
        submissions: true,
      },
    });

    return NextResponse.json({
      attempt,
      exam,
      isFinished: false,
    });
  } catch (err: any) {
    console.error("POST /api/exams/[id]/start error:", err);
    return NextResponse.json({ error: "Failed to initiate exam attempt" }, { status: 500 });
  }
}
