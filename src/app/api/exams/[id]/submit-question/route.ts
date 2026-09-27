import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { judgeSubmission, JudgeTestCase } from "@/lib/judge";
import { AttemptStatus } from "@prisma/client";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id: examId } = await params;
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { questionId, language, sourceCode } = await req.json();

    if (!questionId || !language || !sourceCode) {
      return NextResponse.json({ error: "Incomplete submission payload" }, { status: 400 });
    }

    // Verify active attempt
    const attempt = await prisma.examAttempt.findUnique({
      where: {
        examId_studentId: {
          examId,
          studentId: user.id,
        },
      },
    });

    if (!attempt || attempt.status !== AttemptStatus.IN_PROGRESS) {
      return NextResponse.json({ error: "Exam attempt is not currently active" }, { status: 403 });
    }

    // Fetch all test cases for this question
    const testCases = await prisma.testCase.findMany({
      where: { questionId },
      orderBy: { orderIndex: "asc" },
    });

    if (testCases.length === 0) {
      return NextResponse.json({ error: "Question has no test cases configured." }, { status: 400 });
    }

    // Judge submission
    const judgeInput: JudgeTestCase[] = testCases.map((tc) => ({
      id: tc.id,
      input: tc.input,
      expectedOutput: tc.expectedOutput,
      marks: tc.marks,
      isHidden: tc.isHidden,
      explanation: tc.explanation,
    }));

    const evaluation = await judgeSubmission(language, sourceCode, judgeInput, 3000);

    // Create Submission record
    const submission = await prisma.submission.create({
      data: {
        attemptId: attempt.id,
        questionId,
        language,
        sourceCode,
        status: evaluation.status,
        score: evaluation.score,
        passedCount: evaluation.passedCount,
        totalTestCases: evaluation.totalCount,
        executionTime: evaluation.executionTime,
        compileOutput: evaluation.compileOutput,
        testResults: {
          create: evaluation.results.map((res) => ({
            testCaseId: res.testCaseId,
            status: res.status,
            actualOutput: res.actualOutput,
            // Only store expectedOutput if not hidden to maintain complete integrity
            expectedOutput: res.isHidden ? "" : res.expectedOutput,
            executionTime: res.executionTime,
            marksEarned: res.marksEarned,
            errorMessage: res.errorMessage,
          })),
        },
      },
      include: {
        testResults: true,
      },
    });

    // Recompute highest score per question for this student's attempt
    const allSubmissionsForAttempt = await prisma.submission.findMany({
      where: { attemptId: attempt.id },
      select: { questionId: true, score: true },
    });

    const questionMaxScores: Record<string, number> = {};
    for (const sub of allSubmissionsForAttempt) {
      questionMaxScores[sub.questionId] = Math.max(questionMaxScores[sub.questionId] || 0, sub.score);
    }

    const newTotalScore = Object.values(questionMaxScores).reduce((a, b) => a + b, 0);

    const exam = await prisma.exam.findUnique({
      where: { id: examId },
      select: { totalMarks: true },
    });
    const totalExamMarks = exam?.totalMarks || 100;
    const percentage = (newTotalScore / totalExamMarks) * 100;

    await prisma.examAttempt.update({
      where: { id: attempt.id },
      data: {
        totalScore: newTotalScore,
        percentage,
      },
    });

    // Return sanitized results (hidden test cases have inputs and outputs masked)
    const sanitizedResults = evaluation.results.map((r, idx) => ({
      index: idx + 1,
      status: r.status,
      marksEarned: r.marksEarned,
      marksMax: r.marksMax,
      executionTime: r.executionTime,
      isHidden: r.isHidden,
      input: r.isHidden ? undefined : r.input,
      expectedOutput: r.isHidden ? undefined : r.expectedOutput,
      actualOutput: r.isHidden ? (r.status === "PASSED" ? "Correct Output" : "Incorrect Output") : r.actualOutput,
      errorMessage: r.errorMessage,
    }));

    return NextResponse.json({
      success: true,
      submissionId: submission.id,
      status: evaluation.status,
      score: evaluation.score,
      maxScore: evaluation.maxScore,
      passedCount: evaluation.passedCount,
      totalCount: evaluation.totalCount,
      executionTime: evaluation.executionTime,
      compileOutput: evaluation.compileOutput,
      testResults: sanitizedResults,
    });
  } catch (err: any) {
    console.error("Submit Question error:", err);
    return NextResponse.json({ error: "Evaluation failed" }, { status: 500 });
  }
}
