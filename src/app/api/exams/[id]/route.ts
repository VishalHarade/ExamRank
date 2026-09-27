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
  } catch (err: any) {
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
    const updated = await prisma.exam.update({
      where: { id },
      data: {
        ...body,
        startTime: body.startTime ? new Date(body.startTime) : undefined,
        endTime: body.endTime ? new Date(body.endTime) : undefined,
      },
    });

    return NextResponse.json({ success: true, exam: updated });
  } catch (err: any) {
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
  } catch (err: any) {
    console.error("DELETE /api/exams/[id] error:", err);
    return NextResponse.json({ error: "Failed to delete exam" }, { status: 500 });
  }
}
