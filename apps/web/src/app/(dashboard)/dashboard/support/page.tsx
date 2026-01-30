import { getServerSession } from "next-auth";
import Link from "next/link";
import { authOptions } from "@/lib/auth";
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
  title: "Support | STS Strategies",
};

async function getUserTickets(userId: string) {
  return prisma.supportTicket.findMany({
    where: { userId },
    include: {
      messages: {
        take: 1,
        orderBy: { createdAt: "desc" },
      },
    },
    orderBy: { updatedAt: "desc" },
  });
}

function getStatusBadge(status: string) {
  switch (status) {
    case "OPEN":
      return <Badge className="bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-100">Open</Badge>;
    case "IN_PROGRESS":
      return <Badge className="bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-100">In Progress</Badge>;
    case "WAITING_ON_CUSTOMER":
      return <Badge className="bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-100">Waiting on You</Badge>;
    case "RESOLVED":
      return <Badge className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100">Resolved</Badge>;
    case "CLOSED":
      return <Badge className="bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-100">Closed</Badge>;
    default:
      return <Badge>{status}</Badge>;
  }
}

function getPriorityColor(priority: string) {
  switch (priority) {
    case "URGENT":
      return "text-red-600 dark:text-red-400";
    case "HIGH":
      return "text-orange-600 dark:text-orange-400";
    case "MEDIUM":
      return "text-yellow-600 dark:text-yellow-400";
    case "LOW":
      return "text-gray-600 dark:text-gray-400";
    default:
      return "";
  }
}

export default async function SupportPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return null;

  const tickets = await getUserTickets(session.user.id);

  const openTickets = tickets.filter((t) =>
    ["OPEN", "IN_PROGRESS", "WAITING_ON_CUSTOMER"].includes(t.status)
  );
  const closedTickets = tickets.filter((t) =>
    ["RESOLVED", "CLOSED"].includes(t.status)
  );

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Support</h1>
          <p className="text-muted-foreground mt-1">
            View and manage your support tickets
          </p>
        </div>
        <Button asChild>
          <Link href="/dashboard/support/new">Create Ticket</Link>
        </Button>
      </div>

      {tickets.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center">
            <div className="mx-auto w-12 h-12 rounded-full bg-muted flex items-center justify-center mb-4">
              <svg
                className="h-6 w-6 text-muted-foreground"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z"
                />
              </svg>
            </div>
            <h3 className="text-lg font-semibold mb-2">No tickets yet</h3>
            <p className="text-muted-foreground mb-6 max-w-sm mx-auto">
              Need help with your strategies or account? Create a support ticket
              and we&apos;ll get back to you.
            </p>
            <Button asChild>
              <Link href="/dashboard/support/new">Create Your First Ticket</Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-8">
          {/* Open Tickets */}
          {openTickets.length > 0 && (
            <div>
              <h2 className="text-xl font-semibold mb-4">
                Open Tickets ({openTickets.length})
              </h2>
              <div className="space-y-4">
                {openTickets.map((ticket) => (
                  <Card key={ticket.id}>
                    <CardHeader className="pb-2">
                      <div className="flex items-start justify-between">
                        <div>
                          <Link
                            href={`/dashboard/support/${ticket.id}`}
                            className="hover:underline"
                          >
                            <CardTitle className="text-lg">
                              {ticket.subject}
                            </CardTitle>
                          </Link>
                          <CardDescription className="mt-1">
                            Created{" "}
                            {new Date(ticket.createdAt).toLocaleDateString()} •{" "}
                            <span className={getPriorityColor(ticket.priority)}>
                              {ticket.priority}
                            </span>
                            {ticket.category && ` • ${ticket.category}`}
                          </CardDescription>
                        </div>
                        {getStatusBadge(ticket.status)}
                      </div>
                    </CardHeader>
                    <CardContent>
                      {ticket.messages[0] && (
                        <p className="text-sm text-muted-foreground line-clamp-2">
                          {ticket.messages[0].message}
                        </p>
                      )}
                      <div className="mt-4">
                        <Button asChild variant="outline" size="sm">
                          <Link href={`/dashboard/support/${ticket.id}`}>
                            View Ticket
                          </Link>
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {/* Closed Tickets */}
          {closedTickets.length > 0 && (
            <div>
              <h2 className="text-xl font-semibold mb-4">
                Closed Tickets ({closedTickets.length})
              </h2>
              <div className="space-y-4">
                {closedTickets.map((ticket) => (
                  <Card key={ticket.id} className="opacity-75">
                    <CardHeader className="pb-2">
                      <div className="flex items-start justify-between">
                        <div>
                          <Link
                            href={`/dashboard/support/${ticket.id}`}
                            className="hover:underline"
                          >
                            <CardTitle className="text-lg">
                              {ticket.subject}
                            </CardTitle>
                          </Link>
                          <CardDescription className="mt-1">
                            Closed{" "}
                            {ticket.closedAt
                              ? new Date(ticket.closedAt).toLocaleDateString()
                              : new Date(ticket.updatedAt).toLocaleDateString()}
                          </CardDescription>
                        </div>
                        {getStatusBadge(ticket.status)}
                      </div>
                    </CardHeader>
                    <CardContent>
                      <Button asChild variant="ghost" size="sm">
                        <Link href={`/dashboard/support/${ticket.id}`}>
                          View Details
                        </Link>
                      </Button>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
