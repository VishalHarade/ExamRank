import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { ExamWorkspace } from "@/components/exam/ExamWorkspace";
import { AttemptStatus } from "@prisma/client";

export default async function ExamPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await getCurrentUser();

  if (!user) {
    redirect(`/login?redirect=/student/exam/${id}`);
  }

  // Fetch exam with questions and public test cases
  const exam = await prisma.exam.findUnique({
    where: { id },
    include: {
      examQuestions: {
        include: {
          question: {
            include: {
              testCases: {
                where: { isHidden: false }, // Only public test cases for the student initial view
                orderBy: { orderIndex: "asc" },
              },
            },
          },
        },
        orderBy: { orderIndex: "asc" },
      },
    },
  });

  if (!exam) {
    redirect("/student");
  }

  const now = new Date();

  // Find or create attempt
  let attempt = await prisma.examAttempt.findUnique({
    where: {
      examId_studentId: {
        examId: exam.id,
        studentId: user.id,
      },
    },
  });

  if (!attempt) {
    const durationMs = exam.duration * 60 * 1000;
    const computedDeadline = new Date(Math.min(now.getTime() + durationMs, exam.endTime.getTime()));

    attempt = await prisma.examAttempt.create({
      data: {
        examId: exam.id,
        studentId: user.id,
        status: AttemptStatus.IN_PROGRESS,
        startedAt: now,
        endTime: computedDeadline,
        currentQuestionId: exam.examQuestions[0]?.questionId || null,
      },
    });
  }

  // Format dates to ISO strings for client props
  const serializedExam = {
    ...exam,
    startTime: exam.startTime.toISOString(),
    endTime: exam.endTime.toISOString(),
    createdAt: exam.createdAt.toISOString(),
    updatedAt: exam.updatedAt.toISOString(),
    examQuestions: exam.examQuestions.map((eq) => ({
      ...eq,
      question: {
        ...eq.question,
        createdAt: eq.question.createdAt.toISOString(),
        updatedAt: eq.question.updatedAt.toISOString(),
        testCases: eq.question.testCases.map((tc) => ({
          ...tc,
          createdAt: tc.createdAt.toISOString(),
          updatedAt: tc.updatedAt.toISOString(),
        })),
      },
    })),
  };

  const serializedAttempt = {
    ...attempt,
    startedAt: attempt.startedAt ? attempt.startedAt.toISOString() : null,
    submittedAt: attempt.submittedAt ? attempt.submittedAt.toISOString() : null,
    endTime: attempt.endTime ? attempt.endTime.toISOString() : null,
    createdAt: attempt.createdAt.toISOString(),
    updatedAt: attempt.updatedAt.toISOString(),
  };

  return <ExamWorkspace initialExam={serializedExam as any} initialAttempt={serializedAttempt as any} />;
}
