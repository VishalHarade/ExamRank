import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { executeCode } from "@/lib/runner";
import { normalizeOutput, compareOutput } from "@/lib/judge";
import { AttemptStatus } from "@prisma/client";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id: examId } = await params;
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { questionId, language, sourceCode, customInput } = await req.json();

    if (!questionId || !language || !sourceCode) {
      return NextResponse.json({ error: "Missing required execution payload" }, { status: 400 });
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
      return NextResponse.json({ error: "No active attempt. Cannot execute code." }, { status: 403 });
    }

    // If custom input is provided, run only custom input
    if (typeof customInput === "string" && customInput.trim().length > 0) {
      const execResult = await executeCode(language, sourceCode, customInput, 3000);
      return NextResponse.json({
        type: "custom",
        result: {
          stdout: execResult.stdout,
          stderr: execResult.stderr,
          compileOutput: execResult.compileOutput,
          exitCode: execResult.exitCode,
          executionTime: execResult.executionTime,
          isTimeLimitExceeded: execResult.isTimeLimitExceeded,
          isCompilationError: execResult.isCompilationError,
          isRuntimeError: execResult.isRuntimeError,
        },
      });
    }

    // Otherwise, fetch sample (public) test cases only
    const sampleTestCases = await prisma.testCase.findMany({
      where: {
        questionId,
        isHidden: false,
      },
      orderBy: { orderIndex: "asc" },
    });

    const testResults = [];
    for (let i = 0; i < sampleTestCases.length; i++) {
      const tc = sampleTestCases[i];
      const exec = await executeCode(language, sourceCode, tc.input, 3000);

      const isPassed = !exec.isCompilationError && !exec.isRuntimeError && !exec.isTimeLimitExceeded && compareOutput(exec.stdout, tc.expectedOutput);

      testResults.push({
        testCaseIndex: i + 1,
        input: tc.input,
        expectedOutput: tc.expectedOutput,
        actualOutput: exec.stdout,
        stderr: exec.stderr,
        compileOutput: exec.compileOutput,
        executionTime: exec.executionTime,
        status: exec.isCompilationError
          ? "COMPILATION_ERROR"
          : exec.isTimeLimitExceeded
          ? "TIME_LIMIT_EXCEEDED"
          : exec.isRuntimeError
          ? "RUNTIME_ERROR"
          : isPassed
          ? "PASSED"
          : "FAILED",
        explanation: tc.explanation,
      });

      // Break early if compilation error
      if (exec.isCompilationError) {
        break;
      }
    }

    return NextResponse.json({
      type: "samples",
      testResults,
    });
  } catch (err: any) {
    console.error("POST /api/exams/[id]/run error:", err);
    return NextResponse.json({ error: "Code execution failed" }, { status: 500 });
  }
}
