"use client";

import { useState } from "react";
import {
  BarChart3,
  Users,
  ShieldAlert,
  Layers,
  Sparkles,
  ArrowRight,
  BookOpen,
} from "lucide-react";
import { AdminAnalytics } from "./AdminAnalytics";
import { AdminUserManager } from "./AdminUserManager";
import { AdminViolationsManager } from "./AdminViolationsManager";

type AdminTab = "analytics" | "users" | "violations";

export function AdminDashboard({ defaultTab = "analytics" }: { defaultTab?: AdminTab }) {
  const [activeTab, setActiveTab] = useState<AdminTab>(defaultTab);

  return (
    <div className="space-y-8">
      {/* Top Banner & Tab Navigation */}
      <div className="glass-panel p-6 sm:p-8 rounded-3xl border border-white/10 relative overflow-hidden">
        <div className="absolute -right-10 -bottom-10 w-80 h-80 bg-blue-600/10 rounded-full blur-[90px] pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-xs font-mono text-blue-400 mb-3">
              <span className="h-2 w-2 rounded-full bg-blue-400 animate-pulse" />
              SYSTEM ADMINISTRATOR COMMAND CENTER
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white">
              Institutional Examination Control &amp; Oversight
            </h1>
            <p className="text-sm text-slate-400 mt-1 max-w-2xl">
              Monitor real-time academic integrity, manage candidate &amp; teacher enrollment, inspect violation incident logs with instructor attribution, and grant re-attempts.
            </p>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex flex-wrap items-center gap-2 mt-8 pt-6 border-t border-white/5">
          <button
            onClick={() => setActiveTab("analytics")}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold transition-all ${
              activeTab === "analytics"
                ? "bg-blue-600 text-white shadow-lg shadow-blue-500/20"
                : "bg-slate-900/60 text-slate-400 hover:text-white hover:bg-slate-800 border border-white/5"
            }`}
          >
            <BarChart3 className="h-4 w-4" />
            Executive Analytics &amp; Metrics
          </button>

          <button
            onClick={() => setActiveTab("users")}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold transition-all ${
              activeTab === "users"
                ? "bg-blue-600 text-white shadow-lg shadow-blue-500/20"
                : "bg-slate-900/60 text-slate-400 hover:text-white hover:bg-slate-800 border border-white/5"
            }`}
          >
            <Users className="h-4 w-4" />
            Candidate &amp; Teacher Directory (Bulk Upload/Delete)
          </button>

          <button
            onClick={() => setActiveTab("violations")}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold transition-all ${
              activeTab === "violations"
                ? "bg-blue-600 text-white shadow-lg shadow-blue-500/20"
                : "bg-slate-900/60 text-slate-400 hover:text-white hover:bg-slate-800 border border-white/5"
            }`}
          >
            <ShieldAlert className="h-4 w-4" />
            Incident Oversight &amp; Re-attempt Grants
          </button>
        </div>
      </div>

      {/* Tab Panels */}
      {activeTab === "analytics" && <AdminAnalytics />}
      {activeTab === "users" && <AdminUserManager />}
      {activeTab === "violations" && <AdminViolationsManager />}
    </div>
  );
}
