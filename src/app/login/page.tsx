"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Lock,
  Mail,
  ArrowRight,
  AlertCircle,
  Eye,
  EyeOff,
  Building2,
  GraduationCap,
  BookOpen,
  Shield,
  CheckCircle2,
} from "lucide-react";
import Link from "next/link";
import { ThemeToggle } from "@/components/ThemeProvider";

type PortalRole = "TEACHER" | "STUDENT" | "ADMIN";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialRoleParam = searchParams.get("role")?.toUpperCase();
  const emailParam = searchParams.get("email");

  const [activePortal, setActivePortal] = useState<PortalRole>(
    initialRoleParam === "ADMIN" ? "ADMIN" : initialRoleParam === "STUDENT" ? "STUDENT" : "TEACHER"
  );
  const [email, setEmail] = useState(emailParam || "");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (emailParam) {
      setEmail(emailParam);
    }
  }, [emailParam]);

  const handlePortalSwitch = (role: PortalRole) => {
    setActivePortal(role);
    setError(null);
    setEmail("");
    setPassword("");
  };

  const handleFillDemo = (demoEmail: string, demoPass: string) => {
    setEmail(demoEmail);
    setPassword(demoPass);
    setError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password.trim()) {
      setError("Please provide both email address and password.");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim(), password: password.trim() }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Authentication failed. Please verify your credentials.");
      }

      // Check if user role matches active portal for clearer UX, or route automatically
      if (data.user.role === "STUDENT") {
        router.push("/student");
      } else if (data.user.role === "ADMIN") {
        router.push("/admin");
      } else {
        router.push("/teacher");
      }
      router.refresh();
    } catch (err: any) {
      setError(err.message || "An unexpected error occurred. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#070B13] text-slate-100 flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8 selection:bg-blue-600 selection:text-white">
      <div className="fixed top-4 right-4 z-50">
        <ThemeToggle />
      </div>
      {/* Brand Header */}
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
        <Link
          href="/"
          className="inline-flex items-center gap-2.5 mb-6 group focus:outline-none"
        >
          <div className="h-10 w-10 rounded-xl bg-blue-600 flex items-center justify-center text-white font-mono font-bold text-lg shadow-lg shadow-blue-600/30 group-hover:scale-105 transition-transform">
            &gt;_
          </div>
          <div className="text-left">
            <span className="font-bold text-2xl tracking-tight text-white">
              Exam<span className="text-blue-500">Rank</span>
            </span>
            <span className="block text-[11px] text-slate-400 font-mono tracking-wider">
              CAMPUS ASSESSMENT SUITE
            </span>
          </div>
        </Link>
      </div>

      <div className="mt-2 sm:mx-auto sm:w-full sm:max-w-md">
        {/* Modern Role Tab Switcher */}
        <div className="bg-[#0E1524] border border-slate-800 p-1.5 rounded-2xl mb-4 flex items-center gap-1 shadow-sm">
          <button
            type="button"
            onClick={() => handlePortalSwitch("TEACHER")}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl text-xs font-semibold transition-all ${
              activePortal === "TEACHER"
                ? "bg-purple-600 text-white shadow-md shadow-purple-600/20"
                : "text-slate-400 hover:text-white hover:bg-slate-800/50"
            }`}
          >
            <BookOpen className="h-4 w-4" />
            Faculty Login
          </button>

          <button
            type="button"
            onClick={() => handlePortalSwitch("STUDENT")}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl text-xs font-semibold transition-all ${
              activePortal === "STUDENT"
                ? "bg-blue-600 text-white shadow-md shadow-blue-600/20"
                : "text-slate-400 hover:text-white hover:bg-slate-800/50"
            }`}
          >
            <GraduationCap className="h-4 w-4" />
            Student Login
          </button>

          <button
            type="button"
            onClick={() => handlePortalSwitch("ADMIN")}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl text-xs font-semibold transition-all ${
              activePortal === "ADMIN"
                ? "bg-amber-600 text-white shadow-md shadow-amber-600/20"
                : "text-slate-400 hover:text-white hover:bg-slate-800/50"
            }`}
          >
            <Shield className="h-4 w-4" />
            Admin
          </button>
        </div>

        {/* Main Login Card */}
        <div className="bg-[#0E1524] border border-slate-800/90 rounded-3xl p-6 sm:p-8 shadow-2xl relative overflow-hidden">
          {/* Subtle Ambient Light based on portal */}
          <div
            className={`absolute top-0 right-0 w-64 h-64 rounded-full blur-[80px] pointer-events-none opacity-15 ${
              activePortal === "TEACHER"
                ? "bg-purple-500"
                : activePortal === "STUDENT"
                ? "bg-blue-500"
                : "bg-amber-500"
            }`}
          />

          <div className="mb-6 relative z-10">
            <h2 className="text-xl font-bold tracking-tight text-white flex items-center gap-2">
              {activePortal === "TEACHER" && "Faculty & Instructor Portal"}
              {activePortal === "STUDENT" && "Student Examination Portal"}
              {activePortal === "ADMIN" && "Platform Administrator Console"}
            </h2>
            <p className="mt-1 text-xs text-slate-400 leading-relaxed">
              {activePortal === "TEACHER" &&
                "Access examination authoring, live proctor telemetry, question repository, and candidate evaluations."}
              {activePortal === "STUDENT" &&
                "Sign in to take scheduled college examinations, run test code, and view published scorecards."}
              {activePortal === "ADMIN" &&
                "Manage candidate roster, bulk imports, cheat incidents, and exam retries."}
            </p>
          </div>

          {error && (
            <div className="mb-5 p-3.5 rounded-xl bg-red-950/40 border border-red-800/60 flex items-start gap-2.5 text-red-200 text-xs leading-relaxed animate-shake">
              <AlertCircle className="h-4 w-4 shrink-0 text-red-400 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4 relative z-10">
            <div>
              <label
                htmlFor="email"
                className="block text-xs font-semibold text-slate-300 mb-1.5"
              >
                {activePortal === "TEACHER"
                  ? "Faculty Email Address"
                  : activePortal === "STUDENT"
                  ? "Student College Email"
                  : "Administrator Email"}
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <Mail className="h-4 w-4" />
                </div>
                <input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder={
                    activePortal === "TEACHER"
                      ? "faculty.name@college.edu"
                      : activePortal === "STUDENT"
                      ? "student@college.edu"
                      : "admin@college.edu"
                  }
                  className="w-full pl-10 pr-3.5 py-2.5 rounded-xl bg-[#070B13] border border-slate-700/80 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-purple-500/40 focus:border-purple-500 transition-colors"
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label
                  htmlFor="password"
                  className="block text-xs font-semibold text-slate-300"
                >
                  Password
                </label>
                <span className="text-[11px] text-slate-400">
                  {activePortal === "TEACHER"
                    ? "Need reset? Contact Admin"
                    : "Exam controller protected"}
                </span>
              </div>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <Lock className="h-4 w-4" />
                </div>
                <input
                  id="password"
                  name="password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  className="w-full pl-10 pr-10 py-2.5 rounded-xl bg-[#070B13] border border-slate-700/80 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-purple-500/40 focus:border-purple-500 transition-colors"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-200 transition-colors"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between pt-1">
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="h-3.5 w-3.5 rounded bg-slate-900 border-slate-700 text-blue-600 focus:ring-blue-500 focus:ring-offset-0"
                />
                <span className="text-xs text-slate-300">Keep me authenticated</span>
              </label>
            </div>

            <div className="pt-2">
              <button
                type="submit"
                disabled={loading}
                className={`w-full py-2.5 px-4 rounded-xl text-xs font-bold uppercase tracking-wider text-white transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed shadow-md ${
                  activePortal === "TEACHER"
                    ? "bg-purple-600 hover:bg-purple-500 shadow-purple-600/30"
                    : activePortal === "STUDENT"
                    ? "bg-blue-600 hover:bg-blue-500 shadow-blue-600/30"
                    : "bg-amber-600 hover:bg-amber-500 shadow-amber-600/30"
                }`}
              >
                {loading ? (
                  <span className="flex items-center gap-2">
                    <span className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Signing in...
                  </span>
                ) : (
                  <>
                    Sign In to Portal <ArrowRight className="h-4 w-4" />
                  </>
                )}
              </button>
            </div>
          </form>

          {/* Quick Demo Access Chip for Testing */}
          <div className="mt-6 pt-5 border-t border-slate-800/90 relative z-10">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                Quick Demo Access:
              </span>
              <span className="text-[10px] text-slate-500">Click to fill</span>
            </div>

            {activePortal === "TEACHER" && (
              <button
                type="button"
                onClick={() => handleFillDemo("teacher@college.edu", "password123")}
                className="w-full text-left p-2.5 rounded-xl bg-purple-950/20 hover:bg-purple-950/40 border border-purple-800/40 text-purple-300 text-xs flex items-center justify-between transition-colors"
              >
                <div>
                  <div className="font-semibold text-white">Prof. Alan Turing</div>
                  <div className="text-[11px] text-purple-400/80 font-mono">
                    teacher@college.edu • Dept of CSE
                  </div>
                </div>
                <span className="text-[10px] bg-purple-900/60 border border-purple-700/60 px-2 py-0.5 rounded text-purple-200">
                  Fill Credentials
                </span>
              </button>
            )}

            {activePortal === "STUDENT" && (
              <button
                type="button"
                onClick={() => handleFillDemo("student1@college.edu", "password123")}
                className="w-full text-left p-2.5 rounded-xl bg-blue-950/20 hover:bg-blue-950/40 border border-blue-800/40 text-blue-300 text-xs flex items-center justify-between transition-colors"
              >
                <div>
                  <div className="font-semibold text-white">Alex Rivera (6th Sem)</div>
                  <div className="text-[11px] text-blue-400/80 font-mono">
                    student1@college.edu • USN: 1MS21CS001
                  </div>
                </div>
                <span className="text-[10px] bg-blue-900/60 border border-blue-700/60 px-2 py-0.5 rounded text-blue-200">
                  Fill Credentials
                </span>
              </button>
            )}

            {activePortal === "ADMIN" && (
              <button
                type="button"
                onClick={() => handleFillDemo("admin@college.edu", "admin123")}
                className="w-full text-left p-2.5 rounded-xl bg-amber-950/20 hover:bg-amber-950/40 border border-amber-800/40 text-amber-300 text-xs flex items-center justify-between transition-colors"
              >
                <div>
                  <div className="font-semibold text-white">Dr. Grace Hopper (Dean)</div>
                  <div className="text-[11px] text-amber-400/80 font-mono">
                    admin@college.edu • Exam Controller
                  </div>
                </div>
                <span className="text-[10px] bg-amber-900/60 border border-amber-700/60 px-2 py-0.5 rounded text-amber-200">
                  Fill Credentials
                </span>
              </button>
            )}
          </div>

          <div className="mt-5 pt-4 border-t border-slate-800/80 flex items-center justify-between text-xs text-slate-400">
            <span className="flex items-center gap-1.5 text-slate-400">
              <Building2 className="h-3.5 w-3.5" /> Campus Network
            </span>
            <Link
              href="/"
              className="text-slate-400 hover:text-slate-200 transition-colors"
            >
              Return to Homepage
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#070B13]" />}>
      <LoginForm />
    </Suspense>
  );
}
