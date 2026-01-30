"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";

interface AdminAccessActionsProps {
  accessId: string | null;
  status: string | null;
  userId: string;
  strategyId: string;
}

export function AdminAccessActions({
  accessId,
  status,
  userId,
  strategyId,
}: AdminAccessActionsProps) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);

  async function handleGrant() {
    setIsLoading(true);
    try {
      const response = await fetch("/api/admin/access/grant", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, strategyId }),
      });

      if (!response.ok) {
        const result = await response.json();
        throw new Error(result.error?.message || "Failed to grant access");
      }

      router.refresh();
    } catch (error) {
      alert(error instanceof Error ? error.message : "An error occurred");
    } finally {
      setIsLoading(false);
    }
  }

  async function handleRevoke() {
    if (!accessId) return;
    if (!confirm("Are you sure you want to revoke this access?")) return;

    setIsLoading(true);
    try {
      const response = await fetch(`/api/admin/access/${accessId}/revoke`, {
        method: "POST",
      });

      if (!response.ok) {
        const result = await response.json();
        throw new Error(result.error?.message || "Failed to revoke access");
      }

      router.refresh();
    } catch (error) {
      alert(error instanceof Error ? error.message : "An error occurred");
    } finally {
      setIsLoading(false);
    }
  }

  async function handleRetry() {
    if (!accessId) return;

    setIsLoading(true);
    try {
      const response = await fetch(`/api/admin/access/${accessId}/retry`, {
        method: "POST",
      });

      if (!response.ok) {
        const result = await response.json();
        throw new Error(result.error?.message || "Failed to retry");
      }

      router.refresh();
    } catch (error) {
      alert(error instanceof Error ? error.message : "An error occurred");
    } finally {
      setIsLoading(false);
    }
  }

  // No existing access - show grant button
  if (!accessId || !status) {
    return (
      <Button size="sm" onClick={handleGrant} disabled={isLoading}>
        {isLoading ? "..." : "Grant Access"}
      </Button>
    );
  }

  // Based on status
  switch (status) {
    case "GRANTED":
      return (
        <Button
          size="sm"
          variant="destructive"
          onClick={handleRevoke}
          disabled={isLoading}
        >
          {isLoading ? "..." : "Revoke"}
        </Button>
      );
    case "PENDING":
      return (
        <div className="flex gap-2">
          <Button size="sm" onClick={handleGrant} disabled={isLoading}>
            {isLoading ? "..." : "Force Grant"}
          </Button>
        </div>
      );
    case "FAILED":
      return (
        <div className="flex gap-2">
          <Button size="sm" onClick={handleRetry} disabled={isLoading}>
            {isLoading ? "..." : "Retry"}
          </Button>
          <Button size="sm" variant="outline" onClick={handleGrant} disabled={isLoading}>
            {isLoading ? "..." : "Manual Grant"}
          </Button>
        </div>
      );
    case "REVOKED":
      return (
        <Button size="sm" onClick={handleGrant} disabled={isLoading}>
          {isLoading ? "..." : "Re-grant"}
        </Button>
      );
    default:
      return null;
  }
}
