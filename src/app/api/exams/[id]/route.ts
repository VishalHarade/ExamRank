import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { Role } from "@prisma/client";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const exam = await prisma.exam.findUnique({
      where: { id },
      include: {
        createdBy: {
          select: { name: true, department: true },
        },
        examQuestions: {
          include: {
            question: {
              include: {
                testCases: {
                  where: user.role === Role.STUDENT ? { isHidden: false } : undefined,
                  select: {
                    id: true,
                    input: true,
                    expectedOutput: true,
                    explanation: true,
                    marks: true,
                    isHidden: true,
                    orderIndex: true,
                  },
                  orderBy: { orderIndex: "asc" },
                },
              },
            },
          },
          orderBy: { orderIndex: "asc" },
        },
        attempts: user.role === Role.STUDENT ? {
          where: { studentId: user.id },
          include: {
            submissions: {
              orderBy: { submittedAt: "desc" },
            },
            violations: {
              orderBy: { timestamp: "desc" },
            },
          },
        } : undefined,
      },
    });

    if (!exam) {
      return NextResponse.json({ error: "Exam not found" }, { status: 404 });
    }

    return NextResponse.json({ exam });
  } catch (err: unknown) {
    console.error("GET /api/exams/[id] error:", err);
    return NextResponse.json({ error: "Failed to load exam" }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const user = await getCurrentUser();
    if (!user || (user.role !== Role.TEACHER && user.role !== Role.ADMIN)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const body = await req.json();
    const existing = await prisma.exam.findUnique({
      where: { id },
      select: { id: true, createdById: true },
    });
    if (!existing) {
      return NextResponse.json({ error: "Exam not found" }, { status: 404 });
    }
    if (user.role === Role.TEACHER && existing.createdById !== user.id) {
      return NextResponse.json({ error: "You can only edit examinations you created" }, { status: 403 });
    }

    if (body.startTime && body.endTime && new Date(body.endTime) <= new Date(body.startTime)) {
      return NextResponse.json({ error: "Exam end time must be after its start time" }, { status: 400 });
    }

    const updated = await prisma.$transaction(async (tx) => {
      const exam = await tx.exam.update({
        where: { id },
        data: {
          title: typeof body.title === "string" ? body.title.trim() : undefined,
          description: typeof body.description === "string" ? body.description : undefined,
          instructions: typeof body.instructions === "string" ? body.instructions : undefined,
          duration: Number.isFinite(Number(body.duration)) ? Number(body.duration) : undefined,
          startTime: body.startTime ? new Date(body.startTime) : undefined,
          endTime: body.endTime ? new Date(body.endTime) : undefined,
          status: body.status,
          violationLimit: Number.isFinite(Number(body.violationLimit)) ? Number(body.violationLimit) : undefined,
          passPercentage: Number.isFinite(Number(body.passPercentage)) ? Number(body.passPercentage) : undefined,
          totalMarks: Array.isArray(body.questionIds) ? body.questionIds.length * 20 : undefined,
        },
      });

      if (Array.isArray(body.questionIds)) {
        await tx.examQuestion.deleteMany({ where: { examId: id } });
        if (body.questionIds.length > 0) {
          await tx.examQuestion.createMany({
            data: body.questionIds.map((questionId: string, orderIndex: number) => ({
              examId: id,
              questionId,
              orderIndex,
              marks: 20,
            })),
          });
        }
      }

      return exam;
    });

    return NextResponse.json({ success: true, exam: updated });
  } catch (err: unknown) {
    console.error("PATCH /api/exams/[id] error:", err);
    return NextResponse.json({ error: "Failed to update exam" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const user = await getCurrentUser();
    if (!user || (user.role !== Role.TEACHER && user.role !== Role.ADMIN)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    await prisma.exam.delete({
      where: { id },
    });

    return NextResponse.json({ success: true, message: "Exam deleted" });
  } catch (err: unknown) {
    console.error("DELETE /api/exams/[id] error:", err);
    return NextResponse.json({ error: "Failed to delete exam" }, { status: 500 });
  }
}
