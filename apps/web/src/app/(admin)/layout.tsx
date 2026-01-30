import { redirect } from "next/navigation";
import Link from "next/link";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getServerSession(authOptions);

  if (!session?.user) {
    redirect("/login");
  }

  if (session.user.role !== "ADMIN") {
    redirect("/dashboard");
  }

  return (
    <div className="min-h-screen bg-muted/30">
      {/* Admin Header */}
      <header className="sticky top-0 z-40 border-b bg-background">
        <div className="container mx-auto flex h-16 items-center justify-between px-4">
          <div className="flex items-center gap-8">
            <Link href="/admin" className="font-bold text-xl">
              STS Admin
            </Link>
            <nav className="hidden md:flex items-center gap-6 text-sm">
              <Link
                href="/admin"
                className="text-muted-foreground hover:text-foreground transition-colors"
              >
                Dashboard
              </Link>
              <Link
                href="/admin/users"
                className="text-muted-foreground hover:text-foreground transition-colors"
              >
                Users
              </Link>
              <Link
                href="/admin/access"
                className="text-muted-foreground hover:text-foreground transition-colors"
              >
                Access
              </Link>
              <Link
                href="/admin/tickets"
                className="text-muted-foreground hover:text-foreground transition-colors"
              >
                Tickets
              </Link>
              <Link
                href="/admin/strategies"
                className="text-muted-foreground hover:text-foreground transition-colors"
              >
                Strategies
              </Link>
              <Link
                href="/admin/audit"
                className="text-muted-foreground hover:text-foreground transition-colors"
              >
                Audit Log
              </Link>
            </nav>
          </div>
          <div className="flex items-center gap-4">
            <Link
              href="/dashboard"
              className="text-sm text-muted-foreground hover:text-foreground"
            >
              User View
            </Link>
            <Link
              href="/api/auth/signout"
              className="text-sm text-muted-foreground hover:text-foreground"
            >
              Sign out
            </Link>
          </div>
        </div>
      </header>

      {/* Mobile Nav */}
      <nav className="md:hidden border-b bg-background">
        <div className="container mx-auto flex items-center gap-4 px-4 py-2 overflow-x-auto text-sm">
          <Link
            href="/admin"
            className="text-muted-foreground hover:text-foreground whitespace-nowrap"
          >
            Dashboard
          </Link>
          <Link
            href="/admin/users"
            className="text-muted-foreground hover:text-foreground whitespace-nowrap"
          >
            Users
          </Link>
          <Link
            href="/admin/access"
            className="text-muted-foreground hover:text-foreground whitespace-nowrap"
          >
            Access
          </Link>
          <Link
            href="/admin/tickets"
            className="text-muted-foreground hover:text-foreground whitespace-nowrap"
          >
            Tickets
          </Link>
          <Link
            href="/admin/strategies"
            className="text-muted-foreground hover:text-foreground whitespace-nowrap"
          >
            Strategies
          </Link>
          <Link
            href="/admin/audit"
            className="text-muted-foreground hover:text-foreground whitespace-nowrap"
          >
            Audit
          </Link>
        </div>
      </nav>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">{children}</main>
    </div>
  );
}
