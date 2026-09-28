import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { ExamWorkspace, type Attempt, type Exam } from "@/components/exam/ExamWorkspace";

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

  // Loading the briefing must not start the exam clock. Attempts begin only
  // after the student accepts the rules through the start endpoint.
  const attempt = await prisma.examAttempt.findUnique({
    where: {
      examId_studentId: {
        examId: exam.id,
        studentId: user.id,
      },
    },
  });

  if (!attempt && (
    (exam.status !== "ACTIVE" && exam.status !== "PUBLISHED") ||
    now < exam.startTime ||
    now > exam.endTime
  )) {
    redirect("/student");
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

  const serializedAttempt = attempt
    ? {
        ...attempt,
        startedAt: attempt.startedAt ? attempt.startedAt.toISOString() : null,
        submittedAt: attempt.submittedAt ? attempt.submittedAt.toISOString() : null,
        endTime: attempt.endTime ? attempt.endTime.toISOString() : null,
        createdAt: attempt.createdAt.toISOString(),
        updatedAt: attempt.updatedAt.toISOString(),
      }
    : null;

  return (
    <ExamWorkspace
      initialExam={serializedExam as unknown as Exam}
      initialAttempt={serializedAttempt as unknown as Attempt | null}
    />
  );
}
