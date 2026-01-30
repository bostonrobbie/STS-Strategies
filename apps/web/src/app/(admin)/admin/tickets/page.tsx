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
  title: "Tickets | Admin | STS Strategies",
};

async function getTickets() {
  return prisma.supportTicket.findMany({
    include: {
      user: {
        select: { email: true, name: true },
      },
      messages: {
        take: 1,
        orderBy: { createdAt: "desc" },
      },
    },
    orderBy: [{ status: "asc" }, { updatedAt: "desc" }],
    take: 100,
  });
}

function getStatusBadge(status: string) {
  switch (status) {
    case "OPEN":
      return <Badge className="bg-blue-100 text-blue-800">Open</Badge>;
    case "IN_PROGRESS":
      return <Badge className="bg-yellow-100 text-yellow-800">In Progress</Badge>;
    case "WAITING_ON_CUSTOMER":
      return <Badge className="bg-purple-100 text-purple-800">Waiting</Badge>;
    case "RESOLVED":
      return <Badge className="bg-green-100 text-green-800">Resolved</Badge>;
    case "CLOSED":
      return <Badge className="bg-gray-100 text-gray-800">Closed</Badge>;
    default:
      return <Badge>{status}</Badge>;
  }
}

function getPriorityBadge(priority: string) {
  switch (priority) {
    case "URGENT":
      return <Badge variant="destructive">Urgent</Badge>;
    case "HIGH":
      return <Badge className="bg-orange-100 text-orange-800">High</Badge>;
    case "MEDIUM":
      return <Badge variant="secondary">Medium</Badge>;
    case "LOW":
      return <Badge variant="outline">Low</Badge>;
    default:
      return <Badge>{priority}</Badge>;
  }
}

export default async function TicketsPage() {
  const tickets = await getTickets();

  const open = tickets.filter((t) =>
    ["OPEN", "IN_PROGRESS", "WAITING_ON_CUSTOMER"].includes(t.status)
  );
  const closed = tickets.filter((t) =>
    ["RESOLVED", "CLOSED"].includes(t.status)
  );

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold">Support Tickets</h1>
        <p className="text-muted-foreground mt-1">
          Manage customer support requests
        </p>
      </div>

      {/* Quick Stats */}
      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Open Tickets</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{open.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Closed Tickets</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{closed.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Total Tickets</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{tickets.length}</div>
          </CardContent>
        </Card>
      </div>

      {/* Open Tickets */}
      {open.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Open Tickets ({open.length})</CardTitle>
            <CardDescription>Tickets requiring attention</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {open.map((ticket) => (
                <div
                  key={ticket.id}
                  className="flex items-center justify-between p-4 rounded-lg border"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <p className="font-medium truncate">{ticket.subject}</p>
                      {getPriorityBadge(ticket.priority)}
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {ticket.user.email} •{" "}
                      {new Date(ticket.updatedAt).toLocaleDateString()}
                      {ticket.category && ` • ${ticket.category}`}
                    </p>
                  </div>
                  <div className="flex items-center gap-3 ml-4">
                    {getStatusBadge(ticket.status)}
                    <Button asChild size="sm">
                      <Link href={`/admin/tickets/${ticket.id}`}>View</Link>
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* All Tickets Table */}
      <Card>
        <CardHeader>
          <CardTitle>All Tickets</CardTitle>
          <CardDescription>Complete ticket history</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b text-left text-sm text-muted-foreground">
                  <th className="pb-3 pr-4">Subject</th>
                  <th className="pb-3 pr-4">User</th>
                  <th className="pb-3 pr-4">Category</th>
                  <th className="pb-3 pr-4">Priority</th>
                  <th className="pb-3 pr-4">Status</th>
                  <th className="pb-3 pr-4">Updated</th>
                  <th className="pb-3">Actions</th>
                </tr>
              </thead>
              <tbody>
                {tickets.map((ticket) => (
                  <tr key={ticket.id} className="border-b">
                    <td className="py-4 pr-4">
                      <p className="font-medium truncate max-w-xs">
                        {ticket.subject}
                      </p>
                    </td>
                    <td className="py-4 pr-4">
                      <p className="text-sm">{ticket.user.email}</p>
                    </td>
                    <td className="py-4 pr-4 text-sm">
                      {ticket.category || "-"}
                    </td>
                    <td className="py-4 pr-4">{getPriorityBadge(ticket.priority)}</td>
                    <td className="py-4 pr-4">{getStatusBadge(ticket.status)}</td>
                    <td className="py-4 pr-4 text-sm text-muted-foreground">
                      {new Date(ticket.updatedAt).toLocaleDateString()}
                    </td>
                    <td className="py-4">
                      <Button asChild size="sm" variant="outline">
                        <Link href={`/admin/tickets/${ticket.id}`}>View</Link>
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
