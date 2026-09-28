"use client";

import { useState, useEffect, useRef } from "react";
import {
  Users,
  UserPlus,
  UploadCloud,
  Trash2,
  Search,
  Filter,
  CheckSquare,
  Square,
  AlertCircle,
  CheckCircle2,
  RefreshCw,
  FileSpreadsheet,
  X,
  GraduationCap,
  Shield,
  BookOpen,
  Download,
  AlertTriangle,
} from "lucide-react";

interface UserRecord {
  id: string;
  name: string;
  email: string;
  role: "STUDENT" | "TEACHER" | "ADMIN";
  usn: string | null;
  department: string | null;
  semester: number | null;
  division: string | null;
  createdAt: string;
  _count: {
    attempts: number;
    createdExams: number;
    violations: number;
  };
}

interface UserCounts {
  total: number;
  students: number;
  teachers: number;
  admins: number;
}

export function AdminUserManager() {
  const [users, setUsers] = useState<UserRecord[]>([]);
  const [counts, setCounts] = useState<UserCounts>({ total: 0, students: 0, teachers: 0, admins: 0 });
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState<string>("ALL");
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]);

  // Modals
  const [showAddModal, setShowAddModal] = useState(false);
  const [showBulkModal, setShowBulkModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  // Notifications
  const [toastMessage, setToastMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Single Add User Form State
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "password123",
    role: "STUDENT",
    department: "Computer Science & Engineering",
    usn: "",
    semester: "6",
    division: "A",
  });
  const [isSubmittingSingle, setIsSubmittingSingle] = useState(false);

  // Bulk Upload Form State
  const [bulkCsvText, setBulkCsvText] = useState("");
  const [bulkRole, setBulkRole] = useState<"STUDENT" | "TEACHER">("STUDENT");
  const [bulkUploading, setBulkUploading] = useState(false);
  const [bulkResults, setBulkResults] = useState<{
    insertedCount: number;
    skippedCount: number;
    skippedUsers: Array<{ email: string; reason: string }>;
  } | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const showToast = (type: "success" | "error", text: string) => {
    setToastMessage({ type, text });
    setTimeout(() => setToastMessage(null), 5000);
  };

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (roleFilter !== "ALL") params.append("role", roleFilter);
      if (searchQuery.trim()) params.append("query", searchQuery.trim());

      const res = await fetch(`/api/admin/users?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setUsers(data.users || []);
        if (data.counts) setCounts(data.counts);
      } else {
        showToast("error", "Failed to load users directory");
      }
    } catch (err) {
      console.error(err);
      showToast("error", "Network error while fetching users");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, [roleFilter]);

  // Handle search debounce
  useEffect(() => {
    const handler = setTimeout(() => {
      fetchUsers();
    }, 300);
    return () => clearTimeout(handler);
  }, [searchQuery]);

  // Selection logic
  const handleSelectAll = () => {
    if (selectedUserIds.length === users.length) {
      setSelectedUserIds([]);
    } else {
      setSelectedUserIds(users.map((u) => u.id));
    }
  };

  const handleToggleSelect = (id: string) => {
    setSelectedUserIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  // Bulk Delete
  const handleBulkDelete = async () => {
    if (selectedUserIds.length === 0) return;
    try {
      const res = await fetch("/api/admin/users", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userIds: selectedUserIds }),
      });
      const data = await res.json();
      if (res.ok) {
        showToast("success", data.message || `Deleted ${selectedUserIds.length} user(s).`);
        setSelectedUserIds([]);
        setShowDeleteConfirm(false);
        fetchUsers();
      } else {
        showToast("error", data.error || "Failed to delete users");
      }
    } catch (err) {
      showToast("error", "Error communicating with server");
    }
  };

  // Single User Create
  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.email) {
      showToast("error", "Name and email are mandatory");
      return;
    }
    setIsSubmittingSingle(true);
    try {
      const res = await fetch("/api/admin/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });
      const data = await res.json();
      if (res.ok) {
        showToast("success", `User ${data.user.name} created successfully.`);
        setShowAddModal(false);
        setFormData({
          name: "",
          email: "",
          password: "password123",
          role: "STUDENT",
          department: "Computer Science & Engineering",
          usn: "",
          semester: "6",
          division: "A",
        });
        fetchUsers();
      } else {
        showToast("error", data.error || "Failed to create user");
      }
    } catch (err) {
      showToast("error", "Error creating user");
    } finally {
      setIsSubmittingSingle(false);
    }
  };

  // Bulk CSV Upload
  const handleBulkUpload = async () => {
    if (!bulkCsvText.trim()) {
      showToast("error", "Please provide CSV data or select a file");
      return;
    }

    setBulkUploading(true);
    setBulkResults(null);

    try {
      // Parse CSV rows
      const lines = bulkCsvText
        .split("\n")
        .map((l) => l.trim())
        .filter((l) => l.length > 0);

      if (lines.length === 0) {
        showToast("error", "CSV content is empty");
        setBulkUploading(false);
        return;
      }

      // Check header or assume standard ordering: Name, Email, USN/Role, Department, Semester, Division, Password
      let startIndex = 0;
      const firstLineLower = lines[0].toLowerCase();
      if (firstLineLower.includes("email") || firstLineLower.includes("name")) {
        startIndex = 1; // skip header line
      }

      const parsedUsers: any[] = [];
      for (let i = startIndex; i < lines.length; i++) {
        const parts = lines[i].split(",").map((p) => p.trim().replace(/^["']|["']$/g, ""));
        if (parts.length < 2) continue;

        const name = parts[0];
        const email = parts[1];
        let role = bulkRole;
        let usn = "";
        let department = "Computer Science & Engineering";
        let semester = "6";
        let division = "A";
        let password = "password123";

        if (bulkRole === "STUDENT") {
          usn = parts[2] || "";
          department = parts[3] || department;
          semester = parts[4] || semester;
          division = parts[5] || division;
          password = parts[6] || password;
        } else {
          // TEACHER
          department = parts[2] || department;
          password = parts[3] || password;
        }

        parsedUsers.push({
          name,
          email,
          role,
          usn: usn || null,
          department: department || null,
          semester: semester ? Number(semester) : null,
          division: division || null,
          password,
        });
      }

      if (parsedUsers.length === 0) {
        showToast("error", "No valid user rows found in CSV text");
        setBulkUploading(false);
        return;
      }

      const res = await fetch("/api/admin/users/bulk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ users: parsedUsers }),
      });

      const data = await res.json();
      if (res.ok) {
        setBulkResults({
          insertedCount: data.insertedCount,
          skippedCount: data.skippedCount,
          skippedUsers: data.skippedUsers || [],
        });
        showToast("success", data.message);
        fetchUsers();
      } else {
        showToast("error", data.error || "Failed to process bulk upload");
      }
    } catch (err: any) {
      showToast("error", err.message || "Failed to upload batch");
    } finally {
      setBulkUploading(false);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      setBulkCsvText(text || "");
    };
    reader.readAsText(file);
  };

  const downloadSampleCsv = (type: "STUDENT" | "TEACHER") => {
    let header = "";
    let sample = "";
    if (type === "STUDENT") {
      header = "Name,Email,USN,Department,Semester,Division,Password\n";
      sample =
        "Rohan Verma,rohan.v@college.edu,1MS21CS101,Computer Science & Engineering,6,A,password123\n" +
        "Sneha Rao,sneha.r@college.edu,1MS21CS102,Computer Science & Engineering,6,B,password123\n" +
        "Karthik Nair,karthik.n@college.edu,1MS21CS103,Information Science,6,A,password123\n";
    } else {
      header = "Name,Email,Department,Password\n";
      sample =
        "Prof. Donald Knuth,knuth@college.edu,Computer Science & Engineering,password123\n" +
        "Dr. Barbara Liskov,liskov@college.edu,Information Science,password123\n";
    }

    const blob = new Blob([header + sample], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `sample_${type.toLowerCase()}_upload.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

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

      {/* Directory Stats Top Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-[#111722] border border-slate-800 rounded-2xl p-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-400 uppercase tracking-wider">Total Users</span>
            <Users className="h-4 w-4 text-blue-400" />
          </div>
          <div className="text-2xl font-bold text-white mt-1.5">{counts.total}</div>
          <div className="text-xs text-slate-500 mt-0.5">Enrolled across system</div>
        </div>

        <div className="bg-[#111722] border border-slate-800 rounded-2xl p-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-400 uppercase tracking-wider">Students</span>
            <GraduationCap className="h-4 w-4 text-emerald-400" />
          </div>
          <div className="text-2xl font-bold text-white mt-1.5">{counts.students}</div>
          <div className="text-xs text-emerald-400/80 mt-0.5">Registered candidates</div>
        </div>

        <div className="bg-[#111722] border border-slate-800 rounded-2xl p-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-400 uppercase tracking-wider">Teachers & Faculty</span>
            <BookOpen className="h-4 w-4 text-purple-400" />
          </div>
          <div className="text-2xl font-bold text-white mt-1.5">{counts.teachers}</div>
          <div className="text-xs text-purple-400/80 mt-0.5">Exam examiners & creators</div>
        </div>

        <div className="bg-[#111722] border border-slate-800 rounded-2xl p-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-400 uppercase tracking-wider">Administrators</span>
            <Shield className="h-4 w-4 text-amber-400" />
          </div>
          <div className="text-2xl font-bold text-white mt-1.5">{counts.admins}</div>
          <div className="text-xs text-slate-500 mt-0.5">System controllers</div>
        </div>
      </div>

      {/* Action Toolbar */}
      <div className="bg-[#111722] border border-slate-800 rounded-2xl p-4 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        {/* Search & Filter */}
        <div className="flex flex-1 flex-col sm:flex-row items-center gap-3">
          <div className="relative w-full sm:w-64 shrink-0">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search by name, email, USN, dept..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 rounded-lg bg-[#0B0F17] border border-slate-700/80 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>

          <div className="flex items-center gap-1.5 bg-[#0B0F17] border border-slate-800 rounded-lg p-1 self-start sm:self-auto">
            {["ALL", "STUDENT", "TEACHER", "ADMIN"].map((r) => (
              <button
                key={r}
                onClick={() => setRoleFilter(r)}
                className={`px-3 py-1 rounded text-xs font-medium transition-colors ${
                  roleFilter === r
                    ? "bg-blue-600 text-white"
                    : "text-slate-400 hover:text-white"
                }`}
              >
                {r === "ALL" ? "All" : r === "STUDENT" ? "Students" : r === "TEACHER" ? "Teachers" : "Admins"}
              </button>
            ))}
          </div>
        </div>

        {/* Primary Action Buttons */}
        <div className="flex flex-wrap items-center gap-2.5">
          {selectedUserIds.length > 0 && (
            <button
              onClick={() => setShowDeleteConfirm(true)}
              className="flex items-center gap-2 px-3.5 py-2 rounded-lg bg-red-600 hover:bg-red-500 text-white text-xs font-semibold shadow-sm transition-all animate-pulse"
            >
              <Trash2 className="h-4 w-4" />
              Delete Selected ({selectedUserIds.length})
            </button>
          )}

          <button
            onClick={() => {
              setBulkResults(null);
              setBulkCsvText("");
              setShowBulkModal(true);
            }}
            className="flex items-center gap-2 px-3.5 py-2 rounded-lg bg-blue-600/10 hover:bg-blue-600/20 text-blue-400 border border-blue-500/30 text-xs font-medium transition-all"
          >
            <UploadCloud className="h-4 w-4" />
            Bulk Upload (CSV)
          </button>

          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-2 px-3.5 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-medium shadow-sm transition-all"
          >
            <UserPlus className="h-4 w-4" />
            Add User
          </button>

          <button
            onClick={fetchUsers}
            title="Refresh list"
            className="p-2 rounded-lg bg-[#0B0F17] border border-slate-700/80 text-slate-400 hover:text-white transition-colors"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          </button>
        </div>
      </div>

      {/* Users Table */}
      <div className="bg-[#111722] border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-[#0B0F17] text-slate-400 uppercase text-[11px] font-semibold border-b border-slate-800 tracking-wider">
              <tr>
                <th className="py-3 px-4 w-10">
                  <button
                    onClick={handleSelectAll}
                    className="flex items-center text-slate-400 hover:text-white"
                  >
                    {users.length > 0 && selectedUserIds.length === users.length ? (
                      <CheckSquare className="h-4 w-4 text-blue-500" />
                    ) : (
                      <Square className="h-4 w-4" />
                    )}
                  </button>
                </th>
                <th className="py-3 px-4">User Details</th>
                <th className="py-3 px-4">Role</th>
                <th className="py-3 px-4">Identifier / USN</th>
                <th className="py-3 px-4">Department & Class</th>
                <th className="py-3 px-4">Exams & Activity</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {loading ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-500">
                    <RefreshCw className="h-6 w-6 animate-spin mx-auto mb-2 text-blue-500" />
                    Loading enrolled directory...
                  </td>
                </tr>
              ) : users.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-500">
                    No users matching the selected filters found.
                  </td>
                </tr>
              ) : (
                users.map((u) => {
                  const isSelected = selectedUserIds.includes(u.id);
                  return (
                    <tr
                      key={u.id}
                      className={`transition-colors ${
                        isSelected ? "bg-blue-950/20" : "hover:bg-slate-800/40"
                      }`}
                    >
                      <td className="py-3 px-4">
                        <button
                          onClick={() => handleToggleSelect(u.id)}
                          className="flex items-center text-slate-400 hover:text-white"
                        >
                          {isSelected ? (
                            <CheckSquare className="h-4 w-4 text-blue-500" />
                          ) : (
                            <Square className="h-4 w-4" />
                          )}
                        </button>
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-3">
                          <div className="h-8 w-8 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center font-bold text-white text-xs shrink-0">
                            {u.name.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <div className="font-semibold text-white">{u.name}</div>
                            <div className="text-[11px] text-slate-400 font-mono">{u.email}</div>
                          </div>
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wider inline-flex items-center gap-1 ${
                            u.role === "STUDENT"
                              ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/30"
                              : u.role === "TEACHER"
                              ? "bg-purple-500/10 text-purple-400 border border-purple-500/30"
                              : "bg-amber-500/10 text-amber-400 border border-amber-500/30"
                          }`}
                        >
                          {u.role === "STUDENT" && <GraduationCap className="h-3 w-3" />}
                          {u.role === "TEACHER" && <BookOpen className="h-3 w-3" />}
                          {u.role === "ADMIN" && <Shield className="h-3 w-3" />}
                          {u.role}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        {u.usn ? (
                          <span className="font-mono bg-slate-900 px-2 py-0.5 rounded text-blue-300 border border-slate-800 text-[11px]">
                            {u.usn}
                          </span>
                        ) : (
                          <span className="text-slate-500">—</span>
                        )}
                      </td>
                      <td className="py-3 px-4">
                        <div>
                          <span className="text-slate-300 block truncate max-w-[200px]">
                            {u.department || "General"}
                          </span>
                          {u.semester && (
                            <span className="text-[11px] text-slate-500">
                              Sem {u.semester} {u.division ? `• Div ${u.division}` : ""}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <div className="text-[11px] space-y-0.5">
                          {u.role === "STUDENT" && (
                            <>
                              <div>
                                <span className="text-slate-400">Attempts:</span>{" "}
                                <span className="font-semibold text-white">{u._count.attempts}</span>
                              </div>
                              {u._count.violations > 0 && (
                                <div className="text-red-400 flex items-center gap-1">
                                  <AlertTriangle className="h-3 w-3" />
                                  <span>{u._count.violations} violations logged</span>
                                </div>
                              )}
                            </>
                          )}
                          {u.role === "TEACHER" && (
                            <div>
                              <span className="text-slate-400">Exams Authored:</span>{" "}
                              <span className="font-semibold text-white">{u._count.createdExams}</span>
                            </div>
                          )}
                          {u.role === "ADMIN" && (
                            <span className="text-slate-500">Full System Control</span>
                          )}
                        </div>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <button
                          onClick={() => {
                            setSelectedUserIds([u.id]);
                            setShowDeleteConfirm(true);
                          }}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-red-400 hover:bg-red-500/10 transition-colors"
                          title="Delete user"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="bg-[#111722] border border-slate-800 rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl">
            <div className="flex items-center gap-3 text-red-400">
              <div className="h-10 w-10 rounded-full bg-red-950/60 border border-red-800/80 flex items-center justify-center shrink-0">
                <AlertCircle className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-base font-semibold text-white">Confirm Removal</h3>
                <p className="text-xs text-slate-400">
                  Permanent cascade deletion of account records
                </p>
              </div>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed">
              Are you sure you want to permanently delete{" "}
              <span className="font-bold text-white">{selectedUserIds.length}</span> selected user(s)?
              All corresponding exam submissions, attempts, authored questions, and logs will also be deleted.
            </p>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="px-4 py-2 rounded-lg text-xs font-medium text-slate-400 hover:text-white bg-slate-900 border border-slate-800 hover:bg-slate-800 transition"
              >
                Cancel
              </button>
              <button
                onClick={handleBulkDelete}
                className="px-4 py-2 rounded-lg text-xs font-medium text-white bg-red-600 hover:bg-red-500 shadow-sm transition"
              >
                Yes, Delete Permanently
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Single User Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="bg-[#111722] border border-slate-800 rounded-2xl max-w-lg w-full p-6 space-y-5 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2.5">
                <UserPlus className="h-5 w-5 text-blue-500" />
                <h3 className="text-base font-semibold text-white">Enroll Single User</h3>
              </div>
              <button
                onClick={() => setShowAddModal(false)}
                className="text-slate-400 hover:text-white"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleCreateUser} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">Full Name *</label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="e.g. John Doe"
                    className="w-full px-3 py-2 rounded-lg bg-[#0B0F17] border border-slate-700 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">Email Address *</label>
                  <input
                    type="email"
                    required
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    placeholder="e.g. john@college.edu"
                    className="w-full px-3 py-2 rounded-lg bg-[#0B0F17] border border-slate-700 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">Role</label>
                  <select
                    value={formData.role}
                    onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg bg-[#0B0F17] border border-slate-700 text-xs text-white focus:outline-none focus:border-blue-500"
                  >
                    <option value="STUDENT">Student Candidate</option>
                    <option value="TEACHER">Faculty / Teacher</option>
                    <option value="ADMIN">System Administrator</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">Department</label>
                  <input
                    type="text"
                    value={formData.department}
                    onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                    placeholder="Computer Science & Engineering"
                    className="w-full px-3 py-2 rounded-lg bg-[#0B0F17] border border-slate-700 text-xs text-white focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              {formData.role === "STUDENT" && (
                <div className="grid grid-cols-3 gap-3 p-3 rounded-xl bg-slate-900/60 border border-slate-800">
                  <div>
                    <label className="block text-[11px] font-medium text-slate-300 mb-1">USN / Roll No</label>
                    <input
                      type="text"
                      value={formData.usn}
                      onChange={(e) => setFormData({ ...formData, usn: e.target.value })}
                      placeholder="1MS21CS099"
                      className="w-full px-2.5 py-1.5 rounded-lg bg-[#0B0F17] border border-slate-700 text-xs text-white font-mono focus:outline-none focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-medium text-slate-300 mb-1">Semester</label>
                    <input
                      type="number"
                      min={1}
                      max={8}
                      value={formData.semester}
                      onChange={(e) => setFormData({ ...formData, semester: e.target.value })}
                      className="w-full px-2.5 py-1.5 rounded-lg bg-[#0B0F17] border border-slate-700 text-xs text-white focus:outline-none focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-medium text-slate-300 mb-1">Division</label>
                    <input
                      type="text"
                      value={formData.division}
                      onChange={(e) => setFormData({ ...formData, division: e.target.value })}
                      placeholder="A / B"
                      className="w-full px-2.5 py-1.5 rounded-lg bg-[#0B0F17] border border-slate-700 text-xs text-white focus:outline-none focus:border-blue-500"
                    />
                  </div>
                </div>
              )}

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Initial Password</label>
                <input
                  type="text"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg bg-[#0B0F17] border border-slate-700 text-xs text-white font-mono focus:outline-none focus:border-blue-500"
                />
                <span className="text-[11px] text-slate-500 mt-1 block">Default: password123</span>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 rounded-lg text-xs font-medium text-slate-400 hover:text-white bg-slate-900 border border-slate-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingSingle}
                  className="px-4 py-2 rounded-lg text-xs font-semibold text-white bg-blue-600 hover:bg-blue-500 disabled:opacity-50"
                >
                  {isSubmittingSingle ? "Saving..." : "Create Account"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Bulk Upload Modal */}
      {showBulkModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="bg-[#111722] border border-slate-800 rounded-2xl max-w-2xl w-full p-6 space-y-5 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2.5">
                <UploadCloud className="h-5 w-5 text-blue-500" />
                <div>
                  <h3 className="text-base font-semibold text-white">Bulk Upload Users &amp; Teachers</h3>
                  <p className="text-xs text-slate-400">Import student batches or faculty roster via CSV</p>
                </div>
              </div>
              <button
                onClick={() => setShowBulkModal(false)}
                className="text-slate-400 hover:text-white"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Target Role Selector */}
            <div className="flex items-center justify-between bg-slate-900/60 p-3 rounded-xl border border-slate-800">
              <div className="flex items-center gap-3">
                <span className="text-xs font-medium text-slate-300">Upload Target:</span>
                <div className="inline-flex rounded-lg border border-slate-700 p-0.5 bg-[#0B0F17]">
                  <button
                    type="button"
                    onClick={() => setBulkRole("STUDENT")}
                    className={`px-3 py-1 rounded text-xs font-medium transition ${
                      bulkRole === "STUDENT"
                        ? "bg-blue-600 text-white"
                        : "text-slate-400 hover:text-white"
                    }`}
                  >
                    Students
                  </button>
                  <button
                    type="button"
                    onClick={() => setBulkRole("TEACHER")}
                    className={`px-3 py-1 rounded text-xs font-medium transition ${
                      bulkRole === "TEACHER"
                        ? "bg-purple-600 text-white"
                        : "text-slate-400 hover:text-white"
                    }`}
                  >
                    Teachers / Faculty
                  </button>
                </div>
              </div>

              <button
                type="button"
                onClick={() => downloadSampleCsv(bulkRole)}
                className="flex items-center gap-1.5 text-xs text-blue-400 hover:text-blue-300 bg-blue-950/40 px-3 py-1.5 rounded-lg border border-blue-800/60 transition"
              >
                <Download className="h-3.5 w-3.5" />
                Sample CSV Template
              </button>
            </div>

            {/* File Upload Zone */}
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <input
                  type="file"
                  ref={fileInputRef}
                  accept=".csv,text/csv"
                  onChange={handleFileUpload}
                  className="hidden"
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="flex items-center gap-2 px-3 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium transition"
                >
                  <FileSpreadsheet className="h-4 w-4 text-emerald-400" />
                  Choose CSV File
                </button>
                <span className="text-xs text-slate-500">or paste CSV rows directly below</span>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  CSV Data Content:
                </label>
                <textarea
                  rows={7}
                  value={bulkCsvText}
                  onChange={(e) => setBulkCsvText(e.target.value)}
                  placeholder={
                    bulkRole === "STUDENT"
                      ? "Name,Email,USN,Department,Semester,Division,Password\nJohn Doe,john@college.edu,1MS21CS001,Computer Science & Engineering,6,A,password123\nJane Smith,jane@college.edu,1MS21CS002,Computer Science & Engineering,6,B,password123"
                      : "Name,Email,Department,Password\nProf. Donald Knuth,knuth@college.edu,Computer Science & Engineering,password123\nDr. Barbara Liskov,liskov@college.edu,Information Science,password123"
                  }
                  className="w-full px-3 py-2.5 rounded-lg bg-[#0B0F17] border border-slate-700 font-mono text-xs text-white placeholder:text-slate-600 focus:outline-none focus:border-blue-500 leading-relaxed"
                />
              </div>
            </div>

            {/* Results breakdown if completed */}
            {bulkResults && (
              <div className="p-3.5 rounded-xl bg-slate-900 border border-slate-800 space-y-2 text-xs">
                <div className="flex items-center gap-2 font-semibold text-emerald-400">
                  <CheckCircle2 className="h-4 w-4" />
                  {bulkResults.insertedCount} user(s) imported successfully
                </div>
                {bulkResults.skippedCount > 0 && (
                  <div>
                    <div className="text-amber-400 font-medium">
                      {bulkResults.skippedCount} row(s) skipped:
                    </div>
                    <ul className="mt-1 list-disc list-inside text-slate-400 space-y-0.5 max-h-24 overflow-y-auto">
                      {bulkResults.skippedUsers.map((s, idx) => (
                        <li key={idx}>
                          <span className="text-slate-300">{s.email}</span>: {s.reason}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setShowBulkModal(false)}
                className="px-4 py-2 rounded-lg text-xs font-medium text-slate-400 hover:text-white bg-slate-900 border border-slate-800"
              >
                Close
              </button>
              <button
                type="button"
                onClick={handleBulkUpload}
                disabled={bulkUploading || !bulkCsvText.trim()}
                className="flex items-center gap-2 px-5 py-2 rounded-lg text-xs font-semibold text-white bg-blue-600 hover:bg-blue-500 disabled:opacity-50 shadow-sm"
              >
                {bulkUploading ? (
                  <>
                    <RefreshCw className="h-4 w-4 animate-spin" />
                    Processing Import...
                  </>
                ) : (
                  <>
                    <UploadCloud className="h-4 w-4" />
                    Execute Import
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
