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

    const question = await prisma.question.findUnique({
      where: { id },
      include: {
        testCases: {
          orderBy: { orderIndex: "asc" },
        },
      },
    });

    if (!question) {
      return NextResponse.json({ error: "Question not found" }, { status: 404 });
    }

    return NextResponse.json({ question });
  } catch (err: any) {
    console.error("GET /api/questions/[id] error:", err);
    return NextResponse.json({ error: "Failed to load question" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const user = await getCurrentUser();
    if (!user || (user.role !== Role.TEACHER && user.role !== Role.ADMIN)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    await prisma.question.delete({
      where: { id },
    });

    return NextResponse.json({ success: true, message: "Question deleted" });
  } catch (err: any) {
    console.error("DELETE /api/questions/[id] error:", err);
    return NextResponse.json({ error: "Failed to delete question" }, { status: 500 });
  }
}
