import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { addJob } from "@/lib/queue";

/**
 * GET /api/admin/strategies
 * List all strategies
 */
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user || session.user.role !== "ADMIN") {
      return NextResponse.json(
        { error: { code: "UNAUTHORIZED", message: "Admin access required" } },
        { status: 401 }
      );
    }

    const strategies = await db.strategy.findMany({
      orderBy: { sortOrder: "asc" },
      include: {
        _count: {
          select: {
            strategyAccess: true,
          },
        },
      },
    });

    return NextResponse.json({ strategies });
  } catch (error) {
    console.error("List strategies error:", error);
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message: "Failed to list strategies" } },
      { status: 500 }
    );
  }
}

/**
 * POST /api/admin/strategies
 * Create a new strategy
 *
 * If strategy is created as active, automatically queues
 * grant jobs for all users with completed purchases.
 */
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user || session.user.role !== "ADMIN") {
      return NextResponse.json(
        { error: { code: "UNAUTHORIZED", message: "Admin access required" } },
        { status: 401 }
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

    // Validate required fields
    if (!name || !slug || !description || !pineId || !market || !timeframe || !style) {
      return NextResponse.json(
        {
          error: {
            code: "VALIDATION_ERROR",
            message: "Missing required fields",
          },
        },
        { status: 400 }
      );
    }

    // Check for existing slug or pineId
    const existing = await db.strategy.findFirst({
      where: {
        OR: [{ slug }, { pineId }],
      },
    });

    if (existing) {
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

    // Create strategy
    const strategy = await db.strategy.create({
      data: {
        name,
        slug,
        description,
        longDescription,
        pineId,
        market,
        timeframe,
        style,
        sessionFocus,
        features: features || [],
        imageUrl,
        autoProvision: autoProvision ?? true,
        isActive: isActive ?? false,
        sortOrder: sortOrder ?? 0,
      },
    });

    // Audit log
    await db.auditLog.create({
      data: {
        userId: session.user.id,
        action: "strategy.created",
        details: {
          strategyId: strategy.id,
          strategyName: strategy.name,
          isActive: strategy.isActive,
        },
      },
    });

    // If created as active, trigger auto-grant for all purchasers
    if (strategy.isActive) {
      await triggerAutoGrant(strategy.id, strategy.name, strategy.pineId);
    }

    return NextResponse.json({ strategy }, { status: 201 });
  } catch (error) {
    console.error("Create strategy error:", error);
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message: "Failed to create strategy" } },
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
