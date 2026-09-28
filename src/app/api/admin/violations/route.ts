import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { Role, AttemptStatus } from "@prisma/client";

// GET /api/admin/violations — Violations, Failures & Teacher Attribution
export async function GET(req: NextRequest) {
  try {
    const admin = await getCurrentUser();
    if (!admin || admin.role !== Role.ADMIN) {
      return NextResponse.json({ error: "Unauthorized: Administrator access required" }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const filter = searchParams.get("filter") || "ALL"; // ALL | ALL_ATTEMPTS | VIOLATIONS | FAILED | TERMINATED
    const teacherId = searchParams.get("teacherId");
    const examId = searchParams.get("examId");

    // Fetch all attempts with student, exam, teacher, and violations
    const attempts = await prisma.examAttempt.findMany({
      where: {
        AND: [
          examId ? { examId } : {},
          teacherId ? { exam: { createdById: teacherId } } : {},
        ],
      },
      include: {
        student: {
          select: {
            id: true,
            name: true,
            email: true,
            usn: true,
            department: true,
            semester: true,
          },
        },
        exam: {
          select: {
            id: true,
            title: true,
            duration: true,
            totalMarks: true,
            passPercentage: true,
            violationLimit: true,
            status: true,
            startTime: true,
            endTime: true,
            createdBy: {
              select: {
                id: true,
                name: true,
                email: true,
                department: true,
              },
            },
          },
        },
        violations: {
          orderBy: { timestamp: "desc" },
        },
      },
      orderBy: { updatedAt: "desc" },
    });

    // Process and flag items
    const records = attempts
      .map((att) => {
        const passMark = (att.exam.passPercentage / 100) * att.exam.totalMarks;
        const isTerminated = att.status === AttemptStatus.TERMINATED;
        const isCompleted =
          att.status === AttemptStatus.SUBMITTED ||
          att.status === AttemptStatus.AUTO_SUBMITTED ||
          att.status === AttemptStatus.TERMINATED;
        const isFailed = isTerminated || (isCompleted && att.totalScore < passMark);
        const hasViolations = att.violationCount > 0 || att.violations.length > 0;
        const violationLimitExceeded = att.violationCount >= att.exam.violationLimit || isTerminated;

        return {
          id: att.id,
          examId: att.examId,
          examTitle: att.exam.title,
          examStatus: att.exam.status,
          totalMarks: att.exam.totalMarks,
          passPercentage: att.exam.passPercentage,
          passMark,
          violationLimit: att.exam.violationLimit,
          teacher: {
            id: att.exam.createdBy.id,
            name: att.exam.createdBy.name,
            email: att.exam.createdBy.email,
            department: att.exam.createdBy.department || "Faculty of Computing",
          },
          student: {
            id: att.student.id,
            name: att.student.name,
            email: att.student.email,
            usn: att.student.usn,
            department: att.student.department,
            semester: att.student.semester,
          },
          status: att.status,
          totalScore: att.totalScore,
          percentage: Number(att.percentage.toFixed(1)),
          violationCount: att.violationCount,
          startedAt: att.startedAt ? att.startedAt.toISOString() : null,
          submittedAt: att.submittedAt ? att.submittedAt.toISOString() : null,
          isFailed,
          isTerminated,
          hasViolations,
          violationLimitExceeded,
          canRetry: isCompleted || isTerminated || att.status === AttemptStatus.IN_PROGRESS,
          violations: att.violations.map((v) => ({
            id: v.id,
            type: v.type,
            severity: v.severity,
            metadata: v.metadata,
            timestamp: v.timestamp.toISOString(),
          })),
        };
      })
      .filter((rec) => {
        // Keep only incidents: violations or failed or terminated
        if (filter === "ALL_ATTEMPTS") return true;
        if (filter === "VIOLATIONS") return rec.hasViolations;
        if (filter === "FAILED") return rec.isFailed;
        if (filter === "TERMINATED") return rec.isTerminated || rec.violationLimitExceeded;
        // ALL incident view returns any attempt that either has violations or failed
        return rec.hasViolations || rec.isFailed || rec.isTerminated;
      });

    // Summary statistics
    const totalIncidents = records.length;
    const totalViolationsCount = records.reduce((sum, r) => sum + r.violationCount, 0);
    const failedCount = records.filter((r) => r.isFailed).length;
    const terminatedCount = records.filter((r) => r.isTerminated || r.violationLimitExceeded).length;
    const uniqueStudents = new Set(records.map((r) => r.student.id)).size;
    const uniqueTeachers = new Set(records.map((r) => r.teacher.id)).size;

    return NextResponse.json({
      records,
      summary: {
        totalIncidents,
        totalViolationsCount,
        failedCount,
        terminatedCount,
        uniqueStudents,
        uniqueTeachers,
      },
    });
  } catch (err: unknown) {
    console.error("GET /api/admin/violations error:", err);
    return NextResponse.json({ error: "Failed to retrieve incident records" }, { status: 500 });
  }
}
