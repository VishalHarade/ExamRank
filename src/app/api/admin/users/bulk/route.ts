import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser, hashPassword } from "@/lib/auth";
import { Role } from "@prisma/client";

interface BulkUserRecord {
  name: string;
  email: string;
  role?: string;
  department?: string;
  usn?: string;
  semester?: number | string;
  division?: string;
  password?: string;
}

// POST /api/admin/users/bulk — Bulk upload users & teachers
export async function POST(req: NextRequest) {
  try {
    const admin = await getCurrentUser();
    if (!admin || admin.role !== Role.ADMIN) {
      return NextResponse.json({ error: "Unauthorized: Administrator access required" }, { status: 403 });
    }

    const body = await req.json();
    const { users } = body as { users: BulkUserRecord[] };

    if (!Array.isArray(users) || users.length === 0) {
      return NextResponse.json({ error: "Invalid payload: 'users' array is required and must not be empty" }, { status: 400 });
    }

    if (users.length > 500) {
      return NextResponse.json({ error: "Batch size limit exceeded. Maximum 500 users per upload." }, { status: 400 });
    }

    const defaultPasswordHash = await hashPassword("password123");

    // Gather and normalize emails
    const cleanList: Array<{
      name: string;
      email: string;
      role: Role;
      department: string | null;
      usn: string | null;
      semester: number | null;
      division: string | null;
      passwordHash: string;
    }> = [];

    const skippedUsers: Array<{ email: string; reason: string }> = [];
    const seenInBatch = new Set<string>();

    for (let i = 0; i < users.length; i++) {
      const u = users[i];
      const name = u.name?.trim();
      const rawEmail = u.email?.trim().toLowerCase();

      if (!name || !rawEmail) {
        skippedUsers.push({ email: rawEmail || `Row ${i + 1}`, reason: "Missing name or email" });
        continue;
      }

      // Basic email regex
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(rawEmail)) {
        skippedUsers.push({ email: rawEmail, reason: "Invalid email format" });
        continue;
      }

      if (seenInBatch.has(rawEmail)) {
        skippedUsers.push({ email: rawEmail, reason: "Duplicate entry in current upload batch" });
        continue;
      }
      seenInBatch.add(rawEmail);

      let assignedRole: Role = Role.STUDENT;
      const upperRole = u.role?.toUpperCase().trim();
      if (upperRole === "TEACHER" || upperRole === "FACULTY" || upperRole === "INSTRUCTOR") {
        assignedRole = Role.TEACHER;
      } else if (upperRole === "ADMIN") {
        assignedRole = Role.ADMIN;
      }

      const pHash = u.password?.trim() ? await hashPassword(u.password.trim()) : defaultPasswordHash;

      cleanList.push({
        name,
        email: rawEmail,
        role: assignedRole,
        department: u.department?.trim() || null,
        usn: assignedRole === Role.STUDENT ? u.usn?.trim() || null : null,
        semester: u.semester ? parseInt(String(u.semester), 10) || null : null,
        division: u.division?.trim() || null,
        passwordHash: pHash,
      });
    }

    // Check which emails already exist in database
    const batchEmails = cleanList.map((c) => c.email);
    const existingUsers = await prisma.user.findMany({
      where: { email: { in: batchEmails } },
      select: { email: true },
    });

    const existingEmailSet = new Set(existingUsers.map((e) => e.email.toLowerCase()));
    const finalToInsert = cleanList.filter((c) => {
      if (existingEmailSet.has(c.email)) {
        skippedUsers.push({ email: c.email, reason: "User with this email already exists in system" });
        return false;
      }
      return true;
    });

    // Bulk insert users
    let insertedCount = 0;
    if (finalToInsert.length > 0) {
      const created = await prisma.user.createMany({
        data: finalToInsert,
        skipDuplicates: true,
      });
      insertedCount = created.count;

      // Audit log
      await prisma.auditLog.create({
        data: {
          userId: admin.id,
          action: "BULK_UPLOAD_USERS",
          entity: "User",
          details: JSON.stringify({
            attempted: users.length,
            inserted: insertedCount,
            skipped: skippedUsers.length,
          }),
        },
      });
    }

    return NextResponse.json({
      success: true,
      insertedCount,
      skippedCount: skippedUsers.length,
      skippedUsers,
      totalProcessed: users.length,
      message: `Import complete: ${insertedCount} user(s) added successfully. ${skippedUsers.length} skipped.`,
    });
  } catch (err: any) {
    console.error("POST /api/admin/users/bulk error:", err);
    return NextResponse.json({ error: err.message || "Failed to process bulk upload" }, { status: 500 });
  }
}
