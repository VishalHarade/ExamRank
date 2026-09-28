"use client";

import { useState, useEffect } from "react";
import {
  ShieldAlert,
  AlertTriangle,
  RotateCcw,
  CheckCircle2,
  XCircle,
  Clock,
  User,
  GraduationCap,
  BookOpen,
  Filter,
  Search,
  RefreshCw,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  AlertCircle,
  X,
  Award,
} from "lucide-react";

interface ViolationRecord {
  id: string;
  type: string;
  severity: string;
  metadata?: string | null;
  timestamp: string;
}

interface IncidentItem {
  id: string; // Attempt ID
  examId: string;
  examTitle: string;
  examStatus: string;
  totalMarks: number;
  passPercentage: number;
  passMark: number;
  violationLimit: number;
  teacher: {
    id: string;
    name: string;
    email: string;
    department: string;
  };
  student: {
    id: string;
    name: string;
    email: string;
    usn: string | null;
    department: string | null;
    semester: number | null;
  };
  status: string;
  totalScore: number;
  percentage: number;
  violationCount: number;
  startedAt: string | null;
  submittedAt: string | null;
  isFailed: boolean;
  isTerminated: boolean;
  hasViolations: boolean;
  violationLimitExceeded: boolean;
  canRetry: boolean;
  violations: ViolationRecord[];
}

interface SummaryData {
  totalIncidents: number;
  totalViolationsCount: number;
  failedCount: number;
  terminatedCount: number;
  uniqueStudents: number;
  uniqueTeachers: number;
}

