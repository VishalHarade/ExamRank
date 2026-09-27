import { executeCode, ExecutionResult } from "./runner";
import { TestResultStatus, SubmissionStatus } from "@prisma/client";

export interface JudgeTestCase {
  id: string;
  input: string;
  expectedOutput: string;
  marks: number;
  isHidden: boolean;
  explanation?: string | null;
}

export interface TestCaseResult {
  testCaseId: string;
  status: TestResultStatus;
  actualOutput: string;
  expectedOutput?: string;
  input?: string;
  marksEarned: number;
  marksMax: number;
  executionTime: number;
  errorMessage?: string;
  isHidden: boolean;
}

export interface JudgeEvaluationSummary {
  status: SubmissionStatus;
  score: number;
  maxScore: number;
  passedCount: number;
  totalCount: number;
  executionTime: number; // max execution time among all cases
  compileOutput?: string;
  results: TestCaseResult[];
}

/**
 * Normalizes output by trimming whitespace and normalizing line breaks
 */
export function normalizeOutput(str: string): string {
  if (!str) return "";
  return str
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n")
    .split("\n")
    .map((line) => line.trimEnd())
    .join("\n")
    .trim();
}

/**
 * Compares actual output with expected output, supporting whitespace normalization and floating point tolerance
 */
export function compareOutput(actual: string, expected: string, floatTolerance = 1e-6): boolean {
  const normActual = normalizeOutput(actual);
  const normExpected = normalizeOutput(expected);

  if (normActual === normExpected) return true;

  // Try numerical comparison if both represent numbers or lists of numbers
  const actualTokens = normActual.split(/\s+/);
  const expectedTokens = normExpected.split(/\s+/);

  if (actualTokens.length !== expectedTokens.length) return false;

  for (let i = 0; i < actualTokens.length; i++) {
    const act = actualTokens[i];
    const exp = expectedTokens[i];

    if (act === exp) continue;

    const actNum = Number(act);
    const expNum = Number(exp);

    if (!isNaN(actNum) && !isNaN(expNum)) {
      if (Math.abs(actNum - expNum) <= floatTolerance) {
        continue;
      }
    }
    return false;
  }

  return true;
}

export async function judgeSubmission(
  language: string,
  sourceCode: string,
  testCases: JudgeTestCase[],
  timeLimitMs: number = 2500
): Promise<JudgeEvaluationSummary> {
  const results: TestCaseResult[] = [];
  let totalScoreEarned = 0;
  let maxPossibleScore = 0;
  let passedCount = 0;
  let maxExecutionTime = 0;
  let overallStatus: SubmissionStatus = SubmissionStatus.ACCEPTED;
  let compileOutput = "";

  for (let i = 0; i < testCases.length; i++) {
    const tc = testCases[i];
    maxPossibleScore += tc.marks;

    const execResult: ExecutionResult = await executeCode(language, sourceCode, tc.input, timeLimitMs);

    maxExecutionTime = Math.max(maxExecutionTime, execResult.executionTime);

    if (execResult.isCompilationError) {
      compileOutput = execResult.compileOutput || execResult.stderr;
      results.push({
        testCaseId: tc.id,
        status: TestResultStatus.COMPILATION_ERROR,
        actualOutput: "",
        expectedOutput: tc.isHidden ? undefined : tc.expectedOutput,
        input: tc.isHidden ? undefined : tc.input,
        marksEarned: 0,
        marksMax: tc.marks,
        executionTime: execResult.executionTime,
        errorMessage: execResult.compileOutput || execResult.stderr,
        isHidden: tc.isHidden,
      });
      // All remaining tests also fail with compilation error
      for (let j = i + 1; j < testCases.length; j++) {
        const remainingTc = testCases[j];
        maxPossibleScore += remainingTc.marks;
        results.push({
          testCaseId: remainingTc.id,
          status: TestResultStatus.COMPILATION_ERROR,
          actualOutput: "",
          marksEarned: 0,
          marksMax: remainingTc.marks,
          executionTime: 0,
          errorMessage: "Compilation failed",
          isHidden: remainingTc.isHidden,
        });
      }
      return {
        status: SubmissionStatus.COMPILATION_ERROR,
        score: 0,
        maxScore: maxPossibleScore,
        passedCount: 0,
        totalCount: testCases.length,
        executionTime: execResult.executionTime,
        compileOutput,
        results,
      };
    }

    if (execResult.isTimeLimitExceeded) {
      if (overallStatus === SubmissionStatus.ACCEPTED) overallStatus = SubmissionStatus.TIME_LIMIT_EXCEEDED;
      results.push({
        testCaseId: tc.id,
        status: TestResultStatus.TIME_LIMIT_EXCEEDED,
        actualOutput: "",
        expectedOutput: tc.isHidden ? undefined : tc.expectedOutput,
        input: tc.isHidden ? undefined : tc.input,
        marksEarned: 0,
        marksMax: tc.marks,
        executionTime: execResult.executionTime,
        errorMessage: `Time limit exceeded (${timeLimitMs}ms)`,
        isHidden: tc.isHidden,
      });
      continue;
    }

    if (execResult.isRuntimeError) {
      if (overallStatus === SubmissionStatus.ACCEPTED) overallStatus = SubmissionStatus.RUNTIME_ERROR;
      results.push({
        testCaseId: tc.id,
        status: TestResultStatus.RUNTIME_ERROR,
        actualOutput: execResult.stdout,
        expectedOutput: tc.isHidden ? undefined : tc.expectedOutput,
        input: tc.isHidden ? undefined : tc.input,
        marksEarned: 0,
        marksMax: tc.marks,
        executionTime: execResult.executionTime,
        errorMessage: execResult.stderr || "Runtime error occurred during execution",
        isHidden: tc.isHidden,
      });
      continue;
    }

    const isMatch = compareOutput(execResult.stdout, tc.expectedOutput);

    if (isMatch) {
      passedCount++;
      totalScoreEarned += tc.marks;
      results.push({
        testCaseId: tc.id,
        status: TestResultStatus.PASSED,
        actualOutput: tc.isHidden ? "Hidden Test Passed" : execResult.stdout,
        expectedOutput: tc.isHidden ? undefined : tc.expectedOutput,
        input: tc.isHidden ? undefined : tc.input,
        marksEarned: tc.marks,
        marksMax: tc.marks,
        executionTime: execResult.executionTime,
        isHidden: tc.isHidden,
      });
    } else {
      if (overallStatus === SubmissionStatus.ACCEPTED) overallStatus = SubmissionStatus.WRONG_ANSWER;
      results.push({
        testCaseId: tc.id,
        status: TestResultStatus.FAILED,
        actualOutput: tc.isHidden ? "Hidden Test Failed" : execResult.stdout,
        expectedOutput: tc.isHidden ? undefined : tc.expectedOutput,
        input: tc.isHidden ? undefined : tc.input,
        marksEarned: 0,
        marksMax: tc.marks,
        executionTime: execResult.executionTime,
        errorMessage: "Output does not match expected output",
        isHidden: tc.isHidden,
      });
    }
  }

  if (passedCount === testCases.length) {
    overallStatus = SubmissionStatus.ACCEPTED;
  } else if (passedCount > 0 && overallStatus === SubmissionStatus.ACCEPTED) {
    overallStatus = SubmissionStatus.WRONG_ANSWER;
  }

  return {
    status: overallStatus,
    score: totalScoreEarned,
    maxScore: maxPossibleScore,
    passedCount,
    totalCount: testCases.length,
    executionTime: maxExecutionTime,
    compileOutput,
    results,
  };
}
