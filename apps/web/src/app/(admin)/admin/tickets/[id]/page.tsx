import { notFound } from "next/navigation";
import Link from "next/link";
import { prisma } from "@sts/database";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AdminTicketActions } from "@/components/admin-ticket-actions";
import { AdminTicketReplyForm } from "@/components/admin-ticket-reply-form";

interface TicketPageProps {
  params: { id: string };
}

async function getTicket(id: string) {
  return prisma.supportTicket.findUnique({
    where: { id },
    include: {
      user: {
        select: { id: true, email: true, name: true, tradingViewUsername: true },
      },
      messages: {
        orderBy: { createdAt: "asc" },
        include: {
          user: {
            select: { name: true, email: true, role: true },
          },
        },
      },
    },
  });
}

function getStatusBadge(status: string) {
  switch (status) {
    case "OPEN":
      return <Badge className="bg-blue-100 text-blue-800">Open</Badge>;
    case "IN_PROGRESS":
      return <Badge className="bg-yellow-100 text-yellow-800">In Progress</Badge>;
    case "WAITING_ON_CUSTOMER":
      return <Badge className="bg-purple-100 text-purple-800">Waiting on Customer</Badge>;
    case "RESOLVED":
      return <Badge className="bg-green-100 text-green-800">Resolved</Badge>;
    case "CLOSED":
      return <Badge className="bg-gray-100 text-gray-800">Closed</Badge>;
    default:
      return <Badge>{status}</Badge>;
  }
}

export default async function AdminTicketPage({ params }: TicketPageProps) {
  const ticket = await getTicket(params.id);

  if (!ticket) {
    notFound();
  }

  const isClosed = ["RESOLVED", "CLOSED"].includes(ticket.status);

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <nav className="text-sm mb-4">
          <Link
            href="/admin/tickets"
            className="text-muted-foreground hover:text-foreground"
          >
            Tickets
          </Link>
          <span className="mx-2 text-muted-foreground">/</span>
          <span>#{ticket.id.slice(-6)}</span>
        </nav>
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold">{ticket.subject}</h1>
            <p className="text-muted-foreground mt-1">
              From: {ticket.user.email} •{" "}
              {new Date(ticket.createdAt).toLocaleString()}
            </p>
          </div>
          <div className="flex items-center gap-3">
            {getStatusBadge(ticket.status)}
            <AdminTicketActions ticketId={ticket.id} currentStatus={ticket.status} />
          </div>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-4">
        {/* Messages */}
        <div className="lg:col-span-3 space-y-4">
          {ticket.messages.map((message) => (
            <Card
              key={message.id}
              className={
                message.isInternal
                  ? "border-amber-200 bg-amber-50 dark:border-amber-900 dark:bg-amber-950/20"
                  : message.isFromUser
                    ? ""
                    : "border-primary/20 bg-primary/5"
              }
            >
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <CardTitle className="text-sm font-medium">
                      {message.isFromUser ? (
                        message.user?.name || message.user?.email || "Customer"
                      ) : (
                        <span className="text-primary">Support Team</span>
                      )}
                    </CardTitle>
                    {message.isInternal && (
                      <Badge variant="outline" className="text-xs">
                        Internal Note
                      </Badge>
                    )}
                    {message.user?.role === "ADMIN" && !message.isFromUser && (
                      <Badge variant="secondary" className="text-xs">
                        Admin
                      </Badge>
                    )}
                  </div>
                  <span className="text-xs text-muted-foreground">
                    {new Date(message.createdAt).toLocaleString()}
                  </span>
                </div>
              </CardHeader>
              <CardContent>
                <div className="whitespace-pre-wrap text-sm">{message.message}</div>
              </CardContent>
            </Card>
          ))}

          {/* Reply Form */}
          {!isClosed && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Reply</CardTitle>
              </CardHeader>
              <CardContent>
                <AdminTicketReplyForm ticketId={ticket.id} />
              </CardContent>
            </Card>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Customer Info</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div>
                <p className="text-muted-foreground">Email</p>
                <p className="font-medium">{ticket.user.email}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Name</p>
                <p className="font-medium">{ticket.user.name || "Not set"}</p>
              </div>
              <div>
                <p className="text-muted-foreground">TradingView</p>
                <p className="font-mono">
                  {ticket.user.tradingViewUsername || "Not set"}
                </p>
              </div>
              <Link
                href={`/admin/users/${ticket.user.id}`}
                className="block text-primary hover:underline"
              >
                View full profile
              </Link>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Ticket Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div>
                <p className="text-muted-foreground">ID</p>
                <p className="font-mono">{ticket.id}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Category</p>
                <p>{ticket.category || "Other"}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Priority</p>
                <p>{ticket.priority}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Created</p>
                <p>{new Date(ticket.createdAt).toLocaleString()}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Last Updated</p>
                <p>{new Date(ticket.updatedAt).toLocaleString()}</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
