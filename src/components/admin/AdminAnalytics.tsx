"use client";

import { useEffect, useState } from "react";
import {
  Users,
  BookOpen,
  FileText,
  Code,
  TrendingUp,
  ShieldAlert,
  Activity,
  Award,
  BarChart2,
  CheckCircle,
  XCircle,
  Clock,
  AlertTriangle,
  Monitor,
  Database,
  ChevronRight,
  RefreshCw,
} from "lucide-react";

// ────────────────────────────────────────────────────────────────────────────────
// Types
// ────────────────────────────────────────────────────────────────────────────────
interface AnalyticsData {
  overview: {
    totalStudents: number;
    totalTeachers: number;
    totalExams: number;
    totalQuestions: number;
    totalSubmissions: number;
    totalAttempts: number;
    activeAttempts: number;
    terminatedAttempts: number;
    overallPassRate: number;
    avgScore: number;
    totalViolations: number;
    avgViolationsPerAttempt: number;
  };
  examsByStatus: { status: string; count: number }[];
  violationsByType: { type: string; count: number }[];
  submissionsByStatus: { status: string; count: number }[];
  questionsByDifficulty: { difficulty: string; count: number }[];
  studentsByDepartment: { department: string; count: number }[];
  examPerformance: {
    id: string;
    title: string;
    status: string;
    totalMarks: number;
    attemptCount: number;
    activeCount: number;
    submittedCount: number;
    avgScore: number;
    passRate: number;
    questionCount: number;
    totalViolations: number;
  }[];
  topStudents: {
    name: string;
    usn: string;
    department: string;
    avgPercentage: number;
    examsTaken: number;
  }[];
  recentActivity: {
    studentName: string;
    usn: string | null;
    examTitle: string;
    status: string;
    score: number;
    timestamp: string | null;
  }[];
}

// ────────────────────────────────────────────────────────────────────────────────
// Helpers
// ────────────────────────────────────────────────────────────────────────────────
const STATUS_BADGE: Record<string, { bg: string; text: string }> = {
  DRAFT: { bg: "bg-slate-800", text: "text-slate-300" },
  SCHEDULED: { bg: "bg-blue-950/60 border border-blue-800/60", text: "text-blue-300" },
  ACTIVE: { bg: "bg-emerald-950/60 border border-emerald-800/60", text: "text-emerald-300" },
  COMPLETED: { bg: "bg-purple-950/60 border border-purple-800/60", text: "text-purple-300" },
  RESULT_PUBLISHED: { bg: "bg-amber-950/60 border border-amber-800/60", text: "text-amber-300" },
  CANCELLED: { bg: "bg-red-950/60 border border-red-800/60", text: "text-red-300" },
  SUBMITTED: { bg: "bg-emerald-950/60 border border-emerald-800/60", text: "text-emerald-300" },
  AUTO_SUBMITTED: { bg: "bg-blue-950/60 border border-blue-800/60", text: "text-blue-300" },
  IN_PROGRESS: { bg: "bg-amber-950/60 border border-amber-800/60", text: "text-amber-300" },
  TERMINATED: { bg: "bg-red-950/60 border border-red-800/60", text: "text-red-300" },
};

