import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { addJob } from "@/lib/queue";

interface RouteContext {
  params: Promise<{ id: string }>;
}

/**
 * GET /api/admin/strategies/[id]
 * Get a single strategy by ID
 */
export async function GET(req: NextRequest, context: RouteContext) {
  try {
    const session = await getServerSession(authOptions);
    const { id } = await context.params;

    if (!session?.user || session.user.role !== "ADMIN") {
      return NextResponse.json(
        { error: { code: "UNAUTHORIZED", message: "Admin access required" } },
        { status: 401 }
      );
    }

    const strategy = await db.strategy.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            strategyAccess: true,
          },
        },
        strategyAccess: {
          take: 10,
          orderBy: { createdAt: "desc" },
          include: {
            user: {
              select: {
                email: true,
                tradingViewUsername: true,
              },
            },
          },
        },
      },
    });

    if (!strategy) {
      return NextResponse.json(
        { error: { code: "NOT_FOUND", message: "Strategy not found" } },
        { status: 404 }
      );
    }

    return NextResponse.json({ strategy });
  } catch (error) {
    console.error("Get strategy error:", error);
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message: "Failed to get strategy" } },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/admin/strategies/[id]
 * Update a strategy
 *
 * If strategy is being activated (isActive: false -> true),
 * automatically queues grant jobs for all users with completed purchases.
 */
export async function PATCH(req: NextRequest, context: RouteContext) {
  try {
    const session = await getServerSession(authOptions);
    const { id } = await context.params;

    if (!session?.user || session.user.role !== "ADMIN") {
      return NextResponse.json(
        { error: { code: "UNAUTHORIZED", message: "Admin access required" } },
        { status: 401 }
      );
    }

    // Get existing strategy
    const existingStrategy = await db.strategy.findUnique({
      where: { id },
    });

    if (!existingStrategy) {
      return NextResponse.json(
        { error: { code: "NOT_FOUND", message: "Strategy not found" } },
        { status: 404 }
      );
    }

    const body = await req.json();
    const {
      name,
      slug,
      description,
      longDescription,
      pineId,
      market,
      timeframe,
      style,
      sessionFocus,
      features,
      imageUrl,
      autoProvision,
      isActive,
      sortOrder,
    } = body;

    // Check for slug/pineId conflicts with other strategies
    if (slug || pineId) {
      const conflict = await db.strategy.findFirst({
        where: {
          AND: [
            { id: { not: id } },
            {
              OR: [
                slug ? { slug } : {},
                pineId ? { pineId } : {},
              ].filter((o) => Object.keys(o).length > 0),
            },
          ],
        },
      });

      if (conflict) {
        return NextResponse.json(
          {
            error: {
              code: "DUPLICATE",
              message: "A strategy with this slug or Pine ID already exists",
            },
          },
          { status: 400 }
        );
      }
    }

    // Detect activation (inactive -> active)
    const isBeingActivated =
      existingStrategy.isActive === false && isActive === true;

    // Update strategy
    const strategy = await db.strategy.update({
      where: { id },
      data: {
        ...(name !== undefined && { name }),
        ...(slug !== undefined && { slug }),
        ...(description !== undefined && { description }),
        ...(longDescription !== undefined && { longDescription }),
        ...(pineId !== undefined && { pineId }),
        ...(market !== undefined && { market }),
        ...(timeframe !== undefined && { timeframe }),
        ...(style !== undefined && { style }),
        ...(sessionFocus !== undefined && { sessionFocus }),
        ...(features !== undefined && { features }),
        ...(imageUrl !== undefined && { imageUrl }),
        ...(autoProvision !== undefined && { autoProvision }),
        ...(isActive !== undefined && { isActive }),
        ...(sortOrder !== undefined && { sortOrder }),
      },
    });

    // Audit log
    await db.auditLog.create({
      data: {
        userId: session.user.id,
        action: "strategy.updated",
        details: {
          strategyId: strategy.id,
          strategyName: strategy.name,
          changes: body,
          wasActivated: isBeingActivated,
        },
      },
    });

    // If strategy was just activated, trigger auto-grant for all purchasers
    if (isBeingActivated) {
      await triggerAutoGrant(strategy.id, strategy.name, strategy.pineId);
    }

    return NextResponse.json({ strategy });
  } catch (error) {
    console.error("Update strategy error:", error);
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message: "Failed to update strategy" } },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/admin/strategies/[id]
 * Delete a strategy (soft delete by deactivating)
 */
export async function DELETE(req: NextRequest, context: RouteContext) {
  try {
    const session = await getServerSession(authOptions);
    const { id } = await context.params;

    if (!session?.user || session.user.role !== "ADMIN") {
      return NextResponse.json(
        { error: { code: "UNAUTHORIZED", message: "Admin access required" } },
        { status: 401 }
      );
    }

    const strategy = await db.strategy.findUnique({
      where: { id },
    });

    if (!strategy) {
      return NextResponse.json(
        { error: { code: "NOT_FOUND", message: "Strategy not found" } },
        { status: 404 }
      );
    }

    // Soft delete by deactivating
    await db.strategy.update({
      where: { id },
      data: { isActive: false },
    });

    // Audit log
    await db.auditLog.create({
      data: {
        userId: session.user.id,
        action: "strategy.deactivated",
        details: {
          strategyId: strategy.id,
          strategyName: strategy.name,
        },
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Delete strategy error:", error);
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message: "Failed to delete strategy" } },
      { status: 500 }
    );
  }
}

/**
 * Trigger auto-grant job for all users with completed purchases
 */
async function triggerAutoGrant(
  strategyId: string,
  strategyName: string,
  pineId: string
): Promise<void> {
  try {
    await addJob("new-strategy-grant", {
      strategyId,
      strategyName,
      pineId,
    });

    console.log(`[Strategies] Queued auto-grant job for strategy: ${strategyName}`);
  } catch (error) {
    console.error("[Strategies] Failed to queue auto-grant job:", error);
    // Don't fail the request, just log the error
  }
}
