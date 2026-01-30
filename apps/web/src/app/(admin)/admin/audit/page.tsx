import Link from "next/link";
import { prisma } from "@sts/database";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export const metadata = {
  title: "Audit Log | Admin | STS Strategies",
};

async function getAuditLogs() {
  return prisma.auditLog.findMany({
    include: {
      user: {
        select: { email: true, name: true },
      },
    },
    orderBy: { createdAt: "desc" },
    take: 200,
  });
}

function getActionBadge(action: string) {
  if (action.startsWith("admin.")) {
    return <Badge variant="default">Admin</Badge>;
  }
  if (action.startsWith("access.")) {
    return <Badge className="bg-green-100 text-green-800">Access</Badge>;
  }
  if (action.startsWith("ticket.")) {
    return <Badge className="bg-blue-100 text-blue-800">Ticket</Badge>;
  }
  if (action.startsWith("user.")) {
    return <Badge className="bg-purple-100 text-purple-800">User</Badge>;
  }
  if (action.startsWith("purchase.")) {
    return <Badge className="bg-yellow-100 text-yellow-800">Purchase</Badge>;
  }
  return <Badge variant="secondary">{action.split(".")[0]}</Badge>;
}

export default async function AuditPage() {
  const logs = await getAuditLogs();

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold">Audit Log</h1>
        <p className="text-muted-foreground mt-1">
          Track all system activities and changes
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Recent Activity ({logs.length})</CardTitle>
          <CardDescription>
            Last 200 audit log entries
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b text-left text-sm text-muted-foreground">
                  <th className="pb-3 pr-4">Time</th>
                  <th className="pb-3 pr-4">User</th>
                  <th className="pb-3 pr-4">Category</th>
                  <th className="pb-3 pr-4">Action</th>
                  <th className="pb-3">Details</th>
                </tr>
              </thead>
              <tbody>
                {logs.map((log) => (
                  <tr key={log.id} className="border-b">
                    <td className="py-4 pr-4 text-sm text-muted-foreground whitespace-nowrap">
                      {new Date(log.createdAt).toLocaleString()}
                    </td>
                    <td className="py-4 pr-4">
                      {log.user ? (
                        <Link
                          href={`/admin/users/${log.userId}`}
                          className="text-sm hover:underline"
                        >
                          {log.user.email}
                        </Link>
                      ) : (
                        <span className="text-sm text-muted-foreground">
                          System
                        </span>
                      )}
                    </td>
                    <td className="py-4 pr-4">{getActionBadge(log.action)}</td>
                    <td className="py-4 pr-4">
                      <code className="text-sm">{log.action}</code>
                    </td>
                    <td className="py-4">
                      <pre className="text-xs text-muted-foreground max-w-md overflow-hidden text-ellipsis">
                        {JSON.stringify(log.details, null, 0).slice(0, 100)}
                        {JSON.stringify(log.details).length > 100 && "..."}
                      </pre>
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
