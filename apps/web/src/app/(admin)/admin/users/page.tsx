import Link from "next/link";
import { prisma } from "@sts/database";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export const metadata = {
  title: "Users | Admin | STS Strategies",
};

async function getUsers() {
  return prisma.user.findMany({
    include: {
      _count: {
        select: {
          purchases: true,
          strategyAccess: true,
          supportTickets: true,
        },
      },
    },
    orderBy: { createdAt: "desc" },
    take: 100,
  });
}

export default async function UsersPage() {
  const users = await getUsers();

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold">Users</h1>
        <p className="text-muted-foreground mt-1">
          Manage registered users and their access
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>All Users ({users.length})</CardTitle>
          <CardDescription>
            Click on a user to view details and manage access
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b text-left text-sm text-muted-foreground">
                  <th className="pb-3 pr-4">User</th>
                  <th className="pb-3 pr-4">TradingView</th>
                  <th className="pb-3 pr-4">Role</th>
                  <th className="pb-3 pr-4">Purchases</th>
                  <th className="pb-3 pr-4">Access</th>
                  <th className="pb-3 pr-4">Tickets</th>
                  <th className="pb-3 pr-4">Joined</th>
                  <th className="pb-3">Actions</th>
                </tr>
              </thead>
              <tbody>
                {users.map((user) => (
                  <tr key={user.id} className="border-b">
                    <td className="py-4 pr-4">
                      <div>
                        <p className="font-medium">{user.name || "No name"}</p>
                        <p className="text-sm text-muted-foreground">
                          {user.email}
                        </p>
                      </div>
                    </td>
                    <td className="py-4 pr-4">
                      <span className="font-mono text-sm">
                        {user.tradingViewUsername || "-"}
                      </span>
                    </td>
                    <td className="py-4 pr-4">
                      <Badge
                        variant={user.role === "ADMIN" ? "default" : "secondary"}
                      >
                        {user.role}
                      </Badge>
                    </td>
                    <td className="py-4 pr-4">{user._count.purchases}</td>
                    <td className="py-4 pr-4">{user._count.strategyAccess}</td>
                    <td className="py-4 pr-4">{user._count.supportTickets}</td>
                    <td className="py-4 pr-4 text-sm text-muted-foreground">
                      {new Date(user.createdAt).toLocaleDateString()}
                    </td>
                    <td className="py-4">
                      <Button asChild size="sm" variant="outline">
                        <Link href={`/admin/users/${user.id}`}>View</Link>
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
