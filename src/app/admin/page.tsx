import { getCurrentUser } from "@/lib/auth";
import { redirect } from "next/navigation";
import { Navbar } from "@/components/Navbar";
import { AdminDashboard } from "@/components/admin/AdminDashboard";
import { Role } from "@prisma/client";

export const metadata = {
  title: "Admin Control Center — ExamRank",
  description: "Executive analytics, candidate & teacher directory, anti-cheat violations, and exam retry authorization.",
};

export default async function AdminPage() {
  const user = await getCurrentUser();

  if (!user || user.role !== Role.ADMIN) {
    if (user?.role === Role.TEACHER) {
      redirect("/teacher");
    } else {
      redirect("/login");
    }
  }

  return (
    <div className="min-h-screen bg-[#0B0F17] text-slate-100 flex flex-col">
      <Navbar user={user} />
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <AdminDashboard />
      </main>
    </div>
  );
}
