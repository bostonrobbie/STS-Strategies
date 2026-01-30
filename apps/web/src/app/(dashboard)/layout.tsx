import { redirect } from "next/navigation";
import Link from "next/link";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getServerSession(authOptions);

  if (!session?.user) {
    redirect("/login");
  }

  return (
    <div className="min-h-screen bg-muted/30">
      {/* Dashboard Header */}
      <header className="sticky top-0 z-40 border-b bg-background">
        <div className="container mx-auto flex h-16 items-center justify-between px-4">
          <div className="flex items-center gap-8">
            <Link href="/" className="font-bold text-xl">
              STS Strategies
            </Link>
            <nav className="hidden md:flex items-center gap-6 text-sm">
              <Link
                href="/dashboard"
                className="text-muted-foreground hover:text-foreground transition-colors"
              >
                Overview
              </Link>
              <Link
                href="/dashboard/strategies"
                className="text-muted-foreground hover:text-foreground transition-colors"
              >
                My Strategies
              </Link>
              <Link
                href="/dashboard/support"
                className="text-muted-foreground hover:text-foreground transition-colors"
              >
                Support
              </Link>
              <Link
                href="/dashboard/settings"
                className="text-muted-foreground hover:text-foreground transition-colors"
              >
                Settings
              </Link>
            </nav>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-sm text-muted-foreground">
              {session.user.email}
            </span>
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
            href="/dashboard"
            className="text-muted-foreground hover:text-foreground whitespace-nowrap"
          >
            Overview
          </Link>
          <Link
            href="/dashboard/strategies"
            className="text-muted-foreground hover:text-foreground whitespace-nowrap"
          >
            My Strategies
          </Link>
          <Link
            href="/dashboard/support"
            className="text-muted-foreground hover:text-foreground whitespace-nowrap"
          >
            Support
          </Link>
          <Link
            href="/dashboard/settings"
            className="text-muted-foreground hover:text-foreground whitespace-nowrap"
          >
            Settings
          </Link>
        </div>
      </nav>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">{children}</main>
    </div>
  );
}
