import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser, hashPassword } from "@/lib/auth";
import { Role } from "@prisma/client";

// GET /api/admin/users — List and filter users
export async function GET(req: NextRequest) {
  try {
    const admin = await getCurrentUser();
    if (!admin || admin.role !== Role.ADMIN) {
      return NextResponse.json({ error: "Unauthorized: Administrator access required" }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const roleParam = searchParams.get("role");
    const query = searchParams.get("query")?.trim();

    const where: any = {};

    if (roleParam && roleParam !== "ALL") {
      if (Object.values(Role).includes(roleParam as Role)) {
        where.role = roleParam as Role;
      }
    }

    if (query) {
      where.OR = [
        { name: { contains: query } },
        { email: { contains: query } },
        { usn: { contains: query } },
        { department: { contains: query } },
      ];
    }

    const [users, totalCount, studentCount, teacherCount, adminCount] = await Promise.all([
      prisma.user.findMany({
        where,
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          usn: true,
          department: true,
          semester: true,
          division: true,
          createdAt: true,
          _count: {
            select: {
              attempts: true,
              createdExams: true,
              violations: true,
            },
          },
        },
        orderBy: { createdAt: "desc" },
      }),
      prisma.user.count(),
      prisma.user.count({ where: { role: Role.STUDENT } }),
      prisma.user.count({ where: { role: Role.TEACHER } }),
      prisma.user.count({ where: { role: Role.ADMIN } }),
    ]);

    return NextResponse.json({
      users,
      counts: {
        total: totalCount,
        students: studentCount,
        teachers: teacherCount,
        admins: adminCount,
      },
    });
  } catch (err: any) {
    console.error("GET /api/admin/users error:", err);
    return NextResponse.json({ error: "Failed to retrieve user directory" }, { status: 500 });
  }
}

// POST /api/admin/users — Create single user (student or teacher)
export async function POST(req: NextRequest) {
  try {
    const admin = await getCurrentUser();
    if (!admin || admin.role !== Role.ADMIN) {
      return NextResponse.json({ error: "Unauthorized: Administrator access required" }, { status: 403 });
    }

    const body = await req.json();
    const { name, email, password, role, department, usn, semester, division } = body;

    if (!name || !email) {
      return NextResponse.json({ error: "Name and email are required" }, { status: 400 });
    }

    const normalizedEmail = email.trim().toLowerCase();
    const existing = await prisma.user.findUnique({
      where: { email: normalizedEmail },
    });

    if (existing) {
      return NextResponse.json({ error: `User with email ${normalizedEmail} already exists` }, { status: 409 });
    }

    const rawPassword = password?.trim() || "password123";
    const passwordHash = await hashPassword(rawPassword);

    const validRole = Object.values(Role).includes(role) ? role : Role.STUDENT;

    const newUser = await prisma.user.create({
      data: {
        name: name.trim(),
        email: normalizedEmail,
        passwordHash,
        role: validRole,
        department: department?.trim() || null,
        usn: validRole === Role.STUDENT ? usn?.trim() || null : null,
        semester: semester ? Number(semester) : null,
        division: division?.trim() || null,
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        usn: true,
        department: true,
        semester: true,
        division: true,
        createdAt: true,
      },
    });

    // Audit log
    await prisma.auditLog.create({
      data: {
        userId: admin.id,
        action: "CREATE_USER",
        entity: "User",
        entityId: newUser.id,
        details: JSON.stringify({ role: newUser.role, email: newUser.email, name: newUser.name }),
      },
    });

    return NextResponse.json({ user: newUser, message: "User created successfully" }, { status: 201 });
  } catch (err: any) {
    console.error("POST /api/admin/users error:", err);
    return NextResponse.json({ error: err.message || "Failed to create user" }, { status: 500 });
  }
}

// DELETE /api/admin/users — Bulk remove users
export async function DELETE(req: NextRequest) {
  try {
    const admin = await getCurrentUser();
    if (!admin || admin.role !== Role.ADMIN) {
      return NextResponse.json({ error: "Unauthorized: Administrator access required" }, { status: 403 });
    }

    const body = await req.json();
    const { userIds } = body;

    if (!Array.isArray(userIds) || userIds.length === 0) {
      return NextResponse.json({ error: "userIds array is required" }, { status: 400 });
    }

    // Protect active admin from deleting their own account
    const safeUserIds = userIds.filter((id: string) => id !== admin.id);

    if (safeUserIds.length === 0) {
      return NextResponse.json({ error: "Cannot delete your own administrator account" }, { status: 400 });
    }

    // Cascade delete any user-specific relational entities safely
    // 1. Delete test results for user submissions
    await prisma.submissionTestResult.deleteMany({
      where: {
        submission: {
          attempt: {
            studentId: { in: safeUserIds },
          },
        },
      },
    });

    // 2. Delete submissions for user attempts
    await prisma.submission.deleteMany({
      where: {
        attempt: {
          studentId: { in: safeUserIds },
        },
      },
    });

    // 3. Delete violations
    await prisma.violation.deleteMany({
      where: {
        studentId: { in: safeUserIds },
      },
    });

    // 4. Delete attempts
    await prisma.examAttempt.deleteMany({
      where: {
        studentId: { in: safeUserIds },
      },
    });

    // 5. Delete exams created by these users (if teachers)
    await prisma.exam.deleteMany({
      where: {
        createdById: { in: safeUserIds },
      },
    });

    // 6. Delete questions created by these users
    await prisma.question.deleteMany({
      where: {
        createdById: { in: safeUserIds },
      },
    });

    // 7. Delete users
    const deleteResult = await prisma.user.deleteMany({
      where: {
        id: { in: safeUserIds },
      },
    });

    // Record audit log
    await prisma.auditLog.create({
      data: {
        userId: admin.id,
        action: "BULK_DELETE_USERS",
        entity: "User",
        details: JSON.stringify({ count: deleteResult.count, requestedCount: userIds.length }),
      },
    });

    return NextResponse.json({
      success: true,
      deletedCount: deleteResult.count,
      message: `Successfully deleted ${deleteResult.count} user(s).`,
    });
  } catch (err: any) {
    console.error("DELETE /api/admin/users error:", err);
    return NextResponse.json({ error: "Failed to delete specified users" }, { status: 500 });
  }
}
