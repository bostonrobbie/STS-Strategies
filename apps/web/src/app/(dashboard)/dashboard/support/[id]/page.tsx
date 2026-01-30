import { getServerSession } from "next-auth";
import { notFound } from "next/navigation";
import Link from "next/link";
import { authOptions } from "@/lib/auth";
import { prisma } from "@sts/database";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TicketReplyForm } from "@/components/ticket-reply-form";

interface TicketPageProps {
  params: { id: string };
}

async function getTicket(ticketId: string, userId: string) {
  return prisma.supportTicket.findFirst({
    where: {
      id: ticketId,
      userId,
    },
    include: {
      messages: {
        where: { isInternal: false },
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

export default async function TicketPage({ params }: TicketPageProps) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return null;

  const ticket = await getTicket(params.id, session.user.id);

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
            href="/dashboard/support"
            className="text-muted-foreground hover:text-foreground"
          >
            Support
          </Link>
          <span className="mx-2 text-muted-foreground">/</span>
          <span>Ticket #{ticket.id.slice(-6)}</span>
        </nav>
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold">{ticket.subject}</h1>
            <p className="text-muted-foreground mt-1">
              Created {new Date(ticket.createdAt).toLocaleDateString()} •{" "}
              {ticket.category && `${ticket.category} • `}
              {ticket.priority} priority
            </p>
          </div>
          {getStatusBadge(ticket.status)}
        </div>
      </div>

      {/* Messages */}
      <div className="space-y-4">
        {ticket.messages.map((message) => (
          <Card
            key={message.id}
            className={message.isFromUser ? "" : "border-primary/20 bg-primary/5"}
          >
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-medium">
                  {message.isFromUser ? (
                    message.user?.name || message.user?.email || "You"
                  ) : (
                    <span className="text-primary">STS Strategies Support</span>
                  )}
                </CardTitle>
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
      </div>

      {/* Reply Form */}
      {!isClosed ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Reply</CardTitle>
          </CardHeader>
          <CardContent>
            <TicketReplyForm ticketId={ticket.id} />
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="py-6 text-center">
            <p className="text-muted-foreground">
              This ticket has been {ticket.status.toLowerCase()}. If you need
              further assistance, please{" "}
              <Link
                href="/dashboard/support/new"
                className="text-primary hover:underline"
              >
                create a new ticket
              </Link>
              .
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
