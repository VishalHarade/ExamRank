import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { cookies } from "next/headers";
import { prisma } from "./prisma";
import { Role } from "@prisma/client";

const JWT_SECRET = process.env.JWT_SECRET || "examrank-college-secret-key-fallback";
const AUTH_COOKIE = "examrank_session";

export interface SessionUser {
  id: string;
  name: string;
  email: string;
  role: Role;
  usn?: string | null;
  department?: string | null;
}

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 10);
}

export async function comparePassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export function signToken(user: SessionUser): string {
  return jwt.sign(
    {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      usn: user.usn,
      department: user.department,
    },
    JWT_SECRET,
    { expiresIn: "12h" }
  );
}

export function verifyToken(token: string): SessionUser | null {
  try {
    return jwt.verify(token, JWT_SECRET) as SessionUser;
  } catch {
    return null;
  }
}

export async function getCurrentUser(): Promise<SessionUser | null> {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get(AUTH_COOKIE)?.value;
    if (!token) return null;
    return verifyToken(token);
  } catch {
    return null;
  }
}

export async function getAuthenticatedUserWithDb(): Promise<any | null> {
  const session = await getCurrentUser();
  if (!session) return null;
  return prisma.user.findUnique({
    where: { id: session.id },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      usn: true,
      department: true,
      semester: true,
      division: true,
    },
  });
}

export { AUTH_COOKIE };
