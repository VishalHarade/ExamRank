"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Plus,
  PlayCircle,
  Eye,
  BarChart3,
  Calendar,
  Clock,
  ShieldAlert,
  X,
  CheckCircle2,
  Trash2,
  Layers,
  ChevronRight,
  Search,
  BookOpen,
  Filter,
  Check,
  AlertTriangle,
} from "lucide-react";
import { formatDate } from "@/lib/utils";

interface QuestionSummary {
  id: string;
  title: string;
  difficulty: "EASY" | "MEDIUM" | "HARD";
  defaultMarks: number;
}

interface ExamItem {
  id: string;
  title: string;
  description: string;
  duration: number;
  startTime: string;
  endTime: string;
  status: string;
  violationLimit: number;
  totalMarks: number;
  examQuestions: { id: string; question: { id: string; title: string; difficulty: string } }[];
  attempts: { id: string; status: string; totalScore: number }[];
}

interface TeacherExamListProps {
  initialExams: ExamItem[];
  availableQuestions: QuestionSummary[];
}

export function TeacherExamList({ initialExams, availableQuestions }: TeacherExamListProps) {
  const router = useRouter();
  const [exams, setExams] = useState<ExamItem[]>(initialExams);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");

  // Create Modal State
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [questionSearch, setQuestionSearch] = useState("");

  // New exam form state
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [instructions, setInstructions] = useState(
    "1. Stay in fullscreen mode at all times.\n2. Switching browser tabs triggers an automatic violation.\n3. Code autosaves after every test run."
  );
  const [duration, setDuration] = useState("60");
  const [violationLimit, setViolationLimit] = useState("3");
  const [passPercentage, setPassPercentage] = useState("40");
  const [status, setStatus] = useState("ACTIVE");
  const [selectedQuestionIds, setSelectedQuestionIds] = useState<string[]>([]);

  // Default start and end dates (now to +3 hours)
  const now = new Date();
  const defaultStart = now.toISOString().slice(0, 16);
  const threeHoursLater = new Date(now.getTime() + 3 * 60 * 60 * 1000).toISOString().slice(0, 16);
  const [startTime, setStartTime] = useState(defaultStart);
  const [endTime, setEndTime] = useState(threeHoursLater);

  // Status Change / Delete
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const toggleQuestion = (qId: string) => {
    setSelectedQuestionIds((prev) =>
      prev.includes(qId) ? prev.filter((id) => id !== qId) : [...prev, qId]
    );
  };

  const handleCreateExam = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    setIsSubmitting(true);

    try {
      const res = await fetch("/api/exams", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title.trim(),
          description: description.trim(),
          instructions,
          duration: parseInt(duration) || 60,
          startTime: new Date(startTime).toISOString(),
          endTime: new Date(endTime).toISOString(),
          status,
          violationLimit: parseInt(violationLimit) || 3,
          questionIds: selectedQuestionIds,
        }),
      });

      if (res.ok) {
        setShowCreateModal(false);
        router.refresh();
        setTitle("");
        setDescription("");
        setSelectedQuestionIds([]);
      }
    } catch (err) {
      console.error("Create exam error:", err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteExam = async (examId: string) => {
    if (!confirm("Are you sure you want to delete this examination? All student attempts will be deleted.")) {
      return;
    }
    setDeletingId(examId);
    try {
      const res = await fetch(`/api/exams/${examId}`, { method: "DELETE" });
      if (res.ok) {
        setExams((prev) => prev.filter((e) => e.id !== examId));
        router.refresh();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setDeletingId(null);
    }
  };

  const handleUpdateStatus = async (examId: string, newStatus: string) => {
    try {
      const res = await fetch(`/api/exams/${examId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      if (res.ok) {
        setExams((prev) =>
          prev.map((e) => (e.id === examId ? { ...e, status: newStatus } : e))
        );
        router.refresh();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const filteredExams = exams.filter((exam) => {
    const matchesSearch =
      exam.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      exam.description.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === "ALL" || exam.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const totalSelectedMarks = selectedQuestionIds.reduce((sum, qId) => {
    const q = availableQuestions.find((item) => item.id === qId);
    return sum + (q ? q.defaultMarks : 20);
  }, 0);

  return (
    <section className="space-y-6">
      {/* Action Toolbar: Search, Filters & Create */}
      <div className="bg-[#0E1524] border border-slate-800 rounded-2xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-sm">
        <div className="flex flex-1 flex-col sm:flex-row items-center gap-3">
          <div className="relative w-full sm:w-80">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search exams by title or topic..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 rounded-xl bg-[#070B13] border border-slate-700/80 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:ring-1 focus:ring-purple-500"
            />
          </div>

          <div className="flex items-center gap-1 bg-[#070B13] border border-slate-800 rounded-xl p-1 self-start sm:self-auto overflow-x-auto max-w-full">
            {[
              { id: "ALL", label: "All Exams" },
              { id: "ACTIVE", label: "Active (Live)" },
              { id: "SCHEDULED", label: "Scheduled" },
              { id: "RESULT_PUBLISHED", label: "Results" },
              { id: "DRAFT", label: "Drafts" },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setStatusFilter(tab.id)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors ${
                  statusFilter === tab.id
                    ? "bg-purple-600 text-white"
                    : "text-slate-400 hover:text-white"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        <button
          onClick={() => setShowCreateModal(true)}
          className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold text-white bg-purple-600 hover:bg-purple-500 shadow-md shadow-purple-600/30 transition-all shrink-0"
        >
          <Plus className="h-4 w-4" />
          Schedule Examination
        </button>
      </div>

      {/* Exams Grid */}
      <div className="grid gap-4">
        {filteredExams.length === 0 ? (
          <div className="bg-[#0E1524] border border-slate-800 rounded-2xl p-12 text-center text-slate-400">
            <Layers className="h-8 w-8 mx-auto mb-3 text-slate-600" />
            <h3 className="text-sm font-semibold text-white">No examinations found</h3>
            <p className="text-xs text-slate-500 mt-1">
              Try adjusting your search criteria or create a new examination.
            </p>
          </div>
        ) : (
          filteredExams.map((exam) => {
            const activeStudents = exam.attempts.filter((a) => a.status === "IN_PROGRESS").length;
            const completedStudents = exam.attempts.filter(
              (a) =>
                a.status === "SUBMITTED" ||
                a.status === "AUTO_SUBMITTED" ||
                a.status === "TERMINATED"
            ).length;

            return (
              <div
                key={exam.id}
                className="bg-[#0E1524] hover:bg-[#121B2F] border border-slate-800 rounded-2xl p-6 transition flex flex-col md:flex-row md:items-center justify-between gap-6 shadow-sm"
              >
                <div className="space-y-2.5 flex-1">
                  <div className="flex flex-wrap items-center gap-2.5">
                    <span
                      className={`px-2.5 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wider inline-flex items-center gap-1.5 border ${
                        exam.status === "ACTIVE"
                          ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/30"
                          : exam.status === "SCHEDULED"
                          ? "bg-blue-500/10 text-blue-400 border-blue-500/30"
                          : exam.status === "RESULT_PUBLISHED"
                          ? "bg-purple-500/10 text-purple-400 border-purple-500/30"
                          : "bg-slate-800 text-slate-400 border-slate-700"
                      }`}
                    >
                      {exam.status === "ACTIVE" && (
                        <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                      )}
                      {exam.status === "RESULT_PUBLISHED" ? "RESULTS PUBLISHED" : exam.status}
                    </span>

                    <span className="text-xs text-slate-400 flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {exam.duration} mins
                    </span>

                    <span className="text-xs text-slate-500">
                      Window: {formatDate(exam.startTime)} – {formatDate(exam.endTime)}
                    </span>
                  </div>

                  <h3 className="text-base sm:text-lg font-bold text-white">{exam.title}</h3>
                  <p className="text-xs text-slate-400 line-clamp-1">{exam.description}</p>

                  <div className="flex flex-wrap items-center gap-2.5 text-xs text-slate-300 pt-1">
                    <span className="px-2.5 py-1 rounded-lg bg-[#070B13] border border-slate-800 text-slate-300">
                      {exam.examQuestions.length} Questions ({exam.totalMarks || 70} Marks)
                    </span>
                    <span className="px-2.5 py-1 rounded-lg bg-[#070B13] border border-slate-800 text-emerald-400 flex items-center gap-1">
                      <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                      {activeStudents} In Progress
                    </span>
                    <span className="px-2.5 py-1 rounded-lg bg-[#070B13] border border-slate-800 text-blue-400">
                      {completedStudents} Submissions
                    </span>
                    <span className="px-2.5 py-1 rounded-lg bg-[#070B13] border border-slate-800 text-amber-400">
                      Violations Limit: {exam.violationLimit}
                    </span>
                  </div>
                </div>

                {/* Action Buttons & Status Selector */}
                <div className="flex flex-wrap items-center gap-2 shrink-0">
                  <Link
                    href={`/teacher/exams/${exam.id}/monitor`}
                    className={`px-3.5 py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition border ${
                      exam.status === "ACTIVE"
                        ? "bg-emerald-600/15 hover:bg-emerald-600/25 text-emerald-400 border-emerald-500/40 shadow-sm"
                        : "bg-slate-900 hover:bg-slate-800 text-slate-300 border-slate-800"
                    }`}
                  >
                    <Eye className="h-3.5 w-3.5" /> Live Proctor
                  </Link>

                  <Link
                    href={`/teacher/exams/${exam.id}/results`}
                    className="px-3.5 py-2 rounded-xl text-xs font-semibold bg-blue-600/15 hover:bg-blue-600/25 text-blue-400 border border-blue-500/40 transition flex items-center gap-1.5"
                  >
                    <BarChart3 className="h-3.5 w-3.5" /> Results
                  </Link>

                  {/* Status Dropdown */}
                  <select
                    value={exam.status}
                    onChange={(e) => handleUpdateStatus(exam.id, e.target.value)}
                    className="px-2.5 py-2 rounded-xl text-xs bg-[#070B13] border border-slate-800 text-slate-300 focus:outline-none focus:border-purple-500"
                  >
                    <option value="ACTIVE">Set Active</option>
                    <option value="SCHEDULED">Set Scheduled</option>
                    <option value="RESULT_PUBLISHED">Publish Results</option>
                    <option value="ENDED">End Exam</option>
                    <option value="DRAFT">Draft</option>
                  </select>

                  <button
                    onClick={() => handleDeleteExam(exam.id)}
                    disabled={deletingId === exam.id}
                    title="Delete Exam"
                    className="p-2 rounded-xl text-slate-400 hover:text-red-400 hover:bg-red-500/10 transition-colors"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Create Exam Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="max-w-3xl w-full bg-[#0E1524] border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl space-y-6 my-8">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <div className="flex items-center gap-2.5">
                <div className="h-9 w-9 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400">
                  <Plus className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-white">Schedule New Examination</h3>
                  <p className="text-xs text-slate-400">Configure parameters, proctoring security &amp; question set</p>
                </div>
              </div>
              <button
                onClick={() => setShowCreateModal(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleCreateExam} className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-300 font-semibold mb-1">
                  Examination Title *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. CS302: Data Structures & Algorithms Lab Exam"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[#070B13] border border-slate-700 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-purple-500"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">
                  Description
                </label>
                <textarea
                  rows={2}
                  placeholder="Lab examination coverage, batch information, grading criteria..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl bg-[#070B13] border border-slate-700 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-purple-500 resize-none"
                />
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">
                    Duration (Minutes)
                  </label>
                  <input
                    type="number"
                    min={15}
                    max={360}
                    value={duration}
                    onChange={(e) => setDuration(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-[#070B13] border border-slate-700 text-xs text-white focus:outline-none focus:border-purple-500"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 font-semibold mb-1">
                    Violation Limit
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={10}
                    value={violationLimit}
                    onChange={(e) => setViolationLimit(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-[#070B13] border border-slate-700 text-xs text-white focus:outline-none focus:border-purple-500"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 font-semibold mb-1">
                    Pass Mark (%)
                  </label>
                  <input
                    type="number"
                    min={20}
                    max={90}
                    value={passPercentage}
                    onChange={(e) => setPassPercentage(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-[#070B13] border border-slate-700 text-xs text-white focus:outline-none focus:border-purple-500"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 font-semibold mb-1">
                    Initial Status
                  </label>
                  <select
                    value={status}
                    onChange={(e) => setStatus(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-[#070B13] border border-slate-700 text-xs text-white focus:outline-none focus:border-purple-500"
                  >
                    <option value="ACTIVE">Active (Immediate)</option>
                    <option value="SCHEDULED">Scheduled</option>
                    <option value="DRAFT">Draft</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">
                    Start Date &amp; Time
                  </label>
                  <input
                    type="datetime-local"
                    value={startTime}
                    onChange={(e) => setStartTime(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-[#070B13] border border-slate-700 text-xs text-white focus:outline-none focus:border-purple-500"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 font-semibold mb-1">
                    End Deadline
                  </label>
                  <input
                    type="datetime-local"
                    value={endTime}
                    onChange={(e) => setEndTime(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-[#070B13] border border-slate-700 text-xs text-white focus:outline-none focus:border-purple-500"
                  />
                </div>
              </div>

              {/* Question Selection from Bank */}
              <div className="space-y-2 pt-2 border-t border-slate-800">
                <div className="flex items-center justify-between">
                  <label className="block text-slate-300 font-semibold">
                    Select Coding Questions ({selectedQuestionIds.length} Selected • {totalSelectedMarks} Total Marks)
                  </label>
                  <span className="text-[11px] text-purple-400">
                    From Question Bank ({availableQuestions.length} available)
                  </span>
                </div>

                <div className="max-h-48 overflow-y-auto space-y-1.5 p-2 rounded-xl bg-[#070B13] border border-slate-800">
                  {availableQuestions.length === 0 ? (
                    <div className="p-4 text-center text-slate-500 text-xs">
                      No questions found in bank. Add problems in the Question Bank first.
                    </div>
                  ) : (
                    availableQuestions.map((q) => {
                      const isSelected = selectedQuestionIds.includes(q.id);
                      return (
                        <div
                          key={q.id}
                          onClick={() => toggleQuestion(q.id)}
                          className={`p-2.5 rounded-lg border cursor-pointer flex items-center justify-between transition-colors ${
                            isSelected
                              ? "bg-purple-950/40 border-purple-600/60 text-white"
                              : "bg-slate-900/60 border-slate-800 text-slate-300 hover:border-slate-700"
                          }`}
                        >
                          <div className="flex items-center gap-2.5">
                            <div
                              className={`h-4 w-4 rounded flex items-center justify-center border text-[10px] ${
                                isSelected
                                  ? "bg-purple-600 border-purple-600 text-white"
                                  : "border-slate-700"
                              }`}
                            >
                              {isSelected && <Check className="h-3 w-3" />}
                            </div>
                            <span className="font-medium text-xs">{q.title}</span>
                          </div>

                          <div className="flex items-center gap-2 text-[10px]">
                            <span
                              className={`px-2 py-0.5 rounded font-mono ${
                                q.difficulty === "EASY"
                                  ? "bg-emerald-500/10 text-emerald-400"
                                  : q.difficulty === "MEDIUM"
                                  ? "bg-amber-500/10 text-amber-400"
                                  : "bg-rose-500/10 text-rose-400"
                              }`}
                            >
                              {q.difficulty}
                            </span>
                            <span className="font-mono text-slate-400">{q.defaultMarks} Marks</span>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-white bg-slate-900 border border-slate-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting || !title.trim()}
                  className="px-5 py-2 rounded-xl text-xs font-bold text-white bg-purple-600 hover:bg-purple-500 disabled:opacity-50 shadow-md shadow-purple-600/30 transition-all"
                >
                  {isSubmitting ? "Creating..." : "Save & Publish Exam"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </section>
  );
}
