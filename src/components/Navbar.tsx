"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { LogOut, BarChart3, BookOpen, Layers } from "lucide-react";

interface NavbarProps {
  user?: {
    id: string;
    name: string;
    email: string;
    role: "STUDENT" | "TEACHER" | "ADMIN";
    usn?: string | null;
    department?: string | null;
  } | null;
}

export function Navbar({ user }: NavbarProps) {
  const router = useRouter();
  const pathname = usePathname();

  const handleLogout = async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
      router.push("/login");
      router.refresh();
    } catch (err) {
      console.error(err);
    }
  };

  const isActive = (path: string) => {
    if (path === "/teacher" && pathname === "/teacher") return true;
    if (path !== "/teacher" && pathname?.startsWith(path)) return true;
    return false;
  };

  return (
    <header className="sticky top-0 z-40 w-full border-b border-slate-800 bg-[#0B0F17]/95 backdrop-blur-sm">
      <div className="max-w-7xl mx-auto flex h-14 items-center justify-between px-4 sm:px-6 lg:px-8">
        <div className="flex items-center gap-6">
          <Link href="/" className="flex items-center gap-2.5 group">
            <div className="h-7 w-7 rounded-md bg-blue-600 flex items-center justify-center text-white font-mono font-bold text-xs shadow-sm">
              &gt;_
            </div>
            <div className="flex items-baseline gap-1.5">
              <span className="font-semibold text-base tracking-tight text-white">
                Exam<span className="text-blue-500">Rank</span>
              </span>
              <span className="text-[11px] text-slate-400 font-normal hidden sm:inline">
                Portal
              </span>
            </div>
          </Link>

          {user && (
            <nav className="hidden md:flex items-center gap-1 text-sm font-medium">
              {user.role === "STUDENT" && (
                <Link
                  href="/student"
                  className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                    isActive("/student")
                      ? "bg-slate-800 text-white"
                      : "text-slate-300 hover:text-white hover:bg-slate-800/50"
                  }`}
                >
                  My Examinations
                </Link>
              )}

              {user.role === "ADMIN" && (
                <>
                  <Link
                    href="/admin"
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                      isActive("/admin")
                        ? "bg-blue-600 text-white"
                        : "text-slate-300 hover:text-white hover:bg-slate-800/50"
                    }`}
                  >
                    <BarChart3 className="h-3.5 w-3.5" /> Platform Analytics
                  </Link>
                  <Link
                    href="/teacher"
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                      isActive("/teacher") && !pathname?.includes("/teacher/questions")
                        ? "bg-slate-800 text-white"
                        : "text-slate-300 hover:text-white hover:bg-slate-800/50"
                    }`}
                  >
                    <Layers className="h-3.5 w-3.5" /> Exams &amp; Proctoring
                  </Link>
                  <Link
                    href="/teacher/questions"
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                      isActive("/teacher/questions")
                        ? "bg-slate-800 text-white"
                        : "text-slate-300 hover:text-white hover:bg-slate-800/50"
                    }`}
                  >
                    <BookOpen className="h-3.5 w-3.5" /> Question Bank
                  </Link>
                </>
              )}

              {user.role === "TEACHER" && (
                <>
                  <Link
                    href="/teacher"
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                      isActive("/teacher") && !pathname?.includes("/teacher/questions")
                        ? "bg-slate-800 text-white"
                        : "text-slate-300 hover:text-white hover:bg-slate-800/50"
                    }`}
                  >
                    <Layers className="h-3.5 w-3.5" /> Exams Dashboard
                  </Link>
                  <Link
                    href="/teacher/questions"
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                      isActive("/teacher/questions")
                        ? "bg-slate-800 text-white"
                        : "text-slate-300 hover:text-white hover:bg-slate-800/50"
                    }`}
                  >
                    <BookOpen className="h-3.5 w-3.5" /> Question Bank
                  </Link>
                </>
              )}
            </nav>
          )}
        </div>

        <div className="flex items-center gap-3">
          {user ? (
            <div className="flex items-center gap-3">
              <div className="hidden sm:flex flex-col text-right">
                <span className="text-xs font-semibold text-slate-200 leading-tight">
                  {user.name}
                </span>
                <span className="text-[11px] text-slate-400">
                  {user.role === "STUDENT" ? user.usn || user.department : user.department || user.role}
                </span>
              </div>

              <div className="flex items-center gap-2">
                <span
                  className={`px-2 py-0.5 rounded text-[11px] font-semibold uppercase tracking-wider ${
                    user.role === "STUDENT"
                      ? "bg-blue-500/10 text-blue-400 border border-blue-500/30"
                      : user.role === "TEACHER"
                      ? "bg-purple-500/10 text-purple-400 border border-purple-500/30"
                      : "bg-emerald-500/10 text-emerald-400 border border-emerald-500/30"
                  }`}
                >
                  {user.role}
                </span>

                <button
                  onClick={handleLogout}
                  title="Logout"
                  className="p-1.5 rounded-md text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
                >
                  <LogOut className="h-4 w-4" />
                </button>
              </div>
            </div>
          ) : (
            <Link
              href="/login"
              className="px-3 py-1.5 rounded-md text-xs font-medium bg-blue-600 hover:bg-blue-500 text-white transition-colors"
            >
              Sign In
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}
