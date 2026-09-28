"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import {
  Clock,
  ShieldAlert,
  Play,
  Send,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Maximize2,
  Minimize2,
  RefreshCw,
  Terminal,
  FileCode,
  RotateCcw,
  Sparkles,
  Lock,
  ChevronRight,
  Eye,
  Check,
  AlertOctagon,
} from "lucide-react";
import confetti from "canvas-confetti";
import { ThemeToggle, useTheme } from "@/components/ThemeProvider";

// Dynamically import Monaco Editor to avoid SSR window issues
const MonacoEditor = dynamic(() => import("@monaco-editor/react"), {
  ssr: false,
  loading: () => (
    <div className="h-full w-full flex items-center justify-center bg-[#0d131f] text-slate-500 font-mono text-sm">
      <span className="animate-pulse">Loading Monaco Editor environment...</span>
    </div>
  ),
});

interface TestCase {
  id: string;
  input: string;
  expectedOutput: string;
  explanation?: string | null;
  marks: number;
  isHidden: boolean;
  orderIndex: number;
}

interface Question {
  id: string;
  title: string;
  slug?: string | null;
  description: string;
  inputFormat: string;
  outputFormat: string;
  constraints: string;
  difficulty: "EASY" | "MEDIUM" | "HARD";
  allowedLanguages: string;
  timeLimit: number;
  memoryLimit: number;
  defaultMarks: number;
  starterCode?: string | null;
  tags?: string | null;
  testCases: TestCase[];
}

interface ExamQuestionItem {
  id: string;
  orderIndex: number;
  marks: number;
  question: Question;
}

export interface Exam {
  id: string;
  title: string;
  description: string;
  instructions?: string | null;
  duration: number;
  startTime: string;
  endTime: string;
  status: string;
  violationLimit: number;
  allowedLanguages: string;
  totalMarks: number;
  enableFullscreen: boolean;
  enableTabMonitoring: boolean;
  enableClipboardRestrictions: boolean;
  enableRightClickDisable: boolean;
  examQuestions: ExamQuestionItem[];
}

export interface Attempt {
  id: string;
  status: string;
  startedAt?: string | null;
  endTime?: string | null;
  totalScore: number;
  violationCount: number;
  currentQuestionId?: string | null;
  autosavedCode?: string | null;
}

interface ExamWorkspaceProps {
  initialExam: Exam;
  initialAttempt: Attempt | null;
}

