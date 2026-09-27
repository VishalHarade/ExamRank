"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Download,
  Award,
  CheckCircle2,
  XCircle,
  BarChart3,
  TrendingUp,
  ShieldAlert,
  Share2,
  FileSpreadsheet,
} from "lucide-react";

interface AttemptResult {
  id: string;
  studentName: string;
  usn?: string | null;
  email: string;
  status: string;
  startedAt?: string | null;
  submittedAt?: string | null;
  totalScore: number;
  percentage: number;
  isPassed: boolean;
  violationCount: number;
  submissionsCount: number;
}

interface QuestionStat {
  questionId: string;
  title: string;
  difficulty: string;
  marks: number;
  totalSubmissions: number;
  acceptedCount: number;
  accuracy: number;
}

interface ExamResultsData {
  exam: {
    id: string;
    title: string;
    status: string;
    duration: number;
    totalMarks: number;
    passPercentage: number;
    startTime: string;
    endTime: string;
  };
  summary: {
    totalAttempts: number;
    avgScore: number;
    maxScore: number;
    minScore: number;
    passRate: number;
    totalViolations: number;
  };
  questionAnalytics: QuestionStat[];
  attempts: AttemptResult[];
}

export function ExamResultsView({ data }: { data: ExamResultsData }) {
  const router = useRouter();
  const [examStatus, setExamStatus] = useState(data.exam.status);
  const [isPublishing, setIsPublishing] = useState(false);

  // Export to CSV
  const handleExportCSV = () => {
    const headers = ["Rank", "Student Name", "USN", "Email", "Status", "Score", "Percentage", "Result", "Violations"];
    const rows = data.attempts.map((att, idx) => [
      idx + 1,
      `"${att.studentName}"`,
      `"${att.usn || "N/A"}"`,
      `"${att.email}"`,
      att.status,
      att.totalScore,
      `${att.percentage}%`,
      att.isPassed ? "PASSED" : "FAILED",
      att.violationCount,
    ]);

    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map((e) => e.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `ExamRank_Results_${data.exam.title.replace(/\s+/g, "_")}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Publish Results
  const handlePublishResults = async () => {
    setIsPublishing(true);
    try {
      const res = await fetch(`/api/exams/${data.exam.id}/results`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "PUBLISH_RESULTS" }),
      });
      if (res.ok) {
        setExamStatus("RESULT_PUBLISHED");
        router.refresh();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsPublishing(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link
            href="/teacher"
            className="p-2 rounded-xl border border-white/10 hover:bg-white/5 text-slate-400 hover:text-white transition"
          >
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono uppercase text-blue-400 font-semibold tracking-wider">
                Examination Analytics & Scores
              </span>
              <span
                className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-bold uppercase ${
                  examStatus === "RESULT_PUBLISHED"
                    ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/30"
                    : "bg-amber-500/10 text-amber-400 border border-amber-500/30"
                }`}
              >
                {examStatus === "RESULT_PUBLISHED" ? "PUBLISHED TO STUDENTS" : "UNPUBLISHED"}
              </span>
            </div>
            <h1 className="text-xl sm:text-2xl font-bold text-white mt-0.5">{data.exam.title}</h1>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          {examStatus !== "RESULT_PUBLISHED" && (
            <button
              onClick={handlePublishResults}
              disabled={isPublishing}
              className="px-4 py-2 rounded-xl text-xs font-bold bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-600/30 transition flex items-center gap-1.5"
            >
              <Share2 className="h-4 w-4" />
              {isPublishing ? "Publishing..." : "Publish Results to Students"}
            </button>
          )}

          <button
            onClick={handleExportCSV}
            className="px-4 py-2 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-600/30 transition flex items-center gap-1.5"
          >
            <FileSpreadsheet className="h-4 w-4" />
            Export CSV
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
        <div className="glass-card p-4 rounded-2xl border border-white/5">
          <div className="text-xs text-slate-400 font-mono uppercase">Pass Rate</div>
          <div className="text-2xl font-bold text-emerald-400 mt-1">{data.summary.passRate}%</div>
          <div className="text-[11px] text-slate-400 mt-0.5">Threshold: {data.exam.passPercentage}%</div>
        </div>

        <div className="glass-card p-4 rounded-2xl border border-white/5">
          <div className="text-xs text-slate-400 font-mono uppercase">Average Score</div>
          <div className="text-2xl font-bold text-blue-400 mt-1">
            {data.summary.avgScore} <span className="text-xs text-slate-400">/ {data.exam.totalMarks}</span>
          </div>
          <div className="text-[11px] text-slate-400 mt-0.5">Mean class performance</div>
        </div>

        <div className="glass-card p-4 rounded-2xl border border-white/5">
          <div className="text-xs text-slate-400 font-mono uppercase">Highest Score</div>
          <div className="text-2xl font-bold text-purple-400 mt-1">
            {data.summary.maxScore} <span className="text-xs text-slate-400">/ {data.exam.totalMarks}</span>
          </div>
          <div className="text-[11px] text-slate-400 mt-0.5">Top candidate</div>
        </div>

        <div className="glass-card p-4 rounded-2xl border border-white/5">
          <div className="text-xs text-slate-400 font-mono uppercase">Lowest Score</div>
          <div className="text-2xl font-bold text-amber-400 mt-1">
            {data.summary.minScore} <span className="text-xs text-slate-400">/ {data.exam.totalMarks}</span>
          </div>
          <div className="text-[11px] text-slate-400 mt-0.5">Minimum evaluated</div>
        </div>

        <div className="glass-card p-4 rounded-2xl border border-white/5">
          <div className="text-xs text-slate-400 font-mono uppercase">Total Violations</div>
          <div className="text-2xl font-bold text-rose-400 mt-1">{data.summary.totalViolations}</div>
          <div className="text-[11px] text-slate-400 mt-0.5">Integrity logs</div>
        </div>
      </div>

      {/* Question Analytics Breakdown */}
      <div className="glass-card rounded-2xl border border-white/10 p-6 space-y-4">
        <h2 className="text-base font-bold text-white flex items-center gap-2">
          <BarChart3 className="h-5 w-5 text-purple-400" />
          Question-Wise Performance & Accuracy
        </h2>

        <div className="grid sm:grid-cols-3 gap-4">
          {data.questionAnalytics.map((qa, i) => (
            <div key={qa.questionId} className="p-4 rounded-xl bg-slate-900/60 border border-white/5 space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-mono text-xs font-bold text-blue-400">Q{i + 1}</span>
                <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded bg-slate-800 text-slate-300">
                  {qa.difficulty} • {qa.marks} pts
                </span>
              </div>
              <h3 className="font-bold text-sm text-white line-clamp-1">{qa.title}</h3>

              <div className="space-y-1 pt-1">
                <div className="flex justify-between text-xs">
                  <span className="text-slate-400">Accuracy Rate:</span>
                  <span className="font-bold text-emerald-400">{qa.accuracy}%</span>
                </div>
                {/* Progress bar */}
                <div className="h-1.5 w-full bg-slate-800 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-blue-500 to-emerald-400 rounded-full"
                    style={{ width: `${qa.accuracy}%` }}
                  />
                </div>
              </div>

              <div className="text-[11px] font-mono text-slate-400 flex justify-between pt-1">
                <span>Total Attempts: {qa.totalSubmissions}</span>
                <span>Passed: {qa.acceptedCount}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Student Rank Table */}
      <div className="glass-card rounded-2xl border border-white/10 overflow-hidden shadow-xl">
        <div className="px-6 py-4 border-b border-white/10 bg-slate-950/60 flex items-center justify-between">
          <h2 className="font-bold text-sm text-white flex items-center gap-2">
            <Award className="h-4 w-4 text-emerald-400" />
            Rank Order & Candidate Grade Sheet
          </h2>
          <span className="text-xs font-mono text-slate-400">
            {data.attempts.length} Candidates Evaluated
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-900/60 text-slate-400 font-mono uppercase border-b border-white/5">
              <tr>
                <th className="px-6 py-3">Rank</th>
                <th className="px-6 py-3">Student Name</th>
                <th className="px-6 py-3">USN</th>
                <th className="px-6 py-3">Score</th>
                <th className="px-6 py-3">Percentage</th>
                <th className="px-6 py-3">Result</th>
                <th className="px-6 py-3">Violations</th>
                <th className="px-6 py-3">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5 font-mono">
              {data.attempts.map((att, idx) => (
                <tr key={att.id} className="hover:bg-white/[0.02] transition">
                  <td className="px-6 py-4 font-bold text-slate-400">#{idx + 1}</td>
                  <td className="px-6 py-4 font-bold text-white font-sans">{att.studentName}</td>
                  <td className="px-6 py-4 text-slate-300">{att.usn || "N/A"}</td>
                  <td className="px-6 py-4 font-bold text-white">
                    {att.totalScore} / {data.exam.totalMarks}
                  </td>
                  <td className="px-6 py-4 font-bold text-blue-400">{att.percentage}%</td>
                  <td className="px-6 py-4">
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        att.isPassed ? "bg-emerald-500/10 text-emerald-400" : "bg-rose-500/10 text-rose-400"
                      }`}
                    >
                      {att.isPassed ? "PASS" : "FAIL"}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        att.violationCount === 0 ? "text-slate-400" : "text-amber-400 bg-amber-500/10"
                      }`}
                    >
                      {att.violationCount}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-slate-400">{att.status}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
