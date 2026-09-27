"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  ShieldAlert,
  Clock,
  Users,
  Eye,
  RefreshCw,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  FileCode,
  ArrowLeft,
  Activity,
  Layers,
} from "lucide-react";
import { formatSeconds } from "@/lib/utils";

interface StudentTelemetry {
  attemptId: string;
  studentId: string;
  studentName: string;
  usn?: string | null;
  email: string;
  department?: string | null;
  status: string;
  startedAt?: string | null;
  submittedAt?: string | null;
  totalScore: number;
  percentage: number;
  violationCount: number;
  violations: { id: string; type: string; severity: string; metadata?: string | null; timestamp: string }[];
  secondsRemaining: number;
  currentQuestionId?: string | null;
  currentQuestionTitle: string;
  totalSubmissions: number;
  ipAddress?: string | null;
}

interface MonitorData {
  examId: string;
  title: string;
  status: string;
  duration: number;
  totalMarks: number;
  violationLimit: number;
  totalRegisteredOrAttempted: number;
  activeNow: number;
  submittedCount: number;
  terminatedCount: number;
  students: StudentTelemetry[];
  serverTime: string;
}

export function LiveMonitor({ examId }: { examId: string }) {
  const [data, setData] = useState<MonitorData | null>(null);
  const [loading, setLoading] = useState(true);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [selectedStudent, setSelectedStudent] = useState<StudentTelemetry | null>(null);

  const fetchTelemetry = async () => {
    try {
      const res = await fetch(`/api/exams/${examId}/live-monitor`);
      if (res.ok) {
        const json = await res.json();
        setData(json);
      }
    } catch (err) {
      console.error("Telemetry fetch error:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTelemetry();
    if (!autoRefresh) return;
    const interval = setInterval(fetchTelemetry, 4000); // Poll every 4s for live updates
    return () => clearInterval(interval);
  }, [examId, autoRefresh]);

  if (loading && !data) {
    return (
      <div className="flex items-center justify-center min-h-[400px] text-slate-400 font-mono text-xs">
        <span className="h-4 w-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mr-2" />
        Connecting to Examination Telemetry Desk...
      </div>
    );
  }

  if (!data) {
    return (
      <div className="glass-card p-8 rounded-2xl border border-white/5 text-center text-rose-400">
        Failed to load exam proctoring stream.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Top Header & Metrics */}
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
              <span className="flex h-2.5 w-2.5 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-xs font-mono uppercase text-emerald-400 font-semibold tracking-wider">
                Live Proctoring Stream Active
              </span>
            </div>
            <h1 className="text-xl sm:text-2xl font-bold text-white mt-0.5">{data.title}</h1>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={() => setAutoRefresh(!autoRefresh)}
            className={`px-3 py-1.5 rounded-xl text-xs font-mono border transition flex items-center gap-1.5 ${
              autoRefresh
                ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400"
                : "bg-slate-900 border-white/10 text-slate-400"
            }`}
          >
            <Activity className="h-3.5 w-3.5" />
            {autoRefresh ? "Auto-Refresh: ON (4s)" : "Auto-Refresh: OFF"}
          </button>

          <button
            onClick={fetchTelemetry}
            className="p-2 rounded-xl border border-white/10 hover:bg-white/5 text-slate-300 transition"
            title="Refresh now"
          >
            <RefreshCw className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="glass-card p-4 rounded-2xl border border-white/5">
          <div className="text-xs text-slate-400 font-mono uppercase">Candidates</div>
          <div className="text-2xl font-bold text-white mt-1">{data.totalRegisteredOrAttempted}</div>
          <div className="text-[11px] text-slate-400 mt-0.5">Assigned to batch</div>
        </div>

        <div className="glass-card p-4 rounded-2xl border border-emerald-500/20 bg-emerald-950/10">
          <div className="text-xs text-emerald-400 font-mono uppercase">Currently In Exam</div>
          <div className="text-2xl font-bold text-emerald-400 mt-1">{data.activeNow}</div>
          <div className="text-[11px] text-emerald-400/80 mt-0.5">Active connections</div>
        </div>

        <div className="glass-card p-4 rounded-2xl border border-blue-500/20 bg-blue-950/10">
          <div className="text-xs text-blue-400 font-mono uppercase">Finished / Submitted</div>
          <div className="text-2xl font-bold text-blue-400 mt-1">{data.submittedCount}</div>
          <div className="text-[11px] text-blue-400/80 mt-0.5">Ready for grading</div>
        </div>

        <div className="glass-card p-4 rounded-2xl border border-rose-500/20 bg-rose-950/10">
          <div className="text-xs text-rose-400 font-mono uppercase">Terminated (Violations)</div>
          <div className="text-2xl font-bold text-rose-400 mt-1">{data.terminatedCount}</div>
          <div className="text-[11px] text-rose-400/80 mt-0.5">Limit reached</div>
        </div>
      </div>

      {/* Candidates Live Table */}
      <div className="glass-card rounded-2xl border border-white/10 overflow-hidden shadow-xl">
        <div className="px-6 py-4 border-b border-white/10 bg-slate-950/60 flex items-center justify-between">
          <h2 className="font-bold text-sm text-white flex items-center gap-2">
            <Users className="h-4 w-4 text-blue-400" />
            Candidate Telemetry Grid
          </h2>
          <span className="text-xs font-mono text-slate-400">
            Max Violations Limit: {data.violationLimit}
          </span>
        </div>

        {data.students.length === 0 ? (
          <div className="p-8 text-center text-slate-400 text-xs font-mono">
            No candidate attempts initiated yet.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-900/60 text-slate-400 font-mono uppercase border-b border-white/5">
                <tr>
                  <th className="px-6 py-3">Student & USN</th>
                  <th className="px-6 py-3">Status</th>
                  <th className="px-6 py-3">Current Question</th>
                  <th className="px-6 py-3">Time Left</th>
                  <th className="px-6 py-3">Score</th>
                  <th className="px-6 py-3">Violations</th>
                  <th className="px-6 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5 font-mono">
                {data.students.map((st) => (
                  <tr key={st.attemptId} className="hover:bg-white/[0.02] transition">
                    <td className="px-6 py-4">
                      <div className="font-bold text-white font-sans">{st.studentName}</div>
                      <div className="text-[11px] text-slate-400">{st.usn || st.email}</div>
                    </td>

                    <td className="px-6 py-4">
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border ${
                          st.status === "IN_PROGRESS"
                            ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/30 animate-pulse"
                            : st.status === "TERMINATED"
                            ? "bg-rose-500/10 text-rose-400 border-rose-500/30"
                            : "bg-blue-500/10 text-blue-400 border-blue-500/30"
                        }`}
                      >
                        {st.status}
                      </span>
                    </td>

                    <td className="px-6 py-4 text-slate-300 font-sans">
                      {st.currentQuestionTitle}
                    </td>

                    <td className="px-6 py-4 text-slate-300">
                      {st.status === "IN_PROGRESS" ? formatSeconds(st.secondsRemaining) : "—"}
                    </td>

                    <td className="px-6 py-4 font-bold text-white">
                      {st.totalScore} / {data.totalMarks}
                    </td>

                    <td className="px-6 py-4">
                      <span
                        className={`px-2 py-0.5 rounded-full text-[11px] font-bold border ${
                          st.violationCount === 0
                            ? "bg-slate-900 text-slate-400 border-white/5"
                            : st.violationCount >= data.violationLimit
                            ? "bg-rose-500/20 text-rose-400 border-rose-500/40"
                            : "bg-amber-500/20 text-amber-400 border-amber-500/40"
                        }`}
                      >
                        {st.violationCount} / {data.violationLimit}
                      </span>
                    </td>

                    <td className="px-6 py-4 text-right">
                      <button
                        onClick={() => setSelectedStudent(st)}
                        className="px-3 py-1.5 rounded-lg border border-white/10 hover:bg-white/5 text-slate-200 transition text-[11px]"
                      >
                        View Logs ({st.violations.length})
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Student Violation Detail Modal */}
      {selectedStudent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="max-w-lg w-full glass-card p-6 rounded-3xl border border-white/10 shadow-2xl space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-bold text-white">
                  Integrity Audit: {selectedStudent.studentName}
                </h3>
                <p className="text-xs text-slate-400">
                  {selectedStudent.usn} • Total Violations: {selectedStudent.violationCount}
                </p>
              </div>
              <button
                onClick={() => setSelectedStudent(null)}
                className="text-slate-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            <div className="max-h-64 overflow-y-auto space-y-2">
              {selectedStudent.violations.length === 0 ? (
                <div className="text-xs text-slate-400 text-center py-4">
                  No violations logged for this candidate.
                </div>
              ) : (
                selectedStudent.violations.map((v) => (
                  <div
                    key={v.id}
                    className="p-3 rounded-xl bg-slate-900/60 border border-white/5 text-xs space-y-1"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-rose-400 font-mono">{v.type}</span>
                      <span className="text-[10px] text-slate-400">
                        {new Date(v.timestamp).toLocaleTimeString()}
                      </span>
                    </div>
                    <p className="text-slate-300 text-[11px]">{v.metadata}</p>
                  </div>
                ))
              )}
            </div>

            <div className="pt-2 flex justify-end">
              <button
                onClick={() => setSelectedStudent(null)}
                className="px-4 py-2 rounded-xl text-xs font-semibold bg-blue-600 hover:bg-blue-500 text-white"
              >
                Close Audit Log
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