export function AdminViolationsManager() {
  const [incidents, setIncidents] = useState<IncidentItem[]>([]);
  const [summary, setSummary] = useState<SummaryData>({
    totalIncidents: 0,
    totalViolationsCount: 0,
    failedCount: 0,
    terminatedCount: 0,
    uniqueStudents: 0,
    uniqueTeachers: 0,
  });
  const [loading, setLoading] = useState(true);
  const [filterType, setFilterType] = useState<"ALL" | "ALL_ATTEMPTS" | "VIOLATIONS" | "FAILED" | "TERMINATED">("ALL_ATTEMPTS");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedAttemptIds, setSelectedAttemptIds] = useState<string[]>([]);
  const [expandedAttemptId, setExpandedAttemptId] = useState<string | null>(null);

  // Retry modal & action state
  const [retryTarget, setRetryTarget] = useState<IncidentItem | null>(null);
  const [isRetrying, setIsRetrying] = useState(false);
  const [toastMessage, setToastMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const showToast = (type: "success" | "error", text: string) => {
    setToastMessage({ type, text });
    setTimeout(() => setToastMessage(null), 5000);
  };

  const fetchIncidents = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filterType !== "ALL") params.append("filter", filterType);

      const res = await fetch(`/api/admin/violations?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setIncidents(data.records || []);
        if (data.summary) setSummary(data.summary);
      } else {
        showToast("error", "Failed to load violation records");
      }
    } catch (err) {
      console.error(err);
      showToast("error", "Network error while fetching incidents");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchIncidents();
  }, [filterType]);

  // Handle single or bulk exam retry grant
  const executeRetry = async (attemptIds: string[]) => {
    if (attemptIds.length === 0) return;
    setIsRetrying(true);
    try {
      const res = await fetch("/api/admin/attempts/retry", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ attemptIds }),
      });
      const data = await res.json();
      if (res.ok) {
        showToast("success", data.message || `Exam retry successfully granted.`);
        setRetryTarget(null);
        setSelectedAttemptIds([]);
        fetchIncidents();
      } else {
        showToast("error", data.error || "Failed to grant exam retry");
      }
    } catch (err) {
      showToast("error", "Network error executing retry grant");
    } finally {
      setIsRetrying(false);
    }
  };

  const filteredIncidents = incidents.filter((item) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      item.student.name.toLowerCase().includes(q) ||
      item.student.email.toLowerCase().includes(q) ||
      (item.student.usn && item.student.usn.toLowerCase().includes(q)) ||
      item.examTitle.toLowerCase().includes(q) ||
      item.teacher.name.toLowerCase().includes(q) ||
      item.teacher.email.toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-6">
      {/* Toast Alert */}
      {toastMessage && (
        <div
          className={`fixed bottom-6 right-6 z-50 flex items-center gap-3 px-4 py-3 rounded-xl border shadow-2xl transition-all ${
            toastMessage.type === "success"
              ? "bg-emerald-950/90 border-emerald-500/40 text-emerald-200"
              : "bg-red-950/90 border-red-500/40 text-red-200"
          }`}
        >
          {toastMessage.type === "success" ? (
            <CheckCircle2 className="h-5 w-5 text-emerald-400 shrink-0" />
          ) : (
            <AlertCircle className="h-5 w-5 text-red-400 shrink-0" />
          )}
          <span className="text-sm font-medium">{toastMessage.text}</span>
          <button
            onClick={() => setToastMessage(null)}
            className="ml-2 text-slate-400 hover:text-white"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Incident Metrics Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-[#111722] border border-slate-800 rounded-2xl p-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-400 uppercase tracking-wider">Violations Logged</span>
            <ShieldAlert className="h-4 w-4 text-amber-400" />
          </div>
          <div className="text-2xl font-bold text-amber-400 mt-1.5">{summary.totalViolationsCount}</div>
          <div className="text-xs text-slate-500 mt-0.5">Tab switch, blur, paste</div>
        </div>

        <div className="bg-[#111722] border border-slate-800 rounded-2xl p-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-400 uppercase tracking-wider">Disqualified</span>
            <XCircle className="h-4 w-4 text-red-400" />
          </div>
          <div className="text-2xl font-bold text-red-400 mt-1.5">{summary.terminatedCount}</div>
          <div className="text-xs text-red-400/80 mt-0.5">Exceeded violation limit</div>
        </div>

        <div className="bg-[#111722] border border-slate-800 rounded-2xl p-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-400 uppercase tracking-wider">Failed Candidates</span>
            <AlertTriangle className="h-4 w-4 text-rose-400" />
          </div>
          <div className="text-2xl font-bold text-white mt-1.5">{summary.failedCount}</div>
          <div className="text-xs text-slate-500 mt-0.5">Below pass percentage</div>
        </div>

        <div className="bg-[#111722] border border-slate-800 rounded-2xl p-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-400 uppercase tracking-wider">Affected Faculty</span>
            <BookOpen className="h-4 w-4 text-purple-400" />
          </div>
          <div className="text-2xl font-bold text-purple-400 mt-1.5">{summary.uniqueTeachers}</div>
          <div className="text-xs text-slate-500 mt-0.5">Whose exams had incidents</div>
        </div>
      </div>

      {/* Toolbar: Search, Filters & Bulk Retry */}
      <div className="bg-[#111722] border border-slate-800 rounded-2xl p-4 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="flex flex-1 flex-col sm:flex-row items-center gap-3">
          <div className="relative w-full sm:w-64 shrink-0">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search student, USN, exam, or teacher..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 rounded-lg bg-[#0B0F17] border border-slate-700/80 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>

          <div className="flex items-center gap-1.5 bg-[#0B0F17] border border-slate-800 rounded-lg p-1 self-start sm:self-auto">
            {(
              [
                { id: "ALL_ATTEMPTS", label: "All Attempts" },
                { id: "ALL", label: "Incidents" },
                { id: "VIOLATIONS", label: "Violations" },
                { id: "FAILED", label: "Failed" },
                { id: "TERMINATED", label: "Disqualified" },
              ] as const
            ).map((t) => (
              <button
                key={t.id}
                onClick={() => setFilterType(t.id)}
                className={`px-3 py-1 rounded text-xs font-medium transition-colors ${
                  filterType === t.id
                    ? "bg-blue-600 text-white"
                    : "text-slate-400 hover:text-white"
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {selectedAttemptIds.length > 0 && (
            <button
              onClick={() => executeRetry(selectedAttemptIds)}
              disabled={isRetrying}
              className="flex items-center gap-2 px-3.5 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold shadow-sm transition-all"
            >
              <RotateCcw className={`h-4 w-4 ${isRetrying ? "animate-spin" : ""}`} />
              Allow Retry for Selected ({selectedAttemptIds.length})
            </button>
          )}

          <button
            onClick={fetchIncidents}
            title="Refresh list"
            className="p-2 rounded-lg bg-[#0B0F17] border border-slate-700/80 text-slate-400 hover:text-white transition-colors"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          </button>
        </div>
      </div>

      {/* Incidents Table with Teacher Attribution */}
      <div className="bg-[#111722] border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-[#0B0F17] text-slate-400 uppercase text-[11px] font-semibold border-b border-slate-800 tracking-wider">
              <tr>
                <th className="py-3 px-4 w-8">
                  <input
                    type="checkbox"
                    checked={
                      filteredIncidents.length > 0 &&
                      selectedAttemptIds.length === filteredIncidents.length
                    }
                    onChange={(e) => {
                      if (e.target.checked) {
                        setSelectedAttemptIds(filteredIncidents.map((i) => i.id));
                      } else {
                        setSelectedAttemptIds([]);
                      }
                    }}
                    className="rounded bg-slate-900 border-slate-700 text-blue-600"
                  />
                </th>
                <th className="py-3 px-4">Student Candidate</th>
                <th className="py-3 px-4">Whose Exam (Faculty / Teacher)</th>
                <th className="py-3 px-4">Exam &amp; Threshold</th>
                <th className="py-3 px-4">Outcome &amp; Score</th>
                <th className="py-3 px-4">Violations Log</th>
                <th className="py-3 px-4 text-right">Admin Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {loading ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-500">
                    <RefreshCw className="h-6 w-6 animate-spin mx-auto mb-2 text-blue-500" />
                    Fetching incident records and teacher details...
                  </td>
                </tr>
              ) : filteredIncidents.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-500">
                    No violations or failed attempts found for the selected criteria.
                  </td>
                </tr>
              ) : (
                filteredIncidents.map((item) => {
                  const isSelected = selectedAttemptIds.includes(item.id);
                  const isExpanded = expandedAttemptId === item.id;

                  return (
                    <>
                      <tr
                        key={item.id}
                        className={`transition-colors ${
                          isSelected ? "bg-blue-950/20" : "hover:bg-slate-800/40"
                        }`}
                      >
                        <td className="py-3.5 px-4">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => {
                              setSelectedAttemptIds((prev) =>
                                prev.includes(item.id)
                                  ? prev.filter((id) => id !== item.id)
                                  : [...prev, item.id]
                              );
                            }}
                            className="rounded bg-slate-900 border-slate-700 text-blue-600"
                          />
                        </td>

                        {/* Student Info */}
                        <td className="py-3.5 px-4">
                          <div>
                            <div className="font-semibold text-white flex items-center gap-1.5">
                              {item.student.name}
                            </div>
                            <div className="text-[11px] text-slate-400 font-mono">
                              {item.student.usn || item.student.email}
                            </div>
                            <div className="text-[10px] text-slate-500">
                              {item.student.department || "Engineering"}
                            </div>
                          </div>
                        </td>

                        {/* Teacher Info — Whose exam was it! */}
                        <td className="py-3.5 px-4">
                          <div className="p-2 rounded-lg bg-slate-900/60 border border-slate-800/80">
                            <div className="font-medium text-purple-300 flex items-center gap-1.5 text-xs">
                              <BookOpen className="h-3.5 w-3.5 text-purple-400 shrink-0" />
                              {item.teacher.name}
                            </div>
                            <div className="text-[11px] text-slate-400 font-mono mt-0.5 truncate max-w-[180px]">
                              {item.teacher.email}
                            </div>
                            <div className="text-[10px] text-slate-500 mt-0.5">
                              {item.teacher.department}
                            </div>
                          </div>
                        </td>

                        {/* Exam Title & Pass Mark */}
                        <td className="py-3.5 px-4">
                          <div>
                            <div className="font-medium text-slate-200 line-clamp-1 max-w-[200px]" title={item.examTitle}>
                              {item.examTitle}
                            </div>
                            <div className="text-[11px] text-slate-400 mt-0.5">
                              Pass Mark: <span className="font-semibold text-slate-300">{item.passMark} pts</span> ({item.passPercentage}%)
                            </div>
                            <div className="text-[10px] text-slate-500">
                              Max Violation Limit: {item.violationLimit}
                            </div>
                          </div>
                        </td>

                        {/* Outcome & Score */}
                        <td className="py-3.5 px-4">
                          <div className="space-y-1">
                            {item.isTerminated || item.violationLimitExceeded ? (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-red-500/20 text-red-400 border border-red-500/40">
                                <XCircle className="h-3 w-3" /> Disqualified
                              </span>
                            ) : item.isFailed ? (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-rose-500/20 text-rose-300 border border-rose-500/40">
                                <AlertTriangle className="h-3 w-3" /> Failed
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-emerald-500/20 text-emerald-400 border border-emerald-500/40">
                                <CheckCircle2 className="h-3 w-3" /> Passed
                              </span>
                            )}

                            <div className="text-[11px]">
                              Score: <span className="font-bold text-white">{item.totalScore}</span> / {item.totalMarks} ({item.percentage}%)
                            </div>
                          </div>
                        </td>

                        {/* Violations Count & View Details button */}
                        <td className="py-3.5 px-4">
                          <div>
                            {item.violationCount > 0 ? (
                              <div className="flex items-center gap-1.5">
                                <span className="px-2 py-0.5 rounded-full text-[11px] font-mono font-bold bg-amber-500/10 text-amber-400 border border-amber-500/30">
                                  {item.violationCount} recorded
                                </span>
                                {item.violations.length > 0 && (
                                  <button
                                    onClick={() =>
                                      setExpandedAttemptId(isExpanded ? null : item.id)
                                    }
                                    className="p-1 rounded text-slate-400 hover:text-white"
                                    title="View incident timestamps"
                                  >
                                    {isExpanded ? (
                                      <ChevronUp className="h-4 w-4" />
                                    ) : (
                                      <ChevronDown className="h-4 w-4" />
                                    )}
                                  </button>
                                )}
                              </div>
                            ) : (
                              <span className="text-slate-500 text-[11px]">No violations</span>
                            )}
                          </div>
                        </td>

                        {/* Allow Exam Retry Action */}
                        <td className="py-3.5 px-4 text-right">
                          <button
                            onClick={() => setRetryTarget(item)}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-emerald-600/15 hover:bg-emerald-600/25 text-emerald-400 border border-emerald-500/40 transition shadow-sm"
                            title="Reset attempt and unlock re-attempt for this student"
                          >
                            <RotateCcw className="h-3.5 w-3.5" />
                            Allow Retry
                          </button>
                        </td>
                      </tr>

                      {/* Expanded Violation Logs Drawer */}
                      {isExpanded && item.violations.length > 0 && (
                        <tr className="bg-slate-900/80">
                          <td colSpan={7} className="p-4 border-b border-slate-800">
                            <div className="space-y-2 max-w-4xl">
                              <div className="text-[11px] font-semibold text-slate-300 uppercase tracking-wider flex items-center gap-2">
                                <ShieldAlert className="h-3.5 w-3.5 text-amber-400" />
                                Incident Timeline for {item.student.name}:
                              </div>
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-2">
                                {item.violations.map((v) => (
                                  <div
                                    key={v.id}
                                    className="p-2.5 rounded-lg bg-[#0B0F17] border border-slate-800 text-[11px] space-y-1"
                                  >
                                    <div className="flex items-center justify-between">
                                      <span className="font-mono font-semibold text-amber-300">
                                        {v.type}
                                      </span>
                                      <span className="text-[10px] text-slate-500">
                                        {new Date(v.timestamp).toLocaleTimeString()}
                                      </span>
                                    </div>
                                    {v.metadata && (
                                      <div className="text-slate-400 text-[10px] leading-relaxed">
                                        {v.metadata}
                                      </div>
                                    )}
                                  </div>
                                ))}
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Allow Retry Confirmation Modal */}
      {retryTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="bg-[#111722] border border-slate-800 rounded-2xl max-w-lg w-full p-6 space-y-4 shadow-2xl">
            <div className="flex items-center gap-3 text-emerald-400">
              <div className="h-10 w-10 rounded-full bg-emerald-950/60 border border-emerald-800/80 flex items-center justify-center shrink-0">
                <RotateCcw className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-base font-semibold text-white">Allow Exam Re-attempt</h3>
                <p className="text-xs text-slate-400">
                  Override attempt lock and reset candidate eligibility
                </p>
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-900 border border-slate-800 space-y-2 text-xs">
              <div className="flex justify-between text-slate-300">
                <span className="text-slate-400">Candidate:</span>
                <span className="font-semibold text-white">{retryTarget.student.name} ({retryTarget.student.usn || retryTarget.student.email})</span>
              </div>
              <div className="flex justify-between text-slate-300">
                <span className="text-slate-400">Exam:</span>
                <span className="text-white font-medium">{retryTarget.examTitle}</span>
              </div>
              <div className="flex justify-between text-slate-300">
                <span className="text-slate-400">Faculty Examiner:</span>
                <span className="text-purple-300">{retryTarget.teacher.name} ({retryTarget.teacher.department})</span>
              </div>
              <div className="flex justify-between text-slate-300">
                <span className="text-slate-400">Current Status:</span>
                <span className="font-semibold text-red-400">
                  {retryTarget.isTerminated ? "Disqualified" : "Failed / Ended"}
                </span>
              </div>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed">
              Granting a retry will reset the student&apos;s previous attempt lock and recorded violations for this exam.
              The student will be permitted to launch a fresh exam attempt with full duration immediately.
            </p>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setRetryTarget(null)}
                className="px-4 py-2 rounded-lg text-xs font-medium text-slate-400 hover:text-white bg-slate-900 border border-slate-800"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isRetrying}
                onClick={() => executeRetry([retryTarget.id])}
                className="flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 shadow-sm"
              >
                {isRetrying ? (
                  <>
                    <RefreshCw className="h-4 w-4 animate-spin" />
                    Unlocking...
                  </>
                ) : (
                  <>
                    <RotateCcw className="h-4 w-4" />
                    Confirm &amp; Allow Retry
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
