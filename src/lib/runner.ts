import { spawn, ChildProcess } from "child_process";
import fs from "fs/promises";
import path from "path";
import os from "os";
import crypto from "crypto";

export interface ExecutionResult {
  stdout: string;
  stderr: string;
  compileOutput?: string;
  exitCode: number | null;
  executionTime: number; // ms
  isTimeLimitExceeded: boolean;
  isCompilationError: boolean;
  isRuntimeError: boolean;
}

export async function executeCode(
  language: string,
  sourceCode: string,
  input: string = "",
  timeLimitMs: number = 3000
): Promise<ExecutionResult> {
  const runId = crypto.randomUUID();
  const tempDir = path.join(os.tmpdir(), `examrank-run-${runId}`);
  await fs.mkdir(tempDir, { recursive: true });

  const normalizedLang = language.toLowerCase();

  try {
    let sourceFileName = "solution";
    let compileCmd: string | null = null;
    let compileArgs: string[] = [];
    let runCmd: string = "";
    let runArgs: string[] = [];

    switch (normalizedLang) {
      case "python":
      case "python3":
      case "py":
        sourceFileName = "solution.py";
        runCmd = "python3";
        runArgs = ["-u", path.join(tempDir, sourceFileName)];
        break;

      case "javascript":
      case "js":
      case "nodejs":
        sourceFileName = "solution.js";
        runCmd = "node";
        runArgs = [path.join(tempDir, sourceFileName)];
        break;

      case "c":
        sourceFileName = "solution.c";
        const cBin = path.join(tempDir, "solution_bin");
        compileCmd = "clang";
        compileArgs = ["-O2", path.join(tempDir, sourceFileName), "-o", cBin];
        runCmd = cBin;
        runArgs = [];
        break;

      case "cpp":
      case "c++":
        sourceFileName = "solution.cpp";
        const cppBin = path.join(tempDir, "solution_bin");
        compileCmd = "clang++";
        compileArgs = ["-O2", "-std=c++17", path.join(tempDir, sourceFileName), "-o", cppBin];
        runCmd = cppBin;
        runArgs = [];
        break;

      case "java":
        sourceFileName = "Solution.java";
        compileCmd = "javac";
        compileArgs = [path.join(tempDir, sourceFileName)];
        runCmd = "java";
        runArgs = ["-cp", tempDir, "-Xmx256m", "Solution"];
        break;

      default:
        throw new Error(`Unsupported programming language: ${language}`);
    }

    const sourceFilePath = path.join(tempDir, sourceFileName);
    await fs.writeFile(sourceFilePath, sourceCode, "utf8");

    // Compilation step if needed
    if (compileCmd) {
      const compileResult = await runProcess(compileCmd, compileArgs, "", 10000, tempDir);
      if (compileResult.exitCode !== 0) {
        return {
          stdout: "",
          stderr: compileResult.stderr || compileResult.stdout,
          compileOutput: compileResult.stderr || compileResult.stdout,
          exitCode: compileResult.exitCode,
          executionTime: compileResult.duration,
          isTimeLimitExceeded: false,
          isCompilationError: true,
          isRuntimeError: false,
        };
      }
    }

    // Execution step
    const runResult = await runProcess(runCmd, runArgs, input, timeLimitMs, tempDir);

    return {
      stdout: runResult.stdout,
      stderr: runResult.stderr,
      compileOutput: "",
      exitCode: runResult.exitCode,
      executionTime: runResult.duration,
      isTimeLimitExceeded: runResult.isTimeLimitExceeded,
      isCompilationError: false,
      isRuntimeError: !runResult.isTimeLimitExceeded && (runResult.exitCode !== 0 || runResult.stderr.length > 0),
    };
  } finally {
    // Clean up temporary workspace
    try {
      await fs.rm(tempDir, { recursive: true, force: true });
    } catch {
      // Ignore cleanup error
    }
  }
}

function runProcess(
  cmd: string,
  args: string[],
  stdinInput: string,
  timeoutMs: number,
  cwd: string
): Promise<{
  stdout: string;
  stderr: string;
  exitCode: number | null;
  duration: number;
  isTimeLimitExceeded: boolean;
}> {
  return new Promise((resolve) => {
    const startTime = Date.now();
    let stdoutData = "";
    let stderrData = "";
    let isTimeLimitExceeded = false;
    let isKilled = false;

    const child: ChildProcess = spawn(cmd, args, {
      cwd,
      stdio: ["pipe", "pipe", "pipe"],
      env: {
        ...process.env,
        LANG: "en_US.UTF-8",
        LC_ALL: "en_US.UTF-8",
      } as NodeJS.ProcessEnv,
    });

    const timeoutHandle = setTimeout(() => {
      isTimeLimitExceeded = true;
      isKilled = true;
      try {
        child.kill("SIGKILL");
      } catch {
        // ignore
      }
    }, timeoutMs);

    if (stdinInput && child.stdin) {
      try {
        child.stdin.write(stdinInput, "utf8");
        child.stdin.end();
      } catch {
        // stream may already be closed
      }
    } else if (child.stdin) {
      child.stdin.end();
    }

    if (child.stdout) {
      child.stdout.on("data", (data: Buffer) => {
        if (stdoutData.length < 50000) {
          stdoutData += data.toString();
        }
      });
    }

    if (child.stderr) {
      child.stderr.on("data", (data: Buffer) => {
        if (stderrData.length < 20000) {
          stderrData += data.toString();
        }
      });
    }

    child.on("error", (err: Error) => {
      clearTimeout(timeoutHandle);
      const duration = Date.now() - startTime;
      resolve({
        stdout: stdoutData,
        stderr: stderrData + "\n" + err.message,
        exitCode: 1,
        duration,
        isTimeLimitExceeded: false,
      });
    });

    child.on("close", (code: number | null) => {
      clearTimeout(timeoutHandle);
      const duration = Date.now() - startTime;
      resolve({
        stdout: stdoutData.trimEnd(),
        stderr: stderrData.trimEnd(),
        exitCode: isKilled ? null : code,
        duration,
        isTimeLimitExceeded,
      });
    });
  });
}
