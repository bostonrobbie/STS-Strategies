"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";

interface AdminTicketReplyFormProps {
  ticketId: string;
}

export function AdminTicketReplyForm({ ticketId }: AdminTicketReplyFormProps) {
  const router = useRouter();
  const [message, setMessage] = useState("");
  const [isInternal, setIsInternal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!message.trim()) return;

    setIsSubmitting(true);
    setError(null);

    try {
      const response = await fetch(`/api/admin/tickets/${ticketId}/reply`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message, isInternal }),
      });

      if (!response.ok) {
        const result = await response.json();
        throw new Error(result.error?.message || "Failed to send reply");
      }

      setMessage("");
      setIsInternal(false);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <Textarea
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        placeholder="Type your reply..."
        rows={4}
        disabled={isSubmitting}
      />

      <div className="flex items-center gap-2">
        <input
          type="checkbox"
          id="isInternal"
          checked={isInternal}
          onChange={(e) => setIsInternal(e.target.checked)}
          className="h-4 w-4 rounded border-gray-300"
        />
        <Label htmlFor="isInternal" className="text-sm font-normal">
          Internal note (not visible to customer)
        </Label>
      </div>

      {error && (
        <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
          {error}
        </div>
      )}

      <div className="flex justify-end gap-2">
        <Button type="submit" disabled={isSubmitting || !message.trim()}>
          {isSubmitting
            ? "Sending..."
            : isInternal
              ? "Add Internal Note"
              : "Send Reply"}
        </Button>
      </div>
    </form>
  );
}
