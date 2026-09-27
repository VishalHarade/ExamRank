import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { Navbar } from "@/components/Navbar";
import { QuestionBank } from "@/components/teacher/QuestionBank";

export default async function QuestionsPage() {
  const user = await getCurrentUser();

  if (!user || (user.role !== "TEACHER" && user.role !== "ADMIN")) {
    redirect("/login");
  }

  const questions = await prisma.question.findMany({
    include: {
      testCases: {
        select: {
          id: true,
          input: true,
          expectedOutput: true,
          marks: true,
          isHidden: true,
          orderIndex: true,
        },
        orderBy: { orderIndex: "asc" },
      },
      _count: {
        select: { submissions: true, examQuestions: true },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  // Serialize dates before passing to client component
  const serialized = questions.map((q) => ({
    ...q,
    createdAt: q.createdAt.toISOString(),
    updatedAt: q.updatedAt.toISOString(),
    testCases: q.testCases.map((tc) => ({
      ...tc,
      createdAt: undefined,
      updatedAt: undefined,
    })),
  }));

  return (
    <div className="min-h-screen bg-[#070b12] text-slate-100 flex flex-col">
      <Navbar user={user} />
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {/* Page Header */}
        <div className="glass-panel p-6 sm:p-8 rounded-3xl border border-white/10 relative overflow-hidden">
          <div className="absolute -right-10 -bottom-10 w-80 h-80 bg-indigo-600/10 rounded-full blur-[90px] pointer-events-none" />
          <div className="relative z-10">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-purple-500/10 border border-purple-500/20 text-xs font-mono text-purple-400 mb-3">
              <span className="h-2 w-2 rounded-full bg-purple-400" />
              QUESTION BANK MANAGEMENT
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white">
              Coding Problem Repository
            </h1>
            <p className="text-sm text-slate-400 mt-1">
              Create, manage, and version coding problems with hidden/visible test cases and starter code templates.
            </p>
          </div>
        </div>

        <QuestionBank initialQuestions={serialized as any} />
      </main>
    </div>
  );
}
