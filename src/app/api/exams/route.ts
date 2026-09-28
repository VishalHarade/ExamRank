import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { Role } from "@prisma/client";

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (user.role === Role.STUDENT) {
      // Return published/scheduled/active/result_published exams
      const exams = await prisma.exam.findMany({
        where: {
          status: {
            in: ["PUBLISHED", "SCHEDULED", "ACTIVE", "ENDED", "RESULT_PUBLISHED"],
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
            },
          },
        },
        orderBy: { startTime: "desc" },
      });

      return NextResponse.json({ exams });
    } else {
      // Teacher / Admin: return all exams with full attempt and question metrics
      const exams = await prisma.exam.findMany({
        include: {
          createdBy: {
            select: { name: true, email: true },
          },
          examQuestions: {
            include: {
              question: {
                select: { id: true, title: true, difficulty: true },
              },
            },
            orderBy: { orderIndex: "asc" },
          },
          attempts: {
            select: {
              id: true,
              status: true,
              totalScore: true,
              percentage: true,
              violationCount: true,
              student: {
                select: { id: true, name: true, usn: true, email: true },
              },
            },
          },
        },
        orderBy: { createdAt: "desc" },
      });

      return NextResponse.json({ exams });
    }
  } catch (err: unknown) {
    console.error("GET /api/exams error:", err);
    return NextResponse.json({ error: "Failed to load exams" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user || (user.role !== Role.TEACHER && user.role !== Role.ADMIN)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const body = await req.json();
    const {
      title,
      description,
      instructions,
      duration,
      startTime,
      endTime,
      status,
      violationLimit,
      passPercentage,
      allowedLanguages,
      questionIds, // array of question IDs
    } = body;

    if (!title || !duration || !startTime || !endTime) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const exam = await prisma.exam.create({
      data: {
        title,
        description: description || "",
        instructions: instructions || "Standard Examination rules apply.",
        duration: parseInt(duration),
        startTime: new Date(startTime),
        endTime: new Date(endTime),
        status: status || "ACTIVE",
        violationLimit: violationLimit ? parseInt(violationLimit) : 3,
        passPercentage: passPercentage ? parseFloat(passPercentage) : 40,
        totalMarks: questionIds?.length ? questionIds.length * 20 : 100,
        allowedLanguages: allowedLanguages || "c,cpp,python,javascript",
        createdById: user.id,
        examQuestions: questionIds && questionIds.length > 0 ? {
          create: questionIds.map((qId: string, idx: number) => ({
            questionId: qId,
            orderIndex: idx,
            marks: 20,
          })),
        } : undefined,
      },
      include: {
        examQuestions: true,
      },
    });

    return NextResponse.json({ success: true, exam }, { status: 201 });
  } catch (err: unknown) {
    console.error("POST /api/exams error:", err);
    return NextResponse.json({ error: err instanceof Error ? err.message : "Failed to create exam" }, { status: 500 });
  }
}