const fmtTime = (iso: string | null) => {
  if (!iso) return "—";
  const d = new Date(iso);
  return d.toLocaleString("en-IN", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
};

// ────────────────────────────────────────────────────────────────────────────────
// Clean Metric Card
// ────────────────────────────────────────────────────────────────────────────────
function MetricCard({
  icon: Icon,
  label,
  value,
  sub,
  pulse = false,
}: {
  icon: React.ElementType;
  label: string;
  value: string | number;
  sub?: string;
  pulse?: boolean;
}) {
  return (
    <div className="bg-[#111722] border border-slate-800 rounded-xl p-4 sm:p-5 flex flex-col justify-between">
      <div className="flex items-center justify-between text-slate-400">
        <span className="text-xs font-medium uppercase tracking-wider">{label}</span>
        <Icon className="h-4 w-4 text-slate-400" />
      </div>
      <div className="mt-3">
        <div className="text-2xl sm:text-3xl font-semibold text-white tracking-tight">
          {value}
        </div>
        {sub && (
          <div className="mt-1 text-xs text-slate-400 flex items-center gap-1.5">
            {pulse && <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />}
            {sub}
          </div>
        )}
      </div>
    </div>
  );
}

function CleanBar({
  label,
  value,
  max,
  colorClass = "bg-blue-600",
  suffix = "",
}: {
  label: string;
  value: number;
  max: number;
  colorClass?: string;
  suffix?: string;
}) {
  const pct = max > 0 ? Math.min(100, Math.round((value / max) * 100)) : 0;
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-xs">
        <span className="text-slate-300 truncate max-w-[70%] font-medium">{label}</span>
        <span className="text-slate-400 font-mono">{value}{suffix}</span>
      </div>
      <div className="h-1.5 w-full rounded-full bg-slate-800">
        <div
          className={`h-1.5 rounded-full ${colorClass} transition-all duration-500`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

// ────────────────────────────────────────────────────────────────────────────────
// Main Admin Component
// ────────────────────────────────────────────────────────────────────────────────
export function AdminAnalytics() {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [lastRefreshed, setLastRefreshed] = useState<string>("");

  const fetchData = async (isManual = false) => {
    if (isManual) setRefreshing(true);
    try {
      const res = await fetch("/api/admin/analytics");
      if (!res.ok) {
        const text = await res.text();
        throw new Error(text || "Failed to load analytics");
      }
      const json = await res.json();
      setData(json);
      setLastRefreshed(new Date().toLocaleTimeString("en-IN"));
      setError("");
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Unknown error");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(() => fetchData(false), 30_000);
    return () => clearInterval(interval);
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center space-y-3">
          <div className="h-8 w-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-slate-400 text-xs">Loading analytics data…</p>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="bg-[#111722] border border-slate-800 rounded-xl p-8 text-center max-w-lg mx-auto my-12">
        <AlertTriangle className="h-8 w-8 text-amber-400 mx-auto mb-3" />
        <h3 className="text-sm font-semibold text-white">Analytics Unavailable</h3>
        <p className="text-xs text-slate-400 mt-1">{error || "Could not retrieve platform metrics."}</p>
        <button
          onClick={() => fetchData(true)}
          className="mt-4 px-3 py-1.5 bg-blue-600 hover:bg-blue-500 rounded-lg text-xs font-medium text-white transition-colors"
        >
          Try Again
        </button>
      </div>
    );
  }

  const {
    overview,
    examsByStatus,
    violationsByType,
    submissionsByStatus,
    questionsByDifficulty,
    studentsByDepartment,
    examPerformance,
    topStudents,
    recentActivity,
  } = data;

  const maxExamAttempts = Math.max(...examPerformance.map((e) => e.attemptCount), 1);
  const maxViolation = Math.max(...violationsByType.map((v) => v.count), 1);
  const maxDept = Math.max(...studentsByDepartment.map((d) => d.count), 1);
  const maxSub = Math.max(...submissionsByStatus.map((s) => s.count), 1);

  return (
    <div className="space-y-6">
      {/* ── Page Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-slate-800">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-semibold text-white tracking-tight">
              Platform Analytics
            </h1>
            <span className="px-2 py-0.5 rounded text-[11px] font-medium bg-blue-500/10 text-blue-400 border border-blue-500/30">
              Admin Overview
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Real-time assessment activity, integrity metrics, and department benchmarks.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <span className="text-[11px] text-slate-400">
            Updated {lastRefreshed || "just now"}
          </span>
          <button
            onClick={() => fetchData(true)}
            disabled={refreshing}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium rounded-lg transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${refreshing ? "animate-spin" : ""}`} />
            Refresh
          </button>
        </div>
      </div>

      {/* ── KPI Grid ── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
        <MetricCard
          icon={Users}
          label="Registered Students"
          value={overview.totalStudents}
          sub="Active candidates"
        />
        <MetricCard
          icon={Activity}
          label="Active Exam Sessions"
          value={overview.activeAttempts}
          sub={overview.activeAttempts > 0 ? "Currently taking exams" : "No live candidates"}
          pulse={overview.activeAttempts > 0}
        />
        <MetricCard
          icon={TrendingUp}
          label="Class Pass Rate"
          value={`${overview.overallPassRate}%`}
          sub={`Avg score: ${overview.avgScore}`}
        />
        <MetricCard
          icon={ShieldAlert}
          label="Integrity Incidents"
          value={overview.totalViolations}
          sub={`${overview.terminatedAttempts} exams auto-terminated`}
        />
      </div>

      {/* ── Secondary Stats Row ── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
        <MetricCard
          icon={FileText}
          label="Created Exams"
          value={overview.totalExams}
          sub={`${overview.totalAttempts} total attempts logged`}
        />
        <MetricCard
          icon={BookOpen}
          label="Repository Problems"
          value={overview.totalQuestions}
          sub="In active question bank"
        />
        <MetricCard
          icon={Code}
          label="Code Submissions"
          value={overview.totalSubmissions}
          sub="Compiler runs & evaluations"
        />
        <MetricCard
          icon={Users}
          label="Faculty / Teachers"
          value={overview.totalTeachers}
          sub="Department instructors"
        />
      </div>

      {/* ── Breakdown Panels ── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {/* Exam Status Breakdown */}
        <div className="bg-[#111722] border border-slate-800 rounded-xl p-5">
          <div className="flex items-center gap-2 mb-4 pb-2 border-b border-slate-800/80">
            <Monitor className="h-4 w-4 text-blue-400" />
            <h2 className="text-xs font-semibold text-white uppercase tracking-wider">
              Exam Status
            </h2>
          </div>
          <div className="space-y-3">
            {examsByStatus.map((item) => (
              <CleanBar
                key={item.status}
                label={item.status.replace("_", " ")}
                value={item.count}
                max={Math.max(...examsByStatus.map((e) => e.count))}
                colorClass="bg-blue-600"
              />
            ))}
          </div>
        </div>

        {/* Anti-Cheat Violations */}
        <div className="bg-[#111722] border border-slate-800 rounded-xl p-5">
          <div className="flex items-center gap-2 mb-4 pb-2 border-b border-slate-800/80">
            <ShieldAlert className="h-4 w-4 text-red-400" />
            <h2 className="text-xs font-semibold text-white uppercase tracking-wider">
              Anti-Cheat Violations by Type
            </h2>
          </div>
          <div className="space-y-3">
            {violationsByType.length === 0 ? (
              <p className="text-slate-400 text-xs">No violation incidents recorded.</p>
            ) : (
              violationsByType.map((item) => (
                <CleanBar
                  key={item.type}
                  label={item.type.replace(/_/g, " ")}
                  value={item.count}
                  max={maxViolation}
                  colorClass="bg-red-500"
                />
              ))
            )}
          </div>
        </div>

        {/* Submissions by Verdict */}
        <div className="bg-[#111722] border border-slate-800 rounded-xl p-5">
          <div className="flex items-center gap-2 mb-4 pb-2 border-b border-slate-800/80">
            <BarChart2 className="h-4 w-4 text-emerald-400" />
            <h2 className="text-xs font-semibold text-white uppercase tracking-wider">
              Judge Verdicts
            </h2>
          </div>
          <div className="space-y-3">
            {submissionsByStatus.length === 0 ? (
              <p className="text-slate-400 text-xs">No code evaluations submitted yet.</p>
            ) : (
              submissionsByStatus.slice(0, 5).map((item) => (
                <CleanBar
                  key={item.status}
                  label={item.status.replace(/_/g, " ")}
                  value={item.count}
                  max={maxSub}
                  colorClass={
                    item.status === "ACCEPTED"
                      ? "bg-emerald-500"
                      : item.status.includes("ERROR")
                      ? "bg-red-500"
                      : "bg-amber-500"
                  }
                />
              ))
            )}
          </div>
        </div>
      </div>

      {/* ── Per-Exam Performance Table ── */}
      <div className="bg-[#111722] border border-slate-800 rounded-xl p-5">
        <div className="flex items-center justify-between mb-4 pb-2 border-b border-slate-800/80">
          <div className="flex items-center gap-2">
            <FileText className="h-4 w-4 text-blue-400" />
            <h2 className="text-xs font-semibold text-white uppercase tracking-wider">
              Exam Performance Overview
            </h2>
          </div>
          <span className="text-xs text-slate-400 font-mono">
            {examPerformance.length} exams recorded
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs min-w-[650px]">
            <thead>
              <tr className="border-b border-slate-800 text-slate-400 text-left font-medium">
                <th className="pb-2.5 font-medium">Title</th>
                <th className="pb-2.5 font-medium text-center">Status</th>
                <th className="pb-2.5 font-medium text-center">Candidates</th>
                <th className="pb-2.5 font-medium text-center">Active Now</th>
                <th className="pb-2.5 font-medium text-center">Avg Score</th>
                <th className="pb-2.5 font-medium text-center">Pass Rate</th>
                <th className="pb-2.5 font-medium text-center">Violations</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {examPerformance.map((exam) => {
                const badge = STATUS_BADGE[exam.status] || {
                  bg: "bg-slate-800",
                  text: "text-slate-300",
                };
                return (
                  <tr key={exam.id} className="hover:bg-slate-800/20 transition-colors">
                    <td className="py-3 pr-4">
                      <div className="font-medium text-white">{exam.title}</div>
                      <div className="text-[11px] text-slate-400 mt-0.5">
                        {exam.questionCount} questions · {exam.totalMarks} total marks
                      </div>
                    </td>
                    <td className="py-3 text-center">
                      <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-semibold uppercase ${badge.bg} ${badge.text}`}>
                        {exam.status.replace("_", " ")}
                      </span>
                    </td>
                    <td className="py-3 text-center font-mono text-slate-200">
                      {exam.attemptCount}
                    </td>
                    <td className="py-3 text-center font-mono">
                      {exam.activeCount > 0 ? (
                        <span className="text-emerald-400 font-semibold">{exam.activeCount}</span>
                      ) : (
                        <span className="text-slate-500">0</span>
                      )}
                    </td>
                    <td className="py-3 text-center font-mono text-slate-200">
                      {exam.submittedCount > 0 ? `${exam.avgScore}/${exam.totalMarks}` : "—"}
                    </td>
                    <td className="py-3 text-center font-mono">
                      {exam.submittedCount > 0 ? (
                        <span className={exam.passRate >= 50 ? "text-emerald-400" : "text-amber-400"}>
                          {exam.passRate}%
                        </span>
                      ) : (
                        <span className="text-slate-500">—</span>
                      )}
                    </td>
                    <td className="py-3 text-center font-mono">
                      {exam.totalViolations > 0 ? (
                        <span className="text-red-400">{exam.totalViolations}</span>
                      ) : (
                        <span className="text-slate-500">0</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── Bottom Grid: Top Students & Activity Feed ── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {/* Top Performers */}
        <div className="bg-[#111722] border border-slate-800 rounded-xl p-5">
          <div className="flex items-center gap-2 mb-4 pb-2 border-b border-slate-800/80">
            <Award className="h-4 w-4 text-amber-400" />
            <h2 className="text-xs font-semibold text-white uppercase tracking-wider">
              Top Student Performers
            </h2>
          </div>

          <div className="space-y-2.5">
            {topStudents.length === 0 ? (
              <p className="text-slate-400 text-xs">No submitted exams to rank yet.</p>
            ) : (
              topStudents.map((s, i) => (
                <div
                  key={s.usn}
                  className="flex items-center justify-between p-2.5 rounded-lg bg-[#0B0F17] border border-slate-800/80"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-xs font-mono font-bold text-slate-400 w-5">
                      #{i + 1}
                    </span>
                    <div>
                      <p className="text-xs font-medium text-white">{s.name}</p>
                      <p className="text-[11px] text-slate-400">
                        {s.usn} · {s.department}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="text-xs font-semibold text-emerald-400">
                      {s.avgPercentage}%
                    </span>
                    <p className="text-[10px] text-slate-400">
                      {s.examsTaken} exam{s.examsTaken !== 1 ? "s" : ""}
                    </p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Recent Activity */}
        <div className="bg-[#111722] border border-slate-800 rounded-xl p-5">
          <div className="flex items-center gap-2 mb-4 pb-2 border-b border-slate-800/80">
            <Clock className="h-4 w-4 text-blue-400" />
            <h2 className="text-xs font-semibold text-white uppercase tracking-wider">
              Recent Candidate Activity
            </h2>
          </div>

          <div className="space-y-2.5">
            {recentActivity.length === 0 ? (
              <p className="text-slate-400 text-xs">No recent activity recorded.</p>
            ) : (
              recentActivity.map((a, i) => (
                <div
                  key={i}
                  className="flex items-center justify-between p-2.5 rounded-lg bg-[#0B0F17] border border-slate-800/80 text-xs"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    {a.status === "SUBMITTED" || a.status === "AUTO_SUBMITTED" ? (
                      <CheckCircle className="h-3.5 w-3.5 text-emerald-400 shrink-0" />
                    ) : a.status === "TERMINATED" ? (
                      <XCircle className="h-3.5 w-3.5 text-red-400 shrink-0" />
                    ) : (
                      <Clock className="h-3.5 w-3.5 text-amber-400 shrink-0" />
                    )}
                    <div className="truncate">
                      <span className="text-white font-medium">{a.studentName}</span>
                      <span className="text-slate-400 ml-1.5 truncate">
                        {a.status === "IN_PROGRESS" ? "started" : "completed"} {a.examTitle}
                      </span>
                    </div>
                  </div>
                  <div className="text-right shrink-0 ml-2">
                    <span className="text-[11px] text-slate-400 font-mono">
                      {fmtTime(a.timestamp)}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
