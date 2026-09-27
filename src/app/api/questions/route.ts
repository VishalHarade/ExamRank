import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { Role, Difficulty } from "@prisma/client";

export async function GET(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const difficulty = searchParams.get("difficulty");

    const questions = await prisma.question.findMany({
      where: difficulty ? { difficulty: difficulty.toUpperCase() as Difficulty } : undefined,
      include: {
        createdBy: {
          select: { name: true, email: true },
        },
        testCases: {
          select: {
            id: true,
            isHidden: true,
            marks: true,
            input: true,
            expectedOutput: true,
          },
        },
        _count: {
          select: { submissions: true, examQuestions: true },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ questions });
  } catch (err: any) {
    console.error("GET /api/questions error:", err);
    return NextResponse.json({ error: "Failed to load questions" }, { status: 500 });
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
      inputFormat,
      outputFormat,
      constraints,
      difficulty,
      allowedLanguages,
      timeLimit,
      memoryLimit,
      defaultMarks,
      starterCode,
      tags,
      testCases,
    } = body;

    if (!title || !description || !inputFormat || !outputFormat) {
      return NextResponse.json({ error: "Missing required question fields" }, { status: 400 });
    }

    const question = await prisma.question.create({
      data: {
        title,
        slug: title.toLowerCase().replace(/[^a-z0-9]+/g, "-"),
        description,
        inputFormat,
        outputFormat,
        constraints: constraints || "None",
        difficulty: (difficulty as Difficulty) || Difficulty.MEDIUM,
        allowedLanguages: allowedLanguages || "c,cpp,python,javascript",
        timeLimit: timeLimit ? parseInt(timeLimit) : 2000,
        memoryLimit: memoryLimit ? parseInt(memoryLimit) : 256,
        defaultMarks: defaultMarks ? parseInt(defaultMarks) : 10,
        starterCode: typeof starterCode === "object" ? JSON.stringify(starterCode) : starterCode,
        tags: tags || "general",
        createdById: user.id,
        testCases: testCases && testCases.length > 0 ? {
          create: testCases.map((tc: any, idx: number) => ({
            input: tc.input,
            expectedOutput: tc.expectedOutput,
            explanation: tc.explanation || null,
            marks: tc.marks ? parseInt(tc.marks) : 5,
            isHidden: !!tc.isHidden,
            orderIndex: idx,
          })),
        } : undefined,
      },
      include: {
        testCases: true,
      },
    });

    return NextResponse.json({ success: true, question }, { status: 201 });
  } catch (err: any) {
    console.error("POST /api/questions error:", err);
    return NextResponse.json({ error: err.message || "Failed to create question" }, { status: 500 });
  }
}