export function ExamWorkspace({ initialExam, initialAttempt }: ExamWorkspaceProps) {
  const router = useRouter();
  const { theme } = useTheme();

  // Exam state
  const [exam] = useState<Exam>(initialExam);
  const [attempt, setAttempt] = useState<Attempt | null>(initialAttempt);
  const [activeQuestionIndex, setActiveQuestionIndex] = useState(0);

  // Code state per question: mapping questionId -> { code, language }
  const [codeDrafts, setCodeDrafts] = useState<Record<string, { code: string; language: string }>>({});
  const [currentLanguage, setCurrentLanguage] = useState<string>("python");

  // Timer & sync state
  const [secondsLeft, setSecondsLeft] = useState<number>(0);
  const [isAutosaving, setIsAutosaving] = useState(false);
  const [lastSavedTime, setLastSavedTime] = useState<string>("Synced");
  const [isStartingAttempt, setIsStartingAttempt] = useState(false);
  const [startError, setStartError] = useState("");

  // Fullscreen & Sentinel state
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [hasStartedInFullscreen, setHasStartedInFullscreen] = useState(false);
  const [violationCount, setViolationCount] = useState<number>(initialAttempt?.violationCount || 0);
  const [violationModal, setViolationModal] = useState<{
    show: boolean;
    title: string;
    message: string;
    severity: string;
  } | null>(null);

  // Execution & Output state
  const [consoleTab, setConsoleTab] = useState<"samples" | "custom" | "results">("samples");
  const [customInput, setCustomInput] = useState<string>("");
  const [isRunningCode, setIsRunningCode] = useState(false);
  const [isSubmittingQuestion, setIsSubmittingQuestion] = useState(false);
  const [runResults, setRunResults] = useState<any>(null);
  const [submissionResults, setSubmissionResults] = useState<any>(null);

  // Submit Exam Modal
  const [showSubmitModal, setShowSubmitModal] = useState(false);
  const [isFinalSubmitting, setIsFinalSubmitting] = useState(false);
  const [isTerminatedOrSubmitted, setIsTerminatedOrSubmitted] = useState(
    initialAttempt?.status === "SUBMITTED" ||
    initialAttempt?.status === "AUTO_SUBMITTED" ||
    initialAttempt?.status === "TERMINATED"
  );
  const autoSubmitInFlight = useRef(false);
  const lastFocusLossAt = useRef(0);

  const activeExamQuestion = exam.examQuestions[activeQuestionIndex];
  const activeQuestion = activeExamQuestion?.question;

  // Language-specific empty starter placeholders (minimal, prod-ready)
  const getBlankTemplate = (lang: string): string => {
    const templates: Record<string, string> = {
      python: "# Read from stdin using input() or sys.stdin\n# Print output using print()\n\n",
      javascript: "// Read input: const lines = require('fs').readFileSync(0,'utf8').trim().split('\\n');\n// Print output: console.log(answer);\n\n",
      cpp: "#include <iostream>\nusing namespace std;\n\nint main() {\n    // Write your solution here\n    \n    return 0;\n}\n",
      c: "#include <stdio.h>\n\nint main() {\n    // Write your solution here\n    \n    return 0;\n}\n",
      java: "import java.util.Scanner;\n\npublic class Solution {\n    public static void main(String[] args) {\n        Scanner sc = new Scanner(System.in);\n        // Write your solution here\n        \n    }\n}\n",
    };
    return templates[lang] || "// Write your solution here\n\n";
  };

  // Initialize code drafts: restore autosaved code ONLY — never auto-fill starter templates
  useEffect(() => {
    let restored: Record<string, { code: string; language: string }> = {};
    if (attempt?.autosavedCode) {
      try {
        restored = JSON.parse(attempt.autosavedCode);
      } catch {
        restored = {};
      }
    }

    const drafts: Record<string, { code: string; language: string }> = {};

    exam.examQuestions.forEach((eq) => {
      const q = eq.question;
      if (restored[q.id]) {
        // Restore previously autosaved code (resume session)
        drafts[q.id] = restored[q.id];
      } else {
        // Fresh start — use minimal blank placeholder, NOT the full starter template
        const defaultLang = "python";
        drafts[q.id] = { code: getBlankTemplate(defaultLang), language: defaultLang };
      }
    });

    setCodeDrafts(drafts);

    if (activeQuestion && drafts[activeQuestion.id]) {
      setCurrentLanguage(drafts[activeQuestion.id].language);
    }
  }, [exam, attempt?.autosavedCode]);

  // Timer countdown
  useEffect(() => {
    if (!attempt?.endTime || isTerminatedOrSubmitted) return;

    const deadline = new Date(attempt.endTime).getTime();

    const updateTimer = () => {
      const now = Date.now();
      const diff = Math.max(0, Math.floor((deadline - now) / 1000));
      setSecondsLeft(diff);

      if (diff <= 0) {
        handleAutoSubmit("Timer expired");
      }
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, [attempt?.endTime, isTerminatedOrSubmitted]);

  // Periodic autosave (every 8 seconds)
  useEffect(() => {
    if (attempt?.status !== "IN_PROGRESS" || !activeQuestion || !codeDrafts[activeQuestion.id] || isTerminatedOrSubmitted) return;

    const interval = setInterval(() => {
      handleAutosave();
    }, 8000);

    return () => clearInterval(interval);
  }, [activeQuestion, attempt?.status, codeDrafts, isTerminatedOrSubmitted]);

  // Autosave handler
  const handleAutosave = async () => {
    if (attempt?.status !== "IN_PROGRESS" || !activeQuestion || isTerminatedOrSubmitted) return;
    const currentDraft = codeDrafts[activeQuestion.id];
    if (!currentDraft) return;

    setIsAutosaving(true);
    try {
      const res = await fetch(`/api/exams/${exam.id}/autosave`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          questionId: activeQuestion.id,
          language: currentDraft.language,
          code: currentDraft.code,
        }),
      });
      if (!res.ok) throw new Error("Autosave was rejected by the server.");
      setLastSavedTime(new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" }));
    } catch (err) {
      console.error("Autosave error:", err);
      setLastSavedTime("Save failed");
    } finally {
      setIsAutosaving(false);
    }
  };

  // Record Violation Helper
  const triggerViolation = useCallback(
    async (type: string, message: string) => {
      if (attempt?.status !== "IN_PROGRESS" || isTerminatedOrSubmitted) return;

      try {
        const res = await fetch(`/api/exams/${exam.id}/violation`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ type, metadata: message }),
        });

        const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Unable to record integrity event.");
        if (data.success) {
          setViolationCount(data.violationCount);

          if (data.isTerminated) {
            setIsTerminatedOrSubmitted(true);
            setViolationModal({
              show: true,
              title: "Examination Terminated",
              message: `You have reached the maximum allowed integrity violations (${data.violationCount}/${data.violationLimit}). Your examination has been automatically locked and submitted.`,
              severity: "CRITICAL",
            });
          } else {
            setViolationModal({
              show: true,
              title: data.severity === "FINAL_WARNING" ? "FINAL INTEGRITY WARNING" : "Integrity Notice",
              message: `${message}. This incident has been logged on the college server. (${data.violationCount}/${data.violationLimit} allowed violations).`,
              severity: data.severity,
            });
          }
        }
      } catch (err) {
        console.error("Violation recording error:", err);
      }
    },
    [exam.id, attempt?.status, isTerminatedOrSubmitted]
  );

  // Anti-cheat Listeners (Visibility change, Fullscreen exit, Context menu)
  useEffect(() => {
    if (!hasStartedInFullscreen || isTerminatedOrSubmitted) return;

    const recordFocusLoss = (type: string, message: string) => {
      const now = Date.now();
      if (now - lastFocusLossAt.current < 1200) return;
      lastFocusLossAt.current = now;
      triggerViolation(type, message);
    };

    const handleVisibilityChange = () => {
      if (document.hidden) {
        recordFocusLoss("TAB_SWITCH", "Student switched away from examination window or minimized tab");
      }
    };

    const handleWindowBlur = () => {
      recordFocusLoss("WINDOW_BLUR", "Student switched away from the examination window");
    };

    const handleFullscreenChange = () => {
      const isStillFull = !!document.fullscreenElement;
      setIsFullscreen(isStillFull);
      if (!isStillFull && !document.hidden) {
        recordFocusLoss("FULLSCREEN_EXIT", "Student exited fullscreen examination mode");
      }
    };

    // 3. Prevent context menu (right click)
    const handleContextMenu = (e: MouseEvent) => {
      if (exam.enableRightClickDisable) {
        e.preventDefault();
        triggerViolation("RIGHT_CLICK", "Right click context menu attempt blocked");
      }
    };

    // 4. Intercept clipboard paste outside editor
    const handlePaste = (e: ClipboardEvent) => {
      // Check if inside Monaco Editor
      const activeEl = document.activeElement;
      const isInsideMonaco = activeEl && activeEl.closest(".monaco-editor");
      if (!isInsideMonaco && exam.enableClipboardRestrictions) {
        e.preventDefault();
        triggerViolation("CLIPBOARD_PASTE", "Clipboard paste attempt outside code editor blocked");
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    document.addEventListener("fullscreenchange", handleFullscreenChange);
    window.addEventListener("blur", handleWindowBlur);
    window.addEventListener("contextmenu", handleContextMenu);
    window.addEventListener("paste", handlePaste);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      document.removeEventListener("fullscreenchange", handleFullscreenChange);
      window.removeEventListener("blur", handleWindowBlur);
      window.removeEventListener("contextmenu", handleContextMenu);
      window.removeEventListener("paste", handlePaste);
    };
  }, [hasStartedInFullscreen, isTerminatedOrSubmitted, exam.enableRightClickDisable, exam.enableClipboardRestrictions, triggerViolation]);

  // Request Fullscreen
  const enterFullscreen = async () => {
    if (isStartingAttempt) return;
    setStartError("");

    try {
      if (document.documentElement.requestFullscreen) {
        await document.documentElement.requestFullscreen();
      }
    } catch {
      // Continue if fullscreen is unavailable; the exam timer is still server-controlled.
    }

    if (!attempt || attempt.status === "NOT_STARTED") {
      setIsStartingAttempt(true);
      try {
        const res = await fetch(`/api/exams/${exam.id}/start`, { method: "POST" });
        const data = await res.json();

        if (!res.ok || !data.attempt) {
          throw new Error(data.error || "Unable to start this examination.");
        }

        setAttempt(data.attempt);
        setViolationCount(data.attempt.violationCount || 0);
        if (data.isFinished) {
          setIsTerminatedOrSubmitted(true);
          return;
        }
      } catch (err) {
        if (document.fullscreenElement) await document.exitFullscreen().catch(() => {});
        setStartError(err instanceof Error ? err.message : "Unable to start this examination.");
        return;
      } finally {
        setIsStartingAttempt(false);
      }
    }

    setIsFullscreen(!!document.fullscreenElement);
    setHasStartedInFullscreen(true);
  };

  // Run Code (Sample tests or Custom input)
  const handleRunCode = async () => {
    if (!activeQuestion || isRunningCode) return;
    const currentDraft = codeDrafts[activeQuestion.id];
    if (!currentDraft) return;

    setIsRunningCode(true);
    setRunResults(null);
    setConsoleTab(customInput.trim().length > 0 ? "custom" : "samples");

    try {
      const res = await fetch(`/api/exams/${exam.id}/run`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          questionId: activeQuestion.id,
          language: currentDraft.language,
          sourceCode: currentDraft.code,
          customInput: customInput.trim().length > 0 ? customInput : undefined,
        }),
      });

      const data = await res.json();
      setRunResults(data);
    } catch (err) {
      console.error("Run code error:", err);
    } finally {
      setIsRunningCode(false);
    }
  };

  // Submit Question Solution (Judges against hidden + public test cases)
  const handleSubmitQuestion = async () => {
    if (!activeQuestion || isSubmittingQuestion) return;
    const currentDraft = codeDrafts[activeQuestion.id];
    if (!currentDraft) return;

    setIsSubmittingQuestion(true);
    setConsoleTab("results");
    setSubmissionResults(null);

    try {
      const res = await fetch(`/api/exams/${exam.id}/submit-question`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          questionId: activeQuestion.id,
          language: currentDraft.language,
          sourceCode: currentDraft.code,
        }),
      });

      const data = await res.json();
      setSubmissionResults(data);

      if (data.status === "ACCEPTED") {
        confetti({
          particleCount: 60,
          spread: 70,
          origin: { y: 0.7 },
        });
      }
    } catch (err) {
      console.error("Submit Question error:", err);
    } finally {
      setIsSubmittingQuestion(false);
    }
  };

  // Final Exam Submission
  const handleAutoSubmit = async (reason = "Normal Submission") => {
    if (!attempt || isTerminatedOrSubmitted || autoSubmitInFlight.current) return;
    autoSubmitInFlight.current = true;
    setIsFinalSubmitting(true);
    try {
      const res = await fetch(`/api/exams/${exam.id}/submit-exam`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isAutoSubmit: true, reason }),
      });
      if (!res.ok) throw new Error("Unable to submit the examination.");
      setIsTerminatedOrSubmitted(true);
      setShowSubmitModal(false);
    } catch (err) {
      console.error("Final submit error:", err);
    } finally {
      setIsFinalSubmitting(false);
      autoSubmitInFlight.current = false;
    }
  };

  const handleManualFinalSubmit = async () => {
    setIsFinalSubmitting(true);
    try {
      await fetch(`/api/exams/${exam.id}/submit-exam`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isAutoSubmit: false }),
      });
      setIsTerminatedOrSubmitted(true);
      setShowSubmitModal(false);
    } catch (err) {
      console.error("Final submit error:", err);
    } finally {
      setIsFinalSubmitting(false);
    }
  };

  // Update current code
  const handleEditorChange = (newCode: string | undefined) => {
    if (!activeQuestion || newCode === undefined) return;
    setCodeDrafts((prev) => ({
      ...prev,
      [activeQuestion.id]: {
        code: newCode,
        language: currentLanguage,
      },
    }));
  };

  // Switch Language: preserve existing code draft, only update language tag
  const handleLanguageChange = (lang: string) => {
    setCurrentLanguage(lang);
    if (!activeQuestion) return;
    // Keep existing code draft — student wrote it, don't reset it on language switch
    setCodeDrafts((prev) => ({
      ...prev,
      [activeQuestion.id]: {
        code: prev[activeQuestion.id]?.code || getBlankTemplate(lang),
        language: lang,
      },
    }));
  };

  // Reset editor to blank language placeholder (not the full starter template)
  const handleResetStarter = () => {
    if (!activeQuestion) return;
    if (!window.confirm("Clear your code and reset to a blank template? This cannot be undone.")) return;
    setCodeDrafts((prev) => ({
      ...prev,
      [activeQuestion.id]: {
        code: getBlankTemplate(currentLanguage),
        language: currentLanguage,
      },
    }));
  };

  // Formatted timer calculation
  const formatTime = (totalSeconds: number) => {
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;
    }
    return `${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;
  };

  // -------------------------------------------------------------
  // PRE-EXAM FULLSCREEN ACCEPTANCE SCREEN
  // -------------------------------------------------------------
  if (!hasStartedInFullscreen && !isTerminatedOrSubmitted) {
    return (
      <div className="relative min-h-screen bg-[#101714] text-slate-100 flex flex-col justify-center items-center p-4">
        <div className="absolute right-4 top-4">
          <ThemeToggle />
        </div>
        <div className="max-w-xl w-full bg-[#18211d] p-6 sm:p-8 rounded-lg border border-[#303d36] shadow-2xl space-y-6">
          <div className="flex items-center gap-3">
            <div className="h-11 w-11 rounded-md bg-[#163b2b] border border-[#246443] flex items-center justify-center text-[#4dcc8a]">
              <ShieldAlert className="h-6 w-6" />
            </div>
            <div>
              <span className="text-[11px] uppercase tracking-wider text-[#4dcc8a] font-semibold">
                Exam briefing
              </span>
              <h1 className="text-xl font-semibold text-white tracking-tight">{exam.title}</h1>
            </div>
          </div>

          <div className="space-y-3 text-sm text-slate-300 bg-[#111915] p-4 rounded-md border border-[#303d36] leading-relaxed">
            <p className="font-semibold text-slate-100">Before you begin</p>
            <ul className="space-y-2 list-disc list-inside text-slate-400">
              <li>
                <strong className="text-slate-200">Fullscreen Required:</strong> Exiting fullscreen triggers an automatic security violation.
              </li>
              <li>
                <strong className="text-slate-200">Tab Switch Sentinel:</strong> Switching tabs or windows is logged instantly to the proctoring desk.
              </li>
              <li>
                <strong className="text-slate-200">Violation Policy:</strong> Maximum {exam.violationLimit} violations allowed before automatic termination.
              </li>
              <li>
                <strong className="text-slate-200">Authoritative Timer:</strong> Duration is {exam.duration} minutes. Server automatically locks submission at expiration.
              </li>
              <li>
                <strong className="text-slate-200">Refresh Recovery:</strong> Code autosaves every few seconds. Refreshing will resume your session seamlessly.
              </li>
            </ul>
          </div>

          <div className="flex items-center justify-between pt-2">
            <button
              onClick={() => router.push("/student")}
              className="px-3 py-2 rounded-md text-sm font-medium text-slate-400 hover:text-white transition"
            >
              Exit to Dashboard
            </button>

            <button
              disabled={isStartingAttempt}
              onClick={enterFullscreen}
              className="px-5 py-2.5 rounded-md text-sm font-semibold bg-[#16884f] hover:bg-[#117443] text-white transition flex items-center gap-2 disabled:opacity-60"
            >
              <Maximize2 className="h-4 w-4" />
              {isStartingAttempt ? "Starting examination..." : "Accept Rules & Start Examination"}
            </button>
          </div>
          {startError && <p role="alert" className="text-sm text-rose-400">{startError}</p>}
        </div>
      </div>
    );
  }

  // -------------------------------------------------------------
  // EXAMINATION COMPLETED / TERMINATED SCREEN
  // -------------------------------------------------------------
  if (isTerminatedOrSubmitted) {
    return (
      <div className="relative min-h-screen bg-[#101714] text-slate-100 flex flex-col justify-center items-center p-4">
        <div className="absolute right-4 top-4">
          <ThemeToggle />
        </div>
          <div className="max-w-md w-full bg-[#18211d] p-7 rounded-lg border border-[#303d36] text-center space-y-6">
            <div className="h-14 w-14 mx-auto rounded-lg bg-[#163b2b] border border-[#246443] flex items-center justify-center text-[#4dcc8a]">
            <CheckCircle className="h-8 w-8" />
          </div>

          <div>
            <h2 className="text-2xl font-bold text-white tracking-tight">Examination Concluded</h2>
            <p className="text-xs text-slate-400 mt-1">
              Your solutions and responses have been successfully recorded in the college database.
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-slate-900/80 border border-white/5 text-left text-xs space-y-2">
            <div className="flex justify-between">
              <span className="text-slate-400">Status</span>
              <span className="font-semibold text-emerald-400 uppercase">{attempt?.status}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Recorded Violations</span>
              <span className="font-semibold text-amber-400">{violationCount} / {exam.violationLimit}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Autosave Integrity</span>
              <span className="font-semibold text-blue-400">Persisted to MySQL</span>
            </div>
          </div>

          <button
            onClick={() => router.push("/student")}
            className="w-full py-3 rounded-xl text-xs font-semibold bg-blue-600 hover:bg-blue-500 text-white transition shadow-lg shadow-blue-600/30"
          >
            Return to Student Dashboard
          </button>
        </div>
      </div>
    );
  }
  // -------------------------------------------------------------
  // IN-EXAM WORKSPACE (HACKERRANK STYLE)
  // -------------------------------------------------------------
  return (
    <div className="h-[100dvh] min-h-[540px] w-screen bg-[#0d1411] text-slate-100 flex flex-col overflow-hidden">
      {/* Violation Alert Modal */}
      {violationModal?.show && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="max-w-md w-full glass-card p-6 rounded-3xl border border-rose-500/30 shadow-2xl space-y-4">
            <div className="flex items-center gap-3 text-rose-400">
              <AlertTriangle className="h-6 w-6" />
              <h3 className="text-lg font-bold">{violationModal.title}</h3>
            </div>
            <p className="text-xs text-slate-300 leading-relaxed">{violationModal.message}</p>
            <div className="pt-2 flex justify-end">
              <button
                onClick={() => {
                  setViolationModal(null);
                  if (!isFullscreen) enterFullscreen();
                }}
                className="px-5 py-2.5 rounded-xl text-xs font-bold bg-rose-600 hover:bg-rose-500 text-white transition"
              >
                Acknowledge & Continue
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Final Submit Confirmation Modal */}
      {showSubmitModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="max-w-md w-full glass-card p-6 rounded-3xl border border-white/10 shadow-2xl space-y-4">
            <div className="flex items-center gap-3 text-blue-400">
              <Send className="h-6 w-6" />
              <h3 className="text-lg font-bold text-white">Submit Examination?</h3>
            </div>
            <p className="text-xs text-slate-300 leading-relaxed">
              Are you sure you want to end and submit your exam? All your saved code solutions will be graded. Once submitted, you cannot re-enter.
            </p>
            <div className="flex justify-end gap-3 pt-2">
              <button
                disabled={isFinalSubmitting}
                onClick={() => setShowSubmitModal(false)}
                className="px-4 py-2 rounded-xl text-xs font-medium text-slate-400 hover:text-white"
              >
                Cancel
              </button>
              <button
                disabled={isFinalSubmitting}
                onClick={handleManualFinalSubmit}
                className="px-5 py-2.5 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-600/30 transition flex items-center gap-1.5"
              >
                {isFinalSubmitting ? "Finalizing..." : "Confirm Final Submission"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Header Bar */}
      <header className="min-h-14 border-b border-[#293630] bg-[#151e19] flex items-center justify-between gap-3 px-3 sm:px-4 py-2 shrink-0">
        <div className="flex min-w-0 items-center gap-3">
          <div className="flex min-w-0 items-center gap-2">
            <Terminal className="h-5 w-5 shrink-0 text-[#42c982]" />
            <span className="truncate font-semibold text-sm text-white">{exam.title}</span>
          </div>

          <div className="hidden xl:flex items-center gap-2 text-xs text-slate-400 pl-4 border-l border-[#293630]">
            <span className="flex items-center gap-1.5">
              <span className={`h-2 w-2 rounded-full ${isAutosaving ? "bg-amber-400 animate-ping" : "bg-emerald-400"}`} />
              {isAutosaving ? "Saving code..." : `Saved ${lastSavedTime}`}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Authoritative Timer */}
          <div
            className={`px-2.5 py-1.5 rounded-md font-mono text-xs font-semibold flex items-center gap-2 border ${
              secondsLeft < 300
                ? "bg-rose-500/10 text-rose-400 border-rose-500/30 animate-pulse"
                : "bg-[#1c2721] border-[#35443b] text-slate-200"
            }`}
          >
            <Clock className="h-3.5 w-3.5" />
            <span>Time Left: {formatTime(secondsLeft)}</span>
          </div>

          {/* Violations Counter */}
          <div
            className={`px-2.5 py-1.5 rounded-md font-mono text-xs font-semibold flex items-center gap-1.5 border ${
              violationCount > 0
                ? "bg-rose-500/10 text-rose-400 border-rose-500/30"
                : "bg-[#153222] text-[#4dcc8a] border-[#28553a]"
            }`}
          >
            <ShieldAlert className="h-3.5 w-3.5" />
            <span>Violations: {violationCount}/{exam.violationLimit}</span>
          </div>

          {/* Fullscreen indicator / toggle */}
          <button
            onClick={enterFullscreen}
            title={isFullscreen ? "Fullscreen Active" : "Click to enter fullscreen"}
            className={`p-1.5 rounded-md border text-xs transition ${
              isFullscreen ? "border-[#28553a] text-[#4dcc8a] bg-[#153222]" : "border-rose-500/30 text-rose-400 bg-rose-500/10"
            }`}
          >
            {isFullscreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
          </button>

          <ThemeToggle />

          {/* Submit Exam Button */}
          <button
            onClick={() => setShowSubmitModal(true)}
            className="px-3.5 py-1.5 rounded-md text-xs font-semibold bg-[#16884f] hover:bg-[#117443] text-white transition"
          >
            Finish Exam
          </button>
        </div>
      </header>

      {/* Main Split Body */}
      <div className="flex-1 min-h-0 flex flex-col lg:flex-row overflow-hidden">
        {/* Left Side: Questions Drawer & Problem Statement */}
        <div className="flex-1 min-h-0 lg:w-[44%] lg:flex-none border-b lg:border-b-0 lg:border-r border-[#293630] flex flex-col bg-[#111a15] overflow-hidden">
          {/* Question Navigator Tabs */}
          <div className="h-11 border-b border-[#293630] flex items-center px-3 gap-2 shrink-0 bg-[#17211b] overflow-x-auto">
            {exam.examQuestions.map((eq, idx) => {
              const isActive = idx === activeQuestionIndex;
              return (
                <button
                  key={eq.id}
                  onClick={() => {
                    handleAutosave();
                    setActiveQuestionIndex(idx);
                  }}
                  className={`px-3 py-1 rounded-md text-xs font-medium transition flex items-center gap-1.5 shrink-0 ${
                    isActive
                      ? "bg-[#1b7548] text-white font-semibold"
                      : "text-slate-400 hover:text-slate-200 hover:bg-[#202c25]"
                  }`}
                >
                  <span>Q{idx + 1}</span>
                  <span className="text-[10px] opacity-75 font-normal">({eq.marks} pts)</span>
                </button>
              );
            })}
          </div>

          {/* Problem Statement Content */}
          {activeQuestion && (
            <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-6 text-sm text-slate-300">
              <div>
                <div className="flex items-center justify-between">
                  <h2 className="text-xl font-semibold text-white tracking-tight">
                    {activeQuestion.title}
                  </h2>
                  <span
                    className={`px-2.5 py-0.5 rounded-full text-xs font-mono uppercase font-semibold ${
                      activeQuestion.difficulty === "EASY"
                        ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                        : activeQuestion.difficulty === "MEDIUM"
                        ? "bg-amber-500/10 text-amber-400 border border-amber-500/20"
                        : "bg-rose-500/10 text-rose-400 border border-rose-500/20"
                    }`}
                  >
                    {activeQuestion.difficulty}
                  </span>
                </div>
                <div className="flex items-center gap-3 text-xs font-mono text-slate-400 mt-2">
                  <span>Max Marks: {activeExamQuestion?.marks}</span>
                  <span>•</span>
                  <span>Time Limit: {activeQuestion.timeLimit}ms</span>
                  <span>•</span>
                  <span>Memory: {activeQuestion.memoryLimit}MB</span>
                </div>
              </div>

              {/* Description */}
              <div className="space-y-2">
                <div className="text-xs font-mono uppercase text-slate-400 font-semibold tracking-wider">
                  Problem Description
                </div>
                <div className="whitespace-pre-line leading-7 text-slate-200 text-sm bg-[#18221c] p-4 rounded-md border border-[#2b3931]">
                  {activeQuestion.description}
                </div>
              </div>

              {/* Input & Output Format */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <div className="text-xs font-mono uppercase text-slate-400 font-semibold tracking-wider">
                    Input Format
                  </div>
                  <div className="whitespace-pre-line text-xs font-mono text-slate-300 bg-[#18221c] p-3 rounded-md border border-[#2b3931]">
                    {activeQuestion.inputFormat}
                  </div>
                </div>

                <div className="space-y-1.5">
                  <div className="text-xs font-mono uppercase text-slate-400 font-semibold tracking-wider">
                    Output Format
                  </div>
                  <div className="whitespace-pre-line text-xs font-mono text-slate-300 bg-[#18221c] p-3 rounded-md border border-[#2b3931]">
                    {activeQuestion.outputFormat}
                  </div>
                </div>
              </div>

              {/* Constraints */}
              <div className="space-y-1.5">
                <div className="text-xs font-mono uppercase text-slate-400 font-semibold tracking-wider">
                  Constraints
                </div>
                <div className="whitespace-pre-line text-xs font-mono text-slate-300 bg-[#18221c] p-3 rounded-md border border-[#2b3931]">
                  {activeQuestion.constraints}
                </div>
              </div>

              {/* Sample Test Cases */}
              <div className="space-y-4">
                <div className="text-xs font-mono uppercase text-slate-400 font-semibold tracking-wider">
                  Sample Test Cases
                </div>
                {activeQuestion.testCases
                  .filter((tc) => !tc.isHidden)
                  .map((tc, i) => (
                    <div key={tc.id} className="p-4 rounded-md bg-[#18221c] border border-[#2b3931] space-y-3">
                      <div className="text-xs font-semibold text-[#4dcc8a]">Sample #{i + 1}</div>
                      <div className="space-y-2">
                        <div>
                          <div className="text-[10px] font-mono text-slate-400 uppercase">Input</div>
                          <pre className="text-xs font-mono text-slate-200 bg-black/40 p-2.5 rounded-lg border border-white/5 overflow-x-auto">
                            {tc.input}
                          </pre>
                        </div>
                        <div>
                          <div className="text-[10px] font-mono text-slate-400 uppercase">Expected Output</div>
                          <pre className="text-xs font-mono text-emerald-400 bg-black/40 p-2.5 rounded-lg border border-white/5 overflow-x-auto">
                            {tc.expectedOutput}
                          </pre>
                        </div>
                        {tc.explanation && (
                          <div>
                            <div className="text-[10px] font-mono text-slate-400 uppercase">Explanation</div>
                            <p className="text-xs text-slate-300 mt-0.5">{tc.explanation}</p>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          )}
        </div>

        {/* Right Side: Monaco Code Editor & Execution Console */}
        <div className="flex-1 min-h-0 lg:w-[56%] lg:flex-none flex flex-col bg-[#0d1411] overflow-hidden">
          {/* Editor Header: Language selector & Actions */}
          <div className="min-h-11 border-b border-[#293630] bg-[#151e19] flex items-center justify-between gap-3 px-3 sm:px-4 py-1.5 shrink-0">
            <div className="flex items-center gap-3">
              <select
                value={currentLanguage}
                onChange={(e) => handleLanguageChange(e.target.value)}
                className="bg-[#202b25] border border-[#35443b] text-xs text-slate-200 py-1.5 px-2.5 rounded-md focus:outline-none focus:border-[#4dcc8a]"
              >
                <option value="python">Python 3.9</option>
                <option value="javascript">JavaScript (Node.js)</option>
                <option value="cpp">C++ (clang++ C++17)</option>
                <option value="c">C (clang C11)</option>
              </select>

              <button
                onClick={handleResetStarter}
                title="Reset to starter template"
                className="flex items-center gap-1 text-[11px] text-slate-400 hover:text-slate-200 px-2 py-1 rounded-md hover:bg-white/5 transition"
              >
                <RotateCcw className="h-3 w-3" /> Reset
              </button>
            </div>

            <div className="flex items-center gap-2">
              <button
                disabled={isRunningCode || isSubmittingQuestion}
                onClick={handleRunCode}
                className="px-3 py-1.5 rounded-md text-xs font-semibold bg-[#25312a] hover:bg-[#303e35] text-slate-200 border border-[#3a4940] transition flex items-center gap-1.5 disabled:opacity-50"
              >
                <Play className="h-3 w-3 fill-current text-emerald-400" />
                {isRunningCode ? "Running..." : "Run Code"}
              </button>

              <button
                disabled={isRunningCode || isSubmittingQuestion}
                onClick={handleSubmitQuestion}
                className="px-3.5 py-1.5 rounded-md text-xs font-semibold bg-[#16884f] hover:bg-[#117443] text-white transition flex items-center gap-1.5 disabled:opacity-50"
              >
                <Send className="h-3 w-3" />
                {isSubmittingQuestion ? "Judging..." : "Submit Solution"}
              </button>
            </div>
          </div>

          {/* Monaco Editor Component */}
          <div className="flex-1 overflow-hidden relative">
            {activeQuestion && (
              <MonacoEditor
                height="100%"
                language={currentLanguage === "cpp" || currentLanguage === "c" ? "cpp" : currentLanguage}
                theme={theme === "light" ? "light" : "vs-dark"}
                value={codeDrafts[activeQuestion.id]?.code || ""}
                onChange={handleEditorChange}
                options={{
                  fontSize: 13,
                  fontFamily: "var(--font-mono), Consolas, 'Fira Code', monospace",
                  minimap: { enabled: false },
                  scrollBeyondLastLine: false,
                  wordWrap: "on",
                  lineNumbers: "on",
                  automaticLayout: true,
                  tabSize: 4,
                  padding: { top: 12, bottom: 12 },
                }}
              />
            )}
          </div>

          {/* Bottom Console Drawer */}
          <div className="h-56 border-t border-[#293630] bg-[#111a15] flex flex-col shrink-0">
            {/* Drawer Tabs */}
            <div className="h-9 border-b border-[#293630] flex items-center px-3 gap-2 bg-[#17211b] shrink-0">
              <button
                onClick={() => setConsoleTab("samples")}
                className={`px-3 py-1 rounded text-xs font-mono font-medium transition ${
                  consoleTab === "samples" ? "bg-[#29372f] text-white" : "text-slate-400 hover:text-slate-200"
                }`}
              >
                Sample Results
              </button>
              <button
                onClick={() => setConsoleTab("custom")}
                className={`px-3 py-1 rounded text-xs font-mono font-medium transition ${
                  consoleTab === "custom" ? "bg-[#29372f] text-white" : "text-slate-400 hover:text-slate-200"
                }`}
              >
                Custom Input
              </button>
              <button
                onClick={() => setConsoleTab("results")}
                className={`px-3 py-1 rounded text-xs font-mono font-medium transition flex items-center gap-1.5 ${
                  consoleTab === "results" ? "bg-[#1b7548] text-white" : "text-slate-400 hover:text-slate-200"
                }`}
              >
                <span>Submission Verdict</span>
                {submissionResults && (
                  <span className={`h-1.5 w-1.5 rounded-full ${submissionResults.status === "ACCEPTED" ? "bg-emerald-400" : "bg-rose-400"}`} />
                )}
              </button>
            </div>

            {/* Drawer Body */}
            <div className="flex-1 overflow-y-auto p-3 text-xs font-mono">
              {/* Tab 1: Sample Results */}
              {consoleTab === "samples" && (
                <div>
                  {!runResults && !isRunningCode && (
                    <div className="text-slate-500 py-6 text-center">
                      Click <strong className="text-slate-400">Run Code</strong> to test your solution against visible sample test cases.
                    </div>
                  )}

                  {isRunningCode && (
                    <div className="flex items-center justify-center gap-2 py-8 text-blue-400">
                      <span className="h-3 w-3 border-2 border-blue-400 border-t-transparent rounded-full animate-spin" />
                      Executing in local sandbox...
                    </div>
                  )}

                  {runResults && runResults.testResults && (
                    <div className="space-y-3">
                      {runResults.testResults.map((tr: any, idx: number) => (
                        <div
                          key={idx}
                          className={`p-3 rounded-xl border ${
                            tr.status === "PASSED"
                              ? "bg-emerald-950/20 border-emerald-500/20 text-emerald-300"
                              : "bg-rose-950/20 border-rose-500/20 text-rose-300"
                          }`}
                        >
                          <div className="flex items-center justify-between mb-2">
                            <span className="font-bold flex items-center gap-1.5">
                              {tr.status === "PASSED" ? (
                                <Check className="h-3.5 w-3.5 text-emerald-400" />
                              ) : (
                                <XCircle className="h-3.5 w-3.5 text-rose-400" />
                              )}
                              Sample Test #{tr.testCaseIndex}: {tr.status}
                            </span>
                            <span className="text-[11px] text-slate-400">{tr.executionTime}ms</span>
                          </div>

                          <div className="grid grid-cols-2 gap-2 text-[11px]">
                            <div>
                              <span className="text-slate-400">Your Output:</span>
                              <pre className="bg-black/40 p-2 rounded mt-0.5 overflow-x-auto text-slate-200">
                                {tr.actualOutput || "(No stdout output)"}
                              </pre>
                            </div>
                            <div>
                              <span className="text-slate-400">Expected Output:</span>
                              <pre className="bg-black/40 p-2 rounded mt-0.5 overflow-x-auto text-emerald-400">
                                {tr.expectedOutput}
                              </pre>
                            </div>
                          </div>

                          {tr.stderr && (
                            <div className="mt-2 text-rose-400 bg-rose-950/40 p-2 rounded text-[11px]">
                              {tr.stderr}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Tab 2: Custom Input */}
              {consoleTab === "custom" && (
                <div className="space-y-2 h-full flex flex-col">
                  <div className="text-[11px] text-slate-400">
                    Provide standard input (stdin) to run with your code:
                  </div>
                  <textarea
                    value={customInput}
                    onChange={(e) => setCustomInput(e.target.value)}
                    placeholder="Enter custom input lines here..."
                    className="w-full flex-1 p-2.5 rounded-xl bg-slate-900/60 border border-white/10 text-xs font-mono text-slate-200 focus:outline-none focus:border-blue-500 resize-none"
                  />
                  {runResults && runResults.type === "custom" && (
                    <div className="p-2.5 rounded-xl bg-black/50 border border-white/5 text-[11px]">
                      <div className="text-slate-400">Program Stdout:</div>
                      <pre className="text-slate-200 mt-1 whitespace-pre-wrap">{runResults.result.stdout || "(Empty stdout)"}</pre>
                      {runResults.result.stderr && (
                        <div className="text-rose-400 mt-1 whitespace-pre-wrap">{runResults.result.stderr}</div>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* Tab 3: Submission Verdict & Hidden Test Evaluation */}
              {consoleTab === "results" && (
                <div>
                  {!submissionResults && !isSubmittingQuestion && (
                    <div className="text-slate-500 py-6 text-center">
                      Click <strong className="text-blue-400">Submit Solution</strong> to judge your code against all test cases including hidden evaluation cases.
                    </div>
                  )}

                  {isSubmittingQuestion && (
                    <div className="flex items-center justify-center gap-2 py-8 text-blue-400">
                      <span className="h-3 w-3 border-2 border-blue-400 border-t-transparent rounded-full animate-spin" />
                      Evaluating against private college test cases...
                    </div>
                  )}

                  {submissionResults && (
                    <div className="space-y-3">
                      {/* Overall Verdict Banner */}
                      <div
                        className={`p-3 rounded-xl border flex items-center justify-between ${
                          submissionResults.status === "ACCEPTED"
                            ? "bg-emerald-950/30 border-emerald-500/30 text-emerald-300"
                            : "bg-rose-950/30 border-rose-500/30 text-rose-300"
                        }`}
                      >
                        <div>
                          <div className="font-bold text-sm tracking-wide flex items-center gap-2">
                            {submissionResults.status === "ACCEPTED" ? (
                              <CheckCircle className="h-4 w-4 text-emerald-400" />
                            ) : (
                              <AlertOctagon className="h-4 w-4 text-rose-400" />
                            )}
                            VERDICT: {submissionResults.status}
                          </div>
                          <div className="text-xs text-slate-400 mt-0.5">
                            Passed {submissionResults.passedCount} / {submissionResults.totalCount} test cases
                          </div>
                        </div>

                        <div className="text-right">
                          <div className="text-base font-black text-white">
                            {submissionResults.score} / {submissionResults.maxScore}
                          </div>
                          <div className="text-[10px] text-slate-400 uppercase">Marks Awarded</div>
                        </div>
                      </div>

                      {/* Test Case Breakdown Grid */}
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                        {submissionResults.testResults.map((tr: any) => (
                          <div
                            key={tr.index}
                            className={`p-2.5 rounded-xl border text-xs flex flex-col justify-between ${
                              tr.status === "PASSED"
                                ? "bg-emerald-950/20 border-emerald-500/20 text-emerald-300"
                                : "bg-rose-950/20 border-rose-500/20 text-rose-300"
                            }`}
                          >
                            <div className="flex items-center justify-between">
                              <span className="font-bold">
                                {tr.isHidden ? `Hidden #${tr.index}` : `Test #${tr.index}`}
                              </span>
                              {tr.status === "PASSED" ? (
                                <Check className="h-3 w-3 text-emerald-400" />
                              ) : (
                                <XCircle className="h-3 w-3 text-rose-400" />
                              )}
                            </div>

                            <div className="mt-2 text-[10px] flex items-center justify-between text-slate-400">
                              <span>{tr.executionTime}ms</span>
                              <span className="font-semibold text-slate-200">
                                {tr.marksEarned}/{tr.marksMax} pts
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>

                      {submissionResults.compileOutput && (
                        <div className="p-3 rounded-xl bg-rose-950/40 border border-rose-500/20 text-rose-300 text-xs whitespace-pre-wrap">
                          <strong className="block mb-1 text-rose-400">Compilation Error:</strong>
                          {submissionResults.compileOutput}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
