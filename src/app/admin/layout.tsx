import Link from "next/link";
import { redirect } from "next/navigation";
import { AdminShell } from "@/components/admin/AdminShell";
import { isSupabaseConfigured } from "@/lib/data";
import { getCurrentProfile } from "@/lib/auth";

export const metadata = { title: "Admin" };
export const dynamic = "force-dynamic";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Before Supabase is connected, let the area render (shows setup notices).
  if (isSupabaseConfigured()) {
    const profile = await getCurrentProfile();
    // Not signed in — middleware already redirects, but guard anyway.
    if (!profile) redirect("/login?redirect=/admin");
    // Signed in but not an admin — show a friendly stop.
    if (!profile.is_admin) {
      return (
        <div className="container-content flex min-h-[60vh] flex-col items-center justify-center py-16 text-center">
          <p className="text-4xl">🔒</p>
          <h1 className="mt-4 font-display text-2xl font-700 text-navy-950">
            Admins only
          </h1>
          <p className="mt-2 max-w-md text-sm text-navy-900/60">
            You&apos;re signed in, but this area is for league commissioners. If you
            think you should have access, ask an admin to flag your account.
          </p>
          <div className="mt-6 flex gap-3">
            <Link href="/predict" className="btn-primary">Go to the Pool</Link>
            <Link href="/" className="btn-ghost">Home</Link>
          </div>
        </div>
      );
    }
  }

  return <AdminShell>{children}</AdminShell>;
}
