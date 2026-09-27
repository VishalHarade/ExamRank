"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  BookOpen,
  Plus,
  Search,
  Filter,
  Code2,
  Trash2,
  CheckCircle2,
  Lock,
  Eye,
  X,
  FileCode,
  Layers,
  Sparkles,
} from "lucide-react";

interface TestCase {
  id: string;
  input: string;
  expectedOutput: string;
  marks: number;
  isHidden: boolean;
}

interface Question {
  id: string;
  title: string;
  description: string;
  difficulty: "EASY" | "MEDIUM" | "HARD";
  allowedLanguages: string;
  defaultMarks: number;
  timeLimit: number;
  memoryLimit: number;
  tags?: string | null;
  testCases: TestCase[];
  _count?: { submissions: number; examQuestions: number };
}

export function QuestionBank({ initialQuestions }: { initialQuestions: Question[] }) {
  const router = useRouter();
  const [questions, setQuestions] = useState<Question[]>(initialQuestions);
  const [search, setSearch] = useState("");
  const [filterDifficulty, setFilterDifficulty] = useState<string>("ALL");
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // New question form state
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [inputFormat, setInputFormat] = useState("Standard line-delimited input.");
  const [outputFormat, setOutputFormat] = useState("Single line output.");
  const [constraints, setConstraints] = useState("1 <= N <= 10^5");
  const [difficulty, setDifficulty] = useState<"EASY" | "MEDIUM" | "HARD">("EASY");
  const [defaultMarks, setDefaultMarks] = useState("20");
  const [tags, setTags] = useState("algorithms,arrays");

  // Dynamic test cases in form
  const [formTestCases, setFormTestCases] = useState<
    { input: string; expectedOutput: string; marks: number; isHidden: boolean; explanation: string }[]
  >([
    { input: "4\n1 2 3 4", expectedOutput: "4", marks: 10, isHidden: false, explanation: "Sample case 1" },
    { input: "5\n-1 -5 10 20 0", expectedOutput: "20", marks: 10, isHidden: true, explanation: "Hidden edge case" },
  ]);

  const addTestCaseRow = () => {
    setFormTestCases((prev) => [
      ...prev,
      { input: "", expectedOutput: "", marks: 5, isHidden: true, explanation: "" },
    ]);
  };

  const removeTestCaseRow = (idx: number) => {
    setFormTestCases((prev) => prev.filter((_, i) => i !== idx));
  };

  const updateTestCase = (idx: number, field: string, value: any) => {
    setFormTestCases((prev) =>
      prev.map((tc, i) => (i === idx ? { ...tc, [field]: value } : tc))
    );
  };

  const handleCreateQuestion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !description) return;
    setIsSubmitting(true);

    try {
      const res = await fetch("/api/questions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          description,
          inputFormat,
          outputFormat,
          constraints,
          difficulty,
          defaultMarks: parseInt(defaultMarks),
          tags,
          testCases: formTestCases,
        }),
      });

      if (res.ok) {
        setShowCreateModal(false);
        router.refresh();
        setTitle("");
        setDescription("");
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const filtered = questions.filter((q) => {
    const matchesSearch = q.title.toLowerCase().includes(search.toLowerCase());
    const matchesDiff = filterDifficulty === "ALL" || q.difficulty === filterDifficulty;
    return matchesSearch && matchesDiff;
  });

  return (
    <div className="space-y-6">
      {/* Search & Actions Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3 flex-1 max-w-md">
          <div className="relative w-full">
            <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
            <input
              type="text"
              placeholder="Search problem bank..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-2 rounded-xl glass-input text-xs focus:outline-none focus:border-blue-500"
            />
          </div>

          <select
            value={filterDifficulty}
            onChange={(e) => setFilterDifficulty(e.target.value)}
            className="px-3 py-2 rounded-xl glass-input text-xs font-mono bg-slate-900 focus:outline-none"
          >
            <option value="ALL">All Difficulties</option>
            <option value="EASY">Easy</option>
            <option value="MEDIUM">Medium</option>
            <option value="HARD">Hard</option>
          </select>
        </div>

        <button
          onClick={() => setShowCreateModal(true)}
          className="px-4 py-2 rounded-xl text-xs font-bold bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-600/30 transition flex items-center gap-1.5 self-start sm:self-auto active:scale-95"
        >
          <Plus className="h-4 w-4" /> Add Problem
        </button>
      </div>

      {/* Questions Grid */}
      <div className="grid gap-4">
        {filtered.map((q) => (
          <div
            key={q.id}
            className="glass-card rounded-2xl p-6 border border-white/5 hover:border-white/15 transition flex flex-col md:flex-row md:items-center justify-between gap-4"
          >
            <div className="space-y-2 flex-1">
              <div className="flex items-center gap-2">
                <span
                  className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-bold uppercase tracking-wider ${
                    q.difficulty === "EASY"
                      ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                      : q.difficulty === "MEDIUM"
                      ? "bg-amber-500/10 text-amber-400 border border-amber-500/20"
                      : "bg-rose-500/10 text-rose-400 border border-rose-500/20"
                  }`}
                >
                  {q.difficulty}
                </span>

                <span className="text-xs font-mono text-slate-400">
                  Default Marks: {q.defaultMarks} pts
                </span>

                <span className="text-xs font-mono text-slate-400">
                  • Limits: {q.timeLimit}ms / {q.memoryLimit}MB
                </span>
              </div>

              <h3 className="text-base font-bold text-white">{q.title}</h3>
              <p className="text-xs text-slate-300 line-clamp-2 leading-relaxed">{q.description}</p>

              <div className="flex flex-wrap items-center gap-2 text-[11px] font-mono text-slate-400 pt-1">
                <span className="px-2 py-0.5 rounded bg-slate-900 border border-white/5">
                  {q.testCases.length} Test Cases ({q.testCases.filter((t) => t.isHidden).length} Hidden)
                </span>
                <span className="px-2 py-0.5 rounded bg-slate-900 border border-white/5">
                  Used in {q._count?.examQuestions || 0} Exams
                </span>
                <span className="px-2 py-0.5 rounded bg-slate-900 border border-white/5 text-slate-500">
                  Tags: {q.tags || "algorithms"}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <span className="text-xs font-mono text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-1 rounded-lg">
                Ready for Exams
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* Create Problem Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="max-w-3xl w-full glass-card p-6 sm:p-8 rounded-3xl border border-white/10 shadow-2xl space-y-6 my-8">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="h-8 w-8 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400">
                  <Code2 className="h-4 w-4" />
                </div>
                <h3 className="text-xl font-bold text-white">Create Coding Problem</h3>
              </div>
              <button
                onClick={() => setShowCreateModal(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/5"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleCreateQuestion} className="space-y-4 text-xs">
              <div className="grid sm:grid-cols-3 gap-3">
                <div className="sm:col-span-2">
                  <label className="block text-slate-300 font-semibold uppercase font-mono mb-1">
                    Problem Title
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Reverse Linked List / Longest Palindrome"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl glass-input text-xs focus:outline-none focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 font-semibold uppercase font-mono mb-1">
                    Difficulty
                  </label>
                  <select
                    value={difficulty}
                    onChange={(e) => setDifficulty(e.target.value as any)}
                    className="w-full px-3 py-2 rounded-xl glass-input text-xs font-mono bg-slate-900 focus:outline-none"
                  >
                    <option value="EASY">EASY</option>
                    <option value="MEDIUM">MEDIUM</option>
                    <option value="HARD">HARD</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-slate-300 font-semibold uppercase font-mono mb-1">
                  Problem Description (Markdown Supported)
                </label>
                <textarea
                  rows={4}
                  required
                  placeholder="Detailed task description..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl glass-input text-xs focus:outline-none focus:border-blue-500 resize-none"
                />
              </div>

              <div className="grid sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-slate-300 font-semibold uppercase font-mono mb-1">
                    Input Format
                  </label>
                  <textarea
                    rows={2}
                    value={inputFormat}
                    onChange={(e) => setInputFormat(e.target.value)}
                    className="w-full px-3 py-1.5 rounded-xl glass-input text-xs focus:outline-none resize-none"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 font-semibold uppercase font-mono mb-1">
                    Output Format
                  </label>
                  <textarea
                    rows={2}
                    value={outputFormat}
                    onChange={(e) => setOutputFormat(e.target.value)}
                    className="w-full px-3 py-1.5 rounded-xl glass-input text-xs focus:outline-none resize-none"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 font-semibold uppercase font-mono mb-1">
                    Constraints
                  </label>
                  <textarea
                    rows={2}
                    value={constraints}
                    onChange={(e) => setConstraints(e.target.value)}
                    className="w-full px-3 py-1.5 rounded-xl glass-input text-xs focus:outline-none resize-none"
                  />
                </div>
              </div>

              {/* Test Cases Builder */}
              <div className="space-y-3 pt-2">
                <div className="flex items-center justify-between">
                  <label className="text-slate-300 font-semibold uppercase font-mono">
                    Evaluation Test Cases ({formTestCases.length})
                  </label>
                  <button
                    type="button"
                    onClick={addTestCaseRow}
                    className="px-2.5 py-1 rounded-lg bg-blue-600/20 text-blue-400 hover:bg-blue-600/30 transition text-xs font-semibold flex items-center gap-1"
                  >
                    <Plus className="h-3.5 w-3.5" /> Add Case
                  </button>
                </div>

                <div className="max-h-56 overflow-y-auto space-y-3 p-2 rounded-2xl bg-slate-900/60 border border-white/5">
                  {formTestCases.map((tc, idx) => (
                    <div key={idx} className="p-3 rounded-xl bg-black/40 border border-white/5 space-y-2 relative">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-slate-300 font-mono">Case #{idx + 1}</span>
                        <div className="flex items-center gap-3">
                          <label className="flex items-center gap-1.5 text-[11px] text-slate-300 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={tc.isHidden}
                              onChange={(e) => updateTestCase(idx, "isHidden", e.target.checked)}
                              className="rounded border-slate-700 text-blue-600"
                            />
                            Hidden Test Case
                          </label>

                          <div className="flex items-center gap-1">
                            <span className="text-[11px] text-slate-400">Marks:</span>
                            <input
                              type="number"
                              min="1"
                              value={tc.marks}
                              onChange={(e) => updateTestCase(idx, "marks", parseInt(e.target.value) || 1)}
                              className="w-12 px-1.5 py-0.5 rounded bg-slate-800 text-center text-xs"
                            />
                          </div>

                          {formTestCases.length > 1 && (
                            <button
                              type="button"
                              onClick={() => removeTestCaseRow(idx)}
                              className="text-slate-500 hover:text-rose-400"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          )}
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <span className="text-[10px] text-slate-400 font-mono">STDIN Input:</span>
                          <textarea
                            rows={2}
                            value={tc.input}
                            onChange={(e) => updateTestCase(idx, "input", e.target.value)}
                            placeholder="Input lines..."
                            className="w-full p-1.5 rounded bg-slate-900 border border-white/5 font-mono text-[11px] resize-none"
                          />
                        </div>
                        <div>
                          <span className="text-[10px] text-slate-400 font-mono">Expected Output:</span>
                          <textarea
                            rows={2}
                            value={tc.expectedOutput}
                            onChange={(e) => updateTestCase(idx, "expectedOutput", e.target.value)}
                            placeholder="Expected stdout..."
                            className="w-full p-1.5 rounded bg-slate-900 border border-white/5 font-mono text-[11px] resize-none"
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="pt-4 border-t border-white/5 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 rounded-xl text-slate-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting || !title || !description}
                  className="px-6 py-2.5 rounded-xl font-bold bg-purple-600 hover:bg-purple-500 text-white shadow-lg shadow-purple-600/30 transition active:scale-95 disabled:opacity-50"
                >
                  {isSubmitting ? "Creating..." : "Save to Question Bank"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
